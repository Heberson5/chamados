import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Ticket, CheckCircle2, Mail, Lock, KeyRound, Plus, Trash2, GripVertical, Palette } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";

interface Props {
  config: any;
  setConfig: (c: any) => void;
}

function Editable({
  value,
  onChange,
  className,
  as: Tag = "span",
  multiline = false,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  as?: any;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  return (
    <Tag
      ref={ref as any}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={(e: any) => {
        const text = multiline ? e.currentTarget.innerText : e.currentTarget.innerText.replace(/\n/g, " ");
        if (text !== value) onChange(text);
      }}
      onKeyDown={(e: any) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className={
        (className || "") +
        " outline-none rounded-sm transition-all hover:ring-1 hover:ring-primary/40 focus:ring-2 focus:ring-primary focus:bg-white/5 cursor-text"
      }
      dangerouslySetInnerHTML={{ __html: value || "" }}
    />
  );
}

export default function LandingLiveEditor({ config, setConfig }: Props) {
  const { branding } = useBranding();
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const features: any[] = config.features || [];

  const update = (patch: any) => setConfig({ ...config, ...patch });
  const updateFeature = (i: number, text: string) => {
    const f = [...features];
    f[i] = { ...f[i], text };
    update({ features: f });
  };
  const addFeature = () => {
    update({
      features: [...features, { id: Date.now().toString(), text: "Novo item" }],
    });
  };
  const removeFeature = (i: number) => {
    update({ features: features.filter((_, idx) => idx !== i) });
  };
  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const f = [...features];
    const [moved] = f.splice(from, 1);
    f.splice(to, 0, moved);
    update({ features: f });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium">Cor de fundo</span>
          <input
            type="color"
            className="w-9 h-9 rounded border cursor-pointer p-0.5 bg-transparent"
            value={config.bgColor || "#020617"}
            onChange={(e) => update({ bgColor: e.target.value })}
          />
          <span className="text-xs font-mono text-muted-foreground">
            {config.bgColor || "#020617"}
          </span>
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="outline" className="gap-1" onClick={addFeature}>
          <Plus size={14} /> Adicionar item
        </Button>
        <span className="text-xs text-muted-foreground italic">
          Clique nos textos para editar • arraste os itens para reordenar
        </span>
      </div>

      {/* Live preview */}
      <div className="rounded-xl border overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[560px]">
          {/* Left panel - editable */}
          <div
            className="relative p-10 text-white overflow-hidden"
            style={{ backgroundColor: config.bgColor || "#020617" }}
          >
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[80px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[80px]" />

            <div className="relative z-10 space-y-8 max-w-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
                  {branding.companyLogo ? (
                    <img src={branding.companyLogo} alt="Logo" className="w-8 h-8 object-contain" />
                  ) : (
                    <Ticket size={32} className="text-primary" />
                  )}
                </div>
                <h1 className="text-2xl font-black tracking-tighter uppercase italic">
                  {branding.companyName || "Chamados"}
                </h1>
              </div>

              <h2 className="text-4xl font-black leading-[0.95]">
                <Editable
                  value={config.brandTitle || ""}
                  onChange={(v) => update({ brandTitle: v })}
                  className="block"
                />
                <Editable
                  value={config.brandHighlight || ""}
                  onChange={(v) => update({ brandHighlight: v })}
                  className="block text-primary italic"
                />
              </h2>

              <Editable
                as="p"
                multiline
                value={config.subtitle || ""}
                onChange={(v) => update({ subtitle: v })}
                className="text-base text-slate-400 leading-relaxed block"
              />

              <div className="space-y-3">
                {features.map((feat, i) => (
                  <div
                    key={feat.id || i}
                    draggable
                    onDragStart={() => setDragIdx(i)}
                    onDragEnter={() => setOverIdx(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnd={() => {
                      if (dragIdx !== null && overIdx !== null) reorder(dragIdx, overIdx);
                      setDragIdx(null);
                      setOverIdx(null);
                    }}
                    className={
                      "flex items-center gap-3 group rounded-md px-1 -mx-1 " +
                      (overIdx === i && dragIdx !== null && dragIdx !== i
                        ? "ring-2 ring-primary/60 bg-primary/5"
                        : "")
                    }
                  >
                    <GripVertical
                      size={14}
                      className="text-slate-500 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
                    />
                    <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={12} className="text-primary" />
                    </div>
                    <Editable
                      value={feat.text || ""}
                      onChange={(v) => updateFeature(i, v)}
                      className="text-slate-300 font-medium flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeFeature(i)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-1"
                      title="Remover"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-4 text-xs text-slate-500 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <Editable
                  value={config.statusText || ""}
                  onChange={(v) => update({ statusText: v })}
                />
              </div>
            </div>
          </div>

          {/* Right panel - editable form preview */}
          <div className="p-10 bg-background flex flex-col justify-center">
            <div className="max-w-sm w-full mx-auto space-y-6">
              <div className="space-y-2">
                <Editable
                  as="h3"
                  value={config.formTitle || ""}
                  onChange={(v) => update({ formTitle: v })}
                  className="text-3xl font-black tracking-tight block"
                />
                <Editable
                  as="p"
                  value={config.formSubtitle || ""}
                  onChange={(v) => update({ formSubtitle: v })}
                  className="text-slate-500 font-medium block"
                />
              </div>
              <div className="space-y-3 opacity-70 pointer-events-none select-none">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <div className="h-12 pl-11 rounded-xl bg-muted border flex items-center text-sm text-muted-foreground">
                    exemplo@empresa.com
                  </div>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <div className="h-12 pl-11 rounded-xl bg-muted border flex items-center text-sm text-muted-foreground">
                    ••••••••
                  </div>
                </div>
                <div className="h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center gap-2 font-black uppercase tracking-widest text-sm">
                  Entrar <KeyRound size={16} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Pré-visualização ao vivo. As mudanças só serão publicadas após clicar em <strong>Salvar Alterações</strong>.
      </p>
    </div>
  );
}