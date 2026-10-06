// "Thông báo" view — port of sidebar.js#buildNotificationsView.
// No hooks: renders on the server inside the client shell.

import type { SxNotification } from "@/lib/sx-dashboard";
import { SxPageHero, SxPageView } from "./sx-page-view";

export function SxNotificationsView({ notifications }: { notifications: readonly SxNotification[] }) {
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <SxPageView>
      <SxPageHero title="Thông báo" subtitle={`${unread} thông báo chưa đọc`} />
      <div className="panel" style={{ overflow: "hidden" }}>
        {notifications.map((n) => (
          <div
            key={n.id}
            className="notification-item"
            style={{ padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start", opacity: n.read ? 0.6 : undefined }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: n.color,
                flex: "0 0 auto",
                marginTop: 4,
                boxShadow: `0 0 8px ${n.color}88`,
              }}
            />
            <div style={{ flex: 1 }}>
              <strong style={{ display: "block", fontSize: 13, color: "var(--sx-text)", marginBottom: 3 }}>{n.title}</strong>
              <small style={{ color: "var(--sx-text-muted)", fontSize: 11, lineHeight: 1.45 }}>{n.message}</small>
            </div>
            {!n.read && <span style={{ fontSize: 9, fontWeight: 700, color: "#27e0b3", whiteSpace: "nowrap" }}>Mới</span>}
          </div>
        ))}
      </div>
    </SxPageView>
  );
}
