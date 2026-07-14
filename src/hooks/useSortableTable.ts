import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export function useSortableTable<T>(data: T[], getValue: (item: T, key: string) => any) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const va = getValue(a, sortKey);
      const vb = getValue(b, sortKey);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") {
        return sortDirection === "asc" ? va - vb : vb - va;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return sortDirection === "asc" ? -1 : 1;
      if (sa > sb) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [data, sortKey, sortDirection, getValue]);

  const requestSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  return { sortedData, sortKey, sortDirection, requestSort };
}

export function useColumnVisibility(defaultKeys: string[]) {
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(defaultKeys.map((k) => [k, true]))
  );
  const toggle = (key: string) => setVisible((prev) => ({ ...prev, [key]: prev[key] === false }));
  const isVisible = (key: string) => visible[key] !== false;
  return { visible, toggle, isVisible };
}
