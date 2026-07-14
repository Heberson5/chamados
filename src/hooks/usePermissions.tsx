  import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 
 interface PermissionContextValue {
   permissions: string[];
   roleData: any;
   loading: boolean;
   hasPermission: (permission: string) => boolean;
   isMaster: boolean;
   isAdmin: boolean;
 }
 
 const PermissionContext = createContext<PermissionContextValue>({
   permissions: [],
   roleData: null,
   loading: true,
   hasPermission: () => false,
   isMaster: false,
   isAdmin: false,
 });
 
export function PermissionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    permissions: string[];
    roleData: any;
    loading: boolean;
    isMaster: boolean;
    isAdmin: boolean;
  }>({
    permissions: [],
    roleData: null,
    loading: true,
    isMaster: false,
    isAdmin: false,
  });

  const currentUserIdRef = useRef<string | null>(null);

  const loadPermissions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    currentUserIdRef.current = user?.id ?? null;

    if (!user) {
      setState({
        permissions: [],
        roleData: null,
        loading: false,
        isMaster: false,
        isAdmin: false,
      });
      return;
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("regra, is_master")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile) {
        console.error("Error loading profile permissions:", profileError);
        setState(prev => ({ ...prev, permissions: [], loading: false }));
        return;
      }

        const isUserMaster = !!profile.is_master || String(profile.regra).toUpperCase() === "MASTER";
       const isUserAdmin = profile.regra === "ADMIN" || isUserMaster;
 
       const regraToName: Record<string, string> = {
         'MASTER': 'Master',
         'ADMIN': 'Administrador',
         'TECNICO': 'Técnico',
         'USUARIO': 'Usuário'
       };
 
       const roleName = regraToName[profile.regra as string] || profile.regra;
 
       const { data: roleDef } = await supabase
         .from("role_definitions")
         .select("*")
         .ilike("name", roleName)
         .maybeSingle();
 
        let newPermissions: string[] = [];
        if (roleDef) {
          newPermissions = (roleDef.permissions as string[]) || [];
        } else if (isUserMaster) {
           newPermissions = ["Acesso Total", "dashboard", "chamados", "acompanhamento", "usuarios", "permissoes", "relatorios", "configuracoes", "audit", "departamentos", "ajuda", "landing_page", "backup"];
        }

        setState({
          permissions: newPermissions,
          roleData: roleDef || null,
          loading: false,
          isMaster: isUserMaster,
          isAdmin: isUserAdmin,
        });
     } catch (err) {
       console.error("Unexpected error loading permissions:", err);
       setState(prev => ({ ...prev, loading: false }));
     }
  };

  useEffect(() => {
    loadPermissions();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // supabase-js re-validates the session on every tab/window focus regain
      // (GoTrueClient#_onVisibilityChanged -> _recoverAndRefresh) and re-fires
      // this listener with TOKEN_REFRESHED/USER_UPDATED, or even a *repeated*
      // SIGNED_IN for the exact same user when the token wasn't due to
      // refresh. Flipping `loading` back to true here was making the whole
      // app flash a full-screen spinner every single time the user switched
      // back to this tab (or to this window from another program). Only show
      // the loading gate for events that actually change who's signed in.
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        return;
      }
      if (event === "SIGNED_OUT" || !session) {
        currentUserIdRef.current = null;
        setState({ permissions: [], roleData: null, loading: false, isMaster: false, isAdmin: false });
        return;
      }
      if (event === "SIGNED_IN" && session.user.id === currentUserIdRef.current) {
        return;
      }
      currentUserIdRef.current = session.user.id;
      setState(prev => ({ ...prev, loading: true }));
      loadPermissions();
    });

    // Listen for profile/role changes
    const channel = supabase.channel('permission-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadPermissions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_definitions' }, () => loadPermissions())
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);
 
  const hasPermission = useCallback((permission: string) => {
    // Master users always have full access as per business rules
    if (state.isMaster) return true;
    
    if (state.permissions.includes("Acesso Total")) return true;
    
    // If checking a main menu permission (e.g., 'chamados')
    if (state.permissions.includes(permission)) return true;
    
    // If checking a granular permission (e.g., 'chamados:editar')
    return state.permissions.includes(permission);
  }, [state.isMaster, state.permissions]);
 
    return (
      <PermissionContext.Provider value={{ 
        permissions: state.permissions, 
        roleData: state.roleData, 
        loading: state.loading, 
        hasPermission, 
        isMaster: state.isMaster, 
        isAdmin: state.isAdmin 
      }}>
        {children}
      </PermissionContext.Provider>
    );
 }
 
 export const usePermissions = () => useContext(PermissionContext);