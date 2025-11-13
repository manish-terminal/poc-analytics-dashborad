import { useEffect, useState } from "react";
import viteLogo from "/vite.svg";
import reactLogo from "../assets/react.svg";
import "../App.css";
import { analytics, logEvent } from "../firebase";

const logEventTypes = [
  { label: "Log Tutorial Start", event: "tutorial_start" },
  { label: "Log Add To Cart", event: "add_to_cart" },
  { label: "Log Share App", event: "share_app" },
];

const Home = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    logEvent(analytics, "test_event", { foo: "bar" });
  }, []);

  const handleLogEvent = (eventName) => () => {
    logEvent(analytics, eventName, { timestamp: Date.now() });
  };

  return (
    <div className="home-page">
      <div className="logo-row">
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((prev) => prev + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/pages/Home.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <div className="log-buttons">
        {logEventTypes.map(({ label, event }) => (
          <button key={event} onClick={handleLogEvent(event)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Home;

