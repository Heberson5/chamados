import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(80),
});

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "empresa";

const Onboarding = () => {
  const { user, profile, refresh, loading, signOut } = useAuth();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user !== undefined) {
      if (!user) navigate("/auth", { replace: true });
      else if (profile && (profile.organization_id || profile.is_master)) {
        navigate("/app", { replace: true });
      }
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="size-6 rounded-full border-2 border-muted border-t-foreground animate-spin" />
      </div>
    );
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!user) return;
    setBusy(true);
    try {
      const baseSlug = slugify(name);
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: org, error: orgErr } = await supabase
        .from("organizations").insert({ name, slug }).select("id").single();
      if (orgErr) throw orgErr;

      const { error: profErr } = await supabase
        .from("profiles").update({ organization_id: org.id }).eq("id", user.id);
      if (profErr) throw profErr;

      const { error: roleErr } = await supabase
        .from("user_roles").insert({ user_id: user.id, organization_id: org.id, role: "admin" });
      if (roleErr) throw roleErr;

      await refresh();
      toast.success("Empresa criada!");
      navigate("/app", { replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar empresa");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-surface-1">
      <div className="w-full max-w-md">
        <form onSubmit={create} className="bg-background border border-border rounded-xl p-8 shadow-soft">
          <h1 className="text-2xl font-semibold tracking-tight">Configure sua empresa</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Você será o administrador desta organização.
          </p>
          <div className="space-y-1.5 mt-6">
            <Label htmlFor="name">Nome da empresa</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Ltda." />
          </div>
          <Button type="submit" className="w-full mt-6" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : "Criar empresa"}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-foreground"
            onClick={async () => {
              await signOut();
              navigate("/auth");
            }}
          >
            <LogOut className="size-4 mr-2" />
            Sair e entrar com outra conta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;