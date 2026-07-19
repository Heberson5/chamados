import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon, Monitor, Ticket, CheckCircle2, Mail, Lock, KeyRound, ArrowRight, Loader2, MessageSquareText } from "lucide-react";
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
import { evaluateSchedule, loadEffectiveSchedule } from "@/lib/accessSchedule";

export default function Login() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { branding } = useBranding();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotChannel, setForgotChannel] = useState<"email" | "sms">("email");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const defaultLanding = {
    bgColor: "#020617",
    brandTitle: "GESTÃO QUE",
    brandHighlight: "TRANSFORMA.",
    subtitle: "A plataforma definitiva para controle de atendimento, inventário e produtividade da sua operação.",
    features: [
      { id: "1", text: "SLA Inteligente & Automático" },
      { id: "2", text: "Inventário em Tempo Real" },
      { id: "3", text: "Workflows Customizáveis" },
      { id: "4", text: "Analytics Avançado" },
    ],
    formTitle: "Acesso",
    formSubtitle: "Bem-vindo. Por favor, identifique-se.",
    statusText: "Sistema Online",
  };
  const [landing, setLanding] = useState<any>(defaultLanding);
  // Posição do mouse (-0.5 a 0.5) usada para o efeito de profundidade/tilt 3D do painel de marca
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "landing_page_settings")
        .maybeSingle();
      if (data?.value) {
        setLanding({ ...defaultLanding, ...(data.value as any) });
      }
      // Apply favicon from branding even before auth
      const { data: brand } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "layout_settings")
        .maybeSingle();
      const v = brand?.value as any;
      if (v?.companyFavicon) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
        if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
        link.href = v.companyFavicon;
      }
      if (v?.companyName) document.title = v.companyName;
    })();
  }, []);
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("forgot-password", {
        body: { email: forgotEmail, channel: forgotChannel }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: forgotChannel === "sms" ? "SMS enviado" : "E-mail enviado",
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


  // Ao abrir a tela de login, encerra qualquer sessão anterior para forçar
  // que o usuário digite e-mail e senha novamente (sem login automático).
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.signOut();
      }
    })();
  }, []);

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
      // Verify access schedule
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const sched = await loadEffectiveSchedule(user.id);
        const status = evaluateSchedule(sched);
        if (status.hasSchedule && !status.allowed) {
          await supabase.auth.signOut();
          toast({
            variant: "destructive",
            title: "Fora do horário permitido",
            description: "Seu acesso está restrito ao horário definido pelo administrador.",
          });
          setLoading(false);
          return;
        }
      }
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background selection:bg-primary/20">
      {/* Left Side: Modern Illustration & Branding */}
      <div
        className="hidden md:flex flex-1 items-center justify-center p-12 text-white relative overflow-hidden [perspective:1600px]"
        style={{ backgroundColor: landing.bgColor || "#020617" }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMouse({
            x: (e.clientX - rect.left) / rect.width - 0.5,
            y: (e.clientY - rect.top) / rect.height - 0.5,
          });
        }}
        onMouseLeave={() => setMouse({ x: 0, y: 0 })}
      >
        {/* Depth layer 1: far background orbs, drift slowly, react least to mouse */}
        <div
          className="absolute top-0 left-0 w-full h-full transition-transform duration-300 ease-out"
          style={{ transform: `translate3d(${mouse.x * 14}px, ${mouse.y * 14}px, 0)` }}
        >
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] animate-float-slow" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] animate-float-slow" style={{ animationDelay: "2s" }} />
          <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] rounded-full bg-indigo-500/10 blur-[80px] animate-float" />
        </div>

        {/* Depth layer 2: perspective floor grid fading into the distance */}
        <div
          className="absolute inset-x-0 bottom-0 h-[55%] opacity-40 [transform-style:preserve-3d]"
          style={{ transform: `rotateX(62deg) translateZ(${-40 - mouse.y * 10}px)`, transformOrigin: "bottom" }}
        >
          <div className="w-full h-full bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_top,black,transparent)]" />
        </div>

        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />

        {/* Main content: tilts subtly toward the cursor, simulating a floating 3D panel */}
        <div
          className="relative z-10 max-w-lg w-full transition-transform duration-300 ease-out will-change-transform [transform-style:preserve-3d]"
          style={{ transform: `rotateY(${mouse.x * 6}deg) rotateX(${-mouse.y * 6}deg)` }}
        >
          <div className="flex items-center gap-4 mb-12 animate-in fade-in slide-in-from-left duration-700">
            <div className="relative" style={{ transform: "translateZ(40px)" }}>
              {/* Floating card stack behind the logo — pure CSS depth illusion */}
              <div className="absolute inset-0 rounded-2xl border border-white/10 bg-primary/10 rotate-[-10deg] translate-x-1.5 translate-y-2 animate-float-delayed" />
              <div className="absolute inset-0 rounded-2xl border border-white/10 bg-white/5 rotate-[8deg] -translate-x-1 translate-y-1 animate-float" />
              <div className="relative p-3.5 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/50">
                {branding.companyLogo ? (
                  <img src={branding.companyLogo} alt="Logo" className="w-12 h-12 object-contain" />
                ) : (
                  <Ticket size={44} className="text-primary" />
                )}
              </div>
            </div>
            <div style={{ transform: "translateZ(30px)" }}>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic">
                {branding.companyName || "Chamados"}
              </h1>
              <div className="h-1 w-12 bg-primary rounded-full mt-1" />
            </div>
          </div>

          <h2
            className="text-6xl font-black leading-[0.9] mb-8 animate-in fade-in slide-in-from-left duration-1000 delay-150"
            style={{ transform: "translateZ(50px)" }}
          >
            {landing.brandTitle} <br />
            <span className="text-primary italic drop-shadow-[0_0_24px_rgba(var(--primary-rgb,99,102,241),0.45)]">{landing.brandHighlight}</span>
          </h2>

          <p
            className="text-xl text-slate-400 mb-12 leading-relaxed max-w-md animate-in fade-in slide-in-from-left duration-1000 delay-300"
            style={{ transform: "translateZ(25px)" }}
          >
            {landing.subtitle}
          </p>

          <div className="space-y-3 animate-in fade-in slide-in-from-left duration-1000 delay-500" style={{ transform: "translateZ(20px)" }}>
            {(landing.features || []).map((feature: any, i: number) => (
              <div
                key={feature.id || i}
                className="flex items-center gap-4 group cursor-default rounded-xl px-3 py-2 -mx-3 transition-all duration-300 hover:bg-white/5 hover:shadow-lg hover:shadow-black/20 hover:translate-x-1"
              >
                <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all duration-300 shrink-0">
                  <CheckCircle2 size={14} className="text-primary group-hover:text-white transition-colors" />
                </div>
                <span className="text-slate-300 font-medium group-hover:text-white transition-colors">{feature.text || feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-12 left-12 text-sm text-slate-500 font-medium flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>{landing.statusText}</span>
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
            <h3 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{landing.formTitle}</h3>
            <p className="text-slate-500 font-medium">{landing.formSubtitle}</p>
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
                        {forgotChannel === "sms"
                          ? "Enviaremos uma senha provisória por SMS para o celular cadastrado."
                          : "Enviaremos uma senha provisória para o seu e-mail cadastrado."}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleForgotPassword} className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setForgotChannel("email")}
                          className={`h-11 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                            forgotChannel === "email" ? "bg-primary text-primary-foreground border-primary" : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}
                        >
                          <Mail className="w-4 h-4" /> E-mail
                        </button>
                        <button
                          type="button"
                          onClick={() => setForgotChannel("sms")}
                          className={`h-11 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                            forgotChannel === "sms" ? "bg-primary text-primary-foreground border-primary" : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}
                        >
                          <MessageSquareText className="w-4 h-4" /> SMS
                        </button>
                      </div>
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
                        {forgotChannel === "sms" && (
                          <p className="text-[11px] text-slate-500 pl-1">
                            Usamos o e-mail só para localizar sua conta — a senha provisória vai por SMS para o celular cadastrado no seu perfil.
                          </p>
                        )}
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
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  className="h-14 pl-12 pr-12 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-2xl transition-all font-medium"
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
