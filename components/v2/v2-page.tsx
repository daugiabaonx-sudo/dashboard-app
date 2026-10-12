// components/v2/v2-page.tsx
// Server entry for every dashboard tab: loads the session, role and the
// Microsoft Planner dataset, maps it to the V2 template model and hands it
// to the client host.

import { connection } from "next/server";
import { Suspense } from "react";
import { getUserRole } from "@/lib/auth/role";
import { requireUser } from "@/lib/auth/session";
import { buildSxShell } from "@/lib/sx-shell-data";
import { getSxViewDataset } from "@/lib/sx-view-dataset";
import { buildV2Model } from "@/lib/v2/v2-model";
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
  const [dataset, role] = await Promise.all([getSxViewDataset(), getUserRole(session.userId)]);
  const { profile, canEdit } = buildSxShell(session, dataset, role);
  const model = buildV2Model(dataset, new Date());
  return (
    <V2App
      model={model}
      profile={{ name: profile.name, initials: profile.initials, roleLabel: profile.roleLabel }}
      canEdit={canEdit}
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
