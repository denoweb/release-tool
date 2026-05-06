import { useEffect, useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { api } from "@/api";
import type { Release, Task } from "@release-tool/shared";

interface FormState {
  taskNumber: string;
  title: string;
  releaseId: string;
}

const empty: FormState = {
  taskNumber: "",
  title: "",
  releaseId: "",
};

export function TaskCreateDialog({
  open,
  releases,
  defaultReleaseId,
  onClose,
  onCreated,
}: {
  open: boolean;
  releases: Release[];
  defaultReleaseId?: string;
  onClose: () => void;
  onCreated: (task: Task) => void;
}) {
  const [form, setForm] = useState<FormState>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setForm({ ...empty, releaseId: defaultReleaseId ?? "" });
      setError(null);
    }
  }, [open, defaultReleaseId]);

  const dirty =
    form.taskNumber !== "" ||
    form.title !== "" ||
    form.releaseId !== (defaultReleaseId ?? "");

  async function handleSubmit() {
    if (!form.taskNumber.trim()) {
      setError("Číslo tasku je povinné");
      return;
    }
    if (!form.title.trim()) {
      setError("Název je povinný");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const task = await api.tasks.create({
        taskNumber: form.taskNumber,
        title: form.title,
        releaseId: form.releaseId || null,
      });
      onCreated(task);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (dirty && !confirm("Máš rozepsaný task. Opravdu zavřít?")) return;
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogHeader onClose={handleClose}>
        <h2 className="font-semibold">Nový task</h2>
      </DialogHeader>

      <DialogBody>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
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
                autoFocus
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
          </div>

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

          {/* Hidden submit so Enter in fields works */}
          <button type="submit" className="hidden" />
        </form>
      </DialogBody>

      <DialogFooter>
        <div className="flex-1" />
        <Button variant="outline" onClick={handleClose}>
          Zrušit
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Vytvářím…" : "Vytvořit"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
