 import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) {
       setLoading(false);
       return;
     }
 
     const { data: profile } = await supabase
       .from("profiles")
       .select("regra, is_master")
       .eq("id", user.id)
       .single();
 
     if (!profile) {
       setLoading(false);
       return;
     }
 
     setIsMaster(!!profile.is_master || profile.regra === "MASTER");
     setIsAdmin(profile.regra === "ADMIN" || profile.regra === "MASTER");
 
     // Map regra enum to role_definitions name
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
 
    if (roleDef) {
      setRoleData(roleDef);
      setPermissions((roleDef.permissions as string[]) || []);
    } else {
      if (profile.is_master || profile.regra === "MASTER") {
        // Fallback for Master if role_definition not found
        setPermissions(["Acesso Total", "dashboard", "chamados", "usuarios", "permissoes", "relatorios", "configuracoes", "audit", "inventario", "financeiro"]);
      } else {
        setPermissions([]);
      }
    }
 
     setLoading(false);
   };
 
   useEffect(() => {
     loadPermissions();
     
     // Listen for profile changes
     const channel = supabase.channel('permission-changes')
       .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadPermissions())
       .on('postgres_changes', { event: '*', schema: 'public', table: 'role_definitions' }, () => loadPermissions())
       .subscribe();
       
     return () => {
       supabase.removeChannel(channel);
     };
   }, []);
 
  const hasPermission = (permission: string) => {
    // Special case: if permissions array is empty but user is Master, they might be testing or have no role def.
    // However, to satisfy the user's request that disabling all perms should block access:
    if (permissions.includes("Acesso Total")) return true;
    
    // If checking a main menu permission (e.g., 'chamados')
    if (permissions.includes(permission)) return true;
    
    // If checking a granular permission (e.g., 'chamados:editar')
    // Check if the user has the specific permission or if it's implicitly allowed by main permission
    // (Though we want granular control, if they have 'chamados', they usually see the menu)
    return permissions.includes(permission);
  };
 
   return (
     <PermissionContext.Provider value={{ permissions, roleData, loading, hasPermission, isMaster, isAdmin }}>
       {children}
     </PermissionContext.Provider>
   );
 }
 
 export const usePermissions = () => useContext(PermissionContext);