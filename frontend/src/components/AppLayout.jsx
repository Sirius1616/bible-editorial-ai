import { Link, useNavigate } from "react-router-dom";
import { clearToken } from "../api/client";

export default function AppLayout({ children }) {
  const navigate = useNavigate();

  function logout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="layout">
      <header className="topbar">
        <Link to="/projects" className="brand">
          Bible Editorial AI
        </Link>
        <button className="link-button" onClick={logout}>
          Log out
        </button>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
