import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User as UserIcon, KeyRound, LogOut, Moon, Sun, Monitor, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import ChangePasswordDialog from "./ChangePasswordDialog";
import { useTheme } from "@/components/ThemeProvider";

interface Props {
  collapsed?: boolean;
}

export default function UserMenu({ collapsed }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [pwdOpen, setPwdOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  };
  const ThemeIcon = theme === "system" ? Monitor : theme === "dark" ? Moon : Sun;
  const themeName = theme === "system" ? "Automático" : theme === "dark" ? "Escuro" : "Claro";

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("nome, sobrenome, email, avatar_url, regra, is_master")
      .eq("id", user.id)
      .single();
    setProfile(data);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const initial = (profile?.nome?.[0] ?? "U").toUpperCase();
  const fullName = `${profile?.nome ?? ""} ${profile?.sobrenome ?? ""}`.trim() || "Usuário";

  const roleLabel = profile?.is_master || profile?.regra === "MASTER"
    ? "Master"
    : profile?.regra === "ADMIN"
      ? "Administrador"
      : profile?.regra === "TECNICO"
        ? "Técnico"
        : "Usuário";

  const avatar = (
    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden shrink-0">
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt={fullName} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-bold">{initial}</span>
      )}
    </div>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full flex items-center rounded-xl transition-colors hover:bg-muted text-left",
              collapsed ? "justify-center p-1" : "gap-2.5 p-2 border"
            )}
          >
            {avatar}
            {!collapsed && (
              <>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[13px] font-semibold truncate">{fullName}</span>
                  <span className="text-[11.5px] text-muted-foreground truncate">{roleLabel}</span>
                </div>
                <ChevronsUpDown size={15} className="text-muted-foreground shrink-0" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-60">
          <DropdownMenuLabel className="font-normal">
            <span className="block text-sm font-semibold">{fullName}</span>
            <span className="block text-xs text-muted-foreground truncate">{profile?.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/perfil")} className="gap-2">
            <UserIcon size={14} /> Meu perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPwdOpen(true)} className="gap-2">
            <KeyRound size={14} /> Trocar senha
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => { e.preventDefault(); cycleTheme(); }}
            className="gap-2"
          >
            <ThemeIcon size={14} /> Tema: {themeName}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive">
            <LogOut size={14} /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
    </>
  );
}