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
 
 export default function Sidebar() {
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
     <div className={cn(
       "h-screen flex flex-col bg-sidebar border-r transition-all duration-300",
       collapsed ? "w-16" : "w-64"
     )}>
       <div className="p-4 flex justify-between items-center border-b">
         {!collapsed && <span className="font-bold text-xl truncate">Help-Me</span>}
         <Button 
           variant="ghost" 
           size="icon" 
           onClick={() => setCollapsed(!collapsed)}
           className="ml-auto"
         >
           {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
         </Button>
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
             onClick={() => navigate(item.path)}
           >
             <item.icon size={20} className={cn(!collapsed && "mr-2")} />
             {!collapsed && <span>{item.label}</span>}
           </Button>
         ))}
       </nav>
 
       <div className="p-2 border-t space-y-2">
         <Button
           variant="ghost"
           className={cn(
             "w-full justify-start",
             collapsed ? "px-2" : "px-4"
           )}
           onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
         >
           {theme === "dark" ? (
             <Sun size={20} className={cn(!collapsed && "mr-2")} />
           ) : (
             <Moon size={20} className={cn(!collapsed && "mr-2")} />
           )}
           {!collapsed && <span>Tema {theme === "dark" ? "Claro" : "Escuro"}</span>}
         </Button>
 
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
     </div>
   );
 }