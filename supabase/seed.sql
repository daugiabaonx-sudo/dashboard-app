-- supabase/seed.sql
-- Seeds one workspace, 8 profiles, 5 projects, 15 tasks, 6 activity rows, 4 notifications.
-- Byte-identical text with lib/data.ts so the 32 Playwright tests stay green.
--
-- The seed runs WITHOUT Supabase Auth (local Docker stack has no GoTrue),
-- so profiles are inserted directly with deterministic UUIDs. The mock adapter
-- (lib/supabase/mock.ts) signs in as one of these users via a dev shortcut.

-- ----- Workspace -----
insert into public.workspaces (id, name, slug)
values (
  '00000000-0000-0000-0000-000000000001',
  'SUNEXT Operations',
  'operations'
)
on conflict (id) do nothing;

-- ----- Profiles (deterministic UUIDs u1..u8) -----
insert into public.profiles (id, email, full_name, initials, avatar_color, department, role, capacity_hours, joined_at) values
  ('00000000-0000-0000-0000-00000000000a', 'minhanh@sunext.io',    'Nguyen Minh Anh',  'MA', '#6366f1', 'Leadership',  'owner',   32, '2024-01-15'),
  ('00000000-0000-0000-0000-00000000000b', 'quocbao@sunext.io',    'Tran Quoc Bao',     'QB', '#8b5cf6', 'Engineering', 'admin',   40, '2024-02-20'),
  ('00000000-0000-0000-0000-00000000000c', 'phuong.le@sunext.io',  'Le Hoang Phuong',   'LP', '#06b6d4', 'Product',     'manager', 40, '2024-03-05'),
  ('00000000-0000-0000-0000-00000000000d', 'thanhdat@sunext.io',   'Pham Thanh Dat',    'TD', '#10b981', 'Engineering', 'member',  40, '2024-04-12'),
  ('00000000-0000-0000-0000-00000000000e', 'kimtuyen@sunext.io',   'Vu Kim Tuyen',      'KT', '#f59e0b', 'Design',      'member',  40, '2024-05-01'),
  ('00000000-0000-0000-0000-00000000000f', 'bichngoc@sunext.io',   'Dao Bich Ngoc',     'BN', '#ec4899', 'Marketing',   'member',  36, '2024-05-22'),
  ('00000000-0000-0000-0000-000000000010', 'giakhanh@sunext.io',   'Hoang Gia Khanh',   'GK', '#ef4444', 'Engineering', 'member',  40, '2024-06-15'),
  ('00000000-0000-0000-0000-000000000011', 'mailinh@sunext.io',    'Bui Thi Mai Linh',  'ML', '#14b8a6', 'Sales',       'viewer',  32, '2024-07-08')
on conflict (id) do nothing;

-- ----- Workspace memberships (everyone is a member of the default workspace) -----
insert into public.workspace_members (workspace_id, user_id, role) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'owner'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'admin'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'manager'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', 'member'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', 'member'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000f', 'member'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'member'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'viewer')
on conflict (workspace_id, user_id) do nothing;

