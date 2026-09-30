import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AdminUsers from "./pages/AdminUsers";
import ExternalIdentities from "./pages/ExternalIdentities";
import ApprovalAnalysis from "./pages/ApprovalAnalysis";
import RequisitionApprovals from "./pages/RequisitionApprovals";
import Stock from "./pages/Stock";
import NotFound from "./pages/NotFound";
import Unsubscribe from "./pages/Unsubscribe";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/integracoes/identidades" element={<ExternalIdentities />} />
          <Route path="/approvals" element={<ApprovalAnalysis />} />
          <Route path="/super-admin" element={<Navigate to="/admin" replace />} />
          <Route path="/requisicoes-aprovacao" element={<RequisitionApprovals />} />
          <Route path="/estoque" element={<Stock />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
