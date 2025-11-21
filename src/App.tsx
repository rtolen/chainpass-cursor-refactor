import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import VaiIntro from "./pages/VaiIntro";
import BusinessVerificationStart from "./pages/BusinessVerificationStart";
import NotFound from "./pages/NotFound";
import PaymentSelection from "./pages/PaymentSelection";
import PaymentForm from "./pages/PaymentForm";

import VerificationTransition from "./pages/VerificationTransition";
import VaiProcessing from "./pages/VaiProcessing";
import LeoDeclaration from "./pages/LeoDeclaration";
import SignatureAgreement from "./pages/SignatureAgreement";
import FacialVerification from "./pages/FacialVerification";
import LEOVaiSuccess from "./pages/LEOVaiSuccess";
import VaiSuccess from "./pages/VaiSuccess";
import Install from "./pages/Install";
import AdminDashboard from "./pages/AdminDashboard";
import Auth from "./pages/Auth";
import BusinessPartnerRegistration from "./pages/BusinessPartnerRegistration";
import BusinessPartnerPortal from "./pages/BusinessPartnerPortal";
import ApiDocumentation from "./pages/ApiDocumentation";
import DeveloperSandbox from "./pages/DeveloperSandbox";
import ErrorMonitoring from "./pages/ErrorMonitoring";
import ContractSignature from "./pages/ContractSignature";
import ComplyCubeFacialVerification from "./pages/ComplyCubeFacialVerification";
import VerificationCallback from "./pages/VerificationCallback";
import FinalVerification from "./pages/FinalVerification";
import FacialVerificationCheckpoint from "./pages/FacialVerificationCheckpoint";
import IdentityVerificationRequirements from "./pages/IdentityVerificationRequirements";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ThemeProvider } from "@/contexts/ThemeContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="fixed top-4 right-4 z-50">
              <ThemeToggle />
            </div>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/identity-verification-requirements" element={<IdentityVerificationRequirements />} />
              <Route path="/vai-intro" element={<VaiIntro />} />
              <Route path="/:businessId/verify" element={<BusinessVerificationStart />} />
              <Route path="/pricing" element={<PaymentSelection />} />
              <Route path="/payment" element={<PaymentForm />} />
              <Route path="/verification-transition" element={<VerificationTransition />} />
              <Route path="/vai-processing" element={<VaiProcessing />} />
              <Route path="/verification-callback" element={<VerificationCallback />} />
              <Route path="/complycube-facial-verification" element={<ComplyCubeFacialVerification />} />
              <Route path="/complycube-callback" element={<ComplyCubeFacialVerification />} />
              <Route path="/leo-declaration" element={<LeoDeclaration />} />
              <Route path="/legal-agreements" element={<SignatureAgreement />} />
              <Route path="/contract-signature" element={<ContractSignature />} />
              <Route path="/final-verification" element={<FinalVerification />} />
              <Route path="/facial-verification" element={<FacialVerification />} />
              <Route path="/verification-checkpoint" element={<FacialVerificationCheckpoint />} />
              <Route path="/leo-vai-success" element={<LEOVaiSuccess />} />
              <Route path="/vai-success" element={<VaiSuccess />} />
              <Route path="/install" element={<Install />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/business-partner-registration" element={<BusinessPartnerRegistration />} />
              <Route path="/partner-portal" element={<BusinessPartnerPortal />} />
              <Route path="/api-docs" element={<ApiDocumentation />} />
              <Route path="/sandbox" element={<DeveloperSandbox />} />
              <Route path="/error-monitoring" element={<ErrorMonitoring />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
