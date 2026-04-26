import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User as UserIcon, Mail, Phone, Hash, MapPin, KeyRound, Camera } from "lucide-react";
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import ChangePasswordDialog from "@/components/ChangePasswordDialog";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function getProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error: any) {
        toast({ variant: "destructive", title: "Erro ao carregar perfil", description: error.message });
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [toast]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          nome: profile.nome,
          sobrenome: profile.sobrenome,
          telefone: profile.telefone,
          ramal: profile.ramal,
          cidade: profile.cidade,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast({ title: "Sucesso", description: "Perfil atualizado com sucesso!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao atualizar perfil", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("ticket-attachments")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("ticket-attachments").getPublicUrl(path);
      const url = `${pub.publicUrl}?t=${Date.now()}`;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);
      if (updErr) throw updErr;
      setProfile({ ...profile, avatar_url: url });
      toast({ title: "Foto atualizada" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao enviar foto", description: err.message });
    } finally {
      setUploading(false);
    }
  };

   const getRoleLabel = (profile: any) => {
     if (profile?.is_master || profile?.regra === 'MASTER') return "Master";
     if (profile?.regra === 'ADMIN') return "Administrador";
     if (profile?.regra === 'TECNICO') return "Técnico";
     return "Usuário";
   };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e de contato.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary border-4 border-background shadow-lg overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon size={48} />
                  )}
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md hover:opacity-90"
                  title="Alterar foto"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera size={14} />}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </div>
              <div>
                <CardTitle className="text-xl">{profile?.nome} {profile?.sobrenome}</CardTitle>
                <CardDescription>{profile?.email}</CardDescription>
                 <div className="mt-2">
                   <Badge variant="outline" className={
                     profile?.is_master || profile?.regra === 'MASTER' ? 'border-purple-500 text-purple-500 bg-purple-50' :
                     profile?.regra === 'ADMIN' ? 'border-blue-500 text-blue-500 bg-blue-50' :
                     profile?.regra === 'TECNICO' ? 'border-amber-500 text-amber-500 bg-amber-50' :
                     'border-slate-500 text-slate-500 bg-slate-50'
                   }>
                     {getRoleLabel(profile)}
                   </Badge>
                 </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Mail size={16} />
              <span>{profile?.email}</span>
            </div>
            {profile?.telefone && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone size={16} />
                <span>{profile.telefone}</span>
              </div>
            )}
            {profile?.ramal && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Hash size={16} />
                <span>Ramal: {profile.ramal}</span>
              </div>
            )}
            {profile?.cidade && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin size={16} />
                <span>{profile.cidade}</span>
              </div>
            )}
            <div className="pt-2">
              <Button variant="outline" className="w-full gap-2" onClick={() => setPwdOpen(true)}>
                <KeyRound size={16} /> Trocar Senha
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Atualize seu nome e dados de contato.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={profile?.nome || ""}
                    onChange={(e) => setProfile({ ...profile, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sobrenome">Sobrenome</Label>
                  <Input
                    id="sobrenome"
                    value={profile?.sobrenome || ""}
                    onChange={(e) => setProfile({ ...profile, sobrenome: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail (Não editável)</Label>
                <Input id="email" value={profile?.email || ""} disabled />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={profile?.telefone || ""}
                    onChange={(e) => setProfile({ ...profile, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ramal">Ramal</Label>
                  <Input
                    id="ramal"
                    value={profile?.ramal || ""}
                    onChange={(e) => setProfile({ ...profile, ramal: e.target.value })}
                    placeholder="1234"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={profile?.cidade || ""}
                  onChange={(e) => setProfile({ ...profile, cidade: e.target.value })}
                  placeholder="Sua cidade"
                />
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
    </div>
  );
}
