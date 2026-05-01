import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon, Monitor, Ticket, CheckCircle2 } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { branding } = useBranding();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: error.message === "Invalid login credentials" 
          ? "E-mail ou senha incorretos." 
          : error.message,
      });
    } else {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left Side: Illustration & Branding */}
      <div className="hidden md:flex flex-1 bg-primary items-center justify-center p-12 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-blue-600 opacity-90" />
        
        {/* Abstract shapes for a modern feel */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse delay-700" />

        <div className="relative z-10 max-w-lg w-full">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              {branding.companyLogo ? (
                <img src={branding.companyLogo} alt="Logo" className="w-12 h-12 object-contain" />
              ) : (
                <Ticket size={40} className="text-white" />
              )}
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              {branding.companyName || "Chamados"}
            </h1>
          </div>
          
          <h2 className="text-5xl font-extrabold leading-tight mb-6">
            Gestão de atendimento <br />
            <span className="text-blue-200">em um só lugar.</span>
          </h2>
          
          <p className="text-lg text-primary-foreground/80 mb-10 leading-relaxed">
            Simplifique seus processos, aumente a produtividade da sua equipe e ofereça um suporte excepcional aos seus clientes.
          </p>

          <div className="space-y-4">
            {[
              "Controle de SLA em tempo real",
              "Gestão de inventário integrada",
              "Fluxos de trabalho personalizados",
              "Relatórios e métricas avançadas"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-primary-foreground/90 font-medium">
                <CheckCircle2 size={20} className="text-blue-300" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="absolute bottom-8 left-12 text-sm text-primary-foreground/60">
          &copy; {new Date().getFullYear()} {branding.companyName || "Chamados"}. Todos os direitos reservados.
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
        <div className="absolute top-6 right-6">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-10 w-10 border"
            onClick={() => {
              if (theme === "system") setTheme("light");
              else if (theme === "light") setTheme("dark");
              else setTheme("system");
            }}
            title="Mudar tema"
          >
            {theme === "system" ? <Monitor size={18} /> : theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
        </div>

        <div className="w-full max-w-md space-y-8">
          <div className="md:hidden flex flex-col items-center mb-8">
            {branding.companyLogo ? (
              <img src={branding.companyLogo} alt="Logo" className="w-16 h-16 object-contain mb-4" />
            ) : (
              <div className="p-3 bg-primary/10 rounded-2xl mb-4">
                <Ticket size={32} className="text-primary" />
              </div>
            )}
            <h1 className="text-2xl font-bold">{branding.companyName || "Chamados"}</h1>
          </div>

          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-3xl font-bold tracking-tight">Bem-vindo de volta</h3>
            <p className="text-muted-foreground">Insira suas credenciais para acessar o sistema</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">E-mail</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="nome@empresa.com"
                className="h-12 bg-muted/30 border-muted-foreground/20 focus:border-primary transition-all"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" title="Senha" className="text-sm font-semibold">Senha</Label>
                <Button variant="link" className="px-0 h-auto text-xs font-semibold text-primary/80" type="button">
                  Esqueceu a senha?
                </Button>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                className="h-12 bg-muted/30 border-muted-foreground/20 focus:border-primary transition-all"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Entrando...</span>
                </div>
              ) : "Acessar Sistema"}
            </Button>
          </form>

          <div className="text-center md:text-left pt-6">
            <p className="text-sm text-muted-foreground">
              Problemas com acesso? <span className="font-semibold text-primary cursor-pointer hover:underline">Entre em contato com o suporte</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}