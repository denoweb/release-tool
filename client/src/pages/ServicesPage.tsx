import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Service } from "@release-tool/shared";

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.services
      .list()
      .then(setServices)
      .finally(() => setLoading(false));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;
    try {
      const s = await api.services.create(name, repo || undefined);
      setServices((prev) => [...prev, s]);
      setName("");
      setRepo("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(id: string) {
    if (!confirm("Smazat službu?")) return;
    try {
      await api.services.remove(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function updateService(
    id: string,
    body: { name?: string; repo?: string },
  ) {
    try {
      const updated = await api.services.update(id, body);
      setServices((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Přidat službu</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="flex gap-2 items-end">
            <div className="w-48 shrink-0 flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Název *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="např. api"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">
                Repo (volitelné)
              </label>
              <Input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="git@…"
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

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-muted-foreground">Načítám…</p>
          ) : services.length === 0 ? (
            <p className="p-6 text-muted-foreground">
              Zatím žádné služby.
            </p>
          ) : (
            <ul className="divide-y">
              {services.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-2 p-3"
                >
                  <Input
                    defaultValue={s.name}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== s.name) updateService(s.id, { name: v });
                    }}
                    className="w-48 shrink-0"
                    placeholder="Název"
                  />
                  <Input
                    defaultValue={s.repo ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (s.repo ?? ""))
                        updateService(s.id, { repo: v });
                    }}
                    className="flex-1"
                    placeholder="Repo (volitelné)"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(s.id)}
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
