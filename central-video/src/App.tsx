import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ThemeShortcut } from "@/components/ThemeShortcut";
const Sso = lazy(() => import("./pages/Sso"));
const Signup = lazy(() => import("./pages/Signup"));
const TeamAccess = lazy(() => import("./pages/TeamAccess"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const CaptainDashboard = lazy(() => import("./pages/CaptainDashboard"));
const CrewDashboard = lazy(() => import("./pages/CrewDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <ThemeShortcut />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <Routes>
              <Route path="/" element={<Sso />} />
              <Route path="/auth" element={<Sso />} />
              <Route path="/sso" element={<Sso />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/team" element={<TeamAccess />} />
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/captain" element={<CaptainDashboard />} />
              <Route path="/crew" element={<CrewDashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
