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
import { Button } from "@/components/ui/button";
import { User as UserIcon, KeyRound, LogOut, Moon, Sun, Monitor } from "lucide-react";
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
  const ThemeIcon = theme === "system" ? Monitor : theme === "dark" ? Sun : Moon;
  const themeLabel = theme === "system" ? "Automático" : theme === "dark" ? "Claro" : "Escuro";

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

  const avatar = (
    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center overflow-hidden shrink-0 border">
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt={fullName} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-semibold">{initial}</span>
      )}
    </div>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full h-auto py-2",
              collapsed ? "px-1 justify-center" : "px-2 justify-start gap-2"
            )}
          >
            {avatar}
            {!collapsed && (
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-sm font-medium truncate w-full text-left">{fullName}</span>
                <span className="text-xs text-muted-foreground truncate w-full text-left">
                  {profile?.email}
                </span>
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56">
          <DropdownMenuLabel>{fullName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/perfil")} className="gap-2">
            <UserIcon size={14} /> Meu Perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPwdOpen(true)} className="gap-2">
            <KeyRound size={14} /> Trocar Senha
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => { e.preventDefault(); cycleTheme(); }}
            className="gap-2"
            title={`Tema atual: ${themeLabel}`}
          >
            <ThemeIcon size={14} />
            <span className="sr-only">Alternar tema ({themeLabel})</span>
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