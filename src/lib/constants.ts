// Shared constants — single source of truth for enums used across UI and API

export const STATUS_COLS = [
  { key: "TODO", label: "To Do", color: "border-gray-600" },
  { key: "IN_PROGRESS", label: "In Progress", color: "border-blue-500" },
  { key: "IN_REVIEW", label: "In Review", color: "border-yellow-500" },
  { key: "CLIENT_APPROVAL", label: "Client Approval", color: "border-purple-500" },
  { key: "REVISION", label: "Revision", color: "border-orange-500" },
  { key: "DONE", label: "Done", color: "border-green-500" },
] as const;

export const STATUS_OPTIONS = STATUS_COLS.map((s) => s.key);

export const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_COLS.map((s) => [s.key, s.label])
);

export const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-gray-500",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
};

export const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const CATEGORY_LABEL: Record<string, string> = {
  VIDEO_EDITING: "Video",
  CLIENT_VIDEO_RECORDING: "Video Recording",
  GRAPHIC_DESIGN: "Design",
  ADS_MANAGEMENT: "Ads",
  SHOOT: "Shoot",
  CONTENT_WRITING: "Content",
  STRATEGY: "Strategy",
  REPORTING: "Reports",
  OTHER: "Other",
};

export const CATEGORY_LABEL_FULL: Record<string, string> = {
  VIDEO_EDITING: "Video Editing",
  CLIENT_VIDEO_RECORDING: "Client Video Recording",
  GRAPHIC_DESIGN: "Graphic Design",
  ADS_MANAGEMENT: "Ads Management",
  SHOOT: "Shoot",
  CONTENT_WRITING: "Content Writing",
  STRATEGY: "Strategy",
  REPORTING: "Reporting",
  OTHER: "Other",
};

// Video upload limits — used by the task video-attachment upload route
export const MAX_VIDEO_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"];
// Magic-byte signatures for the allowed video types — checked against actual file bytes,
// since the client-supplied MIME type can be spoofed.
export const VIDEO_SIGNATURES: { type: string; check: (buf: Buffer) => boolean }[] = [
  {
    type: "video/mp4",
    check: (buf) => buf.length > 11 && buf.toString("ascii", 4, 8) === "ftyp",
  },
  {
    type: "video/quicktime",
    check: (buf) => buf.length > 11 && buf.toString("ascii", 4, 8) === "moov",
  },
  {
    type: "video/webm",
    check: (buf) => buf.length > 3 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3,
  },
  {
    type: "video/x-msvideo",
    check: (buf) =>
      buf.length > 11 &&
      buf.toString("ascii", 0, 4) === "RIFF" &&
      buf.toString("ascii", 8, 11) === "AVI",
  },
];

export const RECURRENCE_ICON: Record<string, string> = {
  DAILY: "↻D",
  WEEKLY: "↻W",
  MONTHLY: "↻M",
};

export const PROJECT_STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-400",
  ON_HOLD: "bg-yellow-500/20 text-yellow-400",
  COMPLETED: "bg-blue-500/20 text-blue-400",
  CANCELLED: "bg-red-500/20 text-red-400",
};

export const PLATFORM_COLOR: Record<string, string> = {
  META: "bg-blue-500/20 text-blue-400",
  GOOGLE: "bg-green-500/20 text-green-400",
  YOUTUBE: "bg-red-500/20 text-red-400",
  OTHER: "bg-gray-700 text-gray-400",
};

export const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-pink-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-orange-500",
];

export function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

// Max upload size: 5 MB
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Roles that have admin-level access across the app — use this instead of inline arrays
export const ADMIN_ROLES = ["superadmin", "admin", "project_manager"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

// Permission system modules and actions — used in role management UI and API
export const MODULES = [
  "clients", "projects", "tasks", "team", "ads",
  "files", "reports", "roles", "settings", "sops",
] as const;

// read_own/read_all exist so a module can grant "see your own records" vs
// "see everything" separately — today only tasks uses that split (see
// src/lib/permissions.ts), other modules keep the coarser "read".
export const ACTIONS = ["create", "read", "read_own", "read_all", "update", "delete", "approve"] as const;

export type Module = (typeof MODULES)[number];
export type Action = (typeof ACTIONS)[number];
