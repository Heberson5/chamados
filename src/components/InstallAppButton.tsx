import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { cn } from "@/lib/utils";

interface InstallAppButtonProps {
  collapsed?: boolean;
  className?: string;
  variant?: "sidebar" | "banner";
}

export default function InstallAppButton({ collapsed, className, variant = "sidebar" }: InstallAppButtonProps) {
  const { canInstall, promptInstall } = useInstallPrompt();

  if (!canInstall) return null;

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
