export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type RegistrationStatus = 'confirmed' | 'waitlisted' | 'cancelled';
export type StaffRole = 'admin' | 'organizer';
export type ReactionType = 'like' | 'celebrate' | 'support';

export interface MemberProfile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  github_url: string | null;
  linkedin_url: string | null;
  telegram_url: string | null;
  contact_email: string | null;
  public_listing: boolean;
  created_at: string;
  updated_at: string;
}

export interface MembershipApplication {
  user_id: string;
  email: string;
  phone: string | null;
  role_title: string;
  interests: string;
  motivation: string;
  status: ApplicationStatus;
  admin_note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface CommunityEvent {
  id: string;
  title: string;
  date: string | null;
  type: 'Meetup' | 'Training';
  location: string | null;
  speaker: string | null;
  description: string | null;
  link: string | null;
  archived: boolean;
  starts_at: string | null;
  ends_at: string | null;
  registration_deadline: string | null;
  capacity: number | null;
  published: boolean;
  registration_open: boolean;
  highlight_image_url: string | null;
  highlight_note: string | null;
  created_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  registration_kind: 'member' | 'guest';
  member_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  status: RegistrationStatus;
  created_at: string;
  updated_at: string;
}

export interface EventResource {
  id: string;
  event_id: string;
  title: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  sort_order: number;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  body: string;
  published: boolean;
  published_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostReaction {
  post_id: string;
  member_id: string;
  reaction: ReactionType;
  created_at: string;
}

export interface MemberPass {
  user_id: string;
  token: string;
  active: boolean;
  issued_at: string;
  rotated_at: string | null;
}

export interface PointLedgerEntry {
  id: string;
  member_id: string;
  event_id: string | null;
  attendance_id: string | null;
  points: number;
  reason: string;
  event_type: CommunityEvent['type'] | null;
  source_type: 'event_attendance' | 'peer_session' | 'peer_session_refund';
  source_id: string | null;
  earned_at: string;
  created_at: string;
  event: Pick<CommunityEvent, 'title' | 'type'> | null;
}

export type PeerSessionStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';

export interface PeerSessionPreference {
  user_id: string;
  enabled: boolean;
  topics: string[];
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface PeerSessionMember extends Pick<MemberProfile, 'user_id' | 'display_name' | 'avatar_url' | 'headline' | 'bio' | 'skills'> {
  peer_session_preferences: PeerSessionPreference | PeerSessionPreference[];
}

export interface PeerSessionRequest {
  id: string;
  requester_id: string;
  peer_id: string;
  topic: string;
  description: string;
  duration_minutes: 15 | 30 | 60;
  points_cost: 50 | 100 | 200;
  status: PeerSessionStatus;
  proposed_start_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  requester: Pick<MemberProfile, 'user_id' | 'display_name' | 'avatar_url'> | null;
  peer: Pick<MemberProfile, 'user_id' | 'display_name' | 'avatar_url'> | null;
}
