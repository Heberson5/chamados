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
 import Reports from "./pages/Reports";
 import Inventory from "./pages/Inventory";
 import Baixas from "./pages/Baixas";

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
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            
            <Route element={<Layout />}>
               <Route path="/dashboard" element={<Dashboard />} />
               <Route path="/chamados" element={<Chamados />} />
               <Route path="/inventario" element={<Inventory />} />
               <Route path="/baixas" element={<Baixas />} />
               <Route path="/reports" element={<Reports />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Fallback for any other route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
      <Toaster />
    </QueryClientProvider>
  );
};

export default App;
