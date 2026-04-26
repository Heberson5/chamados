import { BrandingProvider } from "./hooks/useBranding";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Chamados from "./pages/Chamados";
import Settings from "./pages/Settings";
 import Profile from "./pages/Profile";
  import Users from "./pages/Users";
  import Reports from "./pages/Reports";
  import Permissions from "./pages/Permissions";
import Audit from "./pages/Audit";
import PasswordPolicyPage from "./pages/PasswordPolicy";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="help-me-theme">
        <BrandingProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            
            <Route element={<Layout />}>
               <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/chamados" element={<Chamados />} />
                 <Route path="/reports" element={<Reports />} />
                <Route path="/usuarios" element={<Users />} />
                <Route path="/permissions" element={<Permissions />} />
                <Route path="/audit" element={<Audit />} />
               <Route path="/perfil" element={<Profile />} />
              <Route path="/configuracoes/senhas" element={<PasswordPolicyPage />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Fallback for any other route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </BrowserRouter>
        </BrandingProvider>
      </ThemeProvider>
      <Toaster />
    </QueryClientProvider>
  );
};

export default App;
