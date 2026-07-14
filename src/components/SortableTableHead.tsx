import { TableHead } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortDirection } from "@/hooks/useSortableTable";

interface SortableTableHeadProps {
  label: string;
  sortKey: string;
  currentSortKey: string | null;
  direction: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableTableHead({ label, sortKey, currentSortKey, direction, onSort, className }: SortableTableHeadProps) {
  const active = currentSortKey === sortKey;
  return (
    <TableHead className={cn("cursor-pointer select-none hover:text-foreground transition-colors", className)} onClick={() => onSort(sortKey)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          direction === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
        ) : (
          <ArrowUpDown size={12} className="opacity-30" />
        )}
      </span>
    </TableHead>
  );
}
