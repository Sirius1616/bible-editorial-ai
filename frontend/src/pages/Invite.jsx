import { BookMarked, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { isAuthenticated, setToken } from "../api/client";
import { invitesApi } from "../api";

export default function Invite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    invitesApi
      .info(token)
      .then((data) => {
        setInfo(data);
        setForm((f) => ({ ...f, email: data.email }));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function accept(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const ws = await invitesApi.accept(token);
      navigate(`/workspaces/${ws.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function register(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { access_token } = await invitesApi.register(
        token,
        form.email,
        form.password,
        form.full_name,
      );
      setToken(access_token);
      navigate("/projects");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="auth-wrap">
        <div className="loading-block">
          <Loader2 size={28} className="spinner" />
          <span>Checking invitation…</span>
        </div>
      </div>
    );
  }

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
          <h2>You've been invited to join an editorial workspace.</h2>
          <p>
            Accept the invitation to collaborate with your publishing team on projects, versions,
            and reviews — all inside the studio.
          </p>
          <blockquote className="quote">
            "As iron sharpens iron, so one person sharpens another."
            <br />
            <span style={{ fontSize: "0.85rem", fontStyle: "normal", opacity: 0.8 }}>
              — Proverbs 27:17
            </span>
          </blockquote>
        </div>
        <div className="brand-tagline">Built for Bible &amp; Christian book publishers</div>
      </aside>

      <div className="auth-panel">
        <div className="auth-card">
          {error ? (
            <>
              <h1>Invitation unavailable</h1>
              <p className="sub">{error}</p>
              <Link to="/login" className="button-secondary">
                Go to login
              </Link>
            </>
          ) : (
            <>
              <div className="title-row">
                <h1>{info.workspace_name}</h1>
                <span className="badge badge-neutral">{info.role}</span>
              </div>
              <p className="sub">
                Invitation sent to <strong>{info.email}</strong>. You will join as{" "}
                <strong>{info.role}</strong>.
              </p>

              {isAuthenticated() ? (
                <form onSubmit={accept}>
                  <div className="alert alert-info">
                    <Mail size={16} />
                    <span>
                      You're logged in as <strong>{form.email}</strong>. If that matches the
                      invitation, accept below.
                    </span>
                  </div>
                  <button type="submit" className="primary" disabled={submitting}>
                    {submitting && <Loader2 size={16} className="spinner" />}
                    Accept invitation
                  </button>
                  <p className="auth-switch">
                    Wrong account? <Link to="/login" className="link-button">Log in as a different user</Link>
                  </p>
                </form>
              ) : (
                <form onSubmit={register}>
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
                  <button type="submit" className="primary" disabled={submitting}>
                    {submitting && <Loader2 size={16} className="spinner" />}
                    Create account and join
                  </button>
                  <p className="auth-switch">
                    Already registered? <Link to="/login" className="link-button">Log in</Link>
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
