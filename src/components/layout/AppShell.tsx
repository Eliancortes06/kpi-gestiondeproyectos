import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  Menu,
  X,
  Package,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import garsiteLogo from "@/assets/garsite-logo.png.asset.json";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/proyectos", label: "Proyectos", icon: Package },
  { to: "/indicadores", label: "Gestión de Indicadores", icon: ClipboardList },
  { to: "/carga", label: "Carga de Datos", icon: Upload },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [openMobile, setOpenMobile] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={garsiteLogo.url} alt="Garsite" className="h-8 w-auto" />
          <span className="font-semibold tracking-tight">Project Performance & Trends</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpenMobile((v) => !v)} aria-label="Menú">
          {openMobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      <div className="flex">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-72 shrink-0 transform border-r bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            openMobile ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-full flex-col p-5">
            <Link to="/dashboard" className="flex items-center gap-3 pb-6" onClick={() => setOpenMobile(false)}>
              <div className="flex h-12 w-full items-center justify-center rounded-xl bg-white px-3 py-2 shadow-elegant">
                <img src={garsiteLogo.url} alt="Garsite" className="h-8 w-auto" />
              </div>
            </Link>

            <nav className="flex flex-col gap-1">
              {NAV.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpenMobile(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-elegant"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {openMobile && (
          <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setOpenMobile(false)} />
        )}

        <main className="flex-1 min-w-0">
          <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
