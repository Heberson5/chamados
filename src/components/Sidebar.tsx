 import { useState, useEffect } from "react";
 import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard,
  Ticket,
  Settings,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  BarChart3,
  Package,
   History,
   Users,
   Lock
} from "lucide-react";
 import { cn } from "@/lib/utils";
 import { Button } from "@/components/ui/button";
 import { useTheme } from "@/components/ThemeProvider";
  import { usePermissions } from "@/hooks/usePermissions";
 import UserMenu from "./UserMenu";
 import { useBranding } from "@/hooks/useBranding";
 
interface SidebarProps {
  onMobileClose?: () => void;
}

 export default function Sidebar({ onMobileClose }: SidebarProps) {
   const [collapsed, setCollapsed] = useState(false);
    const { hasPermission } = usePermissions();
    const { branding: layout } = useBranding();
   const { theme, setTheme } = useTheme();
   const navigate = useNavigate();
   const location = useLocation();
 

    const defaultMenuItems = [
      { id: '1', icon: LayoutDashboard, label: "Painel", path: "/dashboard", permission: "dashboard" },
      { id: '2', icon: Ticket, label: "Chamados", path: "/chamados", permission: "chamados" },
      { id: '6', icon: BarChart3, label: "Relatórios", path: "/reports", permission: "relatorios" },
      { id: '3', icon: Users, label: "Usuários", path: "/usuarios", permission: "usuarios" },
      { id: '4', icon: Lock, label: "Permissões", path: "/permissions", permission: "permissoes" },
      { id: '5', icon: History, label: "Auditoria", path: "/audit", permission: "audit" },
      { id: '8', icon: Settings, label: "Configurações", path: "/settings", permission: "configuracoes" },
    ];
 
   const menuItems = (layout.menuOrder && layout.menuOrder.length > 0) 
     ? layout.menuOrder
         .map((orderItem: any) => {
           const defaultItem = defaultMenuItems.find(i => i.id === orderItem.id || i.label === orderItem.label);
           if (!defaultItem) return null;
            return { ...defaultItem, label: orderItem.label, visible: orderItem.visible !== false, permission: defaultItem.permission };
         })
         .filter((item: any) => {
           if (!item || !item.visible) return false;
            return hasPermission(item.permission);
         })
      : defaultMenuItems.filter(item => hasPermission(item.permission));
 
   return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 md:relative flex h-screen flex-col bg-sidebar border-r transition-all duration-300 shadow-xl md:shadow-none",
      collapsed ? "w-16" : "w-64"
    )}>
        <div className="p-4 flex justify-between items-center border-b shrink-0 bg-sidebar/50 backdrop-blur-sm sticky top-0 z-10">
         {!collapsed && (
           <div className="flex items-center gap-2 overflow-hidden">
             {layout.companyLogo && (
               <img src={layout.companyLogo} alt="Logo" className="w-8 h-8 object-contain shrink-0" />
             )}
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent truncate">
                {layout.companyName || "Chamados"}
              </span>
           </div>
         )}
        <div className="flex items-center ml-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onMobileClose}
            className="md:hidden"
          >
            <ChevronLeft size={20} />
          </Button>
        </div>
      </div>
 
       <nav className="flex-1 p-2 space-y-2 overflow-y-auto">
         {menuItems.map((item) => (
           <Button
             key={item.path}
             variant={location.pathname === item.path ? "secondary" : "ghost"}
             className={cn(
               "w-full justify-start",
               collapsed ? "px-2" : "px-4"
             )}
              onClick={() => {
                navigate(item.path);
                if (window.innerWidth < 768 && onMobileClose) onMobileClose();
              }}
           >
             <item.icon size={20} className={cn(!collapsed && "mr-2")} />
             {!collapsed && <span>{item.label}</span>}
           </Button>
         ))}
       </nav>
 
       <div className="p-2 border-t space-y-2">
          {/* Atalho do perfil */}
          <UserMenu collapsed={collapsed} />

          <div className="px-2">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start h-10 transition-all",
                collapsed ? "px-0 justify-center" : "px-4"
              )}
              onClick={() => {
                if (theme === "system") setTheme("light");
                else if (theme === "light") setTheme("dark");
                else setTheme("system");
              }}
              title={`Tema: ${theme === "system" ? "Automático" : theme === "dark" ? "Escuro" : "Claro"}`}
            >
              {theme === "system" ? (
                <Monitor size={20} className={cn(!collapsed && "mr-2")} />
              ) : theme === "dark" ? (
                <Sun size={20} className={cn(!collapsed && "mr-2")} />
              ) : (
                <Moon size={20} className={cn(!collapsed && "mr-2")} />
              )}
              {!collapsed && (
                <span>
                  Tema: {theme === "system" ? "Automático" : theme === "dark" ? "Claro" : "Escuro"}
                </span>
              )}
            </Button>
          </div>
       </div>
    </aside>
  );
}