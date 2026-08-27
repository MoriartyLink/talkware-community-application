const WEB_IMAGE_MAX_DIMENSION = 1024;
const WEBP_QUALITY = 0.82;

export async function createWebImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(1, WEB_IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is not available in this browser.');

    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        result => result ? resolve(result) : reject(new Error('Unable to optimize the selected image.')),
        'image/webp',
        WEBP_QUALITY,
      );
    });
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
