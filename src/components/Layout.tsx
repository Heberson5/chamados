import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "./Sidebar";
import { Button } from "./ui/button";
import { Menu, X } from "lucide-react";
import ChangePasswordDialog from "./ChangePasswordDialog";

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const trackNavigation = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("audit_logs").insert({
          user_id: user.id,
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

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <div className={isSidebarOpen ? "block" : "hidden md:block"}>
        <Sidebar onMobileClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="flex items-center justify-between p-4 border-b md:hidden shrink-0">
          <span className="font-bold text-lg">Help-Me</span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>

      <ChangePasswordDialog
        open={mustChange}
        onOpenChange={setMustChange}
        forced
        onSuccess={() => setMustChange(false)}
      />
    </div>
  );
}