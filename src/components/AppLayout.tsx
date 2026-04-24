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
    Check,
    ChevronsUpDown,
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
 import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/components/ThemeProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

 function hexToHsl(hex: string): string {
   let r = 0, g = 0, b = 0;
   if (hex.length === 4) {
     r = parseInt(hex[1] + hex[1], 16);
     g = parseInt(hex[2] + hex[2], 16);
     b = parseInt(hex[3] + hex[3], 16);
   } else if (hex.length === 7) {
     r = parseInt(hex.substring(1, 3), 16);
     g = parseInt(hex.substring(3, 5), 16);
     b = parseInt(hex.substring(5, 7), 16);
   }
   r /= 255; g /= 255; b /= 255;
   const max = Math.max(r, g, b), min = Math.min(r, g, b);
   let h = 0, s, l = (max + min) / 2;
   if (max === min) {
     h = s = 0;
   } else {
     const d = max - min;
     s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
     switch (max) {
       case r: h = (g - b) / d + (g < b ? 6 : 0); break;
       case g: h = (b - r) / d + 2; break;
       case b: h = (r - g) / d + 4; break;
     }
     h /= 6;
   }
   return {
     hsl: `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`,
     l
   };
 }
 
export const AppLayout = () => {
   const { profile, org, setOrg, signOut } = useAuth();
   const [allOrgs, setAllOrgs] = useState<any[]>([]);
  const { data: settings } = useSystemSettings();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [nav, setNav] = useState<any[]>([]);

  useEffect(() => {
    const defaultItems = [
      { key: "Dashboard", to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
      { key: "Chamados", to: "/app/tickets", icon: Inbox, label: "Chamados" },
      { key: "Kanban", to: "/app/board", icon: KanbanSquare, label: "Kanban" },
      { key: "Empresas", to: "/app/admin/companies", icon: Building2, label: "Empresas", adminOnly: true },
      { key: "Usuários", to: "/app/admin/users", icon: Users, label: "Usuários", adminOnly: true },
      { key: "Estrutura", to: "/app/admin/structure", icon: Briefcase, label: "Estrutura", adminOnly: true },
      { key: "Sistema", to: "/app/admin/system", icon: LayoutGrid, label: "Sistema", adminOnly: true },
      { key: "Configurações", to: "/app/settings", icon: Settings, label: "Configurações" },
    ];

    const menuConfig = (settings?.menu_config as any[]) || [];
    
    let orderedNav = [];
    if (menuConfig.length > 0) {
      // Use the order and labels from menuConfig
      orderedNav = menuConfig.map(configItem => {
        const defaultItem = defaultItems.find(d => d.key === configItem.key);
        if (!defaultItem) return null;
        return { ...defaultItem, label: configItem.label || defaultItem.label };
      }).filter(Boolean);

      // Add any missing default items at the end
      defaultItems.forEach(d => {
        if (!orderedNav.find(o => o.key === d.key)) {
          orderedNav.push(d);
        }
      });
    } else {
      orderedNav = defaultItems;
    }

    // Filter admin items if not master
    const filteredNav = orderedNav.filter(item => !item.adminOnly || profile?.is_master);
    setNav(filteredNav);
  }, [settings?.menu_config, profile?.is_master]);

   useEffect(() => {
     const fetchOrgs = async () => {
       if (profile?.is_master) {
         const { data } = await supabase.from("organizations").select("*").order("name");
         setAllOrgs(data || []);
       }
     };
     fetchOrgs();
   }, [profile?.is_master]);
 
   useEffect(() => {
     if (settings?.system_name) {
       document.title = settings.system_name;
     }
     if (settings?.favicon_url) {
       let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
       if (!link) {
         link = document.createElement('link');
         link.rel = 'icon';
         document.head.appendChild(link);
       }
       link.href = settings.favicon_url;
     }
     if (settings?.primary_color) {
       if (settings.primary_color.startsWith('#')) {
         const { hsl, l } = hexToHsl(settings.primary_color);
         document.documentElement.style.setProperty('--primary', hsl);
         // Set foreground based on luminance
         document.documentElement.style.setProperty('--primary-foreground', l > 0.5 ? '0 0% 0%' : '0 0% 100%');
       } else {
         document.documentElement.style.setProperty('--primary', settings.primary_color);
       }
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
             {profile?.is_master ? (
               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <Button variant="ghost" size="sm" className="w-full justify-between px-2 h-auto py-1 font-medium hover:bg-secondary">
                     <span className="truncate">{org?.name ?? "Selecionar..."}</span>
                     <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="start" className="w-52">
                   {allOrgs.map((o) => (
                     <DropdownMenuItem key={o.id} onClick={() => setOrg(o)}>
                       <Building2 className="mr-2 size-4" />
                       <span className="flex-1 truncate">{o.name}</span>
                       {org?.id === o.id && <Check className="size-3" />}
                     </DropdownMenuItem>
                   ))}
                 </DropdownMenuContent>
               </DropdownMenu>
             ) : (
               <div className="text-sm font-medium px-2 truncate">{org?.name ?? "—"}</div>
             )}
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