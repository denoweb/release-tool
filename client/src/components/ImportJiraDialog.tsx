import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Release } from "@release-tool/shared";

interface ImportResult {
  jql: string;
  found: number;
  created: number;
  updated: number;
  skipped: number;
}

export function ImportJiraDialog({
  release,
  onClose,
  onImported,
}: {
  release: Release | null;
  onClose: () => void;
  onImported?: (result: ImportResult) => void;
}) {
  const [jql, setJql] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    if (release) {
      const safe = release.name.replace(/"/g, '\\"');
      setJql(
        `fixVersion = "${safe}" AND assignee = currentUser()`,
      );
      setError(null);
      setResult(null);
    }
  }, [release]);

  async function handleImport() {
    if (!release) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await api.releases.importJira(release.id, {
        jql: jql.trim() || undefined,
      });
      setResult(r);
      onImported?.(r);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!release} onClose={onClose} className="max-w-lg">
      {release && (
        <>
          <DialogHeader onClose={onClose}>
            <h2 className="font-semibold">
              Import z JIRA — {release.name}
            </h2>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>JQL dotaz</Label>
                <Input
                  value={jql}
                  onChange={(e) => setJql(e.target.value)}
                  placeholder={`fixVersion = "${release.name}" AND assignee = currentUser()`}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Předvyplněno: tasky z fixVersion „{release.name}" přiřazené
                  přihlášenému uživateli. JQL můžeš libovolně upravit.
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
                  {error}
                </p>
              )}

              {result && (
                <div className="text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-md p-3 flex flex-col gap-1">
                  <p>
                    <span className="font-medium">JQL:</span>{" "}
                    <code className="font-mono text-xs">{result.jql}</code>
                  </p>
                  <p>
                    Nalezeno: <strong>{result.found}</strong> · Vytvořeno:{" "}
                    <strong className="text-emerald-600">
                      {result.created}
                    </strong>{" "}
                    · Připojeno k releasu:{" "}
                    <strong className="text-blue-600">{result.updated}</strong>{" "}
                    · Beze změn:{" "}
                    <strong className="text-muted-foreground">
                      {result.skipped}
                    </strong>
                  </p>
                </div>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <div className="flex-1" />
            <Button variant="outline" onClick={onClose}>
              Zavřít
            </Button>
            <Button onClick={handleImport} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importuji…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Importovat
                </>
              )}
            </Button>
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}
