import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="size-6 rounded-full border-2 border-muted border-t-foreground animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  
  if (location.pathname !== "/onboarding") {
    // Se não temos perfil mas terminou de carregar, redirecionamos para onboarding
    if (!profile) {
      return <Navigate to="/onboarding" replace />;
    }
    
    // Se temos perfil mas não é master e não tem empresa, redirecionamos para onboarding
    if (!profile.is_master && !profile.organization_id) {
      return <Navigate to="/onboarding" replace />;
    }
  }
  return <>{children}</>;
};