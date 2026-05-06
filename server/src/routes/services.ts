import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import type { Service } from "@release-tool/shared";

export const servicesRouter = Router();

servicesRouter.get("/", (_req, res) => {
  res.json(db.data.services);
});

servicesRouter.post("/", async (req, res) => {
  const { name, repo } = req.body as { name?: string; repo?: string };
  if (!name?.trim()) {
    return res.status(400).json({ error: "name je povinný" });
  }
  const exists = db.data.services.some(
    (s) => s.name.toLowerCase() === name.trim().toLowerCase(),
  );
  if (exists) {
    return res.status(409).json({ error: "Služba s tímto názvem už existuje" });
  }
  const service: Service = {
    id: nanoid(10),
    name: name.trim(),
    repo: repo?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  db.data.services.push(service);
  await db.write();
  res.status(201).json(service);
});

servicesRouter.patch("/:id", async (req, res) => {
  const service = db.data.services.find((s) => s.id === req.params.id);
  if (!service) return res.status(404).json({ error: "Služba nenalezena" });

  const { name, repo } = req.body as { name?: string; repo?: string };
  if (name !== undefined) service.name = name.trim();
  if (repo !== undefined) service.repo = repo.trim() || undefined;
  await db.write();
  res.json(service);
});

servicesRouter.delete("/:id", async (req, res) => {
  const idx = db.data.services.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Služba nenalezena" });

  const inUse = db.data.tasks.some((t) =>
    t.deployments.some((d) => d.serviceId === req.params.id),
  );
  if (inUse) {
    return res
      .status(409)
      .json({ error: "Služba je použita u některého tasku, nelze smazat" });
  }

  db.data.services.splice(idx, 1);
  await db.write();
  res.status(204).end();
});
