export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  role: string;
  plan: "FREE" | "PRO" | "ENTERPRISE";
}

export interface ModuleInfo {
  key: string;
  label: string;
  icon: string;
  category: string;
  ticketing: boolean;
  defaultStreamMode: string;
  forcedVisibility: "private" | null;
  blurb: string;
}

export interface EventItem {
  id: string;
  module: string;
  title: string;
  description: string | null;
  category: string;
  coverUrl: string | null;
  trailerUrl: string | null;
  startsAt: string | null;
  priceCents: number;
  currency: string;
  maxSeats: number | null;
  seatsSold: number;
  seatsLeft: number | null;
  visibility: string;
  streamMode: string;
  status: string;
  roomName: string;
  creator: { id: string; name: string; avatarUrl: string | null };
  createdAt: string;
}

export interface VideoItem {
  id: string;
  title: string;
  description: string | null;
  url: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  likeCount: number;
  viewCount: number;
  sourceEventId: string | null;
  creator: { id: string; name: string; avatarUrl: string | null };
  createdAt: string;
}

export interface Tier {
  id: string;
  accessLevel: "STANDARD" | "VIP" | "SPEAKER" | "STAFF";
  label: string | null;
  priceCents: number;
  maxQuantity: number | null;
  quantitySold: number;
  quantityLeft: number | null;
}

export interface Ticket {
  id: string;
  eventId: string;
  code: string;
  accessLevel: "STANDARD" | "VIP" | "SPEAKER" | "STAFF";
  passToken: string | null;
  status: string;
  pricePaidCents: number;
  currency: string;
  usedAt: string | null;
  createdAt: string;
}
