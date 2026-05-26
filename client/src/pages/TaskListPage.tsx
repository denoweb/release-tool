import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  GitBranch,
  ListTodo,
  Wrench,
  Rocket,
  Layers,
  Check,
  Download,
  ExternalLink,
  Boxes,
  Copy,
  Pencil,
  StickyNote,
} from "lucide-react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogHeader,
} from "@/components/ui/dialog";
import { StatCard } from "@/components/StatCard";
import { TaskEditDialog } from "@/components/TaskEditDialog";
import { TaskCreateDialog } from "@/components/TaskCreateDialog";
import { ImportJiraDialog } from "@/components/ImportJiraDialog";
import { cn } from "@/lib/utils";
import { STATUS_BADGE_CLASS } from "@/lib/status";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type Release,
  type Service,
  type Task,
  type TaskStatus,
} from "@release-tool/shared";

type ReleaseSelection = "all" | "none" | string;

export function TaskListPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [releaseSel, setReleaseSel] = useState<ReleaseSelection>("all");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [servicesTask, setServicesTask] = useState<Task | null>(null);
  const [importingRelease, setImportingRelease] = useState<Release | null>(
    null,
  );
  const [overviewOpen, setOverviewOpen] = useState(false);

  useEffect(() => {
    Promise.all([api.tasks.list(), api.services.list(), api.releases.list()])
      .then(([t, s, r]) => {
        setTasks(t);
        setServices(s);
        setReleases(r);
        // Při prvním načtení vyber nejnovější release (server vrací desc).
        if (r.length > 0) setReleaseSel(r[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const serviceById = useMemo(
    () => new Map(services.map((s) => [s.id, s])),
    [services],
  );

  const countsByRelease = useMemo(() => {
    const m = new Map<string, number>();
    let none = 0;
    for (const t of tasks) {
      if (!t.releaseId) {
        none += 1;
      } else {
        m.set(t.releaseId, (m.get(t.releaseId) ?? 0) + 1);
      }
    }
    return { byId: m, none };
  }, [tasks]);

  const tasksInRelease = useMemo(() => {
    if (releaseSel === "all") return tasks;
    if (releaseSel === "none") return tasks.filter((t) => !t.releaseId);
    return tasks.filter((t) => t.releaseId === releaseSel);
  }, [tasks, releaseSel]);

  const stats = useMemo(() => {
    const src = tasksInRelease;
    return {
      total: src.length,
      zadano: src.filter((t) => t.status === "zadano").length,
      vReseni: src.filter((t) => t.status === "v_reseni").length,
      hotovo: src.filter((t) => t.status === "hotovo").length,
      onCi: src.filter(
        (t) => t.deployments.length > 0 && t.deployments.every((d) => d.ci),
      ).length,
      onStage: src.filter(
        (t) => t.deployments.length > 0 && t.deployments.every((d) => d.stage),
      ).length,
      onProd: src.filter(
        (t) => t.deployments.length > 0 && t.deployments.every((d) => d.prod),
      ).length,
    };
  }, [tasksInRelease]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks
      .filter((t) => statusFilter === "all" || t.status === statusFilter)
      .filter((t) => {
        if (releaseSel === "all") return true;
        if (releaseSel === "none") return !t.releaseId;
        return t.releaseId === releaseSel;
      })
      .filter(
        (t) =>
          q === "" ||
          t.title.toLowerCase().includes(q) ||
          t.branch.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const order =
          TASK_STATUSES.indexOf(a.status) - TASK_STATUSES.indexOf(b.status);
        if (order !== 0) return order;
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
  }, [tasks, search, statusFilter, releaseSel]);

  const servicesOverview = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; repo?: string; total: number; ci: number; stage: number; prod: number }
    >();
    for (const t of filtered) {
      for (const d of t.deployments) {
        const s = serviceById.get(d.serviceId);
        if (!s) continue;
        const entry =
          map.get(s.id) ??
          {
            id: s.id,
            name: s.name,
            repo: s.repo,
            total: 0,
            ci: 0,
            stage: 0,
            prod: 0,
          };
        entry.total += 1;
        if (d.ci) entry.ci += 1;
        if (d.stage) entry.stage += 1;
        if (d.prod) entry.prod += 1;
        map.set(s.id, entry);
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered, serviceById]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <ReleaseTabs
          releases={releases}
          counts={countsByRelease}
          totalCount={tasks.length}
          selected={releaseSel}
          onSelect={setReleaseSel}
        />

        <div className="flex flex-col gap-6 min-w-0">
          <div className="flex gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-w-0">
              <StatCard
                label="Celkem tasků"
                value={stats.total}
                icon={ListTodo}
                accent="orange"
              />

              <div className="rounded-md bg-card p-4 shadow-md border-2 border-border">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Stavy{" "}
                      <span className="opacity-70">
                        — zadáno / v řešení / hotovo
                      </span>
                    </p>
                    <p className="text-2xl font-semibold mt-0.5 tabular-nums">
                      <span className="text-slate-500">{stats.zadano}</span>
                      <span className="text-muted-foreground mx-1.5">/</span>
                      <span className="text-amber-500">{stats.vReseni}</span>
                      <span className="text-muted-foreground mx-1.5">/</span>
                      <span className="text-green-600">{stats.hotovo}</span>
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
                    <Wrench className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="rounded-md bg-card p-4 shadow-md border-2 border-border">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Nasazení{" "}
                      <span className="opacity-70">— CI / stage / prod</span>
                    </p>
                    <p className="text-2xl font-semibold mt-0.5 tabular-nums">
                      <span className="text-blue-500">{stats.onCi}</span>
                      <span className="text-muted-foreground mx-1.5">/</span>
                      <span className="text-violet-500">{stats.onStage}</span>
                      <span className="text-muted-foreground mx-1.5">/</span>
                      <span className="text-emerald-500">{stats.onProd}</span>
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                    <Rocket className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCreatingOpen(true)}
              className="self-stretch shrink-0 w-24 rounded-md bg-primary text-primary-foreground shadow-md border-2 border-border hover:bg-primary/90 transition flex items-center justify-center"
              aria-label="Nový task"
              title="Nový task"
            >
              <Plus className="h-10 w-10 stroke-[2.5]" />
            </button>

            {(() => {
              const selectedRelease =
                releaseSel !== "all" && releaseSel !== "none"
                  ? (releases.find((r) => r.id === releaseSel) ?? null)
                  : null;
              const enabled = !!selectedRelease;
              return (
                <>
                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={() => setImportingRelease(selectedRelease)}
                    className="self-stretch shrink-0 w-24 rounded-md bg-indigo-600 text-white shadow-md border-2 border-border hover:bg-indigo-500 transition flex flex-col items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
                    aria-label="Import z JIRA"
                    title={
                      enabled
                        ? `Import z JIRA pro release ${selectedRelease.name}`
                        : "Vyber konkrétní release v levém sloupci"
                    }
                  >
                    <Download className="h-6 w-6" />
                    <span className="text-[11px] font-medium">JIRA</span>
                  </button>

                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={() => setOverviewOpen(true)}
                    className="self-stretch shrink-0 w-24 rounded-md bg-violet-600 text-white shadow-md border-2 border-border hover:bg-violet-500 transition flex flex-col items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-violet-600"
                    aria-label="Přehled služeb"
                    title={
                      enabled
                        ? `Přehled služeb pro release ${selectedRelease.name}`
                        : "Vyber konkrétní release v levém sloupci"
                    }
                  >
                    <Boxes className="h-6 w-6" />
                    <span className="text-[11px] font-medium">Služby</span>
                  </button>
                </>
              );
            })()}
          </div>

          <div className="bg-card rounded-md border-2 border-border shadow-md min-w-0">
          <div className="flex flex-wrap gap-2 p-5 border-b-2 border-border">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat (název, branch)…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex h-9 items-center gap-1 rounded-md border-2 border-border p-0.5">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "inline-flex items-center justify-center rounded px-3 h-full text-xs font-medium transition",
                  statusFilter === "all"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                Vše
              </button>
              {TASK_STATUSES.map((s) => {
                const active = statusFilter === s;
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "inline-flex items-center justify-center rounded px-3 h-full text-xs font-medium transition",
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

          {loading ? (
            <p className="p-8 text-center text-muted-foreground">Načítám…</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">
              Žádné tasky.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/40">
                    <th className="px-5 py-2 font-medium w-40">Číslo</th>
                    <th className="px-5 py-2 font-medium min-w-[480px]">
                      Název
                    </th>
                    <th className="px-5 py-2 font-medium w-32">Branch</th>
                    <th className="px-5 py-2 font-medium w-20 text-center">
                      Služby
                    </th>
                    <th className="px-2 py-2 font-medium w-14 text-center">
                      Script
                    </th>
                    <th className="px-2 py-2 font-medium w-14 text-center">
                      Pozn.
                    </th>
                    <th className="px-5 py-2 font-medium w-[104px] text-center">
                      Stav
                    </th>
                    <th className="px-1 py-2 font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((task) => {
                    const total = task.deployments.filter(
                      (d) => d.ci || d.stage || d.prod,
                    ).length;
                    return (
                      <tr
                        key={task.id}
                        className="border-b border-border/40 last:border-0 odd:bg-muted/30 hover:bg-muted/60 transition"
                      >
                        <td className="px-5 py-2 font-mono text-base font-semibold text-foreground">
                          {task.taskNumber || (
                            <span className="text-muted-foreground font-normal">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-2 font-medium">{task.title}</td>
                        <td className="px-5 py-2">
                          {task.branch && (
                            <span className="text-xs font-mono text-muted-foreground inline-flex items-center gap-1">
                              <GitBranch className="h-3 w-3" />
                              {task.branch}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-2 text-center">
                          {total > 0 ? (
                            <button
                              type="button"
                              onClick={() => setServicesTask(task)}
                              className="inline-flex items-center justify-center min-w-[2rem] rounded-full bg-muted hover:bg-muted/70 px-2 py-0.5 text-sm font-semibold tabular-nums transition"
                              title="Zobrazit služby"
                            >
                              {total}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {task.script.trim() ? (
                            <Check className="h-4 w-4 text-emerald-500 inline-block" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {task.note?.trim() ? (
                            <StickyNote
                              className="h-4 w-4 text-amber-500 inline-block"
                              aria-label="Task má poznámku"
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-2 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                              STATUS_BADGE_CLASS[task.status],
                            )}
                          >
                            {TASK_STATUS_LABELS[task.status]}
                          </span>
                        </td>
                        <td className="px-1 py-2 text-center">
                          <Button
                            variant="default"
                            size="icon"
                            onClick={() => setEditingTaskId(task.id)}
                            title="Detail"
                            aria-label="Detail"
                          >
                            <Pencil className="h-4 w-4" />
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
      </div>

      <TaskEditDialog
        taskId={editingTaskId}
        services={services}
        releases={releases}
        onClose={() => setEditingTaskId(null)}
        onSaved={(t) =>
          setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)))
        }
        onDeleted={(id) => {
          setTasks((prev) => prev.filter((x) => x.id !== id));
          setEditingTaskId(null);
        }}
      />

      <Dialog
        open={!!servicesTask}
        onClose={() => setServicesTask(null)}
        className="max-w-2xl"
      >
        {servicesTask && (
          <>
            <DialogHeader onClose={() => setServicesTask(null)}>
              <h2 className="font-semibold">Služby tasku</h2>
            </DialogHeader>
            <DialogBody>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-left border-b-2 border-border">
                    <th className="px-2 py-2 font-medium">Služba</th>
                    <th className="px-2 py-2 font-medium w-10 text-center">
                      Git
                    </th>
                    <th className="px-2 py-2 font-medium w-14 text-center">
                      CI
                    </th>
                    <th className="px-2 py-2 font-medium w-14 text-center">
                      Stage
                    </th>
                    <th className="px-2 py-2 font-medium w-14 text-center">
                      Prod
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {servicesTask.deployments.map((d) => {
                    const service = serviceById.get(d.serviceId);
                    return (
                      <tr
                        key={d.serviceId}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="px-2 py-2 font-medium">
                          {service?.name ?? "?"}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {service?.repo ? (
                            <a
                              href={service.repo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center text-primary hover:text-primary/80"
                              title={service.repo}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        {(["ci", "stage", "prod"] as const).map((env) => (
                          <td key={env} className="text-center">
                            {d[env] ? (
                              <Check className="h-4 w-4 text-emerald-500 inline-block" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DialogBody>
          </>
        )}
      </Dialog>

      <ImportJiraDialog
        release={importingRelease}
        onClose={() => setImportingRelease(null)}
        onImported={() => {
          api.tasks.list().then(setTasks);
        }}
      />

      <Dialog
        open={overviewOpen}
        onClose={() => setOverviewOpen(false)}
        className="max-w-2xl"
      >
        <DialogHeader onClose={() => setOverviewOpen(false)}>
          <h2 className="font-semibold">Přehled služeb</h2>
        </DialogHeader>
        <DialogBody>
          {servicesOverview.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Žádné služby v zobrazených tascích.
            </p>
          ) : (
            <>
              <div className="flex justify-end mb-3">
                <CopyAllServices
                  services={servicesOverview.map((s) => ({
                    name: s.name,
                    repo: s.repo,
                  }))}
                />
              </div>
              <table className="w-full text-sm">
              <tbody>
                {servicesOverview.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="px-2 py-2 font-medium">{s.name}</td>
                    <td className="px-2 py-2 text-center w-12">
                      {s.repo ? (
                        <a
                          href={s.repo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center text-primary hover:text-primary/80"
                          title={s.repo}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center w-12">
                      <CopyServiceName name={s.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </>
          )}
        </DialogBody>
      </Dialog>

      <TaskCreateDialog
        open={creatingOpen}
        releases={releases}
        defaultReleaseId={
          releaseSel !== "all" && releaseSel !== "none" ? releaseSel : undefined
        }
        onClose={() => setCreatingOpen(false)}
        onCreated={(t) => {
          setTasks((prev) => [t, ...prev]);
          setCreatingOpen(false);
          setEditingTaskId(t.id);
        }}
      />
    </div>
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function CopyAllServices({
  services,
}: {
  services: Array<{ name: string; repo?: string }>;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const tsv = services
      .map((s) => `${s.name}\t${s.repo ?? ""}`)
      .join("\n");
    const html =
      "<table><tbody>" +
      services
        .map((s) => {
          const repoCell = s.repo
            ? `<a href="${escapeHtml(s.repo)}">${escapeHtml(s.repo)}</a>`
            : "";
          return `<tr><td>${escapeHtml(s.name)}</td><td>${repoCell}</td></tr>`;
        })
        .join("") +
      "</tbody></table>";

    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([tsv], { type: "text/plain" }),
            "text/html": new Blob([html], { type: "text/html" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(tsv);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* no-op */
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-md border-2 border-border bg-card hover:bg-muted px-3 py-1.5 text-xs font-medium transition"
      title="Zkopíruje všechny služby ve formátu pro vložení do tabulky (Confluence)"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald-500" />
          Zkopírováno
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Kopírovat vše
        </>
      )}
    </button>
  );
}

function CopyServiceName({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(name);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* clipboard API není dostupné */
        }
      }}
      className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition"
      title={copied ? "Zkopírováno" : "Zkopírovat název"}
      aria-label="Zkopírovat název"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}

function ReleaseTabs({
  releases,
  counts,
  totalCount,
  selected,
  onSelect,
}: {
  releases: Release[];
  counts: { byId: Map<string, number>; none: number };
  totalCount: number;
  selected: ReleaseSelection;
  onSelect: (s: ReleaseSelection) => void;
}) {
  return (
    <aside className="bg-card rounded-md border-2 border-border shadow-md flex flex-col min-h-0 overflow-hidden">
      <nav className="p-2 flex flex-col gap-2 overflow-y-auto flex-1 min-h-0">
        <ReleaseTab
          icon={Layers}
          iconColor="text-teal-500"
          label="Vše"
          count={totalCount}
          active={selected === "all"}
          onClick={() => onSelect("all")}
        />
        {releases.length > 0 && (
          <div className="my-1 border-t-2 border-border" />
        )}
        {releases.map((r) => (
          <ReleaseTab
            key={r.id}
            icon={Rocket}
            iconColor="text-orange-500"
            label={r.name}
            sub={new Date(r.releaseDate).toLocaleDateString("cs-CZ")}
            count={counts.byId.get(r.id) ?? 0}
            active={selected === r.id}
            onClick={() => onSelect(r.id)}
          />
        ))}
        {releases.length === 0 && (
          <p className="text-xs text-muted-foreground px-3 py-2">
            Žádné releasy. Přidat lze v sekci Releasy.
          </p>
        )}
      </nav>
    </aside>
  );
}

function ReleaseTab({
  icon: Icon,
  iconColor,
  label,
  sub,
  count,
  active,
  onClick,
  muted,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  label: string;
  sub?: string;
  count: number;
  active: boolean;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "w-full text-left flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors border-2",
        active
          ? "bg-indigo-600 text-white shadow-md ring-1 ring-indigo-500/40 border-transparent"
          : muted
            ? "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            : "border-border text-foreground hover:bg-muted",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          active ? "text-white" : iconColor,
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">{label}</div>
        {sub && (
          <div
            className={cn(
              "text-[11px] truncate",
              active ? "text-indigo-100" : "text-muted-foreground",
            )}
          >
            {sub}
          </div>
        )}
      </div>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums shrink-0 rounded-full px-2 py-0.5 min-w-[2rem] text-center",
          active
            ? "bg-white/25 text-white"
            : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}