-- ----- Projects (deterministic UUIDs p1..p5) -----
insert into public.projects (id, workspace_id, name, description, status, priority, owner_id, member_ids, start_date, due_date, progress, budget, spent, tags) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000001',
   'Customer Portal v2',
   'Rebuild of the customer-facing dashboard with realtime notifications and self-service billing.',
   'active', 'critical',
   '00000000-0000-0000-0000-00000000000b',
   array['00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','00000000-0000-0000-0000-000000000010']::uuid[],
   '2026-08-01', '2026-10-31', 62, 180000, 124500,
   array['frontend','billing','realtime']),

  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000001',
   'Q4 Marketing Campaign',
   'Multi-channel campaign for the November product launch: paid social, email, content partnerships.',
   'active', 'high',
   '00000000-0000-0000-0000-00000000000f',
   array['00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000e','00000000-0000-0000-0000-00000000000f','00000000-0000-0000-0000-000000000011']::uuid[],
   '2026-09-01', '2026-11-15', 34, 95000, 41200,
   array['marketing','growth','q4']),

  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000001',
   'Mobile App Rewrite',
   'Migrate the legacy iOS/Android app to a shared React Native codebase with new offline-first sync.',
   'active', 'high',
   '00000000-0000-0000-0000-00000000000d',
   array['00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-000000000010']::uuid[],
   '2026-07-15', '2027-01-20', 41, 220000, 89500,
   array['mobile','react-native','platform']),

  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000001',
   'Data Warehouse Migration',
   'Move analytics pipeline from Postgres + Airflow to a Snowflake + dbt stack with proper observability.',
   'planning', 'medium',
   '00000000-0000-0000-0000-000000000010',
   array['00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-000000000010']::uuid[],
   '2026-10-15', '2027-02-28', 8, 75000, 4200,
   array['data','infrastructure']),

  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-000000000001',
   'Onboarding Refresh',
   'Redesign the first-run experience to lift activation by 15%. Includes new tutorials and in-app guides.',
   'on_hold', 'low',
   '00000000-0000-0000-0000-00000000000c',
   array['00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000e','00000000-0000-0000-0000-00000000000f']::uuid[],
   '2026-06-01', '2026-09-30', 22, 42000, 9800,
   array['ux','growth'])
on conflict (id) do nothing;

-- ----- Tasks (15 templates, distributed across projects) -----
-- Distribution matches lib/data.ts: TASK_TEMPLATES.length=15, projects.length=5,
-- so i%5 picks the project.
--
-- All dates are anchored relative to current_date so daysUntil(...) matches
-- the mock data layer's output for the same calendar day.

insert into public.tasks
  (id, workspace_id, project_id, title, description, status, priority,
   assignee_id, reporter_id, due_date, created_at, updated_at,
   tags, estimated_hours, logged_hours, progress, blocked, blocker_note,
   comments, attachments)
