import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, Loader2, Monitor, Send, Smartphone } from "lucide-react";
import { EMAIL_TEMPLATE_TAGS, renderEmailTemplate, sendEmail } from "@/utils/email";

/**
 * Pré-visualização de um modelo de e-mail com o layout global e dados de
 * exemplo. Usa o mesmo renderizador do envio real, então o que aparece aqui
 * é o que o destinatário recebe.
 */
export default function EmailTemplatePreview({
  template,
  layout,
}: {
  template: { name?: string; subject?: string; body?: string };
  layout: string;
}) {
  const { toast } = useToast();
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [sending, setSending] = useState(false);

  const rendered = useMemo(
    () => renderEmailTemplate({ subject: template.subject ?? "", body: template.body ?? "" }, layout, EMAIL_TEMPLATE_TAGS),
    [template.subject, template.body, layout]
  );

  const unknownTags = useMemo(() => {
    const found = `${template.subject ?? ""} ${template.body ?? ""}`.match(/{\w+}/g) ?? [];
    return [...new Set(found.map((t) => t.slice(1, -1)))].filter((t) => !(t in EMAIL_TEMPLATE_TAGS) && t !== "corpo" && t !== "body");
  }, [template.subject, template.body]);

  const isEmpty = !(template.body ?? "").trim();

  // Fundo branco por padrão: o HTML de e-mail costuma assumir isso.
  const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>body{margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#11131f;background:#fff}</style></head><body>${rendered.html}</body></html>`;

  const sendTest = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;
    setSending(true);
    const res = await sendEmail(user.email, `[Teste] ${rendered.subject || template.name || "Modelo"}`, rendered.html);
    setSending(false);
    toast(
      res.success
        ? { title: "E-mail de teste enviado", description: `Para ${user.email}, com dados de exemplo.` }
        : { variant: "destructive", title: "Não foi possível enviar", description: String((res.error as Error)?.message ?? res.error ?? "") }
    );
  };

  return (
    <div className="flex flex-col rounded-xl border bg-muted/40 overflow-hidden min-w-0">
      <div className="flex items-center gap-2 border-b bg-card px-3 py-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pré-visualização</span>
        <div className="ml-auto flex items-center gap-1 rounded-lg bg-muted p-0.5">
          {(["desktop", "mobile"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              className={cn("rounded-md p-1.5 text-muted-foreground", device === d && "bg-card text-foreground shadow-sm")}
              title={d === "desktop" ? "Computador" : "Celular"}
              aria-pressed={device === d}
            >
              {d === "desktop" ? <Monitor size={14} /> : <Smartphone size={14} />}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b bg-card px-3 py-2 text-[13px] space-y-0.5">
        <p className="truncate">
          <span className="text-muted-foreground">Assunto: </span>
          <span className="font-semibold">{rendered.subject || <em className="font-normal text-muted-foreground">sem assunto</em>}</span>
        </p>
        <p className="text-xs text-muted-foreground">Para: {EMAIL_TEMPLATE_TAGS.user} · dados de exemplo</p>
      </div>

      <div className="flex-1 flex justify-center p-3">
        {isEmpty ? (
          <p className="self-center text-sm text-muted-foreground">Escreva o corpo do e-mail para ver como ele fica.</p>
        ) : (
          <iframe
            title={`Pré-visualização do modelo ${template.name ?? ""}`}
            sandbox=""
            srcDoc={doc}
            className={cn("h-[320px] rounded-lg border bg-white shadow-sm transition-all", device === "desktop" ? "w-full" : "w-[360px] max-w-full")}
          />
        )}
      </div>

      {unknownTags.length > 0 && (
        <p className="flex items-start gap-1.5 border-t bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          Tags não reconhecidas (não serão substituídas): {unknownTags.map((t) => `{${t}}`).join(", ")}
        </p>
      )}

      <div className="flex justify-end border-t bg-card px-3 py-2">
        <Button type="button" variant="outline" size="sm" onClick={sendTest} disabled={sending || isEmpty}>
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar teste para mim
        </Button>
      </div>
    </div>
  );
}
