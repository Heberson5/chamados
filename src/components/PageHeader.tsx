import { ReactNode } from "react";

export const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <div className="h-14 border-b border-border bg-background px-6 flex items-center justify-between">
    <div>
      <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);