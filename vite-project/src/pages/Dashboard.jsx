import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "../App.css";

const REFRESH_INTERVAL_MS = 10_000;

const Dashboard = () => {
  const [realtimeData, setRealtimeData] = useState({
    events: [],
    windowMinutes: null,
    fetchedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const backendBaseUrl = useMemo(() => {
    const base = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
    return base.endsWith("/") ? base.slice(0, -1) : base;
  }, []);

  const fetchRealtimeAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${backendBaseUrl}/analytics/events/realtime`
      );
      if (!response.ok) {
        throw new Error(
          `Failed to load realtime analytics (${response.status})`
        );
      }

      const data = await response.json();
      setRealtimeData({
        events: Array.isArray(data.events) ? data.events : [],
        windowMinutes:
          typeof data.windowMinutes === "number" ? data.windowMinutes : null,
        fetchedAt: new Date(),
      });
      setError(null);
    } catch (err) {
      console.error("[Dashboard] Failed to load realtime analytics", err);
      setError(err.message || "Unable to load realtime analytics data.");
    } finally {
      setLoading(false);
    }
  }, [backendBaseUrl]);

  useEffect(() => {
    fetchRealtimeAnalytics();
    const interval = setInterval(fetchRealtimeAnalytics, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchRealtimeAnalytics]);

  const totalEvents = useMemo(
    () =>
      realtimeData.events.reduce(
        (acc, item) => acc + Number(item.count ?? 0),
        0
      ),
    [realtimeData.events]
  );
  const uniqueEvents = realtimeData.events.length;
  const chartData = useMemo(
    () =>
      realtimeData.events.map((item) => ({
        name: item.eventName ?? "unknown_event",
        count: Number(item.count ?? 0),
      })),
    [realtimeData.events]
  );
  const sortedEvents = useMemo(
    () =>
      [...realtimeData.events]
        .map((item) => ({
          eventName: item.eventName ?? "unknown_event",
          count: Number(item.count ?? 0),
        }))
        .sort((a, b) => b.count - a.count),
    [realtimeData.events]
  );

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>Events Dashboard</h1>
        <p className="dashboard-subtitle">
          Realtime metrics from Google Analytics (Data API)
        </p>
        <div className="header-actions">
          <button
            className="refresh-button"
            onClick={fetchRealtimeAnalytics}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh now"}
          </button>
          <span className="header-meta">
            {realtimeData.fetchedAt
              ? `Updated ${realtimeData.fetchedAt.toLocaleTimeString()}`
              : "Awaiting data…"}
          </span>
        </div>
      </header>

      <section className="stats-grid">
        {error ? (
          <article className="stat-card">
            <h2>Realtime Events</h2>
            <p className="stat-value">—</p>
            <p className="stat-footer">{error}</p>
          </article>
        ) : (
          <>
            <article className="stat-card">
              <h2>Total Events</h2>
              <p className="stat-value">{loading ? "…" : totalEvents}</p>
              <p className="stat-footer">
                {realtimeData.windowMinutes
                  ? `Past ${realtimeData.windowMinutes} minutes`
                  : "Realtime window"}
              </p>
            </article>
            <article className="stat-card">
              <h2>Unique Event Types</h2>
              <p className="stat-value">{loading ? "…" : uniqueEvents}</p>
              <p className="stat-footer">Detected in the current window</p>
            </article>
          </>
        )}
      </section>

      <section className="analytics-grid">
        <article className="analytics-card">
          <header className="analytics-card__header">
            <h2>GA4 · Realtime Breakdown</h2>
            <span className="analytics-card__meta">
              {realtimeData.windowMinutes
                ? `Past ${realtimeData.windowMinutes} min`
                : ""}
            </span>
          </header>
          {error ? (
            <p className="error-text">{error}</p>
          ) : loading && !sortedEvents.length ? (
            <p>Loading realtime analytics…</p>
          ) : (
            <ul className="analytics-list">
              {sortedEvents.length ? (
                sortedEvents.map((item) => (
                  <li key={item.eventName} className="analytics-list__item">
                    <span className="analytics-list__name">{item.eventName}</span>
                    <span className="analytics-list__value">{item.count}</span>
                  </li>
                ))
              ) : (
                <li className="analytics-list__item analytics-list__item--empty">
                  No realtime GA4 events detected yet.
                </li>
              )}
            </ul>
          )}
        </article>
      </section>

      <section className="chart-card">
        <h2>Events Over Time</h2>
        {error ? (
          <p className="error-text">Unable to load realtime events.</p>
        ) : loading && !chartData.length ? (
          <p>Loading chart…</p>
        ) : chartData.length ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#8884d8"
                strokeWidth={2}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="empty-state">No events found.</p>
        )}
      </section>
    </div>
  );
};

export default Dashboard;

