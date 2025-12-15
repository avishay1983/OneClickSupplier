import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Dashboard from "./pages/Dashboard";
import VendorForm from "./pages/VendorForm";
import VendorStatus from "./pages/VendorStatus";
import VendorReceipts from "./pages/VendorReceipts";
import SystemDocumentation from "./pages/SystemDocumentation";
import Auth from "./pages/Auth";
import ManagerApprovalResult from "./pages/ManagerApprovalResult";
import CRM from "./pages/CRM";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/vendor/:token" element={<VendorForm />} />
            <Route path="/vendor-status/:token" element={<VendorStatus />} />
            <Route path="/vendor-receipts/:token" element={<VendorReceipts />} />
            <Route path="/documentation" element={<SystemDocumentation />} />
            <Route path="/manager-approval-result" element={<ManagerApprovalResult />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
