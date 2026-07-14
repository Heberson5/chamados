import { useNavigate, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMenuItems } from "@/hooks/useMenuItems";

const MAX_VISIBLE_ITEMS = 4;

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

export default function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = useMenuItems();

  const visibleItems = menuItems.slice(0, MAX_VISIBLE_ITEMS);
  const hasMore = menuItems.length > MAX_VISIBLE_ITEMS;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar border-t shadow-[0_-4px_12px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch">
        {visibleItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon size={20} className={active ? "text-primary" : ""} />
              <span className="truncate max-w-[64px]">{item.label}</span>
            </button>
          );
        })}
        {hasMore && (
          <button
            onClick={onMoreClick}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground"
          >
            <Menu size={20} />
            <span>Mais</span>
          </button>
        )}
      </div>
    </nav>
  );
}
