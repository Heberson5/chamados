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
     if (p?.organization_id) {
       const { data: o } = await supabase
         .from("organizations")
         .select("id,name,slug")
         .eq("id", p.organization_id)
         .maybeSingle();
       setOrgState(o ?? null);
     } else {
       setOrgState(null);
     }
  };

  useEffect(() => {
    // Set listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
     if (s?.user) {
       // Defer Supabase calls to avoid deadlocks
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
    await supabase.auth.signOut();
  };

   return (
     <Ctx.Provider value={{ user, session, profile, org, loading, refresh, signOut, setOrg: setOrgState }}>
       {children}
     </Ctx.Provider>
   );
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};