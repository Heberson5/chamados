import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { cn } from "@/lib/utils";

interface InstallAppButtonProps {
  collapsed?: boolean;
  className?: string;
  variant?: "sidebar" | "banner" | "card" | "login";
}

export default function InstallAppButton({ collapsed, className, variant = "sidebar" }: InstallAppButtonProps) {
  const { canInstall, promptInstall } = useInstallPrompt();

  if (!canInstall) return null;

  if (variant === "card") {
    return (
      <div className={cn("rounded-xl border p-3 bg-gradient-to-b from-accent to-card", className)}>
        <p className="text-[12.5px] font-semibold">Instale o app</p>
        <p className="text-[11.5px] text-muted-foreground mt-0.5 mb-2">Acesse mais rápido, direto da área de trabalho ou do celular.</p>
        <Button size="sm" onClick={promptInstall} className="h-7 text-xs">
          <Download size={13} /> Instalar
        </Button>
      </div>
    );
  }

  if (variant === "login") {
    return (
      <div className={cn("flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs", className)}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-primary">
          <Smartphone size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Instale o aplicativo</p>
          <p className="text-xs text-muted-foreground">Android e computador, sem loja.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={promptInstall}>
          <Download size={14} /> Instalar
        </Button>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <button
        type="button"
        onClick={promptInstall}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/15 transition-colors",
          className
        )}
      >
        <Download size={14} />
        Instalar aplicativo
      </button>
    );
  }

  const button = (
    <Button
      variant="ghost"
      onClick={promptInstall}
      className={cn("w-full justify-start", collapsed ? "px-2" : "px-4", className)}
    >
      <Download size={20} className={cn(!collapsed && "mr-2")} />
      {!collapsed && <span>Instalar App</span>}
    </Button>
  );

  if (!collapsed) return button;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">Instalar App</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
