import { useNavigate } from 'react-router-dom';
import { Home, Store } from 'lucide-react';
import { Button } from '../ui/button';
import { ROUTES } from '../../constants/routes';
import { useThemeStore } from '../../store/themeStore';
import * as React from 'react';
import { size } from 'zod';

export function ErrorPage() {
  const navigate = useNavigate();
  const { isDarkMode } = useThemeStore();

  const handleGoHome = () => {
    navigate(ROUTES.MAP);
  };

  // Define colors based on the theme, just like in LoginPage
  const headerBgColor = isDarkMode ? '#3a3a3a' : '#ffffff';
  const headerTextColor = isDarkMode ? '#ffffff' : '#000000';
  const bgColor = isDarkMode ? '#3a3a3a' : ''; // Gradient is handled by Tailwind class
  const cardBgColor = isDarkMode ? '#2a2a2a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#000000';
  const mutedTextColor = isDarkMode ? '#a1a1aa' : '#6b7280';

  return (
    <div
      className={`min-h-screen relative ${!isDarkMode ? 'bg-gradient-to-br from-pink-50 via-pink-100 to-orange-50' : ''}`}
      style={isDarkMode ? { backgroundColor: bgColor } : {}}
    >
      {/* Background pattern from LoginPage */}
      {!isDarkMode && (
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#FFA1A3" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      )}

      {/* Header from LoginPage */}
      <header className="shadow-md relative z-10" style={{ backgroundColor: headerBgColor }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl" style={{ color: headerTextColor }}>LocaLoco</h1>
              <p className="text-sm opacity-90" style={{ color: mutedTextColor }}>
                Discover and support local businesses in your community
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Centered Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)] p-4 relative z-10">
        <div className="text-center p-4 space-y-6">
          
            <h1  style={{fontSize: "100px", fontWeight: 600, marginBottom: "1.5rem", textAlign: "center",}}>
                404
            </h1>
          
          <div className='space-y-2'>
            <p className="text-2xl font-medium" style={{ color: textColor }}>
              Oops! Page not found
            </p>
            <p style={{ color: mutedTextColor }}>
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          <Button
            onClick={handleGoHome}
            className="rounded-full font-semibold px-6 py-3 h-auto text-base bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
          >
            <Home className="w-5 h-5 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
