import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import UserMenu from "./UserMenu";
import InstallAppButton from "./InstallAppButton";
import BrandMark from "./BrandMark";
import { useBranding } from "@/hooks/useBranding";
import { useMenuItems } from "@/hooks/useMenuItems";

interface SidebarProps {
  onMobileClose?: () => void;
}

// Agrupamento visual do menu. A ordem e os rótulos continuam vindo de
// Configurações > Layout (useMenuItems); aqui só decidimos em qual seção cada
// página aparece.
const GROUPS: { label: string | null; paths: string[] }[] = [
  { label: null, paths: ["/dashboard", "/chamados", "/acompanhamento"] },
  { label: "Gestão", paths: ["/reports", "/usuarios", "/departamentos"] },
  { label: "Sistema", paths: ["/permissions", "/audit", "/backup", "/settings", "/ajuda"] },
];

export default function Sidebar({ onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { branding: layout } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = useMenuItems();

  const grouped = GROUPS.map((g) => ({
    label: g.label,
    items: menuItems.filter((i) => g.paths.includes(i.path)),
  }));
  const known = GROUPS.flatMap((g) => g.paths);
  const others = menuItems.filter((i) => !known.includes(i.path));
  if (others.length) grouped[grouped.length - 1].items.push(...others);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 md:relative flex h-screen flex-col bg-sidebar border-r border-sidebar-border transition-[width] duration-200 shadow-floating md:shadow-none",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      <div className={cn("flex items-center gap-2.5 h-16 shrink-0", collapsed ? "justify-center px-2" : "px-4")}>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2.5 min-w-0 hover:opacity-90 transition-opacity"
          title="Ir para o Painel"
        >
          <BrandMark logo={layout.companyLogo} size={32} />
          {!collapsed && (
            <span className="font-bold text-[15px] tracking-tight truncate">{layout.companyName || "Chamados"}</span>
          )}
        </button>
        {!collapsed && (
          <Button variant="ghost" size="icon" onClick={onMobileClose} className="ml-auto md:hidden h-8 w-8">
            <X size={18} />
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3">
        <TooltipProvider delayDuration={150}>
          {grouped.map((group, gi) =>
            group.items.length === 0 ? null : (
              <div key={gi} className={cn(gi > 0 && "mt-4")}>
                {group.label && !collapsed && (
                  <div className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                    {group.label}
                  </div>
                )}
                {group.label && collapsed && <div className="mx-3 mb-2 border-t" />}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = location.pathname === item.path;
                    const btn = (
                      <button
                        type="button"
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          if (window.innerWidth < 768 && onMobileClose) onMobileClose();
                        }}
                        className={cn(
                          "w-full flex items-center gap-2.5 rounded-lg text-[13.5px] font-medium transition-colors h-9",
                          collapsed ? "justify-center px-0" : "px-2.5",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                            : "text-sidebar-foreground hover:bg-muted"
                        )}
                      >
                        <item.icon size={18} className={cn("shrink-0", active ? "text-sidebar-accent-foreground" : "text-muted-foreground")} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </button>
                    );
                    if (!collapsed) return btn;
                    return (
                      <Tooltip key={item.path}>
                        <TooltipTrigger asChild>{btn}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </TooltipProvider>
      </nav>

      <div className="p-3 space-y-2 shrink-0">
        <InstallAppButton collapsed={collapsed} variant={collapsed ? "sidebar" : "card"} />
        <UserMenu collapsed={collapsed} />
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex w-full items-center justify-center gap-2 h-8 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /> Recolher</>}
        </button>
      </div>
    </aside>
  );
}
