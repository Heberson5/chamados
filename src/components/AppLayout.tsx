import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Inbox, KanbanSquare, Settings, LogOut, Headphones } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/app/tickets", icon: Inbox, label: "Chamados" },
  { to: "/app/board", icon: KanbanSquare, label: "Kanban" },
  { to: "/app/settings", icon: Settings, label: "Configurações" },
];

export const AppLayout = () => {
  const { profile, org, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-surface-1">
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-background">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-border">
          <div className="size-7 rounded-md bg-primary text-primary-foreground grid place-items-center">
            <Headphones className="size-4" />
          </div>
          <div className="text-sm font-semibold tracking-tight">Helpdesk</div>
        </div>
        <div className="px-3 py-3">
          <div className="text-xs text-muted-foreground px-2 mb-1">Empresa</div>
          <div className="text-sm font-medium px-2 truncate">{org?.name ?? "—"}</div>
        </div>
        <nav className="flex-1 px-2 space-y-0.5">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 px-1 mb-2">
            <div className="size-7 rounded-full bg-secondary grid place-items-center text-xs font-medium">
              {profile?.full_name?.[0]?.toUpperCase() ?? profile?.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{profile?.full_name ?? profile?.email}</div>
              <div className="text-[11px] text-muted-foreground truncate">{profile?.email}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={async () => {
              await signOut();
              navigate("/auth");
            }}
          >
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};