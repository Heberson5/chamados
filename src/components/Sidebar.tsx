 import { useState } from "react";
 import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { Button } from "@/components/ui/button";
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
 import UserMenu from "./UserMenu";
 import { useBranding } from "@/hooks/useBranding";
 import { useMenuItems } from "@/hooks/useMenuItems";

interface SidebarProps {
  onMobileClose?: () => void;
}

 export default function Sidebar({ onMobileClose }: SidebarProps) {
   const [collapsed, setCollapsed] = useState(false);
    const { branding: layout } = useBranding();
   const navigate = useNavigate();
   const location = useLocation();

    const menuItems = useMenuItems();

   return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 md:relative flex h-screen md:h-[calc(100vh-1.5rem)] md:my-3 md:ml-3 flex-col bg-sidebar border overflow-hidden md:rounded-2xl transition-all duration-300 shadow-xl md:shadow-lg md:shadow-black/10",
      collapsed ? "w-16" : "w-64"
    )}>
        <div className="p-4 flex justify-between items-center border-b shrink-0 bg-sidebar/50 backdrop-blur-sm sticky top-0 z-10">
         {!collapsed && (
           <button
             type="button"
             onClick={() => navigate("/dashboard")}
             className="flex items-center gap-2 overflow-hidden hover:opacity-80 transition-opacity"
             title="Ir para o Painel"
           >
             {layout.companyLogo && (
               <img src={layout.companyLogo} alt="Logo" className="w-8 h-8 object-contain shrink-0" />
             )}
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent truncate">
                {layout.companyName || "Chamados"}
              </span>
           </button>
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