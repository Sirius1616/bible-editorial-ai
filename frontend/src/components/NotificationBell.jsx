import { Bell, CheckCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { notificationsApi } from "../api";
import { formatDate } from "../lib/format";

const TYPE_ICON = {
  assignment: "👤",
  status_change: "🔄",
  comment: "💬",
  mention: "@",
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([
        notificationsApi.list(),
        notificationsApi.unreadCount(),
      ]);
      setNotifications(list);
      setUnread(count.count);
    } catch {
      /* unauthenticated or network error */
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function markRead(id) {
    await notificationsApi.markRead(id);
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await notificationsApi.markAllRead();
    setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  return (
    <div className="notif-bell" ref={ref}>
      <button
        className="ghost notif-bell-btn"
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && <span className="notif-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <h3>Notifications</h3>
            {unread > 0 && (
              <button className="ghost notif-mark-all" onClick={markAllRead}>
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${n.read ? "" : "unread"}`}
                  onClick={() => {
                    if (!n.read) markRead(n.id);
                  }}
                >
                  <span className="notif-icon">{TYPE_ICON[n.type] || "🔔"}</span>
                  <div className="notif-body">
                    <div className="notif-message">{n.message}</div>
                    <div className="notif-time">{formatDate(n.created_at)}</div>
                  </div>
                  {n.content_item_id && n.project_id && (
                    <Link
                      className="notif-link"
                      to={`/projects/${n.project_id}/items/${n.content_item_id}`}
                      onClick={() => setOpen(false)}
                    >
                      View
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
