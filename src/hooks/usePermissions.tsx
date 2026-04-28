  import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
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
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roleData, setRoleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMaster, setIsMaster] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadPermissions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (!user) {
      setPermissions([]);
      setRoleData(null);
      setIsMaster(false);
      setIsAdmin(false);
      setLoading(false);
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
        setPermissions([]);
        setLoading(false);
        return;
      }

       const isUserMaster = !!profile.is_master || profile.regra === "MASTER";
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
 
       // Batch all state updates together to avoid inconsistent intermediate states
       setIsMaster(isUserMaster);
       setIsAdmin(isUserAdmin);
 
       if (roleDef) {
         setRoleData(roleDef);
         setPermissions((roleDef.permissions as string[]) || []);
       } else {
         if (isUserMaster) {
           setPermissions(["Acesso Total", "dashboard", "chamados", "usuarios", "permissoes", "relatorios", "configuracoes", "audit", "inventario", "financeiro"]);
         } else {
           setPermissions([]);
         }
       }
    } catch (err) {
      console.error("Unexpected error loading permissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
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
    if (isMaster) return true;
    
    if (permissions.includes("Acesso Total")) return true;
    
    // If checking a main menu permission (e.g., 'chamados')
    if (permissions.includes(permission)) return true;
    
    // If checking a granular permission (e.g., 'chamados:editar')
    return permissions.includes(permission);
  }, [isMaster, permissions]);
 
   return (
     <PermissionContext.Provider value={{ permissions, roleData, loading, hasPermission, isMaster, isAdmin }}>
       {children}
     </PermissionContext.Provider>
   );
 }
 
 export const usePermissions = () => useContext(PermissionContext);