// /notifications — server-rendered shell, client list inside. Renders the
// full notification stream from /api/notifications (TanStack Query), with a
// "mark all read" action matching the header bell.

import { PageHeader } from "@/components/layout/page-header";
import { NotificationsList } from "@/components/notifications/notifications-list";

export default function NotificationsPage() {
  return (
    <div className="space-y-10 animate-fade-in">
      <PageHeader
        eyebrow="Workspace activity"
        title={
          <>
            All <span className="italic text-primary">notifications</span>.
          </>
        }
        description="Every mention, assignment, and status change in one place. Tap any item to jump to its source."
        actions={null}
      />
      <NotificationsList />
    </div>
  );
}