# Analytics Dashboard POC

This proof-of-concept combines a React analytics dashboard (Vite) with a Node.js + Express backend that pulls GA4 metrics through the Google Analytics Data API. The frontend also logs Firebase Analytics events so you can see activity flow end-to-end.

---

## 1. Project Layout

- `vite-project/` – React UI built with Vite
  - `src/pages/Home.jsx` – sample landing page with Firebase log buttons
  - `src/pages/Dashboard.jsx` – analytics dashboard (Firestore + charts)
- `backend/` – Express API that aggregates GA4 events
  - `index.js` – server entry point and routes
  - `analyticsService.js` – Google Analytics Data API helpers
  - `package.json` – backend dependencies (`express`, `cors`, `googleapis`, `dotenv`)

---

## 2. Prerequisites

- Node.js 18+ (tested with 24.x)
- npm 9+
- Google Cloud GA4 property + service account with **Analytics Data API** access
- Firebase project with Analytics + Firestore enabled

---

## 3. Backend Setup (`backend/`)

1. **Install dependencies**

   ```bash
   cd backend
   npm install
   ```

2. **Copy environment template**

   ```bash
   cp env.example .env
   ```

   The `env.example` file documents the required variables.

3. **Fill in environment values**

   - `GA4_PROPERTY_ID` – numeric GA4 property ID. Find it in Google Analytics → **Admin** → **Property settings** → **Property ID**.
   - `GOOGLE_APPLICATION_CREDENTIALS` – absolute path to the service-account key JSON you downloaded from Google Cloud Console. Create a service account under **IAM & Admin → Service Accounts**, grant it the **Analytics Data API User** role (or equivalent), then add it to GA4 (**Admin → Property Access Management → Add user**) with at least *Viewer* + *Analyst* permissions. Save the JSON under `backend/server/` (or a secure location) and point this variable to it.
   - `PORT` – optional, defaults to `4000`.

   Example:

   ```env
   GA4_PROPERTY_ID=513053895
   GOOGLE_APPLICATION_CREDENTIALS=/Users/you/Documents/poc/backend/server/service-account.json
   PORT=4000
   ```

4. **Run the server**

   ```bash
   npm run dev
   ```

   You should see: `Analytics server running at http://localhost:4000`

5. **Available endpoints**

   - `GET /health` – quick health probe
   - `GET /analytics/events` – GA4 event counts (last 7 days) ordered by total
   - `GET /analytics/events/realtime?minutes=15` – realtime event counts for the last `minutes` (max 29)  
     Response example:

     ```json
     {
       "windowMinutes": 15,
       "events": [
         { "eventName": "page_view", "count": 4 },
         { "eventName": "user_signup", "count": 1 }
       ]
     }
     ```

   Errors include descriptive messages and are logged to the console.

---

## 4. Frontend Setup (`vite-project/`)

1. **Install dependencies**

   ```bash
   cd ../vite-project
   npm install
   ```

   Vite already knows about Firebase Analytics via `src/firebase.js`.

2. **Firebase configuration**

   Ensure `src/firebase.js` contains your Firebase project keys (analytics + Firestore).

3. **Environment variables (optional)**

   If you proxy API calls through Vite, create `.env` to store the backend base URL:

   ```bash
   VITE_BACKEND_URL=http://localhost:4000
   ```

   Use this variable when wiring the dashboard to call the backend endpoints. Set it to your production API URL when deploying.

4. **Start the dev server**

   ```bash
   npm run dev
   ```

   Vite prints a localhost URL (default `http://localhost:5173`). Visit `/dashboard` to view analytics.

---

## 5. Dashboard Features

- **Navigation**: Top-level menu with `Home` and `Dashboard`.
- **Home Page**: Buttons that log sample Firebase Analytics events (`tutorial_start`, `add_to_cart`, `share_app`, etc.).
- **Dashboard Page**:
  - Pulls the latest 50 events from Firestore in real-time (listener stays live)
  - Displays total events, average `responseTime`, and a line chart (Recharts) of events per minute
  - Designed to consume the Node backend for GA4 summaries (last 7 days + realtime)

---

## 6. Wiring Frontend to Backend

1. From within the React app, call the REST endpoints (using `fetch`, Axios, or React Query). Example:

   ```js
   const response = await fetch(
     `${import.meta.env.VITE_BACKEND_URL}/analytics/events`
   );
   const data = await response.json();
   ```

2. Display the aggregate counts in a widget or chart. You can combine GA4 data with Firestore live data for a fuller picture.

---

## 7. Troubleshooting

- **Service account errors**: ensure `GOOGLE_APPLICATION_CREDENTIALS` points to a readable JSON file and the service account has GA4 property access.
- **Realtime limit**: GA standard properties expose only 29 minutes of realtime data; requests exceeding that throw a 400 error.
- **Firebase auth**: make sure Firebase project has Analytics enabled; some browsers block analytics when ad blockers are active.
- **CORS**: Express enables CORS by default in `index.js`. If you deploy, restrict origins accordingly.

---

## 8. Deployment Notes

- **Backend**: host on any Node-compatible platform (Render, Railway, GCP Cloud Run). Set environment variables and mount the service account key securely.
- **Frontend**: build with `npm run build` inside `vite-project/` and deploy to static hosting (Firebase Hosting, Vercel, Netlify). Configure the backend URL for production.

---

## 9. Useful Commands

| Task                            | Command                                |
|---------------------------------|----------------------------------------|
| Install backend deps            | `cd backend && npm install`            |
| Run backend dev server          | `cd backend && npm run dev`            |
| Install frontend deps           | `cd vite-project && npm install`       |
| Run frontend dev server         | `cd vite-project && npm run dev`       |
| Build frontend                  | `cd vite-project && npm run build`     |
| Lint frontend (if enabled)      | `cd vite-project && npm run lint`      |

---

## 10. Next Ideas

- Add authentication before exposing analytics.
- Cache GA4 responses to reduce API calls.
- Push backend metrics into Firestore to unify data sources.
- Add backend unit tests with Jest or Vitest for service functions.

Happy building! If you have questions while extending this POC, feel free to explore or tweak the modules mentioned above.

