import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { STATUS_BADGE_CLASS } from "@/lib/status";
import { cn } from "@/lib/utils";
import { api } from "@/api";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type Release,
  type Service,
  type Task,
  type TaskStatus,
} from "@release-tool/shared";

type DeployEnv = "ci" | "stage" | "prod";

interface DeploymentBools {
  ci: boolean;
  stage: boolean;
  prod: boolean;
}

interface FormState {
  taskNumber: string;
  title: string;
  branch: string;
  status: TaskStatus;
  script: string;
  releaseId: string;
  serviceIds: string[];
  deployments: Record<string, DeploymentBools>;
}

function initialForm(task: Task): FormState {
  return {
    taskNumber: task.taskNumber,
    title: task.title,
    branch: task.branch,
    status: task.status,
    script: task.script,
    releaseId: task.releaseId ?? "",
    serviceIds: task.deployments.map((d) => d.serviceId),
    deployments: Object.fromEntries(
      task.deployments.map((d) => [
        d.serviceId,
        { ci: !!d.ci, stage: !!d.stage, prod: !!d.prod },
      ]),
    ),
  };
}

function setEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((x) => set.has(x));
}

function deploymentsDiffer(form: FormState, task: Task): boolean {
  for (const sid of form.serviceIds) {
    const local = form.deployments[sid];
    if (!local) return true;
    const remote = task.deployments.find((d) => d.serviceId === sid);
    if (!remote) return true; // newly added service
    if (
      local.ci !== !!remote.ci ||
      local.stage !== !!remote.stage ||
      local.prod !== !!remote.prod
    ) {
      return true;
    }
  }
  return false;
}

