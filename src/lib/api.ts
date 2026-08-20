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

export function getMe() {
  return request<{ user: User }>("/auth/me");
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
    startDate: string;
    endDate: string;
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