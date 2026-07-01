import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, RequireAuth, useAuth } from "./router";
import Nav from "./components/Nav";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Research from "./pages/Research";
import Progress from "./pages/Progress";
import Report from "./pages/Report";
import History from "./pages/History";
import Settings from "./pages/Settings";

function AuthedLayout({ children }: { children: React.ReactElement }): React.ReactElement {
  const { user } = useAuth();
  return (
    <>
      {user && <Nav />}
      <main className="main-content">{children}</main>
    </>
  );
}

function AppRoutes(): React.ReactElement {
  const location = useLocation();
  return (
    <AuthedLayout>
      <Routes location={location}>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/research"
          element={
            <RequireAuth>
              <Research />
            </RequireAuth>
          }
        />
        <Route
          path="/research/progress/:sessionId"
          element={
            <RequireAuth>
              <Progress />
            </RequireAuth>
          }
        />
        <Route
          path="/research/report/:sessionId"
          element={
            <RequireAuth>
              <Report />
            </RequireAuth>
          }
        />
        <Route
          path="/history"
          element={
            <RequireAuth>
              <History />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthedLayout>
  );
}

export default function App(): React.ReactElement {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