values
  -- i=0: project=p1, status=backlog,   priority=low,    dueOffset=3
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000a1',
   'Design billing summary component',
   'Create a reusable component that displays invoice history and current plan status with consistent spacing.',
   'backlog', 'low',
   '00000000-0000-0000-0000-00000000000b',
   '00000000-0000-0000-0000-00000000000b',
   current_date + 3,  current_date - 10, current_date - 1,
   array['design','billing'], 2, 0, 0, false, null, 0, 0),

  -- i=1: project=p2, status=todo,      priority=medium, dueOffset=4 (3 + 1%12)
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000a2',
   'Implement websocket auth handshake',
   'Use short-lived JWTs validated against the realtime gateway, rotate on disconnect.',
   'todo', 'medium',
   '00000000-0000-0000-0000-00000000000c',
   '00000000-0000-0000-0000-00000000000f',
   current_date + 4,  current_date - 12, current_date - 2,
   array['backend','realtime'], 4, 1, 0, false, null, 1, 1),

  -- i=2: project=p3, status=in_progress, priority=medium, dueOffset=5
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000a3',
   'Write integration tests for payment flow',
   'Cover happy path plus the 3 most common failure modes (declined card, expired session, currency mismatch).',
   'in_progress', 'medium',
   '00000000-0000-0000-0000-00000000000b',
   '00000000-0000-0000-0000-00000000000d',
   current_date + 5,  current_date - 14, current_date - 3,
   array['testing','billing'], 6, 2, 42, false, null, 2, 2),

  -- i=3: project=p4, status=in_progress, priority=high,   dueOffset=6 (3 + 3%12)
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000a4',
   'Set up Meta Pixel + GA4 for landing pages',
   'Wire conversion events through GTM, double-check consent mode v2 defaults for EU.',
   'in_progress', 'high',
   '00000000-0000-0000-0000-00000000000b',
   '00000000-0000-0000-0000-000000000010',
   current_date + 6,  current_date - 16, current_date - 4,
   array['marketing','analytics'], 8, 3, 55, false, null, 3, 0),

  -- i=4: project=p5, status=in_review,  priority=high,   dueOffset=7
  ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000a5',
   'Refactor auth middleware to use opaque tokens',
   'Stop storing session data in JWTs; move to a Redis-backed lookup keyed by token id.',
   'in_review', 'high',
   '00000000-0000-0000-0000-00000000000c',
   '00000000-0000-0000-0000-00000000000c',
   current_date + 7,  current_date - 18, current_date - 5,
   array['backend','security'], 10, 4, 85, false, null, 4, 1),

  -- i=5: project=p1, status=done,       priority=urgent, dueOffset=0 (done: -|i-4| = -1)
  ('00000000-0000-0000-0000-0000000000b6', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000a1',
   'Audit accessibility of the new dashboard',
   'Run through the 5 critical flows with VoiceOver and keyboard only. Document any failures.',
   'done', 'urgent',
   '00000000-0000-0000-0000-00000000000d',
   '00000000-0000-0000-0000-00000000000b',
   current_date - 1,  current_date - 20, current_date - 1,
   array['a11y','ux'], 12, 12, 100, false, null, 5, 2),

  -- i=6: project=p2, status=done,       priority=low,    dueOffset=-2 (i%7===0)
  ('00000000-0000-0000-0000-0000000000b7', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000a2',
   'Spike: offline-first sync strategy',
   'Compare CRDT vs operational transform approaches for the new mobile sync layer. One-week decision doc.',
   'done', 'low',
   '00000000-0000-0000-0000-00000000000e',
   '00000000-0000-0000-0000-00000000000f',
   current_date - 2,  current_date - 22, current_date - 1,
   array['mobile','research'], 2, 2, 100, false, null, 0, 2),

  -- i=7: project=p3, status=backlog,    priority=medium, dueOffset=10 (3 + 7%12)
  ('00000000-0000-0000-0000-0000000000b8', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000a3',
   'Prepare launch announcement blog post',
   'Draft + iterate with PM, finalize by EOD Wednesday for marketing review.',
   'backlog', 'medium',
   '00000000-0000-0000-0000-00000000000d',
   '00000000-0000-0000-0000-00000000000d',
   current_date + 10, current_date - 24, current_date - 2,
   array['marketing','content'], 4, 1, 0, true,
   'Waiting on legal review of new T&Cs', 1, 0),

  -- i=8: project=p4, status=todo,       priority=high,   dueOffset=-2 (i%7===0)
  ('00000000-0000-0000-0000-0000000000b9', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000a4',
   'Fix flaky notification test in CI',
   'The ''reconnect after server restart'' test is green locally, red on CI 30% of runs.',
   'todo', 'high',
   '00000000-0000-0000-0000-00000000000b',
   '00000000-0000-0000-0000-000000000010',
   current_date - 2,  current_date - 26, current_date - 3,
   array['backend','testing'], 6, 2, 0, false, null, 2, 1),

  -- i=9: project=p5, status=in_progress, priority=urgent, dueOffset=1 (i%5===0)
  ('00000000-0000-0000-0000-0000000000ba', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000a5',
   'Migrate onboarding copy to CMS',
   'Pull all hardcoded strings into Contentful so localization can ship without a release.',
   'in_progress', 'urgent',
   '00000000-0000-0000-0000-00000000000e',
   '00000000-0000-0000-0000-00000000000c',
   current_date + 1,  current_date - 28, current_date - 4,
   array['frontend','i18n'], 8, 3, 65, false, null, 3, 0),

  -- i=10: project=p1, status=in_review, priority=low,    dueOffset=13 (3 + 10%12)
  ('00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000a1',
   'Draft RFC: dbt project structure',
   'Propose a 3-package layout (staging, marts, snapshots) with naming conventions and ownership rules.',
   'in_review', 'low',
   '00000000-0000-0000-0000-00000000000b',
   '00000000-0000-0000-0000-00000000000b',
   current_date + 13, current_date - 30, current_date - 5,
   array['data','docs'], 2, 0, 85, false, null, 4, 0),

  -- i=11: project=p2, status=in_progress, priority=medium, dueOffset=14 (3 + 11%12)
  ('00000000-0000-0000-0000-0000000000bc', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000a2',
   'Design empty states for tasks view',
   'Three empty states: no projects, no tasks, all tasks completed. Each needs a different nudge.',
   'in_progress', 'medium',
   '00000000-0000-0000-0000-00000000000c',
   '00000000-0000-0000-0000-00000000000f',
   current_date + 14, current_date - 32, current_date - 1,
   array['design','ux'], 4, 1, 50, false, null, 5, 1),

  -- i=12: project=p3, status=done,      priority=high,   dueOffset=-8 (done: -|i-4| = -8)
  ('00000000-0000-0000-0000-0000000000bd', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000a3',
   'Add error boundary to dashboard routes',
   'Currently a render error takes down the whole shell. Wrap each route segment independently.',
   'done', 'high',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-00000000000d',
   current_date - 8,  current_date - 34, current_date - 2,
   array['frontend','reliability'], 6, 6, 100, false, null, 0, 0),

  -- i=13: project=p4, status=backlog,   priority=urgent, dueOffset=4 (3 + 13%12 = 3+1)
  ('00000000-0000-0000-0000-0000000000be', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000a4',
   'Review API rate-limit thresholds',
   'Are our current limits matching real usage? Pull last 30d of 429s by endpoint.',
   'backlog', 'urgent',
   '00000000-0000-0000-0000-00000000000b',
   '00000000-0000-0000-0000-000000000010',
   current_date + 4,  current_date - 36, current_date - 1,
   array['backend','ops'], 8, 2, 0, false, null, 1, 1),

  -- i=14: project=p5, status=todo,      priority=low,    dueOffset=5 (3 + 14%12 = 3+2)
  ('00000000-0000-0000-0000-0000000000bf', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000a5',
   'Build usage telemetry for new feature',
   'Define 3 events, get PM sign-off, instrument in code, validate in staging before release.',
   'todo', 'low',
   '00000000-0000-0000-0000-00000000000f',
   '00000000-0000-0000-0000-00000000000c',
   current_date + 5,  current_date - 38, current_date - 2,
   array['product','analytics'], 2, 0, 0, false, null, 2, 2)
