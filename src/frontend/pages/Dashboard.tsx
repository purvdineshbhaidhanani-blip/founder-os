import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

interface User {
  id: string;
  displayName: string;
  email: string;
}

interface DashboardData {
  totalSessions: number;
  champion: any;
  latestSession: any;
  recentSessions: any[];
}

function Dashboard({ user }: { user: User }) {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [researching, setResearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/research/dashboard');
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (err) {
      setError('Failed to load dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResearch = async () => {
    try {
      setResearching(true);
      setError('');
      setProgress(10);

      const res = await fetch('/api/research/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: '30d' }),
      });

      setProgress(50);

      if (res.ok) {
        const data = await res.json();
        setProgress(100);
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchDashboard();
        if (data.session?.sessionId) {
          navigate(`/report/${data.session.sessionId}`);
        }
      } else {
        setError('Research failed');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setResearching(false);
      setProgress(0);
    }
  };

  const handleLogout = () => {
    window.location.href = '/auth/logout';
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Founder OS</h1>
          <p className="subtitle">Opportunity Intelligence Engine</p>
        </div>
        <div className="header-right">
          <span className="user-name">{user.displayName}</span>
          <button className="logout-button" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="dashboard-main">
        {error && <div className="error-banner">{error}</div>}

        <section className="hero-section">
          <div className="hero-content">
            <h2>Research Market Opportunities</h2>
            <p>Discover high-potential opportunities from 6 data sources with AI-powered analysis</p>

            <button
              className="primary-button research-button"
              onClick={handleResearch}
              disabled={researching}
              style={{
                opacity: researching ? 0.6 : 1,
                cursor: researching ? 'not-allowed' : 'pointer',
              }}
            >
              {researching ? 'Researching...' : 'Research Last 30 Days'}
            </button>

            {researching && (
              <div className="progress-container">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="progress-text">{progress}% Complete</p>
              </div>
            )}
          </div>
        </section>

        {loading ? (
          <div className="loading">Loading dashboard...</div>
        ) : dashboard ? (
          <>
            <section className="dashboard-section">
              <h3>Overview</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{dashboard.totalSessions}</div>
                  <div className="stat-label">Total Sessions</div>
                </div>
                {dashboard.champion && (
                  <div className="stat-card">
                    <div className="stat-value">{dashboard.champion.rank || 1}</div>
                    <div className="stat-label">Champion Rank</div>
                  </div>
                )}
              </div>
            </section>

            {dashboard.champion && (
              <section className="dashboard-section">
                <h3>🏆 Champion Opportunity</h3>
                <div className="opportunity-card">
                  <h4>{dashboard.champion.opportunity?.problemSummary || 'Top Opportunity'}</h4>
                  <p className="opportunity-verdict">
                    <strong>Verdict:</strong> {dashboard.champion.decision?.verdict || 'Analyzing...'}
                  </p>
                  <p className="opportunity-confidence">
                    <strong>Confidence:</strong> {Math.round((dashboard.champion.intelligence?.confidence || 0) * 100)}%
                  </p>
                </div>
              </section>
            )}

            {dashboard.recentSessions.length > 0 && (
              <section className="dashboard-section">
                <h3>Recent Sessions</h3>
                <div className="sessions-list">
                  {dashboard.recentSessions.map((session) => (
                    <div key={session.sessionId} className="session-item">
                      <div>
                        <strong>{session.period?.label || 'Session'}</strong>
                        <p className="session-date">
                          {new Date(session.startedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="session-status">
                        <span className={`status-badge ${session.status}`}>
                          {session.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}

export default Dashboard;
