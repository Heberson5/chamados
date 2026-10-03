import { cn } from "@/lib/utils";

interface BrandMarkProps {
  logo?: string;
  className?: string;
  size?: number;
}

/** Logo da empresa (se configurado) ou o símbolo padrão do app. */
export default function BrandMark({ logo, className, size = 32 }: BrandMarkProps) {
  if (logo) {
    return (
      <img
        src={logo}
        alt="Logo"
        style={{ width: size, height: size }}
        className={cn("object-contain shrink-0 rounded-lg", className)}
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "shrink-0 rounded-[28%] bg-primary grid place-items-center text-primary-foreground shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.45),inset_0_1px_0_rgb(255_255_255/0.25)]",
        className
      )}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 7.5A3.5 3.5 0 0 1 7.5 4h9A3.5 3.5 0 0 1 20 7.5v5a3.5 3.5 0 0 1-3.5 3.5H11l-3.6 3.2c-.6.5-1.4.1-1.4-.6V16h-.5A1.5 1.5 0 0 1 4 14.5z"
          fill="currentColor"
        />
        <path d="m9 10.2 2 2 4-4" stroke="hsl(var(--primary))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
