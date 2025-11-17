import * as React from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ROUTES } from "./constants/routes";
import { useAuthStore } from "./store/authStore"; // Assuming you have this for announcements

// Layout components
import { MainLayout } from "./components/layout/MainLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

// Auth pages
import { LoginPage } from "./components/pages/LoginPage";
import { SignupPage } from "./components/pages/SignupPage";
import { ForgotPasswordPage } from "./components/pages/ForgotPassword";
import { ResetPasswordPage } from "./components/pages/ResetPassword"; // Import ResetPasswordPage

// Main pages
import { MapDiscoveryPage } from "./components/MapDiscoveryPage";
import { ProfilePageDisplay } from "./components/ProfilePageDisplay";
import { BusinessProfilePage } from "./components/pages/BusinessProfilePage";
import { ForumPage } from "./components/ForumPage";
import { SettingsPage } from "./components/SettingsPage";
import { NotificationsPage } from "./components/NotificationsPage";
import { WriteReviewPage } from "./components/WriteReviewPage";
import { ErrorPage } from "./components/pages/ErrorPage";
import { VouchersPage } from "./components/VouchersPage";
import ErrorBoundary from "./components/pages/ErrorBoundary";
import { AnnouncementsPage } from "./components/AnnouncementPage";
import { BusinessListPage } from "./components/BusinessListPage";
import { BusinessDetailPage } from "./components/BusinessDetailPage";
import { BookmarksPage } from "./components/BookmarksPage";


const ForgotPasswordWrapper = () => {
    const navigate = useNavigate();

    const handleEmailSent = () => {
        navigate(ROUTES.LOGIN);
    };

    return (
        <ForgotPasswordPage
            onBack={() => navigate(ROUTES.LOGIN)}
            onEmailSent={handleEmailSent}
        />
    );
};

const ResetPasswordWrapper = () => {
    const navigate = useNavigate();

    const handleSuccess = () => {
        navigate(ROUTES.LOGIN);
    };

    return (
        <ResetPasswordPage
            email="" 
            onSuccess={handleSuccess}
        />
    );
};

const AnnouncementsWrapper = () => {
    const navigate = useNavigate();
    const currentBusinessUen = useAuthStore(
        (state) => state.businessMode.currentBusinessUen,
    );
    const isBusinessMode = useAuthStore(
        (state) => state.businessMode.isBusinessMode,
    );

    if (!isBusinessMode || !currentBusinessUen) {
        return <Navigate to={ROUTES.HOME} replace />;
    }

    return (
        <AnnouncementsPage
            businessUen={currentBusinessUen}
            onBack={() => navigate(-1)} 
        />
    );
};

export const AppRoutes = () => {
    return (
        <Routes>
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
            <Route
                path={ROUTES.FORGOT_PASSWORD}
                element={<ForgotPasswordWrapper />}
            />
            <Route path="/password-reset" element={<ResetPasswordWrapper />} />

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
                <Route
                    path={ROUTES.ANNOUNCEMENTS}
                    element={<AnnouncementsWrapper />}
                />
            </Route>

            <Route path="/404" element={<ErrorPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
    );
};
