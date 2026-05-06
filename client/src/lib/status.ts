import { Inbox, Wrench, CheckCircle2, type LucideIcon } from "lucide-react";
import type { TaskStatus } from "@release-tool/shared";

export const STATUS_ICON: Record<TaskStatus, LucideIcon> = {
  zadano: Inbox,
  v_reseni: Wrench,
  hotovo: CheckCircle2,
};

export const STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
  zadano: "bg-slate-500 text-white",
  v_reseni: "bg-amber-500 text-white",
  hotovo: "bg-green-600 text-white",
};

export const STATUS_DOT_CLASS: Record<TaskStatus, string> = {
  zadano: "bg-slate-400",
  v_reseni: "bg-amber-500",
  hotovo: "bg-green-600",
};
