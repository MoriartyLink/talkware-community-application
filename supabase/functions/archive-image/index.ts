import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ARCHIVE_LIMIT_PER_HOUR = 20;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleDriveFile = {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: string;
  error?: { message?: string };
};

const jsonError = (message: string, status: number, code: string) =>
  Response.json({ error: message, code }, { status });

const getImageMimeType = async (file: File) => {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const isWebp = bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";

  if (isJpeg) return "image/jpeg";
  if (isPng) return "image/png";
  if (isWebp) return "image/webp";
  return null;
};

const getGoogleAccessToken = async () => {
  const clientId = Deno.env.get("GOOGLE_DRIVE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_DRIVE_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) return null;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const result = await response.json() as GoogleTokenResponse;

  if (!response.ok || !result.access_token) {
    console.error("Google OAuth token refresh failed", response.status, result.error);
    throw new Error(result.error_description || "Google OAuth token refresh failed");
  }

  return result.access_token;
};

const uploadToGoogleDrive = async (file: File, folderId: string, accessToken: string, ownerId: string) => {
  const boundary = `talkware_${crypto.randomUUID()}`;
  const originalName = file.name.split(/[\\/]/).pop() || "image";
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
  const metadata = JSON.stringify({
    name: `${ownerId}-${crypto.randomUUID()}-${safeName}`,
    parents: [folderId],
  });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`,
    file,
    `\r\n--${boundary}--`,
  ]);
  const uploadUrl = new URL("https://www.googleapis.com/upload/drive/v3/files");
  uploadUrl.searchParams.set("uploadType", "multipart");
  uploadUrl.searchParams.set("supportsAllDrives", "true");
  uploadUrl.searchParams.set("fields", "id,name,mimeType,size");

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  const result = await response.json() as GoogleDriveFile;

  if (!response.ok || !result.id) {
    console.error("Google Drive upload failed", response.status, result.error?.message);
    throw new Error(result.error?.message || "Google Drive upload failed");
  }

  return result;
};

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return jsonError("Method not allowed", 405, "method_not_allowed");

    const { data: { user }, error: userError } = await ctx.supabase.auth.getUser();
    if (userError || !user) return jsonError("Authentication required", 401, "not_authenticated");

    const { data: application, error: applicationError } = await ctx.supabase
      .from("membership_applications")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (applicationError) return jsonError("Unable to verify membership", 500, "membership_check_failed");
    if (application?.status !== "approved") return jsonError("Approved membership required", 403, "membership_required");

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await ctx.supabase
      .from("media_archives")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .gte("created_at", oneHourAgo);
    if (countError) return jsonError("Unable to check archive limit", 500, "archive_limit_check_failed");
    if ((count || 0) >= ARCHIVE_LIMIT_PER_HOUR) {
      return jsonError("Image archive limit reached. Try again later.", 429, "archive_limit_reached");
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const storageBucket = formData.get("storageBucket");
    const storagePath = formData.get("storagePath");
    const mediaKind = formData.get("mediaKind");

    if (!(file instanceof File) || typeof storageBucket !== "string" || typeof storagePath !== "string") {
      return jsonError("A file and its web-copy location are required", 400, "invalid_form_data");
    }
    if (mediaKind !== "avatar" || storageBucket !== "assets") {
      return jsonError("Unsupported archive target", 400, "invalid_archive_target");
    }
    if (!storagePath.startsWith(`member-avatars/${user.id}/`)) {
      return jsonError("Invalid web-copy path", 403, "invalid_storage_path");
    }
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES || !ALLOWED_IMAGE_TYPES.has(file.type)) {
      return jsonError("Upload a JPG, PNG, or WebP image up to 5 MB", 413, "invalid_image");
    }

    const detectedMimeType = await getImageMimeType(file);
    if (!detectedMimeType || detectedMimeType !== file.type) {
      return jsonError("The file contents do not match its image type", 415, "invalid_image_contents");
    }

    const folderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID");
    if (!folderId) {
      return jsonError("Google Drive archiving is not configured", 503, "google_drive_not_configured");
    }

    try {
      const accessToken = await getGoogleAccessToken();
      if (!accessToken) {
        return jsonError("Google Drive archiving is not configured", 503, "google_drive_not_configured");
      }

      const driveFile = await uploadToGoogleDrive(file, folderId, accessToken, user.id);
      const { data: archive, error: archiveError } = await ctx.supabaseAdmin
        .from("media_archives")
        .insert({
          owner_id: user.id,
          media_kind: "avatar",
          provider: "google_drive",
          provider_file_id: driveFile.id,
          provider_folder_id: folderId,
          storage_bucket: storageBucket,
          storage_path: storagePath,
          original_filename: file.name.slice(0, 255),
          mime_type: detectedMimeType,
          file_size: file.size,
        })
        .select("id")
        .single();

      if (archiveError || !archive) {
        console.error("Media archive record insert failed", archiveError?.message);
        await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFile.id!)}?supportsAllDrives=true`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(() => undefined);
        return jsonError("Unable to record the archived image", 500, "archive_record_failed");
      }

      return Response.json({ archived: true, archiveId: archive.id });
    } catch (error) {
      console.error("Image archive failed", error instanceof Error ? error.message : error);
      return jsonError("Google Drive archive failed", 502, "google_drive_upload_failed");
    }
  }),
};
