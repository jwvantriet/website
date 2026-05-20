import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { PlatformAuthProvider } from '@/contexts/PlatformAuthContext';
import Index from './pages/Index';
import About from './pages/About';
import Services from './pages/Services';
import Team from './pages/Team';
import BlogPosts from './pages/BlogPosts';
import Contact from './pages/Contact';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfUse from './pages/TermsOfUse';
import Vacancies from './pages/Vacancies';
import VacancyDetail from './pages/VacancyDetail';
import AdminVacancies from './pages/AdminVacancies';
import AdminSyncDashboard from './pages/AdminSyncDashboard';
import AdminWebhookDashboard from './pages/AdminWebhookDashboard';
import AdminOperationsDashboard from './pages/AdminOperationsDashboard';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import AuthCallback from './pages/AuthCallback';
import AuthError from './pages/AuthError';
import PlatformLogin from './pages/PlatformLogin';
import Dashboard from './pages/platform/Dashboard';
import PayrollPeriods from './pages/platform/PayrollPeriods';
import MonthlyPlanner from './pages/platform/MonthlyPlanner';
import Approvals from './pages/platform/Approvals';
import Corrections from './pages/platform/Corrections';
import PayrollUpload from './pages/platform/PayrollUpload';
import PlatformOidcCallback from './pages/PlatformOidcCallback';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <SonnerToaster />
      <BrowserRouter>
        <AuthProvider>
          <PlatformAuthProvider>
            <Routes>
              {/* Public Website Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/team" element={<Team />} />
              <Route path="/blog-posts" element={<BlogPosts />} />
              <Route path="/blog-posts/:id" element={<BlogPosts />} />
              <Route path="/vacancies" element={<Vacancies />} />
              <Route path="/vacancies/:id" element={<VacancyDetail />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-use" element={<TermsOfUse />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/error" element={<AuthError />} />

              {/* Platform Routes */}
              <Route path="/platform/login" element={<PlatformLogin />} />
              <Route path="/platform/oidc-callback" element={<PlatformOidcCallback />} />
              <Route path="/platform/dashboard" element={<Dashboard />} />
              <Route path="/platform/payroll-periods" element={<PayrollPeriods />} />
              <Route path="/platform/planner" element={<MonthlyPlanner />} />
              <Route path="/platform/approvals" element={<Approvals />} />
              <Route path="/platform/corrections" element={<Corrections />} />
              <Route path="/platform/upload" element={<PayrollUpload />} />

              {/* Admin Routes */}
              <Route
                path="/admin/vacancies"
                element={
                  <ProtectedAdminRoute>
                    <AdminVacancies />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/sync-dashboard"
                element={
                  <ProtectedAdminRoute>
                    <AdminSyncDashboard />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/webhook-dashboard"
                element={
                  <ProtectedAdminRoute>
                    <AdminWebhookDashboard />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/operations"
                element={
                  <ProtectedAdminRoute>
                    <AdminOperationsDashboard />
                  </ProtectedAdminRoute>
                }
              />
            </Routes>
          </PlatformAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;