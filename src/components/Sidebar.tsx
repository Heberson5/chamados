 import { useState, useEffect } from "react";
 import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard,
  Ticket,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Package,
   History,
    Users,
    Lock,
    Building2,
    HelpCircle,
    ClipboardList
} from "lucide-react";
 import { cn } from "@/lib/utils";
 import { Button } from "@/components/ui/button";
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
   const navigate = useNavigate();
   const location = useLocation();
 

    const defaultMenuItems = [
      { id: '1', icon: LayoutDashboard, label: "Painel", path: "/dashboard", permission: "dashboard" },
      { id: '2', icon: Ticket, label: "Chamados", path: "/chamados", permission: "chamados" },
      { id: '11', icon: ClipboardList, label: "Acompanhamento", path: "/acompanhamento", permission: "acompanhamento" },
      { id: '6', icon: BarChart3, label: "Relatórios", path: "/reports", permission: "relatorios" },
        { id: '3', icon: Users, label: "Usuários", path: "/usuarios", permission: "usuarios" },
        { id: '9', icon: Building2, label: "Departamentos", path: "/departamentos", permission: "departamentos" },
         { id: '4', icon: Lock, label: "Permissões", path: "/permissions", permission: "permissoes" },
        { id: '5', icon: History, label: "Auditoria", path: "/audit", permission: "audit" },
        { id: '10', icon: HelpCircle, label: "Ajuda", path: "/ajuda", permission: "ajuda" },
        { id: '8', icon: Settings, label: "Configurações", path: "/settings", permission: "configuracoes" },
     ];
 
    const getMenuItems = () => {
      if (!layout.menuOrder || layout.menuOrder.length === 0) {
        return defaultMenuItems.filter(item => hasPermission(item.permission));
      }

      // Map existing order
      const orderedItems = layout.menuOrder
        .map((orderItem: any) => {
          const defaultItem = defaultMenuItems.find(i => i.id === orderItem.id || i.label === orderItem.label);
          if (!defaultItem) return null;
          return { ...defaultItem, label: orderItem.label, visible: orderItem.visible !== false };
        })
        .filter(item => item !== null) as any[];

      // Add missing default items (like new menus)
      defaultMenuItems.forEach(defaultItem => {
        if (!orderedItems.some(item => item.id === defaultItem.id)) {
          orderedItems.push({ ...defaultItem, visible: true });
        }
      });

      return orderedItems.filter(item => item.visible && hasPermission(item.permission));
    };

    const menuItems = getMenuItems();
 
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
         <TooltipProvider delayDuration={150}>
           {menuItems.map((item) => {
             const button = (
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
             );
             if (!collapsed) return <div key={item.path}>{button}</div>;
             return (
               <Tooltip key={item.path}>
                 <TooltipTrigger asChild>{button}</TooltipTrigger>
                 <TooltipContent side="right">{item.label}</TooltipContent>
               </Tooltip>
             );
           })}
         </TooltipProvider>
       </nav>
 
       <div className="p-2 border-t space-y-2">
          {/* Atalho do perfil */}
          <UserMenu collapsed={collapsed} />
       </div>
    </aside>
  );
}