export function TaskEditDialog({
  taskId,
  services,
  releases,
  onClose,
  onSaved,
  onDeleted,
}: {
  taskId: string | null;
  services: Service[];
  releases: Release[];
  onClose: () => void;
  onSaved: (task: Task) => void;
  onDeleted: (id: string) => void;
}) {
  const open = taskId !== null;
  const [task, setTask] = useState<Task | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setForm(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    api.tasks
      .get(taskId)
      .then((t) => {
        setTask(t);
        setForm(initialForm(t));
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [taskId]);

  const dirty =
    !!task &&
    !!form &&
    (form.taskNumber !== task.taskNumber ||
      form.title !== task.title ||
      form.branch !== task.branch ||
      form.status !== task.status ||
      form.script !== task.script ||
      form.releaseId !== (task.releaseId ?? "") ||
      !setEqual(
        form.serviceIds,
        task.deployments.map((d) => d.serviceId),
      ) ||
      deploymentsDiffer(form, task));

  function toggleService(serviceId: string) {
    setForm((f) => {
      if (!f) return f;
      const has = f.serviceIds.includes(serviceId);
      if (has) {
        const { [serviceId]: _removed, ...rest } = f.deployments;
        return {
          ...f,
          serviceIds: f.serviceIds.filter((id) => id !== serviceId),
          deployments: rest,
        };
      }
      return {
        ...f,
        serviceIds: [...f.serviceIds, serviceId],
        deployments: {
          ...f.deployments,
          [serviceId]: { ci: false, stage: false, prod: false },
        },
      };
    });
  }

  function toggleDeployment(serviceId: string, env: DeployEnv) {
    setForm((f) => {
      if (!f) return f;
      const dep = f.deployments[serviceId];
      if (!dep) return f;
      return {
        ...f,
        deployments: {
          ...f.deployments,
          [serviceId]: { ...dep, [env]: !dep[env] },
        },
      };
    });
  }

  async function handleSave() {
    if (!task || !form) return;
    if (!form.taskNumber.trim()) {
      setError("Číslo tasku je povinné");
      return;
    }
    if (!form.title.trim()) {
      setError("Název je povinný");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // 1. Save metadata + serviceIds — backend reconciles deployment rows
      let current = await api.tasks.update(task.id, {
        taskNumber: form.taskNumber,
        title: form.title,
        branch: form.branch,
        status: form.status,
        script: form.script,
        releaseId: form.releaseId || null,
        serviceIds: form.serviceIds,
      });

      // 2. For each service, sync any per-env deployment toggle that changed
      for (const sid of form.serviceIds) {
        const local = form.deployments[sid];
        if (!local) continue;
        const remote = current.deployments.find((d) => d.serviceId === sid);
        if (!remote) continue;
        const envs: DeployEnv[] = ["ci", "stage", "prod"];
        for (const env of envs) {
          const remoteBool = !!remote[env];
          if (local[env] !== remoteBool) {
            current = await api.tasks.setDeployment(task.id, sid, {
              env,
              deployed: local[env],
            });
          }
        }
      }

      onSaved(current);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    if (!confirm(`Smazat task "${task.title}"?`)) return;
    try {
      await api.tasks.remove(task.id);
      onDeleted(task.id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handleClose() {
    if (dirty && !confirm("Máš neuložené změny. Opravdu zavřít?")) return;
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogHeader onClose={handleClose}>
        <h2 className="font-semibold">
          Úprava tasku
          {task && (
            <span className="font-normal text-xs text-muted-foreground ml-2">
              (vytvořeno{" "}
              {new Date(task.createdAt).toLocaleString("cs-CZ")} · změněno{" "}
              {new Date(task.updatedAt).toLocaleString("cs-CZ")})
            </span>
          )}
        </h2>
      </DialogHeader>

      <DialogBody>
        {loading || !form || !task ? (
          <p className="text-muted-foreground">Načítám…</p>
        ) : (
          <div className="flex flex-col gap-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
                {error}
              </p>
            )}

            <div className="grid grid-cols-[160px_1fr] gap-4">
              <div className="flex flex-col gap-2">
                <Label>Číslo tasku *</Label>
                <Input
                  value={form.taskNumber}
                  onChange={(e) =>
                    setForm({ ...form, taskNumber: e.target.value })
                  }
                  placeholder="např. PROJ-123"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Název *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Release</Label>
                <Select
                  value={form.releaseId}
                  onChange={(e) =>
                    setForm({ ...form, releaseId: e.target.value })
                  }
                >
                  <option value="">— bez releasu —</option>
                  {releases.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Stav</Label>
                <div className="flex h-9 items-center gap-1 rounded-md border-2 border-border p-0.5">
                  {TASK_STATUSES.map((s) => {
                    const active = form.status === s;
                    return (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setForm({ ...form, status: s })}
                        className={cn(
                          "flex-1 inline-flex items-center justify-center rounded px-2 h-full text-xs font-medium transition",
                          active
                            ? STATUS_BADGE_CLASS[s]
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {TASK_STATUS_LABELS[s]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Branch</Label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 h-9 px-3 rounded-md border-2 border-border cursor-pointer shrink-0 select-none">
                    <Checkbox
                      checked={form.branch === "master"}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          branch: e.target.checked ? "master" : "",
                        })
                      }
                    />
                    <span className="text-sm">master</span>
                  </label>
                  <Input
                    value={form.branch === "master" ? "" : form.branch}
                    onChange={(e) =>
                      setForm({ ...form, branch: e.target.value })
                    }
                    disabled={form.branch === "master"}
                    placeholder="feature/…"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Skript</Label>
              <Textarea
                rows={5}
                value={form.script}
                onChange={(e) => setForm({ ...form, script: e.target.value })}
                placeholder="Skript / poznámky k nasazení…"
                className="font-mono text-xs"
              />
            </div>

            <div className="flex flex-col gap-2 mt-2">
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Žádné služby v číselníku.
                </p>
              ) : (
                <div className="border-2 border-border rounded-md overflow-hidden">
                  <table className="w-full text-sm table-fixed">
                    <thead>
                      <tr className="border-b-2 border-border text-muted-foreground text-left">
                        <th className="px-4 py-2 font-medium">Služba</th>
                        <th className="px-4 py-2 font-medium w-20 text-center">
                          CI
                        </th>
                        <th className="px-4 py-2 font-medium w-20 text-center">
                          Stage
                        </th>
                        <th className="px-4 py-2 font-medium w-20 text-center">
                          Prod
                        </th>
                        <th className="px-4 py-2 font-medium w-28"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((service) => {
                        const assigned = form.serviceIds.includes(service.id);
                        const dep = form.deployments[service.id];
                        return (
                          <tr
                            key={service.id}
                            className="border-b border-border/40 last:border-0"
                          >
                            <td className="px-4 py-2 min-w-0">
                              <div
                                className="font-medium truncate"
                                title={service.name}
                              >
                                {service.name}
                              </div>
                              {service.repo && (
                                <div
                                  className="text-xs text-muted-foreground truncate"
                                  title={service.repo}
                                >
                                  {service.repo}
                                </div>
                              )}
                            </td>
                            {(["ci", "stage", "prod"] as const).map((env) => (
                              <td key={env} className="text-center">
                                <Checkbox
                                  disabled={!assigned}
                                  checked={!!dep?.[env]}
                                  onChange={() =>
                                    toggleDeployment(service.id, env)
                                  }
                                />
                              </td>
                            ))}
                            <td className="text-right pr-4 py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleService(service.id)}
                              >
                                {assigned ? "Odebrat" : "Přidat"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}
      </DialogBody>

      <DialogFooter>
        {task && (
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            Smazat
          </Button>
        )}
        <div className="flex-1 flex items-center">
          {dirty && (
            <span className="text-xs text-amber-500 ml-3">
              Neuložené změny
            </span>
          )}
        </div>
        <Button variant="outline" onClick={handleClose}>
          Zrušit
        </Button>
        <Button onClick={handleSave} disabled={!task || saving || !dirty}>
          {saving ? "Ukládám…" : "Uložit"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
