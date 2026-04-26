import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import Landing from "./pages/Landing.tsx";
import Auth from "./pages/Auth.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import { AuthProvider } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import Dashboard from "./pages/app/Dashboard";
import Tickets from "./pages/app/Tickets";
import TicketDetail from "./pages/app/TicketDetail";
import Board from "./pages/app/Board";
import SettingsPage from "./pages/app/Settings";
import AdminCompanies from "./pages/admin/Companies";
import AdminUsers from "./pages/admin/Users";
import AdminStructure from "./pages/admin/Structure";
import AdminSystem from "./pages/admin/System";
import AdminPermissions from "./pages/admin/Permissions";
import AdminAuditLogs from "./pages/admin/AuditLogs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="app-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
              <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
                <Route index element={<Dashboard />} />
                <Route path="tickets" element={<Tickets />} />
                <Route path="tickets/:id" element={<TicketDetail />} />
                <Route path="board" element={<Board />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="admin/companies" element={<AdminCompanies />} />
                <Route path="admin/users" element={<AdminUsers />} />
                <Route path="admin/structure" element={<AdminStructure />} />
                <Route path="admin/system" element={<AdminSystem />} />
                <Route path="admin/permissions" element={<AdminPermissions />} />
                 <Route path="admin/audit-logs" element={<AdminAuditLogs />} />
                 <Route path="reports" element={<div className="p-8 text-muted-foreground italic">Módulo de Relatórios (Em breve)</div>} />
                 <Route path="knowledge" element={<div className="p-8 text-muted-foreground italic">Base de Conhecimento (Em breve)</div>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
