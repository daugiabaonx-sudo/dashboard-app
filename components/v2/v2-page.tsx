// components/v2/v2-page.tsx
// Server entry for every dashboard tab: loads the session, role, workspace
// profiles, open Blocker & Decision requests, notifications, and the Microsoft
// Planner dataset, maps them to the V2 template model and hands them to the client host.

import { connection } from "next/server";
import { Suspense } from "react";
import { canRaiseBlocker, isUserRole, roleLabel } from "@/lib/auth/permissions";
import { getUserRole } from "@/lib/auth/role";
import { requireUser } from "@/lib/auth/session";
import { listOpenDecisionRequests } from "@/lib/db/decision-requests";
import { listNotifications } from "@/lib/db/notifications";
import { listProfiles } from "@/lib/db/profiles";
import { buildSxShell } from "@/lib/sx-shell-data";
import { getSxViewDataset } from "@/lib/sx-view-dataset";
import type { V2DecisionMember } from "@/lib/v2/v2-decisions";
import { buildV2Model, type V2Notification } from "@/lib/v2/v2-model";
import { V2App } from "./v2-app";
import type { V2View } from "./v2-context";

interface V2PageProps {
  view: V2View;
  focusPid?: string;
}

/** Runtime data (session cookie, request time) is read under the page's own <Suspense> — cacheComponents. */
export function V2Page(props: V2PageProps) {
  return (
    <Suspense fallback={<V2PageFallback />}>
      <V2PageContent {...props} />
    </Suspense>
  );
}

async function V2PageContent({ view, focusPid }: V2PageProps) {
  await connection(); // request-time render: real "today" + session
  const session = await requireUser();
  const [dataset, role, decisions, profiles, dbNotifications] = await Promise.all([
    getSxViewDataset(),
    getUserRole(session.userId),
    listOpenDecisionRequests().catch(() => []),
    listProfiles().catch(() => []),
    listNotifications(session.userId).catch(() => []),
  ]);
  const { profile, canEdit } = buildSxShell(session, dataset, role);
  const canRaise = canRaiseBlocker(role ?? "member");
  const baseModel = buildV2Model(dataset, new Date());

  const extraNotes: V2Notification[] = dbNotifications
    .filter((n) => !n.read)
    .map((n) => ({
      title: n.title,
      message: n.body,
      color: n.type === "blocked" ? "#F2873A" : "#5155EA",
    }));

  const model = {
    ...baseModel,
    notifications: [...extraNotes, ...baseModel.notifications],
  };

  const members: V2DecisionMember[] = profiles.map((p) => {
    const r = isUserRole(p.role) ? p.role : "member";
    return {
      id: p.id,
      name: p.name || p.email,
      initials: p.initials || "?",
      role: r,
      roleLabel: roleLabel(r),
    };
  });

  if (!members.some((m) => m.id === session.userId)) {
    const r = isUserRole(role) ? role : "member";
    members.unshift({
      id: session.userId,
      name: profile.name,
      initials: profile.initials,
      role: r,
      roleLabel: profile.roleLabel,
    });
  }

  return (
    <V2App
      model={model}
      profile={{
        userId: session.userId,
        name: profile.name,
        initials: profile.initials,
        roleLabel: profile.roleLabel,
      }}
      canEdit={canEdit}
      canRaise={canRaise}
      decisions={decisions}
      members={members}
      view={view}
      focusPid={focusPid}
      plannerTasks={dataset.tasks}
      etags={dataset.taskEtags ?? {}}
    />
  );
}

/** Blank canvas shown while the Planner dataset streams in. */
export function V2PageFallback() {
  return <div style={{ minHeight: "100vh", background: "#F6F6FE" }} aria-busy="true" />;
}
