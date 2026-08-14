import { BookMarked, LogOut, Moon, Sun } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { clearToken } from "../api/client";
import { useEffect, useState } from "react";
import { authApi } from "../api";
import { useTheme } from "../theme";

function initialsOf(name) {
  return (name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AppLayout({ children, title = "Bible Editorial AI" }) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState(null);

  useEffect(() => {
    authApi
      .me()
      .then(setUser)
      .catch(() => {});
  }, []);

  function logout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="layout">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">
            <BookMarked size={18} />
          </span>
          <div>
            <div className="brand-name">{title}</div>
            <div className="brand-tagline">Editorial production studio</div>
          </div>
        </div>

        <div className="topbar-right">
          <Link to="/projects" className="link-button">
            Projects
          </Link>
          <Link to="/workspaces" className="link-button">
            Workspaces
          </Link>
          <div className="user-chip">
            <span className="avatar">{initialsOf(user?.full_name)}</span>
            <div>
              <div className="user-name">{user?.full_name || "Editor"}</div>
              <div className="user-email">{user?.email || ""}</div>
            </div>
          </div>
          <button
            className="ghost"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle color theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="ghost" onClick={logout} title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
