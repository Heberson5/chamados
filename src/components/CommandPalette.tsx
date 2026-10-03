import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Plus, Sun, Ticket, User as UserIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useMenuItems } from "@/hooks/useMenuItems";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/components/ThemeProvider";

export const OPEN_COMMAND_PALETTE = "command-palette:open";

interface TicketHit {
  id: string;
  os: string | null;
  titulo: string | null;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tickets, setTickets] = useState<TicketHit[]>([]);
  const navigate = useNavigate();
  const menuItems = useMenuItems();
  const { hasPermission } = usePermissions();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_PALETTE, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_PALETTE, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setTickets([]);
    }
  }, [open]);

  useEffect(() => {
    // Remove caracteres com significado na sintaxe de filtro do PostgREST.
    const term = query.replace(/[%,()*\\]/g, " ").trim();
    if (term.length < 2 || !hasPermission("chamados")) {
      setTickets([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("chamados")
        .select("id, os, titulo")
        .or(`titulo.ilike.%${term}%,os.ilike.%${term}%`)
        .order("gerado_em", { ascending: false })
        .limit(8);
      if (!cancelled) setTickets((data as TicketHit[]) || []);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, hasPermission]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden rounded-2xl top-[20%] translate-y-0 [&>button]:hidden">
        <DialogTitle className="sr-only">Busca rápida</DialogTitle>
        <Command>
          <CommandInput value={query} onValueChange={setQuery} placeholder="Buscar chamados, páginas e ações…" />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            {tickets.length > 0 && (
              <CommandGroup heading="Chamados">
                {tickets.map((t) => (
                  <CommandItem key={t.id} value={`chamado ${t.os ?? ""} ${t.titulo ?? ""} ${query}`} onSelect={() => go(`/chamados?id=${t.id}`)}>
                    <Ticket size={16} />
                    <span className="font-mono text-xs text-muted-foreground">#{t.os}</span>
                    <span className="truncate">{t.titulo || "Sem título"}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup heading="Ações">
              {hasPermission("chamados") && (
                <CommandItem value="novo chamado abrir criar" onSelect={() => go("/chamados?novo=1")}>
                  <Plus size={16} /> Novo chamado
                </CommandItem>
              )}
              <CommandItem value="tema escuro claro alternar" onSelect={() => { setTheme(isDark ? "light" : "dark"); setOpen(false); }}>
                {isDark ? <Sun size={16} /> : <Moon size={16} />} Mudar para tema {isDark ? "claro" : "escuro"}
              </CommandItem>
              <CommandItem value="meu perfil conta" onSelect={() => go("/perfil")}>
                <UserIcon size={16} /> Meu perfil
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Ir para">
              {menuItems.map((item) => (
                <CommandItem key={item.path} value={`ir ${item.label}`} onSelect={() => go(item.path)}>
                  <item.icon size={16} /> {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
