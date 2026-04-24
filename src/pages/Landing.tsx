import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Headphones, KanbanSquare, Timer, Bot, Inbox } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useEffect } from "react";

const features = [
  { icon: Inbox, title: "Inbox unificada", desc: "E-mail, portal e chat em um só lugar." },
  { icon: KanbanSquare, title: "Kanban em tempo real", desc: "Visualize o fluxo dos chamados." },
  { icon: Timer, title: "SLA e cronômetro", desc: "Tempo de resposta e resolução sob controle." },
  { icon: Bot, title: "Automação e IA", desc: "Roteamento e classificação automática." },
];

const plans = [
  { name: "Starter", price: "R$ 39", per: "/agente/mês", features: ["Até 5 agentes", "Chamados ilimitados", "Portal do cliente"] },
  { name: "Pro", price: "R$ 79", per: "/agente/mês", featured: true, features: ["Tudo do Starter", "SLA & automações", "Relatórios avançados", "Integrações"] },
  { name: "Enterprise", price: "Sob consulta", per: "", features: ["Tudo do Pro", "IA incluída", "Omnichannel", "Multi-filiais"] },
];

const Landing = () => {
  const { data: settings } = useSystemSettings();

  useEffect(() => {
    if (settings?.system_name) {
      document.title = settings.system_name;
    }
  }, [settings]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="size-7 object-contain" />
            ) : (
              <div className="size-7 rounded-md bg-primary text-primary-foreground grid place-items-center">
                <Headphones className="size-4" />
              </div>
            )}
            <span className="font-semibold tracking-tight">{settings?.system_name ?? "Helpdesk"}</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <Link to="/auth?mode=signup"><Button size="sm">Começar grátis</Button></Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-1 px-3 py-1 text-xs text-muted-foreground mb-6">
          <span className="size-1.5 rounded-full bg-success" /> Multiempresa nativo · 20% mais barato
        </div>
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight max-w-3xl mx-auto leading-[1.05]">
          {(settings?.landing_page_config as any)?.hero_title || "Atendimento que sua equipe vai amar usar."}
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">
          {(settings?.landing_page_config as any)?.hero_subtitle || "Help desk moderno, multiempresa e com IA inclusa. Centralize chamados, automatize o fluxo e cumpra SLAs sem complicação."}
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/auth?mode=signup">
            <Button size="lg" className="gap-2">Começar grátis <ArrowRight className="size-4" /></Button>
          </Link>
          <Link to="/auth"><Button variant="outline" size="lg">Ver demo</Button></Link>
        </div>

        <div className="mt-16 mx-auto max-w-5xl rounded-xl border border-border bg-surface-1 shadow-elevated overflow-hidden">
          <div className="h-8 border-b border-border bg-background flex items-center gap-1.5 px-3">
            <span className="size-2.5 rounded-full bg-muted" />
            <span className="size-2.5 rounded-full bg-muted" />
            <span className="size-2.5 rounded-full bg-muted" />
          </div>
          <div className="grid grid-cols-3 divide-x divide-border min-h-[280px] text-left">
            {["open", "in_progress", "resolved"].map((s, i) => (
              <div key={s} className="p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
                  <span className={`size-2 rounded-full ${["bg-status-open","bg-status-progress","bg-status-resolved"][i]}`} />
                  {["Aberto", "Em andamento", "Resolvido"][i]}
                </div>
                <div className="space-y-2">
                  {[1, 2].map((n) => (
                    <div key={n} className="rounded-md border border-border bg-background p-3 shadow-xs">
                      <div className="text-xs text-muted-foreground">#{i * 10 + n}</div>
                      <div className="text-sm font-medium mt-1 line-clamp-2">
                        {["Falha no login do portal", "Solicitação de novo acesso", "Erro ao gerar boleto", "Dúvida sobre integração", "Lentidão no sistema", "Atualizar dados cadastrais"][i*2+n-1]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border p-5 bg-background">
              <div className="size-8 rounded-md bg-secondary grid place-items-center mb-4">
                <f.icon className="size-4" />
              </div>
              <div className="font-medium">{f.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold tracking-tight">Preços simples, 20% abaixo do mercado</h2>
          <p className="text-muted-foreground mt-2">Cancele quando quiser. Sem surpresas.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-xl border p-6 bg-background ${p.featured ? "border-foreground shadow-elevated" : "border-border"}`}
            >
              <div className="text-sm font-medium">{p.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.per}</span>
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="size-4 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth?mode=signup" className="block mt-6">
                <Button variant={p.featured ? "default" : "outline"} className="w-full">Começar</Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {settings?.system_name ?? "Helpdesk"}. Todos os direitos reservados.
      </footer>
    </div>
  );
};

export default Landing;