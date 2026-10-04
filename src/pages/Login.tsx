import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon, Monitor, CheckCircle2, Mail, Lock, ArrowRight, Loader2, MessageSquareText, Timer, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import BrandMark from "@/components/BrandMark";
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
import InstallAppButton from "@/components/InstallAppButton";
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
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacy, setPrivacy] = useState<{ texto?: string; versao?: string; atualizado_em?: string; encarregado_nome?: string; encarregado_email?: string } | null>(null);
  const defaultLanding = {
    bgColor: "#110f24",
    brandTitle: "Suporte organizado,",
    brandHighlight: "equipe no controle.",
    subtitle: "Abra, acompanhe e resolva chamados com prazos de SLA automáticos, Kanban e relatórios — tudo em um só lugar.",
    features: [
      { id: "1", text: "SLA automático" },
      { id: "2", text: "Kanban" },
      { id: "3", text: "Relatórios" },
      { id: "4", text: "App no celular" },
    ],
    formTitle: "Entrar",
    formSubtitle: "Bem-vindo de volta. Use seu e-mail corporativo.",
    statusText: "Sistema Online",
  };
  const [landing, setLanding] = useState<any>(defaultLanding);

  // O painel esquerdo tem fundo sempre escuro (landing.bgColor), independente
  // do tema claro/escuro do app — por isso não pode usar a cor --primary do
  // tema (que fica quase preta no tema claro, ficando invisível ali). Usamos
  // uma cor de destaque fixa e configurável em vez disso.
  const accentHex = landing.accentColor || "#a99bff";
  const accentRgb = (() => {
    const m = accentHex.replace("#", "").match(/^([\da-f]{6})$/i);
    if (!m) return "129, 140, 248";
    const num = parseInt(m[1], 16);
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  })();

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
      const { data: notice } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "privacy_notice")
        .maybeSingle();
      if (notice?.value) setPrivacy(notice.value as typeof privacy);
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

  // Depois da senha (e, se cadastrada, da verificação em duas etapas).
  const finishLogin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const sched = await loadEffectiveSchedule(user.id);
      const status = evaluateSchedule(sched);
      if (status.hasSchedule && !status.allowed) {
        await supabase.auth.signOut();
        setMfaFactorId(null);
        toast({
          variant: "destructive",
          title: "Fora do horário permitido",
          description: "Seu acesso está restrito ao horário definido pelo administrador.",
        });
        return;
      }
    }
    navigate("/dashboard");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({
          variant: "destructive",
          title: "Erro no login",
          description: error.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos."
            : error.message,
        });
        return;
      }
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totp = factors?.totp?.find((f) => f.status === "verified");
        if (totp) {
          setMfaFactorId(totp.id);
          setMfaCode("");
          return;
        }
      }
      await finishLogin();
    } finally {
      setLoading(false);
    }
  };

  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code: mfaCode.trim() });
      if (error) {
        toast({ variant: "destructive", title: "Código inválido", description: "Confira o código de 6 dígitos no aplicativo autenticador." });
        setMfaCode("");
        return;
      }
      await finishLogin();
    } finally {
      setLoading(false);
    }
  };

  const cancelMfa = async () => {
    await supabase.auth.signOut();
    setMfaFactorId(null);
    setMfaCode("");
    setPassword("");
  };

  const features: { id?: string; text?: string }[] = (landing.features || []).map((f: any) => (typeof f === "string" ? { text: f } : f));

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background selection:bg-primary/20">
      {/* Lado esquerdo: marca, mensagem e prévia do produto (sempre escuro). */}
      <div
        className="hidden md:flex w-1/2 flex-col justify-between p-10 lg:p-14 text-white relative overflow-hidden"
        style={{
          backgroundColor: landing.bgColor || "#110f24",
          ["--landing-accent" as string]: accentHex,
          ["--landing-accent-rgb" as string]: accentRgb,
        }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-[10%] right-[0%] h-[60%] w-[60%] rounded-full bg-[rgba(var(--landing-accent-rgb),0.35)] blur-[140px]" />
          <div className="absolute -bottom-[20%] -left-[10%] h-[45%] w-[45%] rounded-full bg-sky-500/15 blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <BrandMark logo={branding.companyLogo} size={40} />
          <span className="text-lg font-bold tracking-tight">{branding.companyName || "Chamados"}</span>
        </div>

        <div className="relative z-10 max-w-xl animate-in fade-in slide-in-from-left-4 duration-700">
          <h2 className="text-4xl lg:text-5xl font-extrabold leading-[1.05] tracking-tight">
            {landing.brandTitle}
            <br />
            <span className="text-[var(--landing-accent)]">{landing.brandHighlight}</span>
          </h2>
          <p className="mt-5 text-base lg:text-lg text-white/65 leading-relaxed max-w-lg">{landing.subtitle}</p>

          {/* Prévia ilustrativa de chamados */}
          <div className="mt-10 hidden lg:block max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm" aria-hidden="true">
            <div className="rounded-xl bg-white p-4 text-slate-900 shadow-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">#1042</span>
                <span className="pill" style={{ color: "#c2410c", backgroundColor: "#c2410c14", borderColor: "#c2410c33" }}>
                  <span className="pill-dot" /> Em atendimento
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">Notebook lento após atualização</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="sla-chip sla-ok"><Timer size={12} /> 5h 12min</span>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-orange-500 text-[11px] font-bold text-white">EL</span>
              </div>
            </div>
            <div className="ml-8 mt-3 rounded-xl bg-slate-100 p-4 text-slate-900 shadow-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">#1046</span>
                <span className="pill" style={{ color: "#15803d", backgroundColor: "#15803d14", borderColor: "#15803d33" }}>
                  <span className="pill-dot" /> Encerrado
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">E-mail não sincroniza no celular</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="sla-chip sla-ok"><CheckCircle2 size={12} /> Dentro do SLA</span>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-sky-500 text-[11px] font-bold text-white">CM</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          {features.length > 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-white/75">
              {features.map((f, i) => (
                <span key={f.id || i} className="inline-flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[var(--landing-accent)]" />
                  {f.text}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-white/45">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>{landing.statusText}</span>
            <span className="opacity-40">·</span>
            <span>&copy; {new Date().getFullYear()} {landing.copyrightText || branding.companyName || "Chamados"}</span>
          </div>
        </div>
      </div>

      {/* Lado direito: formulário */}
      <div className="flex-1 flex flex-col min-h-screen md:min-h-0 relative">
        <div className="flex items-center justify-between p-4 md:p-6 md:justify-end">
          <div className="flex items-center gap-2.5 md:hidden">
            <BrandMark logo={branding.companyLogo} size={34} />
            <span className="font-bold tracking-tight">{branding.companyName || "Chamados"}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Alternar tema"
            title={theme === "system" ? "Tema automático" : theme === "dark" ? "Tema escuro" : "Tema claro"}
            onClick={() => {
              if (theme === "system") setTheme("light");
              else if (theme === "light") setTheme("dark");
              else setTheme("system");
            }}
          >
            {theme === "system" ? <Monitor size={17} /> : theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center px-5 pb-10 md:px-12">
          <div className="w-full max-w-[400px] space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {mfaFactorId ? (
              <form onSubmit={handleMfa} className="space-y-5">
                <div className="space-y-1.5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-primary mb-3">
                    <ShieldCheck size={22} />
                  </span>
                  <h1 className="text-[28px] font-bold tracking-tight">Verificação em duas etapas</h1>
                  <p className="text-sm text-muted-foreground">Digite o código de 6 dígitos do seu aplicativo autenticador.</p>
                </div>
                <Input
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  aria-label="Código de verificação"
                  className="h-12 text-center text-xl font-mono tracking-[0.5em]"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                />
                <Button type="submit" className="w-full h-11 text-[15px]" disabled={loading || mfaCode.length !== 6}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Confirmar <ArrowRight className="w-4 h-4" /></>}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={cancelMfa} disabled={loading}>
                  Voltar e usar outra conta
                </Button>
              </form>
            ) : (
              <>
              <div className="space-y-1.5">
                <h1 className="text-[28px] font-bold tracking-tight">{landing.formTitle}</h1>
                <p className="text-sm text-muted-foreground">{landing.formSubtitle}</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-semibold">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="voce@empresa.com"
                      className="h-11 pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-sm font-semibold">Senha</Label>
                    <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
                      <DialogTrigger asChild>
                        <button type="button" className="text-xs font-semibold text-primary hover:underline">
                          Esqueci minha senha
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[420px]">
                        <DialogHeader>
                          <DialogTitle>Recuperar acesso</DialogTitle>
                          <DialogDescription>
                            {forgotChannel === "sms"
                              ? "Enviaremos uma senha provisória por SMS para o celular cadastrado."
                              : "Enviaremos uma senha provisória para o seu e-mail cadastrado."}
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleForgotPassword} className="space-y-4 pt-2">
                          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                            {([
                              { value: "email", label: "E-mail", icon: Mail },
                              { value: "sms", label: "SMS", icon: MessageSquareText },
                            ] as const).map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setForgotChannel(opt.value)}
                                className={cn(
                                  "h-9 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors",
                                  forgotChannel === opt.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                <opt.icon className="w-4 h-4" /> {opt.label}
                              </button>
                            ))}
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="forgot-email" className="text-sm font-semibold">E-mail cadastrado</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                              <Input
                                id="forgot-email"
                                type="email"
                                className="h-11 pl-10"
                                placeholder="voce@empresa.com"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                required
                              />
                            </div>
                            {forgotChannel === "sms" && (
                              <p className="text-xs text-muted-foreground">
                                Usamos o e-mail só para localizar sua conta — a senha provisória vai por SMS para o celular cadastrado no seu perfil.
                              </p>
                            )}
                          </div>
                          <DialogFooter>
                            <Button type="submit" className="w-full h-11" disabled={forgotLoading}>
                              {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Solicitar senha <ArrowRight className="w-4 h-4" /></>}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                    <PasswordInput
                      id="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="h-11 pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 text-[15px]" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Validando...
                    </>
                  ) : (
                    <>
                      Entrar <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
              </>
            )}

            <InstallAppButton variant="login" />
          </div>
        </div>

        <p className="pb-6 text-center text-xs text-muted-foreground">
          Problemas para entrar? Fale com a equipe de TI.
          {privacy?.texto && (
            <>
              {" · "}
              <button type="button" className="font-medium underline-offset-2 hover:underline hover:text-foreground" onClick={() => setPrivacyOpen(true)}>
                Aviso de privacidade
              </button>
            </>
          )}
        </p>
        <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Aviso de privacidade</DialogTitle>
              <DialogDescription>
                Versão {privacy?.versao}
                {privacy?.atualizado_em ? ` · atualizado em ${new Date(privacy.atualizado_em + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[55vh] overflow-y-auto custom-scrollbar whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {privacy?.texto}
            </div>
            {(privacy?.encarregado_nome || privacy?.encarregado_email) && (
              <p className="text-xs text-muted-foreground border-t pt-3">
                Encarregado de dados (DPO): {privacy?.encarregado_nome} {privacy?.encarregado_email && `· ${privacy.encarregado_email}`}
              </p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
