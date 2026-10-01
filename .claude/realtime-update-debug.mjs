import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:3000';
const USER_EMAIL = 'minhanh@sunext.io';
const PASSWORD = 'test-password-123';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const frames = [];
page.on('websocket', (ws) => {
  ws.on('framereceived', (f) => {
    const txt = f.payload?.toString() ?? '';
    if (txt.includes('postgres_changes')) frames.push(txt.slice(0, 200));
  });
});

console.log('Step 1: /login');
await page.goto(`${URL}/login`, { waitUntil: 'networkidle' });
await page.locator('input[name="email"]').fill(USER_EMAIL);
await page.locator('input[name="password"]').fill(PASSWORD);
await page.locator('button[type="submit"]').click();
try {
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 10000 });
} catch (e) { console.log('nav timeout'); }

console.log('Step 2: /tasks?view=board');
await page.goto(`${URL}/tasks?view=board`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// 1) Read sub count via direct psql
const { execSync } = await import('child_process');
const subs1 = execSync(`docker exec sunext-db psql -U supabase_admin -d postgres -t -c "select count(*) from realtime.subscription"`).toString().trim();
console.log('SUBS before:', subs1);

// 2) Trigger UPDATE
console.log('UPDATE');
execSync(`docker exec sunext-db psql -U supabase_admin -d postgres -c "update public.tasks set status = status where id = '00000000-0000-0000-0000-0000000000b2'"`).toString().trim();

// 3) Wait 5s, watch frames
await page.waitForTimeout(5000);
console.log('FRAMES:', frames.length);
for (const f of frames) console.log(' -', f);

// 4) Read subs + slot LSN
const subs2 = execSync(`docker exec sunext-db psql -U supabase_admin -d postgres -t -c "select count(*) from realtime.subscription"`).toString().trim();
const lsn = execSync(`docker exec sunext-db psql -U supabase_admin -d postgres -t -c "select confirmed_flush_lsn from pg_replication_slots where slot_name='supabase_realtime_replication_slot_'"`).toString().trim();
console.log('SUBS after:', subs2);
console.log('SLOT LSN:', lsn);

await browser.close();
