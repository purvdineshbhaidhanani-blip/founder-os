import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/Report.css';

interface User {
  id: string;
  displayName: string;
  email: string;
}

interface SessionData {
  session: any;
  analysis: any;
}

function Report({ user }: { user: User }) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReport();
  }, [sessionId]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/research/session/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else {
        setError('Report not found');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="report-loading">Loading report...</div>;
  }

  if (error) {
    return (
      <div className="report-container">
        <div className="error-message">
          {error}
          <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (!report) {
    return <div className="report-loading">No report data</div>;
  }

  const { session, analysis } = report;

  return (
    <div className="report-container">
      <header className="report-header">
        <button className="back-button" onClick={() => navigate('/dashboard')}>← Back</button>
        <h1>Research Report</h1>
        <span className="user-name">{user.displayName}</span>
      </header>

      <main className="report-main">
        <section className="report-section">
          <h2>Session Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Period</label>
              <value>{session.period?.label}</value>
            </div>
            <div className="info-item">
              <label>Status</label>
              <value className={`status-${session.status}`}>{session.status}</value>
            </div>
            <div className="info-item">
              <label>Duration</label>
              <value>{(session.durationMs / 1000).toFixed(2)}s</value>
            </div>
            <div className="info-item">
              <label>Started</label>
              <value>{new Date(session.startedAt).toLocaleString()}</value>
            </div>
          </div>
        </section>

        <section className="report-section">
          <h2>Collection Summary</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{session.totalItemsCollected}</div>
              <div className="stat-label">Items Collected</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{session.totalItemsAfterDedup}</div>
              <div className="stat-label">After Deduplication</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{session.totalSignalsExtracted}</div>
              <div className="stat-label">Signals Extracted</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{session.totalOpportunitiesUpserted}</div>
              <div className="stat-label">Opportunities Found</div>
            </div>
          </div>
        </section>

        {session.sourceStats && session.sourceStats.length > 0 && (
          <section className="report-section">
            <h2>Source Details</h2>
            <div className="sources-list">
              {session.sourceStats.map((source: any) => (
                <div key={source.source} className="source-card">
                  <h4>{source.source}</h4>
                  <div className="source-stats">
                    <span>{source.itemsCollected} items</span>
                    <span className={`status-${source.errors?.length ? 'failed' : 'success'}`}>
                      {source.errors?.length ? `${source.errors.length} errors` : 'Success'}
                    </span>
                    <span>{(source.durationMs / 1000).toFixed(2)}s</span>
                  </div>
                  {source.errors?.length > 0 && (
                    <div className="error-list">
                      {source.errors.map((err: any, i: number) => (
                        <p key={i} className="error-item">{err.message}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {analysis && analysis.topOpportunity && (
          <section className="report-section">
            <h2>🏆 Top Opportunity</h2>
            <div className="opportunity-detail">
              <h3>{analysis.topOpportunity.opportunity?.problemSummary}</h3>
              <div className="opportunity-meta">
                <div className="meta-row">
                  <label>Verdict</label>
                  <value>{analysis.topOpportunity.decision?.verdict}</value>
                </div>
                <div className="meta-row">
                  <label>Confidence</label>
                  <value>{Math.round(analysis.topOpportunity.intelligence?.confidence * 100)}%</value>
                </div>
                <div className="meta-row">
                  <label>Score</label>
                  <value>{analysis.topOpportunity.finalScore?.toFixed(2)}</value>
                </div>
              </div>
              {analysis.topOpportunity.intelligence?.evidence && (
                <div className="evidence-section">
                  <h4>Evidence</h4>
                  <ul>
                    {Object.entries(analysis.topOpportunity.intelligence.evidence).map(([key, val]: any) => (
                      <li key={key}><strong>{key}:</strong> {val}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {analysis && analysis.stats && (
          <section className="report-section">
            <h2>Analysis Summary</h2>
            <div className="summary-grid">
              <div className="summary-card">
                <h4>Total Analyzed</h4>
                <div className="summary-value">{analysis.stats.opportunitiesAnalyzed}</div>
              </div>
              <div className="summary-card">
                <h4>Accepted</h4>
                <div className="summary-value">{analysis.stats.accepted}</div>
              </div>
              <div className="summary-card">
                <h4>Rejected</h4>
                <div className="summary-value">{analysis.stats.rejected}</div>
              </div>
              <div className="summary-card">
                <h4>Avg Confidence</h4>
                <div className="summary-value">{Math.round(analysis.stats.avgConfidence * 100)}%</div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default Report;
