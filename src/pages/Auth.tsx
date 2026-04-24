import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Headphones, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const schema = z.object({
  email: z.string().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
  name: z.string().trim().min(1, "Nome obrigatório").max(100).optional(),
});

const Auth = () => {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(params.get("mode") === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { data: settings } = useSystemSettings();

  useEffect(() => {
    // Só redireciona automaticamente se já estiver logado E tiver empresa vinculada
    // Isso permite que usuários sem empresa vejam a tela de login se quiserem entrar com outra conta
    if (!authLoading && user && (profile?.organization_id || profile?.is_master)) {
      navigate("/app", { replace: true });
    }
  }, [user, profile, authLoading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    const parsed = schema.safeParse({ email, password, name: mode === "signup" ? name : undefined });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Vamos configurar sua empresa.");
        navigate("/app", { replace: true });
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data?.user) {
          navigate("/app", { replace: true });
        }
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao autenticar");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (settings?.system_name) {
      document.title = settings.system_name;
    }
    if (settings?.favicon_url) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) link.href = settings.favicon_url;
    }
     if (settings?.primary_color) {
       const hexToHsl = (hex: string) => {
         const normalizedHex = hex.replace("#", "");
         let r = 0, g = 0, b = 0;
         if (normalizedHex.length === 3) {
           r = parseInt(normalizedHex[0] + normalizedHex[0], 16);
           g = parseInt(normalizedHex[1] + normalizedHex[1], 16);
           b = parseInt(normalizedHex[2] + normalizedHex[2], 16);
         } else if (normalizedHex.length === 6) {
           r = parseInt(normalizedHex.substring(0, 2), 16);
           g = parseInt(normalizedHex.substring(2, 4), 16);
           b = parseInt(normalizedHex.substring(4, 6), 16);
         }
         r /= 255; g /= 255; b /= 255;
         const max = Math.max(r, g, b), min = Math.min(r, g, b);
         let h = 0, s = 0, l = (max + min) / 2;
         if (max !== min) {
           const d = max - min;
           s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
           switch (max) {
             case r: h = (g - b) / d + (g < b ? 6 : 0); break;
             case g: h = (b - r) / d + 2; break;
             case b: h = (r - g) / d + 4; break;
           }
           h /= 6;
         }
         const hVal = Math.round(h * 360);
         const sVal = Math.round(s * 100);
         const lVal = Math.round(l * 100);
         const foreground = lVal > 60 ? "220 13% 13%" : "0 0% 100%";
         document.documentElement.style.setProperty('--primary-foreground', foreground);
         return `${hVal} ${sVal}% ${lVal}%`;
       };
       try {
         const hsl = hexToHsl(settings.primary_color);
         document.documentElement.style.setProperty('--primary', hsl);
       } catch (e) {
         console.error("Invalid primary color", e);
       }
     }
  }, [settings]);

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-10 bg-surface-1 border-r border-border">
        <Link to="/" className="flex items-center gap-2">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="size-7 object-contain" />
          ) : (
            <div className="size-7 rounded-md bg-primary text-primary-foreground grid place-items-center">
              <Headphones className="size-4" />
            </div>
          )}
          <span className="font-semibold tracking-tight">{settings?.system_name ?? "Helpdesk"}</span>
        </Link>
        <div>
          <h2 className="text-3xl font-semibold tracking-tight max-w-sm leading-tight">
            {(settings?.landing_page_config as any)?.hero_title || "Centralize seu atendimento. Encante seus clientes."}
          </h2>
          <p className="text-muted-foreground mt-3 max-w-sm">
            {(settings?.landing_page_config as any)?.hero_subtitle || `${settings?.system_name ?? "Helpdesk"} moderno, multiempresa e com IA inclusa.`}
          </p>
        </div>
        <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} {settings?.system_name ?? "Helpdesk"}</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "login" ? "Entrar na sua conta" : "Criar sua conta"}
            </h1>
             <p className="text-sm text-muted-foreground mt-1">
               {mode === "login" ? "Bem-vindo de volta." : "Teste grátis por 7 dias. Sem compromisso."}
             </p>
          </div>

          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria Silva" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || authLoading}>
            {(isSubmitting || authLoading) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aguarde...
              </>
            ) : mode === "login" ? "Entrar" : "Criar conta"}
          </Button>

          <div className="text-sm text-muted-foreground text-center">
            {mode === "login" ? (
              <>Ainda não tem conta?{" "}
                <button type="button" className="text-foreground underline-offset-4 hover:underline" onClick={() => setMode("signup")}>
                  Cadastre-se
                </button></>
            ) : (
              <>Já tem uma conta?{" "}
                <button type="button" className="text-foreground underline-offset-4 hover:underline" onClick={() => setMode("login")}>
                  Entrar
                </button></>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;