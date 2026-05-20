import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function PlatformOidcCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const error = searchParams.get('error');
    const token = searchParams.get('token');
    const userJson = searchParams.get('user');

    if (error) {
      setErrorMsg(error);
      return;
    }

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        // Store platform session
        localStorage.setItem('platform_token', token);
        localStorage.setItem('platform_user', JSON.stringify(user));
        // Redirect to platform dashboard
        navigate('/platform/dashboard', { replace: true });
      } catch (e) {
        setErrorMsg('Failed to process authentication response.');
      }
    } else {
      setErrorMsg('No authentication data received. Please try logging in again.');
    }
  }, [searchParams, navigate]);

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#222c4a] via-[#1a2340] to-[#222c4a] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#222c4a] mb-2">Login Failed</h2>
          <p className="text-gray-600 text-sm mb-6">{errorMsg}</p>
          <button
            onClick={() => navigate('/platform/login', { replace: true })}
            className="w-full bg-[#407df1] text-white py-3 rounded-lg font-bold hover:bg-[#3568d4] transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#222c4a] via-[#1a2340] to-[#222c4a] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#407df1] mx-auto mb-4"></div>
        <p className="text-white/80">Authenticating with Carerix...</p>
      </div>
    </div>
  );
}