on conflict (id) do nothing;

-- ----- Activity log (insert manually since trigger only fires on task INSERT/UPDATE) -----
insert into public.activity_log (workspace_id, actor_id, type, target_type, target_id, target_title, message, created_at) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'task_completed',  'task',    '00000000-0000-0000-0000-0000000000b6', 'Audit accessibility of the new dashboard',     'marked complete',                       now() - interval '1 hour'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', 'task_assigned',   'task',    '00000000-0000-0000-0000-0000000000bd', 'Add error boundary to dashboard routes',      'assigned to Pham Thanh Dat',            now() - interval '5 hours'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000f', 'comment_added',   'task',    '00000000-0000-0000-0000-0000000000b8', 'Prepare launch announcement blog post',       'left 3 comments',                       now() - interval '12 hours'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'deadline_missed', 'task',    '00000000-0000-0000-0000-0000000000b9', 'Fix flaky notification test in CI',          'missed the deadline by 2 days',          now() - interval '1 day'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'status_changed',  'project', '00000000-0000-0000-0000-0000000000a1', 'Customer Portal v2',                          'moved to in-review phase',                now() - interval '1 day 6 hours'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', 'task_created',    'task',    '00000000-0000-0000-0000-0000000000bc', 'Design empty states for tasks view',         'created a new task',                      now() - interval '1 day 12 hours')
on conflict do nothing;

-- ----- Notifications (owner u1) -----
insert into public.notifications (user_id, type, title, body, link, read, created_at) values
  ('00000000-0000-0000-0000-00000000000a', 'deadline', 'Task overdue',
   'Fix flaky notification test in CI was due 2 days ago.', '/tasks', false, now() - interval '3 hours'),
  ('00000000-0000-0000-0000-00000000000a', 'mention',  'Phuong Le mentioned you',
   'On ''Audit accessibility of the new dashboard'' — can you take a look at the keyboard order?', '/tasks', false, now() - interval '10 hours'),
  ('00000000-0000-0000-0000-00000000000a', 'assigned', 'New task assigned',
   'Add error boundary to dashboard routes — due Friday.', '/tasks', true, now() - interval '1 day 5 hours'),
  ('00000000-0000-0000-0000-00000000000a', 'blocked',  'Task blocked',
   'Prepare launch announcement blog post is waiting on legal review.', '/tasks', true, now() - interval '2 days')
on conflict do nothing;
