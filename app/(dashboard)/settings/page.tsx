import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { NotificationToggles } from "@/components/settings/notification-toggles";

const PLAN_FEATURES = [
  "Unlimited projects",
  "Advanced reporting",
  "SSO + SCIM",
  "Dedicated CSM",
] as const;

const INTEGRATIONS = [
  { name: "Slack", desc: "Send notifications to #ops-feed", connected: true },
  { name: "GitHub", desc: "Link PRs to tasks", connected: true },
  { name: "Linear", desc: "Two-way sync (beta)", connected: false },
  { name: "Google Calendar", desc: "Sync deadlines", connected: false },
];

export default function SettingsPage() {
  return (
    <div className="space-y-10 animate-fade-in">
      <PageHeader
        eyebrow="Workspace · billing · integrations"
        title={<>Make this <span className="italic text-primary">yours</span>.</>}
        description="Workspace identity, plan, and the integrations that keep everything in sync."
        actions={null}
      />

      <section className="grid gap-3 lg:grid-cols-12">
        <Card className="lg:col-span-8 animate-fade-up opacity-0" style={{ animationDelay: "60ms" }}>
          <CardHeader>
            <div className="flex items-end justify-between gap-3">
              <CardTitle className="font-display text-xl font-normal tracking-tight">
                Workspace
              </CardTitle>
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Public profile
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="org">
                Organization name
              </label>
              <Input id="org" defaultValue="SUNEXT Operations" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="slug">
                Workspace URL
              </label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-secondary px-3 text-xs text-muted-foreground">
                  sunext.io/
                </span>
                <Input
                  id="slug"
                  defaultValue="operations"
                  className="rounded-l-none"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="desc">
                Description
              </label>
              <textarea
                id="desc"
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                defaultValue="Internal operations workspace for projects, tasks, and team performance."
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline">Cancel</Button>
              <Button>Save changes</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 animate-fade-up opacity-0" style={{ animationDelay: "120ms" }}>
          <CardHeader>
            <CardTitle className="font-display text-xl font-normal tracking-tight">
              Plan
            </CardTitle>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Currently on Business.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <Badge tone="primary">Business</Badge>
              <p className="text-2xl font-medium tabular-nums text-foreground">
                $24
                <span className="text-sm font-normal text-muted-foreground">/user/mo</span>
              </p>
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Billed monthly · renews Nov 1
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-foreground">
                  <Dot tone="good" />
                  {f}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="mt-5 w-full">
              Manage subscription
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "180ms" }}>
          <CardHeader>
            <CardTitle className="font-display text-xl font-normal tracking-tight">
              Notifications
            </CardTitle>
            <p className="mt-1 text-[13px] text-muted-foreground">
              What gets sent where.
            </p>
          </CardHeader>
          <CardContent>
            <NotificationToggles />
          </CardContent>
        </Card>

        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "240ms" }}>
          <CardHeader>
            <CardTitle className="font-display text-xl font-normal tracking-tight">
              Integrations
            </CardTitle>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Connected services.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {INTEGRATIONS.map((int) => (
                <li
                  key={int.name}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{int.name}</p>
                    <p className="text-[12px] text-muted-foreground">{int.desc}</p>
                  </div>
                  {int.connected ? (
                    <Badge tone="good" size="sm">
                      Connected
                    </Badge>
                  ) : (
                    <Button variant="outline" size="sm">
                      Connect
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
