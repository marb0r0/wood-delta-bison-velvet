import { NavLink, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "./api/client";
import type { Health } from "./types";
import Dashboard from "./pages/Dashboard";
import NewFixture from "./pages/NewFixture";
import QuickPredict from "./pages/QuickPredict";
import History from "./pages/History";
import About from "./pages/About";
import Live from "./pages/Live";

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
    const t = setInterval(() => {
      api.health().then(setHealth).catch(() => setHealth(null));
    }, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span>⚽</span>
          <span>Football AI</span>
        </div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <span className="icon">🏠</span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/novo" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <span className="icon">➕</span>
            <span>Novo Jogo</span>
          </NavLink>
          <NavLink to="/live" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <span className="icon">📡</span>
            <span>Dados Live</span>
          </NavLink>
          <NavLink to="/previsao" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <span className="icon">🔮</span>
            <span>Previsão Rápida</span>
          </NavLink>
          <NavLink to="/historico" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <span className="icon">📋</span>
            <span>Histórico</span>
          </NavLink>
          <NavLink to="/sobre" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <span className="icon">ℹ️</span>
            <span>Sobre</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="health-badge">
            <span className={`health-dot${health?.status === "ok" ? " ok" : ""}`} />
            <span>
              {health ? `${health.status} · ${health.model_version}` : "API offline"}
            </span>
          </div>
        </div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/novo" element={<NewFixture />} />
          <Route path="/live" element={<Live />} />
          <Route path="/previsao" element={<QuickPredict />} />
          <Route path="/historico" element={<History />} />
          <Route path="/sobre" element={<About />} />
        </Routes>
      </main>
    </div>
  );
}
