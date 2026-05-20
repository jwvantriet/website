import React from 'react';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, Loader2, ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({
  children,
}) => {
  const { platformUser, loading, isAgency } = usePlatformAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-[#222c4a] animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  // If the user is not logged in, show a login prompt pointing to platform login
  if (!platformUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-[#222c4a] rounded-full flex items-center justify-center mb-4">
              <LogIn className="h-7 w-7 text-[#fbc134]" />
            </div>
            <CardTitle className="text-xl text-[#222c4a]">
              Admin Login
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-5 pt-2">
            <p className="text-gray-500 text-sm">
              Sign in with your administrator account to access the vacancy management dashboard.
            </p>
            <Button
              onClick={() => navigate(`/platform/login?redirect=${encodeURIComponent(location.pathname)}`)}
              className="w-full bg-[#222c4a] hover:bg-[#1a2340] text-white h-11 text-base"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign in as Admin
            </Button>
            <Link to="/">
              <Button
                variant="outline"
                className="w-full h-11 text-base border-gray-300 text-[#222c4a] hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Website
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is authenticated but not an agency admin — show access denied
  if (!isAgency) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-red-600">
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-5 pt-2">
            <p className="text-gray-500 text-sm">
              You don't have administrator privileges. Please contact your agency administrator.
            </p>
            <Link to="/">
              <Button
                variant="outline"
                className="w-full h-11 text-base border-gray-300 text-[#222c4a] hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Website
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is authenticated and is an agency admin — render the admin page
  return <>{children}</>;
};

export default ProtectedAdminRoute;