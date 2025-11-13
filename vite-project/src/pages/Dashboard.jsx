import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db } from "../firebase";
import "../App.css";

const EVENTS_COLLECTION = "events";
const MAX_EVENTS = 50;

const toDate = (rawTimestamp) => {
  if (!rawTimestamp) return null;
  if (rawTimestamp.toDate) return rawTimestamp.toDate();
  if (typeof rawTimestamp === "number") return new Date(rawTimestamp);
  if (typeof rawTimestamp === "string") return new Date(rawTimestamp);
  if (rawTimestamp.seconds != null)
    return new Date(rawTimestamp.seconds * 1000 + (rawTimestamp.nanoseconds || 0) / 1e6);
  return null;
};

const formatTimeLabel = (date) =>
  date?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? "Unknown";

const groupEventsByMinute = (events) => {
  const buckets = new Map();
  events.forEach((event) => {
    const timestamp = toDate(event.timestamp);
    if (!timestamp) return;
    const bucketKey = timestamp.toISOString().slice(0, 16);
    const bucket = buckets.get(bucketKey) ?? {
      time: formatTimeLabel(timestamp),
      count: 0,
      timeKey: bucketKey,
    };
    bucket.count += 1;
    buckets.set(bucketKey, bucket);
  });
  return Array.from(buckets.values())
    .sort((a, b) => a.timeKey.localeCompare(b.timeKey))
    .map(({ timeKey, ...rest }) => rest);
};

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gaLoading, setGaLoading] = useState(true);
  const [gaError, setGaError] = useState(null);
  const [gaAggregate, setGaAggregate] = useState({ events: [], fetchedAt: null });
  const [gaRealtime, setGaRealtime] = useState({
    events: [],
    windowMinutes: null,
    fetchedAt: null,
  });

  const backendBaseUrl = useMemo(() => {
    const base = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
    return base.endsWith("/") ? base.slice(0, -1) : base;
  }, []);

  useEffect(() => {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const eventsQuery = query(
      eventsRef,
      orderBy("timestamp", "desc"),
      limit(MAX_EVENTS)
    );

    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEvents(docs.reverse());
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[Dashboard] Firestore subscription failed", err);
        setError("Unable to load events. Please try again later.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const fetchGaAnalytics = useCallback(async () => {
    setGaLoading(true);
    try {
      const [aggregateRes, realtimeRes] = await Promise.all([
        fetch(`${backendBaseUrl}/analytics/events`),
        fetch(`${backendBaseUrl}/analytics/events/realtime`),
      ]);

      if (!aggregateRes.ok) {
        throw new Error(`Failed to load GA events (${aggregateRes.status})`);
      }
      if (!realtimeRes.ok) {
        throw new Error(`Failed to load GA realtime (${realtimeRes.status})`);
      }

      const aggregateData = await aggregateRes.json();
      const realtimeData = await realtimeRes.json();

      setGaAggregate({
        events: Array.isArray(aggregateData.events) ? aggregateData.events : [],
        fetchedAt: new Date(),
      });
      setGaRealtime({
        events: Array.isArray(realtimeData.events) ? realtimeData.events : [],
        windowMinutes: realtimeData.windowMinutes,
        fetchedAt: new Date(),
      });
      setGaError(null);
    } catch (err) {
      console.error("[Dashboard] Failed to load GA analytics", err);
      setGaError(err.message || "Unable to load Google Analytics data.");
    } finally {
      setGaLoading(false);
    }
  }, [backendBaseUrl]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!isMounted) return;
      await fetchGaAnalytics();
    };
    load();
    const interval = setInterval(load, 30_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchGaAnalytics]);

  const totalEvents = events.length;

  const avgResponseTime = useMemo(() => {
    const withResponse = events.filter(
      (event) => typeof event.responseTime === "number"
    );
    if (!withResponse.length) return null;
    const total = withResponse.reduce(
      (acc, event) => acc + event.responseTime,
      0
    );
    return total / withResponse.length;
  }, [events]);

  const chartData = useMemo(() => groupEventsByMinute(events), [events]);
  const topGaEvents = useMemo(
    () => gaAggregate.events.slice(0, 6),
    [gaAggregate.events]
  );
  const realtimeEvents = useMemo(
    () => gaRealtime.events.slice(0, 10),
    [gaRealtime.events]
  );
  const aggregateMeta =
    gaAggregate.fetchedAt && !gaLoading
      ? `Updated ${gaAggregate.fetchedAt.toLocaleTimeString()}`
      : gaLoading && !gaAggregate.events.length
      ? "Loading…"
      : gaAggregate.fetchedAt
      ? `Updated ${gaAggregate.fetchedAt.toLocaleTimeString()}`
      : "Pending";
  const realtimeMeta =
    gaRealtime.fetchedAt && !gaLoading
      ? `Updated ${gaRealtime.fetchedAt.toLocaleTimeString()}`
      : gaLoading && !gaRealtime.events.length
      ? "Loading…"
      : gaRealtime.fetchedAt
      ? `Updated ${gaRealtime.fetchedAt.toLocaleTimeString()}`
      : "";

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>Events Dashboard</h1>
        <p className="dashboard-subtitle">
          Live metrics pulled from Firestore & Google Analytics
        </p>
      </header>

      <section className="stats-grid">
        {error ? (
          <article className="stat-card">
            <h2>Firestore Events</h2>
            <p className="stat-value">—</p>
            <p className="stat-footer">{error}</p>
          </article>
        ) : (
          <>
            <article className="stat-card">
              <h2>Total Events</h2>
              <p className="stat-value">{loading ? "…" : totalEvents}</p>
              <p className="stat-footer">
                {loading
                  ? "Loading latest Firestore events…"
                  : `Last ${Math.min(totalEvents, MAX_EVENTS)} events`}
              </p>
            </article>
            <article className="stat-card">
              <h2>Avg. Response Time</h2>
              <p className="stat-value">
                {loading
                  ? "…"
                  : avgResponseTime != null
                  ? `${avgResponseTime.toFixed(2)} ms`
                  : "N/A"}
              </p>
              <p className="stat-footer">Based on events with responseTime</p>
            </article>
          </>
        )}
      </section>

      <section className="analytics-grid">
        <article className="analytics-card">
          <header className="analytics-card__header">
            <h2>GA4 · Last 7 Days</h2>
            <span className="analytics-card__meta">{aggregateMeta}</span>
          </header>
          {gaError ? (
            <p className="error-text">{gaError}</p>
          ) : gaLoading && !gaAggregate.events.length ? (
            <p>Loading Google Analytics data…</p>
          ) : (
            <ul className="analytics-list">
              {topGaEvents.length ? (
                topGaEvents.map((item) => (
                  <li key={`ga-${item.eventName}`} className="analytics-list__item">
                    <span className="analytics-list__name">{item.eventName}</span>
                    <span className="analytics-list__value">{item.count}</span>
                  </li>
                ))
              ) : (
                <li className="analytics-list__item analytics-list__item--empty">
                  No GA4 events found for the last seven days.
                </li>
              )}
            </ul>
          )}
        </article>
        <article className="analytics-card">
          <header className="analytics-card__header">
            <h2>GA4 · Realtime</h2>
            <span className="analytics-card__meta">
              {gaRealtime.windowMinutes
                ? `Past ${gaRealtime.windowMinutes} min`
                : ""}
              {realtimeMeta ? ` · ${realtimeMeta}` : ""}
            </span>
          </header>
          {gaError ? (
            <p className="error-text">{gaError}</p>
          ) : gaLoading && !gaRealtime.events.length ? (
            <p>Loading realtime analytics…</p>
          ) : (
            <ul className="analytics-list">
              {realtimeEvents.length ? (
                realtimeEvents.map((item) => (
                  <li key={`ga-rt-${item.eventName}`} className="analytics-list__item">
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
          <p className="error-text">Unable to load Firestore events.</p>
        ) : loading ? (
          <p>Loading chart…</p>
        ) : chartData.length ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
              <XAxis dataKey="time" />
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

