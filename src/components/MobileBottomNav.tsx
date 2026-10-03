import { useNavigate, useLocation } from "react-router-dom";
import { Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMenuItems } from "@/hooks/useMenuItems";
import { usePermissions } from "@/hooks/usePermissions";

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

export default function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = useMenuItems();
  const { hasPermission } = usePermissions();
  const canOpenTicket = hasPermission("chamados");

  // Com o botão "+" no meio, cabem 2 atalhos de cada lado (o último é "Mais").
  const left = menuItems.slice(0, 2);
  const right = menuItems.slice(2, canOpenTicket ? 3 : 4);

  const NavButton = ({ item }: { item: (typeof menuItems)[number] }) => {
    const active = location.pathname === item.path;
    return (
      <button
        onClick={() => navigate(item.path)}
        className={cn(
          "flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10.5px] font-semibold transition-colors",
          active ? "text-primary" : "text-muted-foreground"
        )}
      >
        <item.icon size={21} />
        <span className="truncate max-w-[72px]">{item.label}</span>
      </button>
    );
  };

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch h-16">
        {left.map((item) => <NavButton key={item.path} item={item} />)}
        {canOpenTicket && (
          <div className="flex-1 flex justify-center">
            <button
              onClick={() => navigate("/chamados?novo=1")}
              aria-label="Novo chamado"
              className="-mt-5 h-14 w-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-[0_10px_24px_-6px_hsl(var(--primary)/0.6)] active:scale-95 transition-transform"
            >
              <Plus size={26} strokeWidth={2.4} />
            </button>
          </div>
        )}
        {right.map((item) => <NavButton key={item.path} item={item} />)}
        <button
          onClick={onMoreClick}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10.5px] font-semibold text-muted-foreground"
        >
          <Menu size={21} />
          <span>Mais</span>
        </button>
      </div>
    </nav>
  );
}
