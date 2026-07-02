import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, RequireAuth, useAuth } from "./router";
import Nav from "./components/Nav";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Research from "./pages/Research";
import Progress from "./pages/Progress";
import Report from "./pages/Report";
import History from "./pages/History";
import Settings from "./pages/Settings";
import PipelineProgress from "./pages/PipelineProgress";
import TopOpportunities from "./pages/TopOpportunities";
import OpportunityDetail from "./pages/OpportunityDetail";

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
          path="/"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route
          path="/pipeline/:pipelineId/progress"
          element={
            <RequireAuth>
              <PipelineProgress />
            </RequireAuth>
          }
        />
        <Route
          path="/pipeline/:pipelineId/opportunities"
          element={
            <RequireAuth>
              <TopOpportunities />
            </RequireAuth>
          }
        />
        <Route
          path="/pipeline/:pipelineId/opportunities/:opportunityId"
          element={
            <RequireAuth>
              <OpportunityDetail />
            </RequireAuth>
          }
        />
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
        <Route path="*" element={<Navigate to="/" replace />} />
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
