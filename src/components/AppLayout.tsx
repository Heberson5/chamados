import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Inbox, 
  KanbanSquare, 
  Settings, 
  LogOut, 
  Headphones, 
  ChevronLeft, 
  ChevronRight,
  Building2,
  Users,
  Briefcase,
  LayoutGrid,
  Sun,
  Moon,
  Monitor
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useTheme } from "@/components/ThemeProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const AppLayout = () => {
  const { profile, org, signOut } = useAuth();
  const { data: settings } = useSystemSettings();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const nav = [
    { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/app/tickets", icon: Inbox, label: "Chamados" },
    { to: "/app/board", icon: KanbanSquare, label: "Kanban" },
    ...(profile?.is_master ? [
      { to: "/app/admin/companies", icon: Building2, label: "Empresas" },
      { to: "/app/admin/users", icon: Users, label: "Usuários" },
      { to: "/app/admin/structure", icon: Briefcase, label: "Estrutura" },
      { to: "/app/admin/system", icon: LayoutGrid, label: "Sistema" },
    ] : []),
    { to: "/app/settings", icon: Settings, label: "Configurações" },
  ];

  useEffect(() => {
    if (settings?.system_name) {
      document.title = settings.system_name;
    }
    if (settings?.favicon_url) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) link.href = settings.favicon_url;
    }
  }, [settings]);

  return (
    <div className="flex min-h-screen bg-surface-1">
      <aside className={cn(
        "hidden md:flex flex-col border-r border-border bg-background transition-all duration-300",
        isCollapsed ? "w-16" : "w-60"
      )}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          <div className={cn("flex items-center gap-2", isCollapsed && "hidden")}>
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="size-7 object-contain" />
            ) : (
              <div className="size-7 rounded-md bg-primary text-primary-foreground grid place-items-center">
                <Headphones className="size-4" />
              </div>
            )}
            {!isCollapsed && (
              <div className="text-sm font-semibold tracking-tight truncate max-w-[120px]">
                {settings?.system_name ?? "Helpdesk"}
              </div>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="size-8"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
        </div>
        {!isCollapsed && (
          <div className="px-3 py-3 border-b border-border">
            <div className="text-xs text-muted-foreground px-2 mb-1">Empresa</div>
            <div className="text-sm font-medium px-2 truncate">{org?.name ?? "—"}</div>
          </div>
        )}
        <nav className="flex-1 px-2 space-y-0.5">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={isCollapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md transition-colors",
                  isCollapsed ? "justify-center p-2.5" : "px-2.5 py-1.5 text-sm",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )
              }
            >
              <Icon className={cn("shrink-0", isCollapsed ? "size-5" : "size-4")} />
              {!isCollapsed && label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className={cn("flex items-center gap-2 px-1 mb-2", isCollapsed && "justify-center px-0")}>
            <div className="size-7 rounded-full bg-secondary grid place-items-center text-xs font-medium">
              {profile?.full_name?.[0]?.toUpperCase() ?? profile?.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            {!isCollapsed && <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{profile?.full_name ?? profile?.email}</div>
              <div className="flex items-center gap-1">
                <div className="text-[11px] text-muted-foreground truncate">{profile?.email}</div>
                {profile?.is_master && (
                  <span className="bg-primary/10 text-primary text-[9px] px-1 rounded font-bold uppercase">Master</span>
                )}
              </div>
            </div>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={cn("w-full justify-start gap-2 text-muted-foreground", isCollapsed && "justify-center px-0")}>
                <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                {!isCollapsed && <span>Tema</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}><Sun className="mr-2 h-4 w-4" /> Claro</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}><Moon className="mr-2 h-4 w-4" /> Escuro</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}><Monitor className="mr-2 h-4 w-4" /> Sistema</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full justify-start gap-2 text-muted-foreground mt-1", isCollapsed && "justify-center px-0")}
            onClick={async () => {
              await signOut();
              navigate("/auth");
            }}
          >
            <LogOut className="size-4" /> {!isCollapsed && "Sair"}
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};