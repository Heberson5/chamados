import { useState } from "react";
import { Eye } from "lucide-react";
import { maskEmail, maskPhone } from "@/lib/lgpd";
import { logPersonalDataAccess } from "@/lib/attachments";

/**
 * Contato mascarado (minimização — LGPD, art. 6º, III). Quem precisa ver o
 * dado completo clica em "mostrar", e esse acesso fica registrado.
 */
export default function MaskedContact({ value, ownerId, kind = "email" }: { value?: string | null; ownerId?: string | null; kind?: "email" | "phone" }) {
  const [shown, setShown] = useState(false);
  if (!value) return <span className="text-muted-foreground">—</span>;
  if (shown) return <span>{value}</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-muted-foreground">{kind === "phone" ? maskPhone(value) : maskEmail(value)}</span>
      <button
        type="button"
        title="Mostrar (o acesso fica registrado)"
        className="text-muted-foreground hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          setShown(true);
          logPersonalDataAccess(ownerId, "contato", kind === "phone" ? "telefone" : "e-mail");
        }}
      >
        <Eye size={13} />
      </button>
    </span>
  );
}
