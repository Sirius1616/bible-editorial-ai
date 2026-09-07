import { BookMarked, BookOpen, LogOut, Moon, Sun } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { clearToken } from "../api/client";
import { useEffect, useState } from "react";
import { authApi } from "../api";
import { useTheme } from "../theme";
import NotificationBell from "./NotificationBell";

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
      <div className="bible-flow" aria-hidden="true">
        <span className="bible-flow-book">
          <BookOpen size={14} />
        </span>
      </div>
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
          <NotificationBell />
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

      <div className="work-watermark" aria-hidden="true">
        <svg viewBox="0 0 360 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M180 30 C 130 26 80 32 36 52 V 176 C 84 154 136 150 180 156 Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M180 30 C 230 26 280 32 324 52 V 176 C 276 154 224 150 180 156 Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M180 26 V 156" stroke="currentColor" strokeWidth="3" />
          <path d="M60 74 H 154 M60 92 H 152 M60 110 H 150 M60 128 H 148" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M206 74 H 300 M208 92 H 298 M210 110 H 300 M212 128 H 302" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
