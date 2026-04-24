import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";

const Settings = () => {
  const { org, profile } = useAuth();
  return (
    <>
      <PageHeader title="Configurações" />
      <div className="p-6 max-w-2xl space-y-4">
        <div className="rounded-xl border border-border bg-background p-5">
          <div className="text-sm font-medium mb-3">Empresa</div>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-muted-foreground">Nome</span><span>{org?.name}</span>
            <span className="text-muted-foreground">Slug</span><span className="font-mono text-xs">{org?.slug}</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background p-5">
          <div className="text-sm font-medium mb-3">Sua conta</div>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-muted-foreground">Nome</span><span>{profile?.full_name ?? "—"}</span>
            <span className="text-muted-foreground">E-mail</span><span>{profile?.email}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Mais opções (SLA, automações, integrações) virão nas próximas iterações.
        </p>
      </div>
    </>
  );
};

export default Settings;