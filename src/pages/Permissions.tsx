import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, User, Hammer, Crown, Plus, Pencil, Trash2, PowerOff, CheckCircle2, Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function Permissions() {
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
    if (!selectedRole.name) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("role_definitions")
        .upsert({
          id: selectedRole.id || undefined,
          name: selectedRole.name,
          description: selectedRole.description,
          icon: selectedRole.icon,
          color: selectedRole.color,
          bg_color: selectedRole.bg_color,
          can_create: selectedRole.can_create,
          can_edit: selectedRole.can_edit,
          can_delete: selectedRole.can_delete,
          can_inactivate: selectedRole.can_inactivate,
          permissions: selectedRole.permissions
        });

      if (error) throw error;
      toast({ title: "Sucesso", description: "Permissão salva com sucesso!" });
      setIsDialogOpen(false);
      fetchRoles();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
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

  const getIcon = (iconName: string) => {
    const icons: Record<string, any> = { Crown, Shield, Hammer, User };
    const IconComp = icons[iconName] || User;
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {roles.map((role) => (
          <Card key={role.id} className="flex flex-col h-full border-2 hover:border-primary/20 transition-all relative group">
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
            <CardHeader className="text-center pb-2">
              <div className={`mx-auto w-12 h-12 rounded-full ${role.bg_color} flex items-center justify-center mb-2 ${role.color}`}>
                {getIcon(role.icon)}
              </div>
              <CardTitle className={role.color}>{role.name}</CardTitle>
              <CardDescription className="text-xs min-h-[40px]">{role.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-2 mt-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Permissões Incluídas:</h4>
                <ul className="space-y-1">
                  {(role.permissions || []).map((perm: string) => (
                    <li key={perm} className="text-xs flex items-center gap-2">
                      <div className={`w-1 h-1 rounded-full ${role.color}`} />
                      {perm}
                    </li>
                  ))}
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
            <div className="grid grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Permissão</Label>
                  <Input value={selectedRole.name} onChange={e => setSelectedRole({...selectedRole, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input value={selectedRole.description} onChange={e => setSelectedRole({...selectedRole, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Cor (Texto)</Label>
                    <Input value={selectedRole.color} onChange={e => setSelectedRole({...selectedRole, color: e.target.value})} placeholder="text-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor (Fundo)</Label>
                    <Input value={selectedRole.bg_color} onChange={e => setSelectedRole({...selectedRole, bg_color: e.target.value})} placeholder="bg-blue-500/10" />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <Label className="block mb-2 font-bold">Ações Granulares</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Pode Criar</Label>
                    <Switch checked={selectedRole.can_create} onCheckedChange={v => setSelectedRole({...selectedRole, can_create: v})} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Pode Editar</Label>
                    <Switch checked={selectedRole.can_edit} onCheckedChange={v => setSelectedRole({...selectedRole, can_edit: v})} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Pode Excluir</Label>
                    <Switch checked={selectedRole.can_delete} onCheckedChange={v => setSelectedRole({...selectedRole, can_delete: v})} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Pode Inativar</Label>
                    <Switch checked={selectedRole.can_inactivate} onCheckedChange={v => setSelectedRole({...selectedRole, can_inactivate: v})} />
                  </div>
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