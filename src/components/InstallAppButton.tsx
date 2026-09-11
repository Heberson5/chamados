import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Share, SquarePlus } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

export default function InstallAppButton({ className }: { className?: string }) {
  const { canInstall, canPromptNatively, isIos, promptInstall } = usePwaInstall();
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  if (!canInstall) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        title="Instalar aplicativo"
        aria-label="Instalar aplicativo"
        className={className}
        onClick={() => (canPromptNatively ? promptInstall() : setShowIosInstructions(true))}
      >
        <Download size={20} />
      </Button>

      {isIos && (
        <Dialog open={showIosInstructions} onOpenChange={setShowIosInstructions}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Instalar como aplicativo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                O Safari não permite instalar apps automaticamente. Siga os passos abaixo:
              </p>
              <ol className="space-y-3">
                <li className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
                  <span className="flex items-center gap-1.5">
                    Toque no ícone de compartilhar <Share size={16} className="inline text-primary" /> na barra do Safari.
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
                  <span className="flex items-center gap-1.5">
                    Escolha <strong>Adicionar à Tela de Início</strong> <SquarePlus size={16} className="inline text-primary" />.
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
                  <span>Confirme tocando em <strong>Adicionar</strong>.</span>
                </li>
              </ol>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
