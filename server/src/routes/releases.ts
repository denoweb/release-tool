import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import { getJiraConfig, searchIssues } from "../jira.js";
import type {
  CreateReleaseInput,
  Release,
  Task,
  UpdateReleaseInput,
} from "@release-tool/shared";

export const releasesRouter = Router();

function isValidDate(s: string) {
  return !Number.isNaN(Date.parse(s));
}

releasesRouter.get("/", (_req, res) => {
  const sorted = [...db.data.releases].sort((a, b) =>
    a.releaseDate.localeCompare(b.releaseDate),
  );
  res.json(sorted);
});

releasesRouter.post("/", async (req, res) => {
  const { name, releaseDate } = req.body as CreateReleaseInput;
  if (!name?.trim()) {
    return res.status(400).json({ error: "name je povinný" });
  }
  if (!releaseDate || !isValidDate(releaseDate)) {
    return res.status(400).json({ error: "releaseDate je neplatný" });
  }
  const exists = db.data.releases.some(
    (r) => r.name.toLowerCase() === name.trim().toLowerCase(),
  );
  if (exists) {
    return res.status(409).json({ error: "Release s tímto názvem už existuje" });
  }
  const release: Release = {
    id: nanoid(10),
    name: name.trim(),
    releaseDate,
    createdAt: new Date().toISOString(),
  };
  db.data.releases.push(release);
  await db.write();
  res.status(201).json(release);
});

releasesRouter.patch("/:id", async (req, res) => {
  const release = db.data.releases.find((r) => r.id === req.params.id);
  if (!release) return res.status(404).json({ error: "Release nenalezen" });

  const { name, releaseDate } = req.body as UpdateReleaseInput;
  if (name !== undefined) release.name = name.trim();
  if (releaseDate !== undefined) {
    if (!isValidDate(releaseDate)) {
      return res.status(400).json({ error: "releaseDate je neplatný" });
    }
    release.releaseDate = releaseDate;
  }
  await db.write();
  res.json(release);
});

releasesRouter.post("/:id/import-jira", async (req, res) => {
  const release = db.data.releases.find((r) => r.id === req.params.id);
  if (!release) return res.status(404).json({ error: "Release nenalezen" });

  const cfg = getJiraConfig();
  if (!cfg) {
    return res.status(503).json({
      error:
        "JIRA není nakonfigurovaná. Vyplň JIRA_BASE_URL, JIRA_EMAIL a JIRA_API_TOKEN v server/.env.",
    });
  }

  const { jql, fixVersion } = req.body as { jql?: string; fixVersion?: string };
  let effectiveJql = jql?.trim();
  if (!effectiveJql) {
    const v = (fixVersion ?? release.name).trim();
    if (!v) {
      return res
        .status(400)
        .json({ error: "Vyplň jql nebo fixVersion (default = název releasu)." });
    }
    // escape uvozovek
    const safe = v.replace(/"/g, '\\"');
    effectiveJql = `fixVersion = "${safe}"`;
  }

  let issues;
  try {
    issues = await searchIssues(cfg, effectiveJql);
  } catch (err) {
    return res.status(502).json({ error: (err as Error).message });
  }

  let created = 0;
  let updated = 0;
  const now = new Date().toISOString();

  for (const issue of issues) {
    const existing = db.data.tasks.find(
      (t) => t.taskNumber.toLowerCase() === issue.key.toLowerCase(),
    );
    if (existing) {
      // přiřadíme k tomuto releasu, zbytek nepřepisujeme
      if (existing.releaseId !== release.id) {
        existing.releaseId = release.id;
        existing.updatedAt = now;
        updated += 1;
      }
      continue;
    }
    const task: Task = {
      id: nanoid(10),
      taskNumber: issue.key,
      title: issue.summary,
      branch: "",
      status: issue.status,
      script: "",
      releaseId: release.id,
      deployments: [],
      createdAt: now,
      updatedAt: now,
    };
    db.data.tasks.push(task);
    created += 1;
  }

  await db.write();
  res.json({
    jql: effectiveJql,
    found: issues.length,
    created,
    updated,
    skipped: issues.length - created - updated,
  });
});

releasesRouter.delete("/:id", async (req, res) => {
  const idx = db.data.releases.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Release nenalezen" });

  const inUse = db.data.tasks.some((t) => t.releaseId === req.params.id);
  if (inUse) {
    return res
      .status(409)
      .json({ error: "Release má přiřazené tasky, nelze smazat" });
  }

  db.data.releases.splice(idx, 1);
  await db.write();
  res.status(204).end();
});
