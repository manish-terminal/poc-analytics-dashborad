import { NavLink, Route, Routes } from "react-router-dom";
import "./App.css";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";

const App = () => {
  return (
    <div className="app-shell">
      <nav className="app-nav">
        <NavLink to="/" className="nav-link">
          Home
        </NavLink>
        <NavLink to="/dashboard" className="nav-link">
          Dashboard
        </NavLink>
      </nav>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
