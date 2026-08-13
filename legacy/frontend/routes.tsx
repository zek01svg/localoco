import * as React from 'react';
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ROUTES } from "./constants/routes";
import { useAuthStore } from './store/authStore'; // Assuming you have this for announcements

// Layout components
import { MainLayout } from "./components/layout/MainLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

// Auth pages
import { LoginPage } from "./components/pages/LoginPage";
import { SignupPage } from "./components/pages/SignupPage";
import { ForgotPasswordPage } from './components/pages/ForgotPassword';
import { ResetPasswordPage } from './components/pages/ResetPassword'; // Import ResetPasswordPage

// Main pages
import { MapDiscoveryPage } from "./components/MapDiscoveryPage";
import { ProfilePageDisplay } from "./components/ProfilePageDisplay";
import { BusinessProfilePage } from "./components/pages/BusinessProfilePage";
import { ForumPage } from "./components/ForumPage";
import { SettingsPage } from "./components/SettingsPage";
import { NotificationsPage } from "./components/NotificationsPage";
import { WriteReviewPage } from "./components/WriteReviewPage";
import { ErrorPage } from "./components/pages/ErrorPage";
import { VouchersPage } from './components/VouchersPage';
import ErrorBoundary from "./components/pages/ErrorBoundary";
import { AnnouncementsPage } from './components/AnnouncementPage';
import { BusinessListPage } from "./components/BusinessListPage";
import { BusinessDetailPage } from "./components/BusinessDetailPage";
import { BookmarksPage } from "./components/BookmarksPage";

// --- START: ADD WRAPPERS HERE ---

// Wrapper for the Forgot Password page
const ForgotPasswordWrapper = () => {
  const navigate = useNavigate();

  const handleEmailSent = () => {
    // After the user requests a link, navigate them back to the login page.
    navigate(ROUTES.LOGIN);
  };
  
  return (
    <ForgotPasswordPage 
      onBack={() => navigate(ROUTES.LOGIN)}
      onEmailSent={handleEmailSent}
    />
  );
};

// Wrapper for the Reset Password page
const ResetPasswordWrapper = () => {
    const navigate = useNavigate();

    const handleSuccess = () => {
        // After a successful password reset, navigate the user to the login page.
        navigate(ROUTES.LOGIN);
    };

    return (
        <ResetPasswordPage
            email="" // The email is just for display and can be empty.
            onSuccess={handleSuccess}
        />
    );
};

// Wrapper for Announcements page to provide correct props
const AnnouncementsWrapper = () => {
  const navigate = useNavigate();
  const currentBusinessUen = useAuthStore((state) => state.businessMode.currentBusinessUen);
  const isBusinessMode = useAuthStore((state) => state.businessMode.isBusinessMode);

  // If not in business mode or no UEN, redirect to home.
  if (!isBusinessMode || !currentBusinessUen) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return (
    <AnnouncementsPage
      businessUen={currentBusinessUen}
      onBack={() => navigate(-1)} // Navigates to the previous page
    />
  );
};

// --- END: WRAPPERS ---


export const AppRoutes = () => {
    return (
        <Routes>
            {/* Public Routes - No Auth Required */}
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
            {/* ✅ UPDATED: Use the ForgotPasswordWrapper */}
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordWrapper />} />
            {/* ✅ ADDED: Add the route for the ResetPasswordPage */}
            <Route path="/password-reset" element={<ResetPasswordWrapper />} />


            {/* Public Routes with Layout - Guests can browse */}
            <Route element={<MainLayout />}>
                <Route path={ROUTES.HOME} element={<MapDiscoveryPage />} />
                <Route path={ROUTES.MAP} element={<MapDiscoveryPage />} />
                <Route
                    path={ROUTES.BUSINESSES}
                    element={<BusinessListPage />}
                />
                <Route
                    path={ROUTES.BUSINESS}
                    element={<BusinessDetailPage />}
                />
            </Route>


            {/* Protected Routes with Layout - Auth Required */}
            <Route
                element={
                    <ProtectedRoute>
                        <MainLayout />
                    </ProtectedRoute>
                }
            >
                <Route path={ROUTES.BOOKMARKS} element={<BookmarksPage />} />
                <Route
                    path={ROUTES.PROFILE}
                    element={
                        <ErrorBoundary>
                            <ProfilePageDisplay />
                        </ErrorBoundary>
                    }
                />
                <Route
                    path={ROUTES.BUSINESS_PROFILE}
                    element={<BusinessProfilePage />}
                />
                <Route path={ROUTES.FORUM} element={<ForumPage />} />
                <Route
                    path={ROUTES.NOTIFICATIONS}
                    element={<NotificationsPage />}
                />
                <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
                <Route path={ROUTES.VOUCHERS} element={<VouchersPage />} />
                <Route path={ROUTES.REVIEW} element={<WriteReviewPage />} />
                {/* ✅ UPDATED: Use the AnnouncementsWrapper */}
                <Route path={ROUTES.ANNOUNCEMENTS} element={<AnnouncementsWrapper />} />
            </Route>
            
            {/* Error Routes */}
            <Route path="/404" element={<ErrorPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
    );
};
