import { BrandingProvider } from "@/hooks/useBranding";
import { PermissionProvider } from "@/hooks/usePermissions";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import Layout from "./components/Layout";
import Login from "./pages/Login";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Chamados = lazy(() => import("./pages/Chamados"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const Users = lazy(() => import("./pages/Users"));
const Reports = lazy(() => import("./pages/Reports"));
const Permissions = lazy(() => import("./pages/Permissions"));
const Audit = lazy(() => import("./pages/Audit"));
const Ajuda = lazy(() => import("./pages/Ajuda"));
const PasswordPolicyPage = lazy(() => import("./pages/PasswordPolicy"));
const NotAuthorized = lazy(() => import("./pages/NotAuthorized"));
const Departments = lazy(() => import("./pages/Departments"));
const Acompanhamento = lazy(() => import("./pages/Acompanhamento"));
const Backup = lazy(() => import("./pages/Backup"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex h-full min-h-[60vh] w-full items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="chamados-theme">
        <PermissionProvider>
          <BrandingProvider>
            <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
            <Routes>
             <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            
            <Route element={<Layout />}>
               <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/chamados" element={<Chamados />} />
                <Route path="/acompanhamento" element={<Acompanhamento />} />
                 <Route path="/reports" element={<Reports />} />
                <Route path="/usuarios" element={<Users />} />
                 <Route path="/permissions" element={<Permissions />} />
                  <Route path="/audit" element={<Audit />} />
                  <Route path="/ajuda" element={<Ajuda />} />
                  <Route path="/departamentos" element={<Departments />} />
                <Route path="/perfil" element={<Profile />} />
              <Route path="/backup" element={<Backup />} />
              <Route path="/configuracoes/senhas" element={<PasswordPolicyPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/unauthorized" element={<NotAuthorized />} />
            </Route>

            {/* Fallback for any other route */}
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
            </BrowserRouter>
          </BrandingProvider>
        </PermissionProvider>
      </ThemeProvider>
      <Toaster />
    </QueryClientProvider>
  );
};

export default App;
