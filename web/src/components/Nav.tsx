import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../api/client";
import { useAuth } from "../router";

export default function Nav(): React.ReactElement {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async (): Promise<void> => {
    await logout();
    await refresh();
    navigate("/login");
  };

  return (
    <nav className="nav">
      <div className="nav-brand">Founder OS</div>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          Home
        </NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
          Advanced: Dashboard
        </NavLink>
        <NavLink to="/research" className={({ isActive }) => (isActive ? "active" : "")}>
          Advanced: Research
        </NavLink>
        <NavLink to="/monitoring" className={({ isActive }) => (isActive ? "active" : "")}>
          Advanced: Monitoring
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? "active" : "")}>
          Advanced: History
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
          Advanced: Settings
        </NavLink>
      </div>
      <div className="nav-user">
        {user && <span className="nav-email">{user.email}</span>}
        <button type="button" onClick={() => void handleLogout()}>
          Log out
        </button>
      </div>
    </nav>
  );
}
