export const TASK_STATUSES = ["zadano", "v_reseni", "hotovo"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  zadano: "Zadáno",
  v_reseni: "V řešení",
  hotovo: "Hotovo",
};

export interface Service {
  id: string;
  name: string;
  repo?: string;
  createdAt: string;
}

export interface Release {
  id: string;
  name: string;
  releaseDate: string;
  createdAt: string;
}

export interface DeploymentState {
  serviceId: string;
  ci: string | null;
  stage: string | null;
  prod: string | null;
}

export interface Task {
  id: string;
  taskNumber: string;
  title: string;
  branch: string;
  status: TaskStatus;
  script: string;
  note: string;
  releaseId: string | null;
  deployments: DeploymentState[];
  createdAt: string;
  updatedAt: string;
}

export interface DbSchema {
  tasks: Task[];
  services: Service[];
  releases: Release[];
}

export type CreateTaskInput = Pick<Task, "title"> &
  Partial<
    Pick<Task, "taskNumber" | "branch" | "status" | "releaseId">
  > & {
    serviceIds?: string[];
  };

export type UpdateTaskInput = Partial<
  Pick<
    Task,
    "taskNumber" | "title" | "branch" | "status" | "script" | "note" | "releaseId"
  >
> & {
  serviceIds?: string[];
};

export interface CreateReleaseInput {
  name: string;
  releaseDate: string;
}

export type UpdateReleaseInput = Partial<CreateReleaseInput>;

export type DeploymentEnv = "ci" | "stage" | "prod";

export interface UpdateDeploymentInput {
  env: DeploymentEnv;
  deployed: boolean;
}
