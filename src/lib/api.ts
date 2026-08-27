const TOKEN_COOKIE = "im_token";

export function saveToken(token: string) {
  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function clearToken() {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(body));
  }

  const text = await res.text();
  return text ? JSON.parse(text) : (null as T);
}

function extractErrorMessage(body: any): string {
    if (Array.isArray(body?.issues) && body.issues.length > 0 && body.issues[0]?.message) {
    return String(body.issues[0].message);
  }
  if (!body || !body.error) return "Request failed";
  if (typeof body.error === "string") return body.error;

  // Zod's .flatten() shape: { fieldErrors: Record<string, string[]>, formErrors: string[] }
  const fieldMessages = Object.values(body.error.fieldErrors ?? {}).flat();
  if (fieldMessages.length > 0) return String(fieldMessages[0]);

  const formMessages = body.error.formErrors ?? [];
  if (formMessages.length > 0) return String(formMessages[0]);

  return "Request failed";
}

// ---- Types ----
export type User = {
  id: string;
  name: string;
  email: string;
  role: "MENTOR" | "INTERN";
  createdAt: string;
};

export type Cohort = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
};

// ---- Auth endpoints ----
export function login(email: string, password: string) {
  return request<{ token: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(name: string, email: string, password: string) {
  return request<{ user: User }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function getMe() {
  return request<{ user: User }>("/auth/me");
}

export function forgotPassword(email: string) {
  return request<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, password: string) {
  return request<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export function requestMagicLink(email: string) {
  return request<{ message: string }>("/auth/magic-link/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function verifyMagicLink(token: string) {
  return request<{ token: string; user: User }>("/auth/magic-link/verify", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

// ---- Cohort endpoints ----
export function getCohorts() {
  return request<Cohort[]>("/cohorts");
}

export function createCohort(input: { name: string; startDate: string; endDate: string }) {
  return request<Cohort>("/cohorts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type Membership = {
  id: string;
  userId: string;
  cohortId: string;
  isActive: boolean;
  joinedAt: string;
  user: { id: string; name: string; email: string };
};

export type Intern = {
  id: string;
  name: string;
  email: string;
};

export function getInterns() {
  return request<Intern[]>("/interns");
}

export function getCohortMembers(cohortId: string) {
  return request<Membership[]>(`/cohorts/${cohortId}/members`);
}

export function addCohortMember(cohortId: string, email: string) {
  return request<Membership>(`/cohorts/${cohortId}/members`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// Removes an intern from a cohort (soft — Membership.isActive: false, all
// their history is kept). Re-adding them later via addCohortMember
// reactivates this same membership.
export function removeCohortMember(cohortId: string, membershipId: string) {
  return request<Membership>(`/cohorts/${cohortId}/members/${membershipId}`, {
    method: "DELETE",
  });
}


export type TaskState = "DRAFT" | "PUBLISHED";

export type Task = {
  id: string;
  cohortId: string;
  title: string;
  description: string;
  state: TaskState;
  startDate: string;
  endDate: string;
  createdAt: string;
};

export function getTasks(cohortId?: string) {
  const query = cohortId ? `?cohortId=${cohortId}` : "";
  return request<Task[]>(`/tasks${query}`);
}

export function createTask(input: {
  cohortId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
}) {
  return request<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function publishTask(taskId: string) {
  return request<Task>(`/tasks/${taskId}/publish`, { method: "POST" });
}

export function updateTask(
  taskId: string,
  input: Partial<{ title: string; description: string; startDate: string; endDate: string }>
) {
  return request<Task>(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteTask(taskId: string) {
  return request<{ success: boolean }>(`/tasks/${taskId}`, { method: "DELETE" });
}


export type TaskAssignmentRow = {
  assignmentId: string;
  membershipId: string;
  status: AssignmentStatus;
  intern: { id: string; name: string; email: string };
  submittedAt: string | null;
};

export function getTaskAssignments(taskId: string) {
  return request<TaskAssignmentRow[]>(`/tasks/${taskId}/assignments`);
}

// Assigns this task to one intern directly (independent of publish-time
// bulk assignment or the cohort-membership backfill).
export function assignTaskToMember(taskId: string, membershipId: string) {
  return request<unknown>(`/tasks/${taskId}/assignments`, {
    method: "POST",
    body: JSON.stringify({ membershipId }),
  });
}

// Unassigns one intern from this task — hard delete, takes their
// submissions/activity on this task with it (see the route's comment).
export function removeTaskAssignment(taskId: string, membershipId: string) {
  return request<{ success: boolean }>(`/tasks/${taskId}/assignments/${membershipId}`, {
    method: "DELETE",
  });
}



// ---- Assignment endpoints ----
export type AssignmentStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "SUBMITTED"
  | "COMPLETED";

export type Assignment = {
  id: string;
  membershipId: string;
  taskId: string;
  status: AssignmentStatus;
  assignedAt: string;
  task: {
    title: string;
    description: string;
    startDate: string | null;
    endDate: string | null;
  };
};

export function getAssignments(membershipId: string) {
  return request<Assignment[]>(`/assignment?membershipId=${membershipId}`);
}

// ---- Submission endpoints ----
export type Submission = {
  id: string;
  assignmentId: string;
  content: string | null;
  links: string[];
  submittedAt: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  attachments?: Attachment[];
};

export function getSubmissions(assignmentId: string) {
  return request<Submission[]>(`/assignment/${assignmentId}/submissions`);
}

export function reviewSubmission(
  submissionId: string,
  input: { decision: "APPROVE" | "REJECT"; reviewNote?: string }
) {
  return request<Submission>(`/submissions/${submissionId}/review`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// ---- Feedback endpoints ----
export type Feedback = {
  id: string;
  membershipId: string;
  weekNumber: number;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
};

export function giveFeedback(input: {
  membershipId: string;
  weekNumber: number;
  rating: number;
  comment: string;
}) {
  return request<Feedback>("/feedback", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getFeedback(membershipId: string) {
  return request<Feedback[]>(`/feedback?membershipId=${membershipId}`);
}

// ---- Attendance endpoints ----
export type AttendanceType =
  | "CHECK_IN"
  | "CHECK_OUT"
  | "LUNCH_START"
  | "LUNCH_END"
  | "AFK_START"
  | "AFK_END"
  | "RELAX_START"
  | "RELAX_END";

export type Attendance = {
  id: string;
  membershipId: string;
  type: AttendanceType;
  occurredAt: string;
  note: string | null;
};

export function getAttendance(membershipId: string) {
  return request<Attendance[]>(`/attendance?membershipId=${membershipId}`);
}

// ---- Task activity endpoints ----
export type Activity = {
  id: string;
  assignmentId: string;
  authorId: string;
  content: string;
  links: string[];
  createdAt: string;
  author: { id: string; name: string; role: "MENTOR" | "INTERN" };
};

export function getActivity(assignmentId: string) {
  return request<Activity[]>(`/assignment/${assignmentId}/activity`);
}

export function postActivity(assignmentId: string, input: { content: string; links?: string[] }) {
  return request<unknown>(`/assignment/${assignmentId}/activity`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}


// ---- Cohort progress endpoint ----
export type MemberProgress = {
  membershipId: string;
  user: { id: string; name: string; email: string };
  isActive: boolean;
  taskCompletion: { total: number; completed: number; percent: number };
  linkedInWeeksLogged: number;
  latestRating: { weekNumber: number; rating: number } | null;
  ratingHistory: { weekNumber: number; rating: number }[];
};

export function getCohortProgress(cohortId: string) {
  return request<MemberProgress[]>(`/cohorts/${cohortId}/progress`);
}


// ---- Dashboard endpoints ----
export type DashboardCohortProgress = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  internsCount: number;
  taskCompletionPercent: number;
  linkedInCompletionPercent: number;
  status: "Active" | "Archived";
};

export type DashboardSummary = {
  activeInterns: number;
  tasksPublishedThisWeek: number;
  avgRating: number | null;
  linkedInPostsThisWeek: number;
  cohorts: DashboardCohortProgress[];
};

export function getDashboardSummary() {
  return request<DashboardSummary>("/dashboard/summary");
}

export type PendingReview = {
  assignmentId: string;
  submittedAt: string;
  task: { id: string; title: string };
  cohort: { id: string; name: string };
  membershipId: string;
  intern: { id: string; name: string };
};

export function getDashboardPendingReviews() {
  return request<{ count: number; items: PendingReview[] }>("/dashboard/pending-reviews");
}
// ---- LinkedIn post endpoints ----
export type LinkedInPost = {
  id: string;
  membershipId: string;
  weekNumber: number;
  url: string;
  loggedAt: string;
};

export function getLinkedInPosts(membershipId: string) {
  return request<LinkedInPost[]>(`/linkedIn-posts?membershipId=${membershipId}`);
}

export function logLinkedInPost(input: { membershipId: string; weekNumber: number; url: string }) {
  return request<LinkedInPost>("/linkedIn-posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}


export type MyMembership = {
  id: string;
  userId: string;
  cohortId: string;
  isActive: boolean;
  joinedAt: string;
  cohort: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
};

export function getMyMemberships() {
  return request<MyMembership[]>("/me/memberships");
}
export function logAttendance(input: { membershipId: string; type: AttendanceType; note?: string }) {
  return request<Attendance>("/attendance", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function createSubmission(assignmentId: string, input: { content?: string; links?: string[] }) {
  return request<Submission>(`/assignment/${assignmentId}/submissions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAssignmentStatus(assignmentId: string, status: "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED") {
  return request<unknown>(`/assignment/${assignmentId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function generateTaskDraft(topic: string) {
  return request<{ title: string; description: string }>("/tasks/draft", {
    method: "POST",
    body: JSON.stringify({ topic }),
  });
}

export type Attachment = {
  id: string;
  submissionId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
};

export function getAttachments(submissionId: string) {
  return request<Attachment[]>(`/submissions/${submissionId}/attachments`);
}

export async function uploadAttachment(submissionId: string, file: globalThis.File): Promise<Attachment> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`/api/submissions/${submissionId}/attachments`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(body));
  }

  return res.json();
} 

// ---- Weekly insight endpoint ----
export type WeeklyInsight = {
  hasActivity: boolean;
  summary: string;
  stats: {
    tasksAssigned: number;
    tasksCompleted: number;
    tasksBlocked: number;
    checkinNotes: number;
  };
};

export function getWeeklyInsight(membershipId: string, weekNumber: number) {
  return request<WeeklyInsight>(`/insights/weekly?membershipId=${membershipId}&weekNumber=${weekNumber}`);
}