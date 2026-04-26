import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";
import { DEFAULT_POLICY, type PasswordPolicy, clearPolicyCache } from "@/lib/passwordPolicy";

export default function PasswordPolicyPage() {
  const [policy, setPolicy] = useState<PasswordPolicy>(DEFAULT_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("regra, is_master")
        .eq("id", user.id)
        .single();
      const ok = prof?.is_master || prof?.regra === "MASTER" || prof?.regra === "ADMIN";
      setAllowed(!!ok);

      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "password_policy")
        .maybeSingle();
      if (data?.value) setPolicy({ ...DEFAULT_POLICY, ...(data.value as any) });
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert({ key: "password_policy", value: policy as any }, { onConflict: "key" });
      if (error) throw error;
      clearPolicyCache();
      toast({ title: "Salvo", description: "Política de senhas atualizada." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <ShieldCheck className="text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Política de Senhas</h1>
          <p className="text-muted-foreground">Defina as regras de senha aplicadas a todos os usuários.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regras de complexidade</CardTitle>
          <CardDescription>Exigências mínimas para qualquer senha do sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 max-w-xs">
            <Label>Tamanho mínimo</Label>
            <Input
              type="number"
              min={6}
              max={64}
              value={policy.min_length}
              onChange={(e) => setPolicy({ ...policy, min_length: Math.max(6, Number(e.target.value) || 8) })}
            />
          </div>

          <div className="space-y-3">
            {[
              { key: "require_uppercase", label: "Exigir letra maiúscula (A-Z)" },
              { key: "require_lowercase", label: "Exigir letra minúscula (a-z)" },
              { key: "require_number", label: "Exigir número (0-9)" },
              { key: "require_special", label: "Exigir caractere especial (ex: !@#$%, pontuação)" },
            ].map((opt) => (
              <div key={opt.key} className="flex items-center justify-between border rounded-md p-3">
                <Label>{opt.label}</Label>
                <Switch
                  checked={(policy as any)[opt.key]}
                  onCheckedChange={(v) => setPolicy({ ...policy, [opt.key]: v } as any)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expiração e primeiro login</CardTitle>
          <CardDescription>Controle quando o usuário é obrigado a trocar a senha.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between border rounded-md p-3">
            <div>
              <Label>Forçar troca no primeiro login</Label>
              <p className="text-xs text-muted-foreground">
                Usuários criados pelo administrador devem definir uma nova senha ao acessar pela primeira vez.
              </p>
            </div>
            <Switch
              checked={policy.force_change_on_first_login}
              onCheckedChange={(v) => setPolicy({ ...policy, force_change_on_first_login: v })}
            />
          </div>

          <div className="space-y-2 max-w-xs">
            <Label>Trocar senha a cada (dias)</Label>
            <Input
              type="number"
              min={0}
              max={365}
              value={policy.expiration_days}
              onChange={(e) => setPolicy({ ...policy, expiration_days: Math.max(0, Number(e.target.value) || 0) })}
            />
            <p className="text-xs text-muted-foreground">
              Use 0 para nunca expirar.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar política
        </Button>
      </div>
    </div>
  );
}