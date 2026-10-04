import { useState, useEffect, useCallback, Suspense } from "react";
import { Outlet, useLocation, useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "./Sidebar";
import MobileBottomNav from "./MobileBottomNav";
import { Button } from "./ui/button";
import { Search, Moon, Sun, Plus } from "lucide-react";
import ChangePasswordDialog from "./ChangePasswordDialog";
import { useBranding } from "@/hooks/useBranding";
import { usePermissions } from "@/hooks/usePermissions";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { Loader2 } from "lucide-react";
import AccessGuard from "./AccessGuard";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { useMenuItems } from "@/hooks/useMenuItems";
import { useTheme } from "./ThemeProvider";
import BrandMark from "./BrandMark";
import NotificationsBell from "./NotificationsBell";
import CommandPalette, { OPEN_COMMAND_PALETTE } from "./CommandPalette";
import SecurityGate from "./security/SecurityGate";

const EXTRA_TITLES: Record<string, string> = {
  "/perfil": "Meu perfil",
  "/privacidade": "Privacidade (LGPD)",
  "/backup": "Backup",
  "/configuracoes/senhas": "Política de senhas",
  "/unauthorized": "Acesso restrito",
};

const PageLoader = () => (
  <div className="flex h-full min-h-[60vh] w-full items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Inactivity timer
  useSessionTimeout();
  // Register this session in the global presence channel (singleton)
  useOnlineUsers();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Force logout listener
  useEffect(() => {
    let cancelled = false;
    let logoutChannel: any = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      logoutChannel = supabase.channel(`force-logout-${user.id}`);
      logoutChannel
        .on("broadcast", { event: "logout" }, async () => {
          await supabase.auth.signOut();
          navigate("/login");
        })
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (logoutChannel) supabase.removeChannel(logoutChannel);
    };
  }, [navigate]);
  const { branding } = useBranding();
  const menuItems = useMenuItems();
  const { theme, setTheme } = useTheme();
   const { hasPermission, loading: permissionsLoading, isMaster } = usePermissions();

  useEffect(() => {
    if (isAuthenticated === false) {
      navigate('/login');
      return;
    }

      if (isAuthenticated === true && !permissionsLoading) {
        const path = location.pathname;

        if (isMaster) {
          // If Master somehow ends up in unauthorized, send to dashboard
          if (path === '/unauthorized') {
            navigate('/dashboard');
          }
          return;
        }

      const pageToPermission: Record<string, string> = {
        '/dashboard': 'dashboard',
        '/chamados': 'chamados',
        '/reports': 'relatorios',
        '/usuarios': 'usuarios',
        '/permissions': 'permissoes',
        '/audit': 'audit',
        '/settings': 'configuracoes',
        '/backup': 'backup',
        '/privacidade': 'privacidade'
      };

      const requiredPermission = pageToPermission[path];
      if (requiredPermission && !hasPermission(requiredPermission)) {
        if (path !== '/dashboard') {
          navigate('/dashboard');
        } else {
          // If even dashboard is blocked
          navigate('/unauthorized');
        }
      }
    }
  }, [location.pathname, isAuthenticated, permissionsLoading, hasPermission, isMaster, navigate]);

  useEffect(() => {
    const trackNavigation = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id_numerico")
          .eq("id", user.id)
          .single();

        await supabase.from("audit_logs").insert({
          auth_user_id: user.id,
          user_id: profile?.id_numerico,
          user_email: user.email,
          action: "NAVIGATION",
          path: location.pathname,
          created_at: new Date().toISOString()
        });
      }
    };
    trackNavigation();
  }, [location.pathname]);

  useEffect(() => {
    const checkPasswordChange = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("must_change_password, password_changed_at")
        .eq("id", user.id)
        .maybeSingle();

      if (data?.must_change_password) {
        setMustChange(true);
        return;
      }

      // Check expiration
      const { data: policy } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "password_policy")
        .maybeSingle();
      const exp = (policy?.value as any)?.expiration_days ?? 0;
      if (exp > 0 && data?.password_changed_at) {
        const last = new Date(data.password_changed_at).getTime();
        const ageDays = (Date.now() - last) / (1000 * 60 * 60 * 24);
        if (ageDays > exp) setMustChange(true);
      }
    };
    checkPasswordChange();
  }, []);

  if (isAuthenticated === null || permissionsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentItem = menuItems.find((i) => i.path === location.pathname);
  const pageTitle = currentItem?.label || EXTRA_TITLES[location.pathname] || "";
  const canOpenTicket = hasPermission("chamados");
  const openPalette = () => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE));
  const isDark = theme === "dark" || (theme === "system" && document.documentElement.classList.contains("dark"));

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={isSidebarOpen ? "block" : "hidden md:block"}>
        <Sidebar onMobileClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AccessGuard />
        {/* Barra superior (desktop) */}
        <header className="hidden md:flex items-center gap-3 h-16 px-6 lg:px-8 border-b bg-card/80 backdrop-blur shrink-0">
          <h2 className="text-[15px] font-semibold truncate">{pageTitle}</h2>
          <button
            type="button"
            onClick={openPalette}
            className="ml-auto flex items-center gap-2 h-9 w-full max-w-[360px] px-3 rounded-lg border bg-background text-sm text-muted-foreground hover:border-input transition-colors"
          >
            <Search size={15} />
            <span className="flex-1 text-left truncate">Buscar chamados, páginas…</span>
            <span className="kbd">Ctrl</span><span className="kbd">K</span>
          </button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            title={isDark ? "Usar tema claro" : "Usar tema escuro"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <NotificationsBell />
          {canOpenTicket && (
            <Button onClick={() => navigate("/chamados?novo=1")}>
              <Plus className="h-4 w-4" /> Novo chamado
            </Button>
          )}
        </header>

        {/* Mobile Header */}
        <header className="flex items-center gap-2 px-4 h-14 border-b md:hidden shrink-0 bg-card relative z-10">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 overflow-hidden min-w-0 hover:opacity-80 transition-opacity"
            title="Ir para o Painel"
          >
            <BrandMark logo={branding.companyLogo} size={28} />
            <span className="font-bold text-[17px] tracking-tight truncate">
              {branding.companyName || "Chamados"}
            </span>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={openPalette} aria-label="Buscar">
              <Search size={19} />
            </Button>
            <NotificationsBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto min-w-0 pb-20 md:pb-0">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>

        <MobileBottomNav onMoreClick={() => setIsSidebarOpen(true)} />
      </div>

      <CommandPalette />
      {!mustChange && <SecurityGate />}
      <ChangePasswordDialog
        open={mustChange}
        onOpenChange={setMustChange}
        forced
        onSuccess={() => setMustChange(false)}
      />
    </div>
  );
}