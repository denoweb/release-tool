import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import type {
  CreateTaskInput,
  DeploymentEnv,
  Task,
  UpdateDeploymentInput,
  UpdateTaskInput,
} from "@release-tool/shared";

export const tasksRouter = Router();

function buildDeployments(serviceIds: string[] = []) {
  return serviceIds.map((serviceId) => ({
    serviceId,
    ci: null,
    stage: null,
    prod: null,
  }));
}

tasksRouter.get("/", (_req, res) => {
  res.json(db.data.tasks);
});

tasksRouter.get("/:id", (req, res) => {
  const task = db.data.tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task nenalezen" });
  res.json(task);
});

function releaseExists(id: string | null | undefined): boolean {
  if (!id) return true;
  return db.data.releases.some((r) => r.id === id);
}

tasksRouter.post("/", async (req, res) => {
  const input = req.body as CreateTaskInput;
  if (!input.taskNumber?.trim()) {
    return res.status(400).json({ error: "taskNumber je povinný" });
  }
  if (!input.title?.trim()) {
    return res.status(400).json({ error: "title je povinný" });
  }
  if (input.releaseId !== undefined && !releaseExists(input.releaseId)) {
    return res.status(400).json({ error: "Release neexistuje" });
  }
  const now = new Date().toISOString();
  const task: Task = {
    id: nanoid(10),
    taskNumber: input.taskNumber?.trim() ?? "",
    title: input.title.trim(),
    branch: input.branch ?? "",
    status: input.status ?? "zadano",
    script: "",
    note: "",
    releaseId: input.releaseId ?? null,
    deployments: buildDeployments(input.serviceIds),
    createdAt: now,
    updatedAt: now,
  };
  db.data.tasks.push(task);
  await db.write();
  res.status(201).json(task);
});

tasksRouter.patch("/:id", async (req, res) => {
  const task = db.data.tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task nenalezen" });

  const input = req.body as UpdateTaskInput;

  if (input.title !== undefined) {
    if (!input.title.trim()) {
      return res.status(400).json({ error: "title je povinný" });
    }
    task.title = input.title;
  }
  if (input.taskNumber !== undefined) {
    if (!input.taskNumber.trim()) {
      return res.status(400).json({ error: "taskNumber je povinný" });
    }
    task.taskNumber = input.taskNumber;
  }
  if (input.branch !== undefined) task.branch = input.branch;
  if (input.status !== undefined) task.status = input.status;
  if (input.script !== undefined) task.script = input.script;
  if (input.note !== undefined) task.note = input.note;
  if (input.releaseId !== undefined) {
    if (!releaseExists(input.releaseId)) {
      return res.status(400).json({ error: "Release neexistuje" });
    }
    task.releaseId = input.releaseId;
  }

  if (input.serviceIds) {
    const existing = new Map(task.deployments.map((d) => [d.serviceId, d]));
    task.deployments = input.serviceIds.map(
      (id) =>
        existing.get(id) ?? {
          serviceId: id,
          ci: null,
          stage: null,
          prod: null,
        },
    );
  }

  task.updatedAt = new Date().toISOString();
  await db.write();
  res.json(task);
});

tasksRouter.delete("/:id", async (req, res) => {
  const idx = db.data.tasks.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Task nenalezen" });
  db.data.tasks.splice(idx, 1);
  await db.write();
  res.status(204).end();
});

tasksRouter.patch("/:id/deployments/:serviceId", async (req, res) => {
  const task = db.data.tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task nenalezen" });

  const deployment = task.deployments.find(
    (d) => d.serviceId === req.params.serviceId,
  );
  if (!deployment)
    return res.status(404).json({ error: "Služba není přiřazená k tasku" });

  const { env, deployed } = req.body as UpdateDeploymentInput;
  const validEnvs: DeploymentEnv[] = ["ci", "stage", "prod"];
  if (!validEnvs.includes(env)) {
    return res.status(400).json({ error: "Neplatné prostředí" });
  }

  deployment[env] = deployed ? new Date().toISOString() : null;
  task.updatedAt = new Date().toISOString();
  await db.write();
  res.json(task);
});
