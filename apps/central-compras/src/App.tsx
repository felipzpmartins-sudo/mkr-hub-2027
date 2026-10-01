import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { LabAuthProvider } from "./contexts/LabAuthContext";
import { RequireLabAuth } from "./components/RequireLabAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <LabAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RequireLabAuth><Index /></RequireLabAuth>} />
            <Route path="/auth" element={<Auth />} />
            {/* Legacy business pages are retained in the source but not exposed
                by this auth-only lab until each one uses the local API. */}
            <Route path="/admin" element={<Navigate to="/" replace />} />
            <Route path="/admin/users" element={<Navigate to="/" replace />} />
            <Route path="/admin/integracoes/identidades" element={<Navigate to="/" replace />} />
            <Route path="/approvals" element={<Navigate to="/" replace />} />
            <Route path="/super-admin" element={<Navigate to="/" replace />} />
            <Route path="/requisicoes-aprovacao" element={<Navigate to="/" replace />} />
            <Route path="/estoque" element={<Navigate to="/" replace />} />
            <Route path="/unsubscribe" element={<Navigate to="/" replace />} />
            <Route path="/reset-password" element={<Navigate to="/auth" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </LabAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
