import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Workspace, notifications, and integrations
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>Public profile visible to your team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline">Cancel</Button>
              <Button>Save changes</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge tone="primary">Business</Badge>
            <p className="mt-3 text-sm text-muted-foreground">
              $24/user/month · billed monthly
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-status-good" />
                Unlimited projects
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-status-good" />
                Advanced reporting
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-status-good" />
                SSO + SCIM
              </li>
            </ul>
            <Button variant="outline" className="mt-4 w-full">
              Manage subscription
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>What gets sent where</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Task assigned to me", channels: ["Email", "Push"], on: true },
              { label: "Mention in comment", channels: ["Email", "Push"], on: true },
              { label: "Deadline approaching", channels: ["Email"], on: true },
              { label: "Project status changes", channels: ["Push"], on: false },
              { label: "Weekly digest", channels: ["Email"], on: true },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.channels.join(", ")}
                  </p>
                </div>
                <button
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    row.on ? "bg-primary" : "bg-secondary"
                  }`}
                  aria-label={`Toggle ${row.label}`}
                  aria-pressed={row.on}
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                      row.on ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>Connected services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Slack", desc: "Send notifications to #ops-feed", connected: true },
              { name: "GitHub", desc: "Link PRs to tasks", connected: true },
              { name: "Linear", desc: "Two-way sync (beta)", connected: false },
              { name: "Google Calendar", desc: "Sync deadlines", connected: false },
            ].map((int) => (
              <div
                key={int.name}
                className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium">{int.name}</p>
                  <p className="text-xs text-muted-foreground">{int.desc}</p>
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
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
