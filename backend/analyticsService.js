// analyticsService.js
// Encapsulates access to the Google Analytics Data API (GA4) using a service account.
const { google } = require("googleapis");

const ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const DATA_API_VERSION = "v1beta"; // GA4 Data API surface exposed via googleapis client.
const REALTIME_MAX_WINDOW_MINUTES = 29; // Standard properties allow up to 29 minutes of realtime data.
const AGGREGATE_CACHE_TTL_MS = 60 * 1000; // 1 minute cache for 7-day report.
const REALTIME_CACHE_TTL_MS = 15 * 1000; // 15 seconds cache for realtime report.

/**
 * Creates an authenticated Analytics Data API client using the service account key file.
 * Throws an error if the GOOGLE_APPLICATION_CREDENTIALS environment variable is missing.
 */
const createAnalyticsClient = async () => {
  const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyFilePath) {
    throw new Error(
      "Missing GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to the service account JSON key."
    );
  }

  // Initialize GoogleAuth with the service account credentials and readonly scope.
  const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: [ANALYTICS_SCOPE],
  });

  // Acquire an authenticated client from the service account.
  const authClient = await auth.getClient();

  // Build the Analytics Data API client bound to the authenticated client.
  return google.analyticsdata({
    version: DATA_API_VERSION,
    auth: authClient,
  });
};

let analyticsClientPromise;
let aggregateCache = {
  fetchedAt: 0,
  data: null,
};
const realtimeCache = new Map(); // key: windowMinutes, value: { fetchedAt, data }

/**
 * Returns a memoized Analytics Data API client to avoid re-authenticating
 * on every request. Subsequent calls reuse the same underlying client.
 */
const getAnalyticsClient = async () => {
  if (!analyticsClientPromise) {
    analyticsClientPromise = createAnalyticsClient();
  }
  return analyticsClientPromise;
};

/**
 * Fetches GA4 event counts grouped by event name for the last seven days.
 *
 * @param {string} propertyId - GA4 property identifier (e.g. "513053895").
 * @returns {Promise<Array<{eventName: string, count: number}>>}
 */
const getEventCountsLast7Days = async (propertyId) => {
  if (!propertyId) {
    throw new Error("A GA4 property ID must be provided.");
  }

  const now = Date.now();
  if (
    aggregateCache.data &&
    now - aggregateCache.fetchedAt < AGGREGATE_CACHE_TTL_MS
  ) {
    return aggregateCache.data;
  }

  // Instantiate (or reuse) the Analytics Data API client.
  const analyticsData = await getAnalyticsClient();

  // Request GA4 event counts grouped by event name across the last seven days.
  const response = await analyticsData.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [
        {
          startDate: "7daysAgo",
          endDate: "today",
        },
      ],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      orderBys: [
        {
          metric: {
            metricName: "eventCount",
          },
          desc: true,
        },
      ],
    },
  });

  const rows = response.data.rows ?? [];

  // Shape the response into the simplified format expected by the frontend.
  const shaped = rows.map((row) => ({
    eventName: row.dimensionValues?.[0]?.value ?? "unknown_event",
    count: Number(row.metricValues?.[0]?.value ?? 0),
  }));

  aggregateCache = {
    fetchedAt: now,
    data: shaped,
  };

  return shaped;
};

/**
 * Fetches GA4 realtime event counts grouped by event name for the provided window (minutes).
 *
 * @param {string} propertyId - GA4 property identifier (e.g. "513053895").
 * @param {number} minutesAgo - Number of minutes to include (capped at 60 per GA docs).
 * @returns {Promise<Array<{eventName: string, count: number}>>}
 */
const getRealtimeEventCounts = async (
  propertyId,
  minutesAgo = REALTIME_MAX_WINDOW_MINUTES
) => {
  if (!propertyId) {
    throw new Error("A GA4 property ID must be provided.");
  }
  if (!Number.isFinite(minutesAgo) || minutesAgo <= 0) {
    throw new Error("Realtime window (minutesAgo) must be a positive number.");
  }

  const window = Math.min(
    Math.round(minutesAgo),
    REALTIME_MAX_WINDOW_MINUTES
  );

  const cached = realtimeCache.get(window);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < REALTIME_CACHE_TTL_MS) {
    return cached.data;
  }

  const analyticsData = await getAnalyticsClient();

  const response = await analyticsData.properties.runRealtimeReport({
    property: `properties/${propertyId}`,
    requestBody: {
      minuteRanges: [
        {
          startMinutesAgo: window,
          endMinutesAgo: 0,
        },
      ],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      orderBys: [
        {
          metric: {
            metricName: "eventCount",
          },
          desc: true,
        },
      ],
    },
  });

  const rows = response.data.rows ?? [];

  const shaped = rows.map((row) => ({
    eventName: row.dimensionValues?.[0]?.value ?? "unknown_event",
    count: Number(row.metricValues?.[0]?.value ?? 0),
  }));

  realtimeCache.set(window, {
    fetchedAt: now,
    data: shaped,
  });

  return shaped;
};

module.exports = {
  getEventCountsLast7Days,
  getRealtimeEventCounts,
  REALTIME_MAX_WINDOW_MINUTES,
};

