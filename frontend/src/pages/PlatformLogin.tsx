import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { Building2, User, Briefcase, ArrowLeft, Eye, EyeOff, ExternalLink } from 'lucide-react';

type LoginMode = 'select' | 'agency' | 'placement' | 'company';

export default function PlatformLogin() {
  const [mode, setMode] = useState<LoginMode>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { loginLocal, error } = usePlatformAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/platform/dashboard';

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const success = await loginLocal(email, password);
    setSubmitting(false);
    if (success) {
      navigate(redirectTo);
    }
  };

  const handleCarerixLogin = (role: 'placement' | 'company') => {
    // Redirect to backend OIDC login endpoint with the intended role
    const oidcUrl = `${window.location.origin}/api/v1/platform-auth/oidc-login?role=${role}`;
    window.location.href = oidcUrl;
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
  };

  const modeConfig = {
    placement: {
      icon: <User className="w-6 h-6 text-[#407df1]" />,
      iconSmall: <User className="w-5 h-5 text-[#407df1]" />,
      bgColor: 'bg-[#407df1]/10',
      bgColorHover: 'bg-[#407df1]/20',
      borderColor: 'border-[#407df1]',
      ringColor: 'focus:ring-[#407df1]',
      focusBorder: 'focus:border-[#407df1]',
      btnBg: 'bg-[#407df1]',
      btnHover: 'hover:bg-[#3568d4]',
      btnText: 'text-white',
      title: 'Placement Login',
      subtitle: 'Sign in with your Carerix credentials',
    },
    company: {
      icon: <Building2 className="w-6 h-6 text-[#61bef6]" />,
      iconSmall: <Building2 className="w-5 h-5 text-[#61bef6]" />,
      bgColor: 'bg-[#61bef6]/10',
      bgColorHover: 'bg-[#61bef6]/20',
      borderColor: 'border-[#61bef6]',
      ringColor: 'focus:ring-[#61bef6]',
      focusBorder: 'focus:border-[#61bef6]',
      btnBg: 'bg-[#61bef6]',
      btnHover: 'hover:bg-[#4aa8e0]',
      btnText: 'text-white',
      title: 'Company Login',
      subtitle: 'Sign in with your Carerix credentials',
    },
    agency: {
      icon: <Briefcase className="w-6 h-6 text-[#fbc134]" />,
      iconSmall: <Briefcase className="w-5 h-5 text-[#fbc134]" />,
      bgColor: 'bg-[#fbc134]/10',
      bgColorHover: 'bg-[#fbc134]/20',
      borderColor: 'border-[#fbc134]',
      ringColor: 'focus:ring-[#fbc134]',
      focusBorder: 'focus:border-[#fbc134]',
      btnBg: 'bg-[#fbc134]',
      btnHover: 'hover:bg-[#e5af2e]',
      btnText: 'text-[#222c4a]',
      title: 'Agency Login',
      subtitle: 'Sign in with your platform credentials',
    },
  };

  const renderCarerixLogin = (currentMode: 'placement' | 'company') => {
    const config = modeConfig[currentMode];
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => { setMode('select'); resetForm(); }}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#222c4a] transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center`}>
            {config.iconSmall}
          </div>
          <div>
            <h2 className="font-semibold text-[#222c4a]">{config.title}</h2>
            <p className="text-xs text-gray-500">{config.subtitle}</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 mb-1 font-medium">
            Carerix Single Sign-On
          </p>
          <p className="text-xs text-blue-600">
            You will be redirected to Carerix to sign in with your existing credentials.
            After authentication, you'll be automatically returned to the platform.
          </p>
        </div>

        <button
          onClick={() => handleCarerixLogin(currentMode)}
          className={`w-full ${config.btnBg} ${config.btnText} py-3 rounded-lg font-bold ${config.btnHover} transition-colors flex items-center justify-center gap-2`}
        >
          <ExternalLink className="w-4 h-4" />
          Sign in with Carerix
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-gray-400">or use local credentials</span>
          </div>
        </div>

        <form onSubmit={handleLocalLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${config.ringColor} ${config.focusBorder} focus:ring-2 outline-none transition-all`}
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${config.ringColor} ${config.focusBorder} focus:ring-2 outline-none transition-all pr-10`}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
          >
            {submitting ? 'Signing in...' : 'Sign In with Local Credentials'}
          </button>
        </form>
      </div>
    );
  };

  const renderAgencyLoginForm = () => {
    const config = modeConfig.agency;
    return (
      <form onSubmit={handleLocalLogin} className="space-y-5">
        <button
          type="button"
          onClick={() => { setMode('select'); resetForm(); }}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#222c4a] transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center`}>
            {config.iconSmall}
          </div>
          <div>
            <h2 className="font-semibold text-[#222c4a]">{config.title}</h2>
            <p className="text-xs text-gray-500">{config.subtitle}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${config.ringColor} ${config.focusBorder} focus:ring-2 outline-none transition-all`}
            placeholder="your@email.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${config.ringColor} ${config.focusBorder} focus:ring-2 outline-none transition-all pr-10`}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`w-full ${config.btnBg} ${config.btnText} py-3 rounded-lg font-bold ${config.btnHover} transition-colors disabled:opacity-50`}
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#222c4a] via-[#1a2340] to-[#222c4a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/">
            <img
              src="https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-04-06/6a3fa59f-0e31-41f9-8ed3-e5a342f84e3f.png"
              alt="Confair Group"
              className="h-12 w-auto mx-auto mb-4"
            />
          </Link>
          <h1 className="text-2xl font-bold text-white">Platform Login</h1>
          <p className="text-white/60 text-sm mt-1">Access your Confair workspace</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {mode === 'select' && (
            <div className="space-y-4">
              <p className="text-center text-gray-600 text-sm mb-6">Select your login method</p>

              {/* Placement Login */}
              <button
                onClick={() => { setMode('placement'); resetForm(); }}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-[#407df1] hover:bg-[#407df1]/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#407df1]/10 flex items-center justify-center group-hover:bg-[#407df1]/20">
                  <User className="w-6 h-6 text-[#407df1]" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-[#222c4a]">Placement Login</p>
                  <p className="text-xs text-gray-500">Sign in via Carerix SSO</p>
                </div>
              </button>

              {/* Company Login */}
              <button
                onClick={() => { setMode('company'); resetForm(); }}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-[#61bef6] hover:bg-[#61bef6]/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#61bef6]/10 flex items-center justify-center group-hover:bg-[#61bef6]/20">
                  <Building2 className="w-6 h-6 text-[#61bef6]" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-[#222c4a]">Company Login</p>
                  <p className="text-xs text-gray-500">Sign in via Carerix SSO</p>
                </div>
              </button>

              {/* Agency Login */}
              <button
                onClick={() => { setMode('agency'); resetForm(); }}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-[#fbc134] hover:bg-[#fbc134]/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#fbc134]/10 flex items-center justify-center group-hover:bg-[#fbc134]/20">
                  <Briefcase className="w-6 h-6 text-[#fbc134]" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-[#222c4a]">Agency Login</p>
                  <p className="text-xs text-gray-500">Sign in with your platform credentials</p>
                </div>
              </button>
            </div>
          )}

          {mode === 'placement' && renderCarerixLogin('placement')}
          {mode === 'company' && renderCarerixLogin('company')}
          {mode === 'agency' && renderAgencyLoginForm()}
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-white/50 text-sm hover:text-white transition-colors">
            ← Back to Website
          </Link>
        </div>
      </div>
    </div>
  );
}