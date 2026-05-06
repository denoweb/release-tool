import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { ListChecks, Rocket, Boxes } from "lucide-react";

const PAGE_META: Record<
  string,
  {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }
> = {
  "/": { title: "Tasky", icon: ListChecks, color: "text-teal-500" },
  "/releases": { title: "Releasy", icon: Rocket, color: "text-orange-500" },
  "/services": { title: "Služby", icon: Boxes, color: "text-violet-500" },
};

function PageTitle() {
  const { pathname } = useLocation();
  const meta = PAGE_META[pathname];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-2.5">
      <Icon className={cn("h-5 w-5", meta.color)} />
      <span className="font-semibold text-lg">{meta.title}</span>
    </div>
  );
}
import { TaskListPage } from "./pages/TaskListPage";
import { ServicesPage } from "./pages/ServicesPage";
import { ReleasesPage } from "./pages/ReleasesPage";
import { ThemeToggle } from "./components/ThemeToggle";
import { cn } from "@/lib/utils";

function NavItem({
  to,
  icon: Icon,
  iconColor,
  children,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          "relative flex items-center gap-3 px-5 py-2.5 text-sm transition-colors",
          isActive
            ? "bg-slate-800/60 text-white before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-teal-400"
            : "text-slate-400 hover:bg-slate-800/40 hover:text-white",
        )
      }
    >
      <Icon className={cn("h-4 w-4 shrink-0", iconColor)} />
      <span>{children}</span>
    </NavLink>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </div>
  );
}

export function App() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-52 shrink-0 bg-[#1F2429] flex flex-col">
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-slate-800">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-md">
            <Rocket className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-bold tracking-wide text-lg">
            RELEASE
          </span>
        </div>

        <SectionLabel>Hlavní</SectionLabel>
        <NavItem to="/" icon={ListChecks} iconColor="text-teal-400">
          Tasky
        </NavItem>

        <SectionLabel>Číselníky</SectionLabel>
        <NavItem to="/releases" icon={Rocket} iconColor="text-orange-400">
          Releasy
        </NavItem>
        <NavItem to="/services" icon={Boxes} iconColor="text-violet-400">
          Služby
        </NavItem>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-card border-b border-border flex items-center px-6">
          <PageTitle />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 px-6 py-6 overflow-x-hidden">
          <Routes>
            <Route path="/" element={<TaskListPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/releases" element={<ReleasesPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
