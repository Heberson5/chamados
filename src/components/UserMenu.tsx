import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { User as UserIcon, KeyRound, LogOut, Moon, Sun, Monitor, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import ChangePasswordDialog from "./ChangePasswordDialog";
import { useTheme } from "@/components/ThemeProvider";
import { SUPPORTED_LANGUAGES } from "@/i18n";

interface Props {
  collapsed?: boolean;
}

export default function UserMenu({ collapsed }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [pwdOpen, setPwdOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const cycleTheme = () => {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  };
  const ThemeIcon = theme === "system" ? Monitor : theme === "dark" ? Sun : Moon;
  const themeLabel =
    theme === "system"
      ? t("userMenu.themeSystem")
      : theme === "dark"
      ? t("userMenu.themeLight")
      : t("userMenu.themeDark");

  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => i18n.language?.startsWith(l.code)) ??
    SUPPORTED_LANGUAGES[0];

  const cycleLanguage = () => {
    const idx = SUPPORTED_LANGUAGES.findIndex((l) => l.code === currentLang.code);
    const next = SUPPORTED_LANGUAGES[(idx + 1) % SUPPORTED_LANGUAGES.length];
    i18n.changeLanguage(next.code);
    try {
      localStorage.setItem("app-language", next.code);
    } catch {}
  };

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
  const fullName =
    `${profile?.nome ?? ""} ${profile?.sobrenome ?? ""}`.trim() || t("userMenu.user");

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
            <UserIcon size={14} /> {t("userMenu.myProfile")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPwdOpen(true)} className="gap-2">
            <KeyRound size={14} /> {t("userMenu.changePassword")}
          </DropdownMenuItem>
          <div className="flex items-center gap-1 px-1 py-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start gap-2 h-8"
              onClick={cycleTheme}
              title={`${t("userMenu.theme")}: ${themeLabel}`}
            >
              <ThemeIcon size={14} />
              <span className="text-xs">{themeLabel}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-8 px-2"
                  title={t("userMenu.language")}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Languages size={14} />
                  <span className="text-xs font-semibold uppercase">
                    {currentLang.code}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="right" className="w-48">
                <DropdownMenuLabel>{t("userMenu.language")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {SUPPORTED_LANGUAGES.map((lng) => (
                  <DropdownMenuItem
                    key={lng.code}
                    onSelect={() => {
                      i18n.changeLanguage(lng.code);
                      try {
                        localStorage.setItem("app-language", lng.code);
                      } catch {}
                    }}
                    className="gap-2"
                  >
                    <span>{lng.flag}</span>
                    <span>{lng.label}</span>
                    {currentLang.code === lng.code && (
                      <span className="ml-auto text-xs text-muted-foreground">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive">
            <LogOut size={14} /> {t("userMenu.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
    </>
  );
}