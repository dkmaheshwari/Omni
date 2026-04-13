// frontend/src/App.jsx

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThreadProvider } from "./contexts/ThreadContext";
import { MessageProvider } from "./contexts/MessageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { SocketProvider } from "./contexts/SocketContext";
import { AnalyticsProvider } from "./contexts/AnalyticsContext";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ChatPage from "./pages/ChatPage";
import LandingPage from "./pages/LandingPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import ToastContainer from "./components/Toast";
import AITutor from "./components/AITutor";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import RealTimeAnalytics from "./components/RealTimeAnalytics";
import ContentGenerator from "./components/ContentGenerator";
import IntelligentAssistance from "./components/IntelligentAssistance";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./contexts/AuthContext";

// Protected Route Component
function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  console.log("🔒 ProtectedRoute check:", { currentUser: !!currentUser, loading });
  return currentUser ? children : <Navigate to="/welcome" />;
}

// Public Route Component (redirects authenticated users to dashboard)
function PublicRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  console.log("🌍 PublicRoute check:", { currentUser: !!currentUser, loading });
  if (currentUser) {
    console.log("🔄 Redirecting authenticated user to dashboard");
    return <Navigate to="/dashboard" />;
  }
  return children;
}

// Root redirect component
function RootRedirect() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  console.log("🏠 RootRedirect check:", { currentUser: !!currentUser, loading });
  if (currentUser) {
    console.log("🔄 Root redirecting authenticated user to dashboard");
    return <Navigate to="/dashboard" />;
  } else {
    console.log("🔄 Root redirecting unauthenticated user to welcome");
    return <Navigate to="/welcome" />;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <AnalyticsProvider>
              <SocketProvider>
                <ThreadProvider>
                  <MessageProvider>
                <Routes>
                {/* Landing page - shows to unauthenticated users */}
                <Route 
                  path="/welcome" 
                  element={
                    <PublicRoute>
                      <LandingPage />
                    </PublicRoute>
                  } 
                />
                
                {/* Auth pages - only for unauthenticated users */}
                <Route 
                  path="/login" 
                  element={
                    <PublicRoute>
                      <LoginPage />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/signup" 
                  element={
                    <PublicRoute>
                      <SignupPage />
                    </PublicRoute>
                  } 
                />
                
                {/* Main dashboard - protected route */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <ChatPage />
                    </ProtectedRoute>
                  }
                />
                
                {/* Profile page - protected route */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                
                {/* Settings page - protected route */}
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                
                {/* AI Features - protected routes */}
                <Route
                  path="/ai/tutor"
                  element={
                    <ProtectedRoute>
                      <AITutor />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ai/analytics"
                  element={
                    <ProtectedRoute>
                      <AnalyticsDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ai/realtime"
                  element={
                    <ProtectedRoute>
                      <RealTimeAnalytics />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ai/content"
                  element={
                    <ProtectedRoute>
                      <ContentGenerator />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ai/assistance"
                  element={
                    <ProtectedRoute>
                      <IntelligentAssistance />
                    </ProtectedRoute>
                  }
                />
                
                {/* Root redirect logic */}
                <Route path="/" element={<RootRedirect />} />
                
                {/* Catch all - redirect to appropriate page */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
              
              {/* Toast notifications */}
              <ToastContainer />
                  </MessageProvider>
                </ThreadProvider>
              </SocketProvider>
            </AnalyticsProvider>
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
