import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, List, BarChart3 } from "lucide-react";

export type PdfExportMode = "list" | "charts" | "both";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (mode: PdfExportMode) => void;
}

export default function PdfExportDialog({ open, onOpenChange, onConfirm }: Props) {
  const choose = (mode: PdfExportMode) => {
    onOpenChange(false);
    onConfirm(mode);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar PDF</DialogTitle>
          <DialogDescription>Escolha o que deve ser incluído no relatório.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Button variant="outline" className="justify-start gap-3 h-auto py-3" onClick={() => choose("both")}>
            <FileText size={18} className="shrink-0" />
            <div className="text-left">
              <div className="font-medium">Gráficos e lista</div>
              <div className="text-xs text-muted-foreground">Inclui os gráficos e a tabela de chamados</div>
            </div>
          </Button>
          <Button variant="outline" className="justify-start gap-3 h-auto py-3" onClick={() => choose("list")}>
            <List size={18} className="shrink-0" />
            <div className="text-left">
              <div className="font-medium">Somente lista</div>
              <div className="text-xs text-muted-foreground">Apenas a tabela de chamados, sem gráficos</div>
            </div>
          </Button>
          <Button variant="outline" className="justify-start gap-3 h-auto py-3" onClick={() => choose("charts")}>
            <BarChart3 size={18} className="shrink-0" />
            <div className="text-left">
              <div className="font-medium">Somente gráficos</div>
              <div className="text-xs text-muted-foreground">Apenas os gráficos, sem a tabela</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
