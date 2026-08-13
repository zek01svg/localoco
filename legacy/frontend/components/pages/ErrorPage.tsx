import { Home, Search, MapPin, Store, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { useThemeStore } from '../../store/themeStore';


interface ErrorPageProps {
  onGoHome?: () => void;
}

export function ErrorPage({ onGoHome}: ErrorPageProps) {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  // Color variables matching VouchersPage
  const bgColor = isDarkMode ? '#3a3a3a' : '#f9fafb';
  const cardBgColor = isDarkMode ? '#2a2a2a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#000000';
  const secondaryTextColor = isDarkMode ? '#a3a3a3' : '#6b7280';
  const borderColor = isDarkMode ? '#404040' : '#e5e7eb';

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: bgColor }}>
      <div className="max-w-7xl mx-auto">
        {/* Header matching your app style */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#FFA1A3' }}>
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-medium" style={{ color: textColor }}>LocaLoco</h1>
              <p className="text-sm" style={{ color: secondaryTextColor }}>
                Discover and support local businesses in your community
              </p>
            </div>
          </div>
        </div>

        {/* 404 Content */}
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="text-center max-w-2xl mx-auto w-full space-y-6">
            {/* 404 Number */}
            <div className="mb-8">
              <h1 className="text-9xl font-bold mb-4" style={{ color: '#FFA1A3' }}>404</h1>
              <div className="flex items-center justify-center gap-2 mb-2" style={{ color: secondaryTextColor }}>
                <MapPin className="w-5 h-5" />
                <span className="text-xl">Location Not Found</span>
              </div>
            </div>

            {/* Info Alert */}
            <Alert style={{ backgroundColor: cardBgColor, borderColor: borderColor }}>
              <AlertCircle className="w-4 h-4 text-[#FFA1A3]" />
              <AlertDescription style={{ color: textColor }}>
                The page you're looking for doesn't exist or may have been relocated.
              </AlertDescription>
            </Alert>

            {/* Message Card */}
            <Card style={{ backgroundColor: cardBgColor, borderColor: borderColor }}>
              <CardContent className="p-8">
                <h2 className="text-2xl font-medium mb-4" style={{ color: textColor }}>
                  Oops! This business seems to have moved
                </h2>
                <p className="mb-6" style={{ color: secondaryTextColor }}>
                  Let's help you find your way back to discovering amazing local businesses!
                </p>

                {/* Action Buttons with improved contrast */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {/* Primary Button - Pink with White Text */}
                  <Button
                    onClick={onGoHome}
                    className="font-medium shadow-sm"
                    style={{
                      backgroundColor: '#FFA1A3',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 20px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FF8A8C';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFA1A3';
                    }}
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Back to Home
                  </Button>

                  {/* Secondary Button - High Contrast Outline */}
                  <Button
                    onClick={onGoHome}
                    variant="outline"
                    className="font-medium shadow-sm"
                    style={{
                      backgroundColor: isDarkMode ? 'transparent' : '#ffffff',
                      color: isDarkMode ? '#ffffff' : '#000000',
                      borderColor: isDarkMode ? '#ffffff' : '#000000',
                      borderWidth: '2px',
                      padding: '10px 20px',
                    }}
                    onMouseEnter={(e) => {
                      if (isDarkMode) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      } else {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? 'transparent' : '#ffffff';
                    }}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search Businesses
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Helpful Links with better contrast */}
            <div className="text-sm" style={{ color: secondaryTextColor }}>
              <p className="mb-2 font-medium">Need help? Try these popular sections:</p>
              <div className="flex flex-wrap justify-center gap-4">
                <button 
                  onClick={onGoHome}
                  className="underline transition-colors font-medium"
                  style={{ 
                    color: isDarkMode ? '#FFA1A3' : '#FF8A8C',
                    textDecorationThickness: '2px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#FF6B6D';
                    e.currentTarget.style.textDecorationThickness = '2px';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isDarkMode ? '#FFA1A3' : '#FF8A8C';
                  }}
                >
                  Map View
                </button>
                <button 
                  onClick={onGoHome}
                  className="underline transition-colors font-medium"
                  style={{ 
                    color: isDarkMode ? '#FFA1A3' : '#FF8A8C',
                    textDecorationThickness: '2px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#FF6B6D';
                    e.currentTarget.style.textDecorationThickness = '2px';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isDarkMode ? '#FFA1A3' : '#FF8A8C';
                  }}
                >
                  Browse All
                </button>
                <button 
                  onClick={onGoHome}
                  className="underline transition-colors font-medium"
                  style={{ 
                    color: isDarkMode ? '#FFA1A3' : '#FF8A8C',
                    textDecorationThickness: '2px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#FF6B6D';
                    e.currentTarget.style.textDecorationThickness = '2px';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isDarkMode ? '#FFA1A3' : '#FF8A8C';
                  }}
                >
                  Popular Businesses
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
