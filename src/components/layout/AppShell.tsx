import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { currentRoleQuery, profileQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ClipboardList,
  Sparkles,
  FileBarChart2,
  Settings2,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/indicadores", label: "Gestión de Indicadores", icon: ClipboardList },
  { to: "/reportes", label: "Reportes", icon: FileBarChart2 },
  { to: "/admin", label: "Administración", icon: Settings2, adminOnly: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data: role } = useSuspenseQuery(currentRoleQuery());
  const { data: profile } = useSuspenseQuery(profileQuery());
  const [openMobile, setOpenMobile] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = NAV.filter((i) => !i.adminOnly || role === "admin");

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-black">K</div>
          <span className="font-semibold tracking-tight">KPI Platform</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpenMobile((v) => !v)} aria-label="Menú">
          {openMobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-72 shrink-0 transform border-r bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            openMobile ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-full flex-col p-5">
            <Link to="/dashboard" className="flex items-center gap-3 pb-6" onClick={() => setOpenMobile(false)}>
              <div className="grid h-10 w-10 place-items-center rounded-xl gradient-primary shadow-glow font-black text-lg">
                K
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold tracking-tight">KPI Platform</span>
                <span className="text-xs text-sidebar-foreground/60">Cumplimiento de proyectos</span>
              </div>
            </Link>

            <nav className="flex flex-col gap-1">
              {items.map((item) => {
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

            <div className="mt-auto border-t border-sidebar-border pt-4">
              <div className="mb-3 flex items-center gap-3 rounded-lg bg-sidebar-accent/40 p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sidebar-primary/20 text-sm font-semibold uppercase text-sidebar-primary-foreground">
                  {(profile?.nombre ?? profile?.correo ?? "?").slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{profile?.nombre ?? profile?.correo ?? "Usuario"}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                    <ShieldCheck className="h-3 w-3" />
                    {role ?? "sin rol"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </Button>
            </div>
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
