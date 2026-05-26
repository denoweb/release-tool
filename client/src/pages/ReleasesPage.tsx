import { useEffect, useState } from "react";
import { Plus, Trash2, Download } from "lucide-react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportJiraDialog } from "@/components/ImportJiraDialog";
import type { Release, Task } from "@release-tool/shared";

export function ReleasesPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.releases.list(), api.tasks.list()])
      .then(([r, t]) => {
        setReleases(r);
        setTasks(t);
      })
      .finally(() => setLoading(false));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !date) return;
    try {
      const r = await api.releases.create({
        name,
        releaseDate: new Date(date).toISOString(),
      });
      setReleases((prev) =>
        [...prev, r].sort((a, b) =>
          b.releaseDate.localeCompare(a.releaseDate),
        ),
      );
      setName("");
      setDate("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(id: string) {
    const release = releases.find((r) => r.id === id);
    const taskCount = tasks.filter((t) => t.releaseId === id).length;
    const message =
      taskCount > 0
        ? `Smazat release „${release?.name}"?\n\n` +
          `Bude smazán release i všech ${taskCount} přiřazených tasků. ` +
          `Tato akce je nevratná.`
        : `Smazat release „${release?.name}"?`;
    if (!confirm(message)) return;
    try {
      await api.releases.remove(id, taskCount > 0);
      setReleases((prev) => prev.filter((r) => r.id !== id));
      setTasks((prev) => prev.filter((t) => t.releaseId !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function updateDate(id: string, value: string) {
    try {
      const updated = await api.releases.update(id, {
        releaseDate: new Date(value).toISOString(),
      });
      setReleases((prev) =>
        prev
          .map((r) => (r.id === id ? updated : r))
          .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)),
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function updateName(id: string, value: string) {
    try {
      const updated = await api.releases.update(id, { name: value });
      setReleases((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const [importRelease, setImportRelease] = useState<Release | null>(null);

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Přidat release</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="flex gap-2 items-end">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Název *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="např. 2026.05"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Datum *</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <Button type="submit">
              <Plus className="h-4 w-4" />
              Přidat
            </Button>
          </form>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      <ImportJiraDialog
        release={importRelease}
        onClose={() => setImportRelease(null)}
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-muted-foreground">Načítám…</p>
          ) : releases.length === 0 ? (
            <p className="p-6 text-muted-foreground">
              Zatím žádné releasy.
            </p>
          ) : (
            <ul className="divide-y">
              {releases.map((r) => (
                <li key={r.id} className="flex items-center gap-2 p-3">
                  <Input
                    defaultValue={r.name}
                    onBlur={(e) =>
                      e.target.value !== r.name &&
                      updateName(r.id, e.target.value)
                    }
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    defaultValue={r.releaseDate.slice(0, 10)}
                    onBlur={(e) =>
                      e.target.value &&
                      e.target.value !== r.releaseDate.slice(0, 10) &&
                      updateDate(r.id, e.target.value)
                    }
                    className="w-40"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImportRelease(r)}
                    title="Import z JIRA"
                  >
                    <Download className="h-4 w-4" />
                    JIRA
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(r.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

