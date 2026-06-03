import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon, Monitor, Ticket, CheckCircle2, Mail, Lock, KeyRound, ArrowRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("forgot-password", {
        body: { email: forgotEmail }
      });
      if (error) throw error;
      toast({
        title: "E-mail enviado",
        description: data.message || "Se o e-mail estiver cadastrado, uma senha provisória foi enviada.",
      });
      setForgotOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Ocorreu um erro ao processar sua solicitação.",
      });
    } finally {
      setForgotLoading(false);
    }
  };


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
    <div className="min-h-screen flex flex-col md:flex-row bg-background selection:bg-primary/20">
      {/* Left Side: Modern Illustration & Branding */}
      <div className="hidden md:flex flex-1 bg-slate-950 items-center justify-center p-12 text-white relative overflow-hidden">
        {/* Modern animated background elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse delay-700" />
          <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] rounded-full bg-indigo-500/10 blur-[80px]" />
          
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>
        
        <div className="relative z-10 max-w-lg w-full">
          <div className="flex items-center gap-4 mb-12 animate-in fade-in slide-in-from-left duration-700">
            <div className="p-3.5 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/50">
              {branding.companyLogo ? (
                <img src={branding.companyLogo} alt="Logo" className="w-12 h-12 object-contain" />
              ) : (
                <Ticket size={44} className="text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic">
                {branding.companyName || "Chamados"}
              </h1>
              <div className="h-1 w-12 bg-primary rounded-full mt-1" />
            </div>
          </div>
          
          <h2 className="text-6xl font-black leading-[0.9] mb-8 animate-in fade-in slide-in-from-left duration-1000 delay-150">
            GESTÃO QUE <br />
            <span className="text-primary italic">TRANSFORMA.</span>
          </h2>
          
          <p className="text-xl text-slate-400 mb-12 leading-relaxed max-w-md animate-in fade-in slide-in-from-left duration-1000 delay-300">
            A plataforma definitiva para controle de atendimento, inventário e produtividade da sua operação.
          </p>

          <div className="space-y-5 animate-in fade-in slide-in-from-left duration-1000 delay-500">
            {[
              "SLA Inteligente & Automático",
              "Inventário em Tempo Real",
              "Workflows Customizáveis",
              "Analytics Avançado"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-4 group cursor-default">
                <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                  <CheckCircle2 size={14} className="text-primary group-hover:text-white transition-colors" />
                </div>
                <span className="text-slate-300 font-medium group-hover:text-white transition-colors">{feature}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="absolute bottom-12 left-12 text-sm text-slate-500 font-medium flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Sistema Online</span>
          <span className="mx-2 opacity-20">|</span>
          <span>&copy; {new Date().getFullYear()} {branding.companyName || "Chamados"}</span>
        </div>
      </div>

      {/* Right Side: Modern Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative bg-background/50 backdrop-blur-sm">
        <div className="absolute top-8 right-8 animate-in fade-in duration-1000">
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl h-12 w-12 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all"
            onClick={() => {
              if (theme === "system") setTheme("light");
              else if (theme === "light") setTheme("dark");
              else setTheme("system");
            }}
          >
            {theme === "system" ? <Monitor size={20} /> : theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
        </div>

        <div className="w-full max-w-sm space-y-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="md:hidden flex flex-col items-center mb-10">
            <div className="p-4 bg-primary/10 rounded-3xl mb-4 shadow-inner">
              {branding.companyLogo ? (
                <img src={branding.companyLogo} alt="Logo" className="w-12 h-12 object-contain" />
              ) : (
                <Ticket size={40} className="text-primary" />
              )}
            </div>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase text-primary">
              {branding.companyName || "Chamados"}
            </h1>
          </div>

          <div className="space-y-3 text-center md:text-left">
            <h3 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Acesso</h3>
            <p className="text-slate-500 font-medium">Bem-vindo. Por favor, identifique-se.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">E-mail corporativo</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="exemplo@empresa.com"
                  className="h-14 pl-12 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-2xl transition-all font-medium"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <Label htmlFor="password" title="Senha" className="text-xs font-bold uppercase tracking-widest text-slate-500">Senha de acesso</Label>
                
                <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
                  <DialogTrigger asChild>
                    <button type="button" className="text-xs font-bold text-primary hover:underline hover:text-primary/80 transition-all uppercase tracking-tighter">
                      Esqueceu?
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] rounded-3xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black">Recuperar Acesso</DialogTitle>
                      <DialogDescription className="font-medium text-slate-500">
                        Enviaremos uma senha provisória para o seu e-mail cadastrado.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleForgotPassword} className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="forgot-email" className="text-xs font-bold uppercase text-slate-500">E-mail cadastrado</Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <Input
                            id="forgot-email"
                            type="email"
                            className="h-14 pl-12 rounded-2xl bg-slate-50 border-slate-200"
                            placeholder="seu-email@empresa.com"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          type="submit" 
                          className="w-full h-14 text-lg font-bold rounded-2xl" 
                          disabled={forgotLoading}
                        >
                          {forgotLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>Solicitar Senha <ArrowRight className="ml-2 w-5 h-5" /></>
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  className="h-14 pl-12 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-2xl transition-all font-medium"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all rounded-2xl group" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validando...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Entrar</span>
                  <KeyRound className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                </div>
              )}
            </Button>
          </form>

          <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                <Monitor size={16} className="text-primary" />
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-900 dark:text-white">Suporte Técnico</p>
                <p className="text-slate-500 font-medium">Contate a TI caso tenha dificuldades.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
