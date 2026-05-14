import type {
  CreateReleaseInput,
  CreateTaskInput,
  Release,
  Service,
  Task,
  UpdateDeploymentInput,
  UpdateReleaseInput,
  UpdateTaskInput,
} from "@release-tool/shared";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  tasks: {
    list: () => request<Task[]>("/api/tasks"),
    get: (id: string) => request<Task>(`/api/tasks/${id}`),
    create: (input: CreateTaskInput) =>
      request<Task>("/api/tasks", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: UpdateTaskInput) =>
      request<Task>(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) =>
      request<void>(`/api/tasks/${id}`, { method: "DELETE" }),
    setDeployment: (id: string, serviceId: string, body: UpdateDeploymentInput) =>
      request<Task>(`/api/tasks/${id}/deployments/${serviceId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },
  services: {
    list: () => request<Service[]>("/api/services"),
    create: (name: string, repo?: string) =>
      request<Service>("/api/services", {
        method: "POST",
        body: JSON.stringify({ name, repo }),
      }),
    update: (id: string, body: { name?: string; repo?: string }) =>
      request<Service>(`/api/services/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      request<void>(`/api/services/${id}`, { method: "DELETE" }),
  },
  releases: {
    list: () => request<Release[]>("/api/releases"),
    create: (input: CreateReleaseInput) =>
      request<Release>("/api/releases", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, body: UpdateReleaseInput) =>
      request<Release>(`/api/releases/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: string, cascade = false) =>
      request<{ deletedTasks: number }>(
        `/api/releases/${id}${cascade ? "?cascade=true" : ""}`,
        { method: "DELETE" },
      ),
    importJira: (
      id: string,
      body: { jql?: string; fixVersion?: string },
    ) =>
      request<{
        jql: string;
        found: number;
        created: number;
        updated: number;
        skipped: number;
      }>(`/api/releases/${id}/import-jira`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
};
