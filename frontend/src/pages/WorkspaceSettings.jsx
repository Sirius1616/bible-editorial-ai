import {
  ArrowLeftRight,
  Building2,
  Copy,
  Loader2,
  Mail,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { workspacesApi } from "../api";

const ROLE_BADGE = {
  owner: "badge-primary",
  admin: "badge-type",
  member: "badge-neutral",
  viewer: "badge-type",
};

const ROLE_OPTIONS = ["admin", "member", "viewer"];

function initialsOf(name) {
  return (name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function WorkspaceSettings() {
  const { workspaceId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");

  const [invite, setInvite] = useState({ email: "", role: "member" });
  const [inviting, setInviting] = useState(false);

  const [transferTo, setTransferTo] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const detail = await workspacesApi.get(Number(workspaceId));
      setWorkspace(detail);
      setName(detail.name);
      const canManage = detail.my_role === "owner" || detail.my_role === "admin";
      setInvites(canManage ? await workspacesApi.listInvites(Number(workspaceId)) : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [workspaceId]);

  const canManage = workspace?.my_role === "owner" || workspace?.my_role === "admin";
  const isOwner = workspace?.my_role === "owner";
  const members = workspace?.members || [];

  async function rename(e) {
    e.preventDefault();
    setError("");
    try {
      const updated = await workspacesApi.update(Number(workspaceId), name);
      setWorkspace((w) => ({ ...w, name: updated.name }));
      setEditingName(false);
      setNotice("Workspace renamed.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendInvite(e) {
    e.preventDefault();
    setInviting(true);
    setError("");
    setNotice("");
    try {
      const created = await workspacesApi.createInvite(
        Number(workspaceId),
        invite.email,
        invite.role,
      );
      setInvites((list) => [created, ...list]);
      setInvite({ email: "", role: "member" });
      setNotice("Invitation created — share the join link with your colleague.");
    } catch (err) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  }

  async function revoke(token) {
    setError("");
    try {
      await workspacesApi.revokeInvite(Number(workspaceId), token);
      setInvites((list) => list.filter((i) => i.token !== token));
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeRole(userId, role) {
    setError("");
    try {
      const updated = await workspacesApi.updateMember(Number(workspaceId), userId, role);
      setWorkspace((w) => ({
        ...w,
        members: w.members.map((m) => (m.user_id === userId ? updated : m)),
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeMember(userId) {
    setError("");
    if (!window.confirm("Remove this member from the workspace?")) return;
    try {
      await workspacesApi.removeMember(Number(workspaceId), userId);
      setWorkspace((w) => ({
        ...w,
        member_count: w.member_count - 1,
        members: w.members.filter((m) => m.user_id !== userId),
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function transfer(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!window.confirm("Transfer workspace ownership to this member? They will become the owner and you will become an admin.")) {
      return;
    }
    try {
      const updated = await workspacesApi.transfer(Number(workspaceId), Number(transferTo));
      setWorkspace((w) => ({
        ...updated,
        members: updated.members,
        member_count: updated.member_count,
        my_role: w.my_role,
      }));
      setTransferTo("");
      setNotice("Ownership transferred.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeWorkspace() {
    setError("");
    if (!window.confirm("Delete this workspace permanently? This cannot be undone.")) return;
    try {
      await workspacesApi.remove(Number(workspaceId));
      window.location.href = "/workspaces";
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="loading-block">
          <Loader2 size={28} className="spinner" />
          <span>Loading workspace…</span>
        </div>
      </AppLayout>
    );
  }

  if (!workspace && !loading) {
    return (
      <AppLayout>
        <div className="card">
          <div className="empty-state">
            <h3>{error || "Workspace not found"}</h3>
            <Link to="/workspaces" className="link-button">
              Back to workspaces
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="page-head">
        <div>
          <div className="title-row">
            {editingName ? (
              <form className="row" style={{ gap: "0.5rem" }} onSubmit={rename}>
                <input
                  aria-label="Workspace name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <button type="submit" className="primary" size="sm">
                  Save
                </button>
                <button type="button" onClick={() => setEditingName(false)}>
                  Cancel
                </button>
              </form>
            ) : (
              <h1>
                {workspace.name}{" "}
                {canManage && (
                  <button className="link-button" onClick={() => setEditingName(true)}>
                    Rename
                  </button>
                )}
              </h1>
            )}
            <span className={`badge ${ROLE_BADGE[workspace.my_role] || "badge-neutral"}`}>
              {workspace.my_role}
            </span>
          </div>
          <p className="sub">
            {workspace.member_count} member{workspace.member_count === 1 ? "" : "s"} — owned by{" "}
            {members.find((m) => m.user_id === workspace.owner_id)?.full_name || "the owner"}
          </p>
        </div>
        <div className="row" style={{ gap: "0.6rem" }}>
          <Link to="/workspaces" className="button-secondary">
            <Building2 size={16} /> Workspaces
          </Link>
          {isOwner && (
            <button className="danger" onClick={removeWorkspace}>
              <Trash2 size={16} /> Delete workspace
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="workspace-layout">
        <section className="card">
          <h2 className="card-title">Members</h2>
          <div className="member-list">
            {members.map((m) => (
              <div className="member-row" key={m.id}>
                <span className="avatar">{initialsOf(m.full_name)}</span>
                <div className="member-info">
                  <div className="member-name">{m.full_name}</div>
                  <div className="member-email">{m.email}</div>
                </div>
                {m.role === "owner" ? (
                  <span className={`badge ${ROLE_BADGE.owner}`}>owner</span>
                ) : canManage ? (
                  <div className="row" style={{ gap: "0.5rem" }}>
                    <select
                      aria-label={`Role of ${m.full_name}`}
                      value={m.role}
                      onChange={(e) => changeRole(m.user_id, e.target.value)}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                    <button
                      className="ghost"
                      title="Remove member"
                      onClick={() => removeMember(m.user_id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <span className={`badge ${ROLE_BADGE[m.role] || "badge-neutral"}`}>{m.role}</span>
                )}
              </div>
            ))}
          </div>

          {isOwner && members.length > 1 && (
            <form className="transfer-form" onSubmit={transfer}>
              <ArrowLeftRight size={16} />
              <select
                aria-label="Transfer ownership to"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                required
              >
                <option value="" disabled>
                  Choose a member…
                </option>
                {members
                  .filter((m) => m.role !== "owner")
                  .map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.full_name}
                    </option>
                  ))}
              </select>
              <button type="submit" className="secondary">
                Transfer ownership
              </button>
            </form>
          )}
        </section>

        {canManage && (
          <section className="card">
            <h2 className="card-title">Invite a member</h2>
            <form className="invite-form" onSubmit={sendInvite}>
              <div>
                <label htmlFor="inv-email">Email address</label>
                <input
                  id="inv-email"
                  type="email"
                  placeholder="coeditor@publisher.org"
                  value={invite.email}
                  onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="inv-role">Role</label>
                <select
                  id="inv-role"
                  value={invite.role}
                  onChange={(e) => setInvite({ ...invite, role: e.target.value })}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="primary" disabled={inviting}>
                {inviting ? <Loader2 size={16} className="spinner" /> : <UserPlus size={16} />}
                Create invite
              </button>
            </form>
            <p className="hint">
              The invite is sent by sharing a join link — no email infrastructure yet.
            </p>

            {invites.length > 0 && (
              <>
                <h2 className="card-title" style={{ marginTop: "1.5rem" }}>
                  Pending invites
                </h2>
                <div className="member-list">
                  {invites.map((i) => (
                    <div className="member-row" key={i.token}>
                      <span className="avatar avatar-invite">
                        <Mail size={14} />
                      </span>
                      <div className="member-info">
                        <div className="member-name">{i.email}</div>
                        <button
                          className="link-button"
                          onClick={() => {
                            navigator.clipboard
                              ?.writeText(`${window.location.origin}/invite/${i.token}`)
                              .catch(() => {});
                            setNotice("Join link copied to clipboard.");
                          }}
                        >
                          <Copy size={12} /> /invite/{i.token}
                        </button>
                      </div>
                      <span className={`badge ${ROLE_BADGE[i.role] || "badge-neutral"}`}>
                        {i.role}
                      </span>
                      <button className="ghost" title="Revoke invite" onClick={() => revoke(i.token)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </AppLayout>
  );
}
