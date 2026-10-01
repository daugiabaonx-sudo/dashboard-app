import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const frames = [];
page.on('websocket', (ws) => {
  console.log('[WS OPEN]');
  ws.on('framereceived', (f) => {
    const text = f.payload?.toString()?.slice(0, 600);
    frames.push({ time: Date.now(), text });
    console.log('[WS<-]', text);
  });
});
await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' });
await page.locator('input[name="email"]').fill('minhanh@sunext.io');
await page.locator('input[name="password"]').fill('test-password-123');
await page.locator('button[type="submit"]').click();
try { await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 10000 }); } catch(e){}
await page.goto('http://127.0.0.1:3000/tasks?view=board', { waitUntil: 'networkidle' });
console.log('On tasks page:', page.url());

// Wait for Subscribed to PostgreSQL frames
await new Promise(r => setTimeout(r, 5000));

const subs = execSync(`docker compose -f /Users/daugiabao/Documents/SUNEXT/Dashboard/dashboard-app/docker-compose.yml exec -T db psql -U supabase_admin -d postgres -c "select count(*) from realtime.subscription"`, { encoding: 'utf8' });
console.log('SUBS COUNT:', subs.trim());

const before = frames.length;
console.log(`=== TRIGGERING UPDATE ===`);
// Use the API path through Next.js by directly updating via SQL since the page is the only listener
execSync(`docker compose -f /Users/daugiabao/Documents/SUNEXT/Dashboard/dashboard-app/docker-compose.yml exec -T db psql -U supabase_admin -d postgres -c "update public.tasks set status = case when status='done' then 'todo' else 'done' end, updated_at = now() where id='00000000-0000-0000-0000-0000000000b2' returning id, status, updated_at"`, { encoding: 'utf8' });
await new Promise(r => setTimeout(r, 6000));
console.log(`=== NEW FRAMES: ${frames.length - before} ===`);
frames.slice(before).forEach((f, i) => console.log(`[${i} @ +${f.time - frames[before-1].time}ms] ${f.text}`));

const subs2 = execSync(`docker compose -f /Users/daugiabao/Documents/SUNEXT/Dashboard/dashboard-app/docker-compose.yml exec -T db psql -U supabase_admin -d postgres -c "select count(*) from realtime.subscription"`, { encoding: 'utf8' });
console.log('SUBS COUNT after:', subs2.trim());
const slot = execSync(`docker compose -f /Users/daugiabao/Documents/SUNEXT/Dashboard/dashboard-app/docker-compose.yml exec -T db psql -U supabase_admin -d postgres -c "select confirmed_flush_lsn from pg_replication_slots"`, { encoding: 'utf8' });
console.log('SLOT LSN:', slot.trim());

await browser.close();
