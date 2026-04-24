import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Headphones } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) navigate("/app", { replace: true });
  }, [user, authLoading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, name: mode === "signup" ? name : undefined });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
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
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-10 bg-surface-1 border-r border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-primary text-primary-foreground grid place-items-center">
            <Headphones className="size-4" />
          </div>
          <span className="font-semibold tracking-tight">Helpdesk</span>
        </Link>
        <div>
          <h2 className="text-3xl font-semibold tracking-tight max-w-sm leading-tight">
            Centralize seu atendimento. Encante seus clientes.
          </h2>
          <p className="text-muted-foreground mt-3 max-w-sm">
            Help desk moderno, multiempresa e com IA inclusa.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} Helpdesk</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "login" ? "Entrar na sua conta" : "Criar sua conta"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "login" ? "Bem-vindo de volta." : "Leva menos de 1 minuto."}
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
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