import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Ticket, Shield, Clock, LayoutGrid, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function Index() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Hero Section */}
      <header className="px-6 py-4 border-b flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Ticket className="text-blue-600" size={24} />
          <span className="font-bold text-xl">Help-Me</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (theme === "system") setTheme("light");
              else if (theme === "light") setTheme("dark");
              else setTheme("system");
            }}
            title="Mudar tema"
          >
            {theme === "system" ? (
              <Monitor size={20} />
            ) : theme === "dark" ? (
              <Sun size={20} />
            ) : (
              <Moon size={20} />
            )}
          </Button>
          <Button variant="ghost" onClick={() => navigate("/login")} className="hover:bg-accent hover:text-accent-foreground">Entrar</Button>
        </div>
      </header>

      <main>
        <section className="py-12 md:py-20 px-6 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
            Gestão de Atendimento <span className="text-blue-600">Inteligente</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10">
            Sistema completo de Help Desk com controle de SLA, quadro Kanban para técnicos e gestão centralizada. 
            Inspirado na arquitetura do repositório Help-Me.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="px-8" onClick={() => navigate("/login")}>
              Começar Agora
            </Button>
            <Button size="lg" variant="outline" className="px-8" onClick={() => navigate("/login")}>
              Saiba Mais
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="py-12 md:py-20 bg-muted/30 px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                <Shield size={24} />
              </div>
              <h3 className="text-xl font-bold">Hierarquia e SLA</h3>
              <p className="text-muted-foreground">
                Controle rigoroso de prazos com cálculos automáticos e suporte a chamados pai/filho.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500">
                <Clock size={24} />
              </div>
              <h3 className="text-xl font-bold">Atendimento Real-time</h3>
              <p className="text-muted-foreground">
                Acompanhe o status dos seus chamados em tempo real com notificações inteligentes.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-500">
                <LayoutGrid size={24} />
              </div>
              <h3 className="text-xl font-bold">Quadro Kanban</h3>
              <p className="text-muted-foreground">
                Visualize e organize os chamados de forma ágil com colunas de status e ações rápidas.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t text-center text-muted-foreground text-sm">
        <p>&copy; 2026 Help-Me System. Todos os direitos reservados.</p>
        <p className="mt-2">Contato: hebersohas@gmail.com</p>
      </footer>
    </div>
  );
}