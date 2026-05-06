import { JSONFilePreset } from "lowdb/node";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { DbSchema } from "@release-tool/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "..", "data");
const dbFile = path.join(dataDir, "db.json");

fs.mkdirSync(dataDir, { recursive: true });

const defaultData: DbSchema = { tasks: [], services: [], releases: [] };

export const db = await JSONFilePreset<DbSchema>(dbFile, defaultData);

let migrated = false;
if (!db.data.releases) {
  db.data.releases = [];
  migrated = true;
}
for (const task of db.data.tasks as Array<
  DbSchema["tasks"][number] & { description?: string; assignee?: string }
>) {
  if (task.releaseId === undefined) {
    task.releaseId = null;
    migrated = true;
  }
  if (task.taskNumber === undefined) {
    task.taskNumber = "";
    migrated = true;
  }
  if (task.script === undefined) {
    task.script = "";
    migrated = true;
  }
  if ("description" in task) {
    delete task.description;
    migrated = true;
  }
  if ("assignee" in task) {
    delete task.assignee;
    migrated = true;
  }
  // map removed statuses to v_reseni / hotovo
  const legacyStatusMap: Record<string, "v_reseni" | "hotovo"> = {
    nasazeno_ci: "v_reseni",
    nasazeno_stage: "v_reseni",
    nasazeno_prod: "hotovo",
  };
  if (task.status in legacyStatusMap) {
    task.status = legacyStatusMap[task.status as string];
    migrated = true;
  }
}
if (migrated) await db.write();
