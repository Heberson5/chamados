import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Shield, User, Hammer, Crown, Plus, Pencil, Trash2, PowerOff, CheckCircle2, Loader2, Save, LayoutDashboard, Ticket, Box, DollarSign, Users, Key, FileText, Settings, History, Search, HelpCircle, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";

export default function Permissions() {
  const navigate = useNavigate();
  const { hasPermission, loading: permsLoading } = usePermissions();

  useEffect(() => {
    if (!permsLoading && !hasPermission("permissoes")) {
      navigate("/dashboard");
    }
  }, [permsLoading, hasPermission, navigate]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const { toast } = useToast();

  const fetchRoles = async () => {
    const { data, error } = await supabase.from("role_definitions").select("*").order("name");
    if (data) setRoles(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleSaveRole = async () => {
    if (!selectedRole?.name) {
      toast({ variant: "destructive", title: "Erro", description: "Informe o nome da permissão." });
      return;
    }
    setIsLoading(true);
    try {
      const payload: any = {
        name: selectedRole.name,
        description: selectedRole.description ?? null,
        icon: selectedRole.icon ?? "User",
        color: selectedRole.color ?? "text-slate-500",
        bg_color: selectedRole.bg_color ?? "bg-slate-500/10",
        can_create: !!selectedRole.can_create,
        can_edit: !!selectedRole.can_edit,
        can_delete: !!selectedRole.can_delete,
        can_inactivate: !!selectedRole.can_inactivate,
        permissions: selectedRole.permissions ?? [],
      };

      let error: any = null;
      if (selectedRole.id) {
        const res = await supabase
          .from("role_definitions")
          .update(payload)
          .eq("id", selectedRole.id);
        error = res.error;
      } else {
        const res = await supabase
          .from("role_definitions")
          .insert(payload);
        error = res.error;
      }

      if (error) throw error;
      toast({ title: "Sucesso", description: "Permissão salva com sucesso!" });
      setIsDialogOpen(false);
      setSelectedRole(null);
      fetchRoles();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta permissão?")) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from("role_definitions").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Permissão excluída." });
      fetchRoles();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

   const availableIcons = [
     { name: "User", icon: User },
     { name: "Shield", icon: Shield },
     { name: "Hammer", icon: Hammer },
     { name: "Crown", icon: Crown },
     { name: "LayoutDashboard", icon: LayoutDashboard },
     { name: "Ticket", icon: Ticket },
     { name: "Box", icon: Box },
     { name: "DollarSign", icon: DollarSign },
     { name: "Users", icon: Users },
     { name: "Key", icon: Key },
     { name: "FileText", icon: FileText },
      { name: "Settings", icon: Settings },
      { name: "History", icon: History },
      { name: "HelpCircle", icon: HelpCircle },
      { name: "Building2", icon: Building2 },
    ];
 
     const availableMenus = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, actions: ["Visualizar", "Exportar", "Ver Chamados por Usuário", "Ver Conformidade SLA"] },
        { id: "chamados", label: "Chamados", icon: Ticket, actions: ["Visualizar", "Criar", "Editar", "Encerrar", "Reabrir", "Excluir", "Ver Interações", "Assumir Chamado", "Transferir"] },
        { id: "acompanhamento", label: "Acompanhamento", icon: FileText, actions: ["Visualizar", "Exportar Excel", "Exportar PDF"] },
        { id: "usuarios", label: "Usuários", icon: Users, actions: ["Visualizar", "Criar", "Editar", "Excluir", "Alterar Senha", "Gerenciar Roles"] },
        { id: "permissoes", label: "Permissões", icon: Key, actions: ["Visualizar", "Criar", "Editar", "Excluir", "Visualizar Roles"] },
        { id: "relatorios", label: "Relatórios", icon: FileText, actions: ["Visualizar", "Exportar PDF", "Exportar Excel", "Ver Desempenho Técnico"] },
        { id: "departamentos", label: "Departamentos", icon: Building2, actions: ["Visualizar", "Criar", "Editar", "Excluir"] },
        { id: "configuracoes", label: "Configurações", icon: Settings, actions: ["Visualizar", "Geral", "Layout", "E-mail", "Segurança", "Kanban"] },
        { id: "audit", label: "Auditoria", icon: History, actions: ["Visualizar", "Exportar", "Limpar Logs"] },
        { id: "ajuda", label: "Ajuda", icon: HelpCircle, actions: ["Visualizar", "Editar Manuais"] },
     ];
 
   const getIcon = (iconName: string) => {
     const IconComp = availableIcons.find(i => i.name === iconName)?.icon || User;
     return <IconComp className="w-6 h-6" />;
   };

  if (isLoading && roles.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permissões</h1>
          <p className="text-muted-foreground">Gerencie os níveis de acesso e permissões de cada tipo de usuário.</p>
        </div>
        <Button onClick={() => {
          setSelectedRole({
            name: "",
            description: "",
            icon: "User",
            color: "text-slate-500",
            bg_color: "bg-slate-500/10",
            permissions: [],
            can_create: true,
            can_edit: true,
            can_delete: false,
            can_inactivate: false
          });
          setIsDialogOpen(true);
        }} className="gap-2">
          <Plus size={18} /> Nova Permissão
        </Button>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
        {roles.map((role) => (
          <Card key={role.id} className="flex flex-col h-full min-h-[480px] border-2 hover:border-primary/20 transition-all relative group">
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                setSelectedRole(role);
                setIsDialogOpen(true);
              }}>
                <Pencil size={14} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRole(role.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
            <CardHeader className="text-center pb-2 relative">
              <div className="absolute top-2 left-2 text-[10px] font-mono text-muted-foreground">
                #{role.id_numerico}
              </div>
              <div className={`mx-auto w-12 h-12 rounded-full ${role.bg_color} flex items-center justify-center mb-2 ${role.color}`}>
                {getIcon(role.icon)}
              </div>
              <CardTitle className={role.color}>{role.name}</CardTitle>
              <CardDescription className="text-xs min-h-[40px]">{role.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="space-y-2 mt-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Permissões Incluídas:</h4>
                <ul className="space-y-1">
                  {(role.permissions || []).slice(0, 5).map((perm: string) => {
                    // Format permission name to be more readable (e.g. "chamados:visualizar" -> "Chamados (Visualizar)")
                    const label = perm.includes(':') 
                      ? perm.split(':').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' (') + ')'
                      : perm.charAt(0).toUpperCase() + perm.slice(1);
                    
                    return (
                      <li key={perm} className="text-xs flex items-center gap-2 truncate">
                        <div className={`w-1 h-1 rounded-full flex-shrink-0 ${role.color}`} />
                        <span className="truncate">{label}</span>
                      </li>
                    );
                  })}
                  {(role.permissions || []).length > 5 && (
                    <li className="text-[10px] font-medium text-muted-foreground mt-1 bg-muted/30 px-2 py-0.5 rounded-full inline-block">
                      +{(role.permissions.length - 5)} acessos
                    </li>
                  )}
                  {(!role.permissions || role.permissions.length === 0) && (
                    <li className="text-xs text-muted-foreground italic">Nenhuma permissão definida</li>
                  )}
                </ul>
              </div>
               <div className="space-y-3 mt-6 border-t pt-4">
                 <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ações Granulares:</h4>
                 <div className="grid grid-cols-2 gap-2">
                   <Badge variant={role.can_create ? "outline" : "secondary"} className={`w-full justify-start gap-1 text-[9px] ${role.can_create ? 'border-green-500/50 text-green-600' : 'opacity-40'}`}>
                     <Plus size={10} /> Criar
                   </Badge>
                   <Badge variant={role.can_edit ? "outline" : "secondary"} className={`w-full justify-start gap-1 text-[9px] ${role.can_edit ? 'border-blue-500/50 text-blue-600' : 'opacity-40'}`}>
                     <Pencil size={10} /> Editar
                   </Badge>
                   <Badge variant={role.can_delete ? "outline" : "secondary"} className={`w-full justify-start gap-1 text-[9px] ${role.can_delete ? 'border-red-500/50 text-red-600' : 'opacity-40'}`}>
                     <Trash2 size={10} /> Excluir
                   </Badge>
                   <Badge variant={role.can_inactivate ? "outline" : "secondary"} className={`w-full justify-start gap-1 text-[9px] ${role.can_inactivate ? 'border-orange-500/50 text-orange-600' : 'opacity-40'}`}>
                     <PowerOff size={10} /> Inativar
                   </Badge>
                 </div>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedRole?.id ? "Editar Permissão" : "Nova Permissão"}</DialogTitle>
          </DialogHeader>
           {selectedRole && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4 overflow-y-auto max-h-[70vh] px-2">
               <div className="space-y-6">
                 <div className="space-y-4">
                   <h3 className="font-bold border-b pb-2">Informações Básicas</h3>
                   <div className="space-y-2">
                     <Label>Nome da Permissão</Label>
                     <Input value={selectedRole.name} onChange={e => setSelectedRole({...selectedRole, name: e.target.value})} placeholder="Ex: Técnico Nível 1" />
                   </div>
                   <div className="space-y-2">
                     <Label>Descrição</Label>
                     <Input value={selectedRole.description} onChange={e => setSelectedRole({...selectedRole, description: e.target.value})} placeholder="O que este nível pode fazer?" />
                   </div>
                   <div className="space-y-3">
                     <Label>Ícone</Label>
                     <div className="grid grid-cols-6 gap-2">
                       {availableIcons.map((item) => (
                         <button
                           key={item.name}
                           onClick={() => setSelectedRole({...selectedRole, icon: item.name})}
                           className={`p-2 rounded-md border flex items-center justify-center transition-all ${selectedRole.icon === item.name ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                         >
                           <item.icon size={20} />
                         </button>
                       ))}
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label>Cor do Tema</Label>
                       <div className="flex items-center gap-2">
                         <Input 
                           type="color" 
                           className="w-12 h-10 p-1 cursor-pointer"
                           value={selectedRole.color_hex || "#3b82f6"} 
                           onChange={e => {
                             const hex = e.target.value;
                             setSelectedRole({
                               ...selectedRole, 
                               color_hex: hex,
                               color: `text-[${hex}]`,
                               bg_color: `bg-[${hex}]/10`
                             });
                           }} 
                         />
                         <span className="text-xs font-mono">{selectedRole.color_hex || "#3b82f6"}</span>
                       </div>
                     </div>
                   </div>
                 </div>
 
                 <div className="space-y-4">
                   <h3 className="font-bold border-b pb-2">Ações Globais</h3>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="flex items-center justify-between border p-3 rounded-lg">
                       <div className="flex flex-col">
                         <Label className="text-sm">Pode Criar</Label>
                         <span className="text-[10px] text-muted-foreground">Novos registros</span>
                       </div>
                       <Switch checked={selectedRole.can_create} onCheckedChange={v => setSelectedRole({...selectedRole, can_create: v})} />
                     </div>
                     <div className="flex items-center justify-between border p-3 rounded-lg">
                       <div className="flex flex-col">
                         <Label className="text-sm">Pode Editar</Label>
                         <span className="text-[10px] text-muted-foreground">Alterar dados</span>
                       </div>
                       <Switch checked={selectedRole.can_edit} onCheckedChange={v => setSelectedRole({...selectedRole, can_edit: v})} />
                     </div>
                     <div className="flex items-center justify-between border p-3 rounded-lg">
                       <div className="flex flex-col">
                         <Label className="text-sm text-destructive">Pode Excluir</Label>
                         <span className="text-[10px] text-muted-foreground">Remover do sistema</span>
                       </div>
                       <Switch checked={selectedRole.can_delete} onCheckedChange={v => setSelectedRole({...selectedRole, can_delete: v})} />
                     </div>
                     <div className="flex items-center justify-between border p-3 rounded-lg">
                       <div className="flex flex-col">
                         <Label className="text-sm text-orange-600">Pode Inativar</Label>
                         <span className="text-[10px] text-muted-foreground">Desativar temporário</span>
                       </div>
                       <Switch checked={selectedRole.can_inactivate} onCheckedChange={v => setSelectedRole({...selectedRole, can_inactivate: v})} />
                     </div>
                   </div>
                 </div>
               </div>
 
               <div className="space-y-4">
                 <h3 className="font-bold border-b pb-2">Acesso aos Menus e Funções</h3>
                 <div className="space-y-3">
                   {availableMenus.map((menu) => (
                     <div key={menu.id} className="border rounded-lg p-3 space-y-3">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <menu.icon size={16} className="text-muted-foreground" />
                           <Label className="font-semibold">{menu.label}</Label>
                         </div>
                         <Switch 
                           checked={(selectedRole.permissions || []).includes(menu.id)} 
                           onCheckedChange={(checked) => {
                             const currentPerms = selectedRole.permissions || [];
                             let nextPerms = [];
                             if (checked) {
                               nextPerms = [...currentPerms, menu.id];
                             } else {
                               nextPerms = currentPerms.filter((p: string) => p !== menu.id && !p.startsWith(`${menu.id}:`));
                             }
                             setSelectedRole({...selectedRole, permissions: nextPerms});
                           }} 
                         />
                       </div>
                       
                        {(selectedRole.permissions || []).includes(menu.id) && menu.actions && (
                          <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t pt-2">
                            {menu.actions.map(func => {
                              const funcKey = `${menu.id}:${func.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_")}`;
                             return (
                               <div key={funcKey} className="flex items-center gap-2">
                                 <Switch 
                                   className="scale-75"
                                   checked={(selectedRole.permissions || []).includes(funcKey)}
                                   onCheckedChange={(checked) => {
                                     const currentPerms = selectedRole.permissions || [];
                                     if (checked) {
                                       setSelectedRole({...selectedRole, permissions: [...currentPerms, funcKey]});
                                     } else {
                                       setSelectedRole({...selectedRole, permissions: currentPerms.filter((p: string) => p !== funcKey)});
                                     }
                                   }}
                                 />
                                 <span className="text-xs">{func}</span>
                               </div>
                             );
                           })}
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               </div>
             </div>
           )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveRole} disabled={isLoading} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={18} />}
              Salvar Permissão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}