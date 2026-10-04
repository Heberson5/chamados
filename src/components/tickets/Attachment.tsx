import { useEffect, useState } from "react";
import { FileText, ImageIcon, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  attachmentName,
  attachmentPath,
  isImageAttachment,
  logPersonalDataAccess,
  signedAttachmentUrl,
} from "@/lib/attachments";

/*
 * Anexo de chamado/comentário. O arquivo fica num bucket privado: a
 * miniatura e o clique pedem um link temporário na hora, e o acesso a
 * arquivo de outra pessoa entra no registro de acessos (LGPD).
 */
export function AttachmentItem({
  stored,
  index,
  ownerId,
  variant = "chip",
  className,
}: {
  stored: string;
  index?: number;
  /** Dono do dado (solicitante/autor), para o registro de acessos. */
  ownerId?: string | null;
  variant?: "chip" | "thumb" | "link";
  className?: string;
}) {
  const { toast } = useToast();
  const [opening, setOpening] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  const isImage = isImageAttachment(stored);
  const isPrivate = attachmentPath(stored) != null;
  const name = attachmentName(stored, index);

  useEffect(() => {
    if (variant !== "thumb" || !isImage) return;
    let alive = true;
    signedAttachmentUrl(stored).then((url) => {
      if (alive) setThumb(url);
    });
    return () => {
      alive = false;
    };
  }, [stored, variant, isImage]);

  const open = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Abre a aba já no clique (evita bloqueio de pop-up) e depois navega.
    const win = window.open("about:blank", "_blank");
    setOpening(true);
    try {
      const url = await signedAttachmentUrl(stored);
      if (!url) throw new Error("Você não tem acesso a este arquivo ou ele foi removido.");
      logPersonalDataAccess(ownerId, "anexo", name);
      if (win) {
        win.opener = null;
        win.location.href = url;
      } else {
        window.open(url, "_blank", "noopener");
      }
    } catch (err) {
      win?.close();
      toast({ variant: "destructive", title: "Não foi possível abrir o anexo", description: (err as Error).message });
    } finally {
      setOpening(false);
    }
  };

  if (variant === "link") {
    return (
      <button type="button" onClick={open} className={cn("text-primary hover:underline text-xs font-medium", className)}>
        {opening ? <Loader2 size={12} className="inline animate-spin" /> : name}
      </button>
    );
  }

  if (variant === "thumb" && isImage) {
    return (
      <button
        type="button"
        onClick={open}
        title={name}
        className={cn("relative block h-20 w-20 overflow-hidden rounded-lg border bg-muted hover:opacity-85 transition-opacity", className)}
      >
        {thumb ? (
          <img src={thumb} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-muted-foreground">
            <ImageIcon size={18} />
          </span>
        )}
        {opening && (
          <span className="absolute inset-0 grid place-items-center bg-background/60">
            <Loader2 size={16} className="animate-spin" />
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      title={isPrivate ? "Abre por link temporário (arquivo protegido)" : name}
      className={cn(
        "inline-flex max-w-[240px] items-center gap-2 pl-1.5 pr-3 py-1.5 border rounded-lg hover:bg-muted transition-colors text-xs font-medium bg-card",
        className
      )}
    >
      <span className="h-7 w-7 shrink-0 rounded-md bg-accent text-accent-foreground grid place-items-center">
        {opening ? <Loader2 size={14} className="animate-spin" /> : isImage ? <ImageIcon size={14} /> : <FileText size={14} />}
      </span>
      <span className="truncate">{name}</span>
      {isPrivate && <Lock size={11} className="shrink-0 text-muted-foreground" />}
    </button>
  );
}
