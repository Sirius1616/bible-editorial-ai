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
      navigate("/projects");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (authed) return <Navigate to="/projects" replace />;

  return (
    <div className="auth-card">
      <h1>Bible Editorial AI</h1>
      <p className="muted">Editorial production for Bible publishers</p>
      <form onSubmit={submit}>
        {mode === "register" && (
          <input
            type="text"
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) => update("full_name", e.target.value)}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password (min 8 chars)"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
      <p className="muted">
        {mode === "login" ? (
          <>
            No account?{" "}
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
  );
}
