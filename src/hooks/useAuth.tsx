import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  organization_id: string | null;
  is_master: boolean;
  department_id: string | null;
  position_id: string | null;
};

type Org = { id: string; name: string; slug: string };

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
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data: p } = await supabase
      .from("profiles")
      .select("id,email,full_name,avatar_url,organization_id,is_master,department_id,position_id")
      .eq("id", uid)
      .maybeSingle();
    
    setProfile(p ?? null);

    let activeOrgId = p?.organization_id;

    // For master users, prioritize localStorage selection
    if (p?.is_master) {
      const savedOrgId = localStorage.getItem("selected_org_id");
      if (savedOrgId) activeOrgId = savedOrgId;
    }

    if (activeOrgId) {
      const { data: o } = await supabase
        .from("organizations")
        .select("id,name,slug")
        .eq("id", activeOrgId)
        .maybeSingle();
      
      if (o) {
        setOrgState(o);
      } else {
        setOrgState(null);
        if (p?.is_master) localStorage.removeItem("selected_org_id");
      }
    } else {
      setOrgState(null);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        if (event === "SIGNED_IN") {
          supabase.rpc("log_user_action", { p_action: "LOGIN" }).then(() => {});
        }
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
        setOrgState(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
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
    <Ctx.Provider value={{ user, session, profile, org, loading, refresh, signOut, setOrg }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
