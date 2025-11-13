// index.js
// Express server exposing analytics data aggregated from Google Analytics Data API (GA4).
require("dotenv").config(); // Load environment variables (GA4_PROPERTY_ID, GOOGLE_APPLICATION_CREDENTIALS, etc.)

const express = require("express");
const cors = require("cors");
const {
  getEventCountsLast7Days,
  getRealtimeEventCounts,
  REALTIME_MAX_WINDOW_MINUTES,
} = require("./analyticsService");

const app = express();
const PORT = process.env.PORT || 4000;
const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID || "513053895";

// Enable CORS so the React dashboard (or other clients) can call this API.
app.use(cors());

// Health check endpoint to verify the service is running.
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Main endpoint: fetch GA4 event counts for the last seven days.
app.get("/analytics/events", async (_req, res) => {
  try {
    // Delegate the data fetching logic to the analytics service module.
    const events = await getEventCountsLast7Days(GA4_PROPERTY_ID);
    res.json({ events });
  } catch (error) {
    // Log the error for troubleshooting and return a friendly message to the client.
    console.error("Failed to load analytics data:", error);
    res.status(500).json({
      error: "Unable to load analytics data. Please check server logs.",
    });
  }
});

// Realtime endpoint: fetch GA4 event counts for the recent window (default 30 minutes).
app.get("/analytics/events/realtime", async (req, res) => {
  const requestedMinutes = Number.parseInt(req.query.minutes, 10);
  const windowMinutes =
    Number.isFinite(requestedMinutes) && requestedMinutes > 0
      ? Math.min(requestedMinutes, REALTIME_MAX_WINDOW_MINUTES)
      : REALTIME_MAX_WINDOW_MINUTES;

  try {
    const events = await getRealtimeEventCounts(
      GA4_PROPERTY_ID,
      windowMinutes
    );
    res.json({
      windowMinutes,
      events,
    });
  } catch (error) {
    console.error("Failed to load realtime analytics data:", error);
    res.status(500).json({
      error:
        `Unable to load realtime analytics data (limit ${REALTIME_MAX_WINDOW_MINUTES} minutes). Please check server logs.`,
    });
  }
});

// Start the HTTP server and log the active port.
app.listen(PORT, () => {
  console.log(`Analytics server running at http://localhost:${PORT}`);
});

