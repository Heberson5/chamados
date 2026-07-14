import {
  LayoutDashboard,
  Ticket,
  Settings,
  BarChart3,
  Package,
  History,
  Users,
  Lock,
  Building2,
  HelpCircle,
  ClipboardList,
  DatabaseBackup,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useBranding } from "@/hooks/useBranding";

export const defaultMenuItems = [
  { id: '1', icon: LayoutDashboard, label: "Painel", path: "/dashboard", permission: "dashboard" },
  { id: '2', icon: Ticket, label: "Chamados", path: "/chamados", permission: "chamados" },
  { id: '11', icon: ClipboardList, label: "Acompanhamento", path: "/acompanhamento", permission: "acompanhamento" },
  { id: '6', icon: BarChart3, label: "Relatórios", path: "/reports", permission: "relatorios" },
  { id: '3', icon: Users, label: "Usuários", path: "/usuarios", permission: "usuarios" },
  { id: '9', icon: Building2, label: "Departamentos", path: "/departamentos", permission: "departamentos" },
  { id: '4', icon: Lock, label: "Permissões", path: "/permissions", permission: "permissoes" },
  { id: '5', icon: History, label: "Auditoria", path: "/audit", permission: "audit" },
  { id: '10', icon: HelpCircle, label: "Ajuda", path: "/ajuda", permission: "ajuda" },
  { id: '12', icon: DatabaseBackup, label: "Backup", path: "/backup", permission: "backup" },
  { id: '8', icon: Settings, label: "Configurações", path: "/settings", permission: "configuracoes" },
];

export function useMenuItems() {
  const { hasPermission } = usePermissions();
  const { branding: layout } = useBranding();

  if (!layout.menuOrder || layout.menuOrder.length === 0) {
    return defaultMenuItems.filter(item => hasPermission(item.permission));
  }

  const orderedItems = layout.menuOrder
    .map((orderItem: any) => {
      const defaultItem = defaultMenuItems.find(i => i.id === orderItem.id || i.label === orderItem.label);
      if (!defaultItem) return null;
      return { ...defaultItem, label: orderItem.label, visible: orderItem.visible !== false };
    })
    .filter((item): item is typeof defaultMenuItems[number] & { visible: boolean } => item !== null);

  defaultMenuItems.forEach(defaultItem => {
    if (!orderedItems.some(item => item.id === defaultItem.id)) {
      orderedItems.push({ ...defaultItem, visible: true });
    }
  });

  return orderedItems.filter(item => item.visible && hasPermission(item.permission));
}
