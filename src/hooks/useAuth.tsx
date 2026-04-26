import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  organization_id: string | null;
   is_master: boolean | null;
  department_id: string | null;
  position_id: string | null;
  role: "admin" | "agent" | "customer" | null;
};

type Org = { id: string; name: string; slug: string; email_settings?: any };

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  org: Org | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  setOrg: (org: Org | null) => void;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [org, setOrgState] = useState<Org | null>(null);
   const [loading, setLoading] = useState(false);
   const [initialized, setInitialized] = useState(false);
   const [isInitialLoad, setIsInitialLoad] = useState(true);
   const [error, setError] = useState<Error | null>(null);

  const loadProfile = async (uid: string, retryCount = 0) => {
    try {
      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select(`
          id, email, full_name, avatar_url, organization_id, is_master, department_id, position_id,
          user_roles ( role )
        `)
        .eq("id", uid)
        .maybeSingle();
      
      if (pErr) throw pErr;

      // If profile not found and it's a new login, retry a few times to wait for the trigger
      if (!p && retryCount < 3) {
        console.log(`Profile not found for ${uid}, retrying... (${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return loadProfile(uid, retryCount + 1);
      }

       const profileData = p ? {
         ...p,
         is_master: !!p.is_master,
         role: (p as any).user_roles?.[0]?.role ?? null
       } : null;

      setProfile(profileData as any);

      let activeOrgId = p?.organization_id;

       try {
         if (p?.is_master) {
           const savedOrgId = localStorage.getItem("selected_org_id");
           if (savedOrgId) activeOrgId = savedOrgId;
         }
       } catch (e) {
         console.warn("Could not access localStorage", e);
       }

       if (activeOrgId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeOrgId)) {
        const { data: o, error: oErr } = await supabase
          .from("organizations")
          .select("id,name,slug,email_settings")
          .eq("id", activeOrgId)
          .maybeSingle();
        
      if (oErr) {
        console.error("Error loading organization:", oErr);
        setOrgState(null);
      } else if (o) {
        setOrgState(o);
      } else {
        setOrgState(null);
        if (p?.is_master) localStorage.removeItem("selected_org_id");
      }
    } else {
      setOrgState(null);
    }
  } catch (err) {
    console.error("Error loading profile:", err);
    if (retryCount >= 3) {
      setProfile(null);
      setOrgState(null);
    }
    throw err;
  }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        setSession(s);
        setUser(s?.user ?? null);
        
        if (s?.user) {
          try {
            await loadProfile(s.user.id);
          } catch (err) {
            console.error("Failed to load profile during init:", err);
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) {
          setInitialized(true);
          setIsInitialLoad(false);
        }
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;
      
      setSession(s);
      setUser(s?.user ?? null);
      
      if (s?.user) {
        if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          setLoading(true);
          try {
            await loadProfile(s.user.id);
          } catch (err) {
            console.error("Failed to load profile on auth change:", err);
            if (mounted) setError(err instanceof Error ? err : new Error(String(err)));
          } finally {
            if (mounted) setLoading(false);
          }
        }
      } else {
        setProfile(null);
        setOrgState(null);
        if (mounted) setLoading(false);
        setInitialized(true);
      }
    });

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const refresh = async () => {
    if (user) await loadProfile(user.id);
  };

  const signOut = async () => {
    await supabase.rpc("log_user_action", { p_action: "LOGOUT" });
    await supabase.auth.signOut();
  };

  const setOrg = (o: Org | null) => {
    setOrgState(o);
    // Only persist if the user is a master user
    // We check profile directly here
    if (profile?.is_master) {
      if (o) localStorage.setItem("selected_org_id", o.id);
      else localStorage.removeItem("selected_org_id");
    }
  };

  return (
    <Ctx.Provider value={{ user, session, profile, org, loading: loading || isInitialLoad, refresh, signOut, setOrg }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
