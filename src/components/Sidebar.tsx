 import { useState } from "react";
 import { useNavigate, useLocation } from "react-router-dom";
import { 
   LayoutDashboard,
   Ticket,
   Settings,
   ChevronLeft,
   ChevronRight,
   LogOut,
   Moon,
   Sun,
   Monitor,
   User,
   Users,
   Package,
   Banknote,
   BarChart3
} from "lucide-react";
 import { cn } from "@/lib/utils";
 import { Button } from "@/components/ui/button";
 import { useTheme } from "@/components/ThemeProvider";
 import { supabase } from "@/integrations/supabase/client";
 
interface SidebarProps {
  onMobileClose?: () => void;
}

export default function Sidebar({ onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
   const { theme, setTheme } = useTheme();
   const navigate = useNavigate();
   const location = useLocation();
 
    const menuItems = [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: Ticket, label: "Chamados", path: "/chamados" },
      { icon: Package, label: "Inventário", path: "/inventory" },
      { icon: Users, label: "Gestão de Pessoas", path: "/users" },
      { icon: Banknote, label: "Financeiro", path: "/finance" },
      { icon: BarChart3, label: "Relatórios", path: "/reports" },
      { icon: User, label: "Perfil", path: "/perfil" },
      { icon: Settings, label: "Configurações", path: "/settings" },
    ];
 
   const handleLogout = async () => {
     await supabase.auth.signOut();
     navigate("/login");
   };
 
   return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 md:relative flex h-screen flex-col bg-sidebar border-r transition-all duration-300 shadow-xl md:shadow-none",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4 flex justify-between items-center border-b shrink-0">
        {!collapsed && <span className="font-bold text-xl truncate">Help-Me</span>}
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
 
         <Button
           variant="ghost"
           className={cn(
             "w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10",
             collapsed ? "px-2" : "px-4"
           )}
           onClick={handleLogout}
         >
           <LogOut size={20} className={cn(!collapsed && "mr-2")} />
           {!collapsed && <span>Sair</span>}
         </Button>
       </div>
    </aside>
  );
}