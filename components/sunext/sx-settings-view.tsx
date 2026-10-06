"use client";

// "Cài đặt" view — port of sidebar.js#buildSettingsView: reset demo data,
// profile info, system info.

import { Info, RotateCcw, User } from "lucide-react";
import type { ReactNode } from "react";
import { useSxShell } from "./sx-shell-context";
import { SxPageHero, SxPageView } from "./sx-page-view";
import { clearSxTaskOverrides } from "./use-sx-task-store";

export interface SxSettingsInfo {
  name: string;
  roleLabel: string;
  email: string;
  mode: string;
  storage: string;
}

const ROW_STYLE = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 12,
  padding: "8px 12px",
  background: "rgba(119,151,199,.05)",
  borderRadius: 8,
} as const;

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={ROW_STYLE}>
      <span style={{ color: "var(--sx-text-muted)" }}>{label}</span>
      <span style={{ color: accent ? "#27e0b3" : "var(--sx-text)", fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function Section({
  icon,
  tone,
  title,
  hint,
  children,
}: {
  icon: ReactNode;
  tone: string;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="panel" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div className={`stat-icon ${tone}`} style={{ width: 42, height: 42 }}>
          {icon}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--sx-text)" }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--sx-text-muted)", marginTop: 2 }}>{hint}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function SxSettingsView({ info }: { info: SxSettingsInfo }) {
  const { showToast } = useSxShell();

  function onReset() {
    clearSxTaskOverrides();
    showToast("Đã khôi phục dữ liệu demo thành công!", "success");
  }

  return (
    <SxPageView>
      <SxPageHero title="Cài đặt" subtitle="Quản lý cài đặt hệ thống" />
      <div style={{ display: "grid", gap: 14, maxWidth: 560 }}>
        <Section icon={<RotateCcw />} tone="orange" title="Reset dữ liệu demo" hint="Khôi phục toàn bộ dữ liệu về trạng thái ban đầu.">
          <button
            type="button"
            id="resetDemoBtn"
            className="sx-reset-btn"
            onClick={onReset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              border: "1px solid rgba(255,138,53,.28)",
              borderRadius: 10,
              color: "#ffac62",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all .2s ease",
            }}
          >
            <RotateCcw width={16} height={16} />
            Reset demo data
          </button>
        </Section>

        <Section icon={<User />} tone="purple" title="Hồ sơ" hint="Thông tin tài khoản của bạn.">
          <div style={{ display: "grid", gap: 8 }}>
            <Row label="Tên" value={info.name} />
            <Row label="Vai trò" value={info.roleLabel} />
            <Row label="Email" value={info.email} />
          </div>
        </Section>

        <Section icon={<Info />} tone="green" title="Phiên bản hệ thống" hint="Thông tin phiên bản hiện tại.">
          <div style={{ display: "grid", gap: 8 }}>
            <Row label="Phiên bản" value="SUNEXT Dashboard v1.0" />
            <Row label="Chế độ" value={info.mode} accent />
            <Row label="Lưu trữ" value={info.storage} />
          </div>
        </Section>
      </div>
    </SxPageView>
  );
}
