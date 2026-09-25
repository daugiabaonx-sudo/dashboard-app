"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";

interface NotificationRow {
  label: string;
  channels: string[];
  on: boolean;
}

const INITIAL: NotificationRow[] = [
  { label: "Task assigned to me", channels: ["Email", "Push"], on: true },
  { label: "Mention in comment", channels: ["Email", "Push"], on: true },
  { label: "Deadline approaching", channels: ["Email"], on: true },
  { label: "Project status changes", channels: ["Push"], on: false },
  { label: "Weekly digest", channels: ["Email"], on: true },
];

export function NotificationToggles() {
  const [rows, setRows] = useState(INITIAL);

  return (
    <ul className="divide-y divide-border">
      {rows.map((row, i) => (
        <li
          key={row.label}
          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div>
            <p className="text-sm font-medium">{row.label}</p>
            <p className="text-[12px] text-muted-foreground">
              {row.channels.join(", ")}
            </p>
          </div>
          <Switch
            label={`Toggle ${row.label}`}
            checked={row.on}
            onCheckedChange={(next) =>
              setRows((prev) =>
                prev.map((r, j) => (j === i ? { ...r, on: next } : r)),
              )
            }
          />
        </li>
      ))}
    </ul>
  );
}
