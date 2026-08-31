// Shared test credentials/ids — kept in one place so global-setup.ts (which
// creates the fixtures) and the specs (which log in as them) can't drift.
export const ADMIN = { email: "admin@relytask.com", password: "Admin@123" };

export const STAFF = { email: "e2e.staff@relytask.com", password: "E2eStaff@123", name: "E2E Staff" };

export const CLIENT_A = {
  email: "e2e.clienta@relytask.com",
  password: "E2eClientA@123",
  name: "E2E Client A",
  companyName: "Acme Agency Client A",
};

export const CLIENT_B = {
  email: "e2e.clientb@relytask.com",
  password: "E2eClientB@123",
  name: "E2E Client B",
  companyName: "Acme Agency Client B",
};

// A task the RBAC suite creates that's owned entirely by admin (not STAFF) —
// used to prove a read_own-only role can't see other people's tasks.
export const ADMIN_ONLY_TASK_TITLE = "E2E RBAC — admin-only task, not owned by staff";

// Has ads:create/read/update but nothing else — proves ads:create is actually
// enforced (video_editor/STAFF has zero ads permissions and must be blocked).
export const ADS_MANAGER = { email: "e2e.adsmanager@relytask.com", password: "E2eAdsManager@123", name: "E2E Ads Manager" };

// A role holding only clients:create (no clients:read) — proves a superadmin's
// granular permission grant actually takes effect per-action, not per-role-name.
export const CUSTOM_CLIENTS_CREATOR_ROLE = "e2e_clients_creator_only";
export const CUSTOM_CLIENTS_CREATOR = {
  email: "e2e.clientscreator@relytask.com",
  password: "E2eClientsCreator@123",
  name: "E2E Clients Creator",
};
export const CUSTOM_ROLE_TEST_CLIENT_EMAIL = "e2e.permtest.client@relytask.com";

// Tied to CLIENT_B's project — used to prove the portal approve/revision
// endpoint enforces task status and the revision cap server-side, not just
// via the UI hiding the buttons.
export const NOT_AWAITING_APPROVAL_TASK_TITLE = "E2E — not yet awaiting client approval";
export const REVISION_LIMIT_REACHED_TASK_TITLE = "E2E — revision limit already reached";
