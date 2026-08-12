import { BookMarked, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { isAuthenticated, setToken } from "../api/client";
import { authApi } from "../api";

export default function Login() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(isAuthenticated());
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) setAuthed(true);
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        await authApi.register(form.email, form.password, form.full_name);
      }
      const { access_token } = await authApi.login(form.email, form.password);
      setToken(access_token);
      setAuthed(true);
      navigate("/projects");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (authed) return <Navigate to="/projects" replace />;

  return (
    <div className="auth-wrap">
      <aside className="auth-brand">
        <div className="brand-lockup">
          <span className="brand-mark">
            <BookMarked size={18} />
          </span>
          <div>
            <div className="brand-name">Bible Editorial AI</div>
            <div className="brand-tagline">Editorial production studio</div>
          </div>
        </div>

        <div className="auth-hero">
          <h2>Editorial production, with the help of an AI writing partner.</h2>
          <p>
            Draft study notes, devotionals, and reference entries against your project's style
            guide. Review versions, capture editorial comments, and approve work — all in one
            studio built for Bible publishers.
          </p>
          <blockquote className="quote">
            "Your word is a lamp to my feet and a light to my path."
            <br />
            <span style={{ fontSize: "0.85rem", fontStyle: "normal", opacity: 0.8 }}>
              — Psalm 119:105
            </span>
          </blockquote>
        </div>

        <div className="brand-tagline">Built for Bible &amp; Christian book publishers</div>
      </aside>

      <div className="auth-panel">
        <div className="auth-card">
          <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="sub">
            {mode === "login"
              ? "Log in to continue to your editorial workspace."
              : "Register to start your first editorial project."}
          </p>

          <form onSubmit={submit}>
            {mode === "register" && (
              <div>
                <label htmlFor="full_name">Full name</label>
                <input
                  id="full_name"
                  type="text"
                  placeholder="e.g. Jane Editor"
                  value={form.full_name}
                  onChange={(e) => update("full_name", e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@publisher.org"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
              />
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button type="submit" className="primary" disabled={loading}>
              {loading && <Loader2 size={16} className="spinner" />}
              {mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <p className="auth-switch">
            {mode === "login" ? (
              <>
                No account yet?{" "}
                <button className="link-button" onClick={() => setMode("register")}>
                  Register
                </button>
              </>
            ) : (
              <>
                Already registered?{" "}
                <button className="link-button" onClick={() => setMode("login")}>
                  Log in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
