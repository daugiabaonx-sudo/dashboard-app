import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:3000';
const USER_EMAIL = 'minhanh@sunext.io';
const PASSWORD = 'test-password-123';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

page.on('console', (msg) => console.log('[browser]', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('[pageerror]', err.message));
page.on('websocket', (ws) => {
  console.log('[ws]', ws.url());
  ws.on('framesent', (f) => console.log('[ws->]', f.payload?.toString()?.slice(0, 200)));
  ws.on('framereceived', (f) => console.log('[ws<-]', f.payload?.toString()?.slice(0, 300)));
  ws.on('close', () => console.log('[ws close]'));
});
page.on('request', (req) => {
  if (req.url().includes('realtime') || req.url().includes('socket')) {
    console.log('[req]', req.method(), req.url());
  }
});
page.on('response', (res) => {
  if (res.url().includes('realtime') || res.url().includes('socket')) {
    console.log('[res]', res.status(), res.url());
  }
});

console.log('Step 1: /login');
await page.goto(`${URL}/login`, { waitUntil: 'networkidle' });

console.log('Step 2: fill login');
await page.locator('input[name="email"]').fill(USER_EMAIL);
await page.locator('input[name="password"]').fill(PASSWORD);

console.log('Step 3: click submit');
await page.locator('button[type="submit"]').click();

console.log('Step 4: wait for navigation');
try {
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 10000 });
  console.log('Step 4: navigated to', page.url());
} catch (e) {
  console.log('Step 4: navigation timeout, current url:', page.url());
}

console.log('Step 5: navigate to /tasks?view=board');
await page.goto(`${URL}/tasks?view=board`, { waitUntil: 'networkidle' }).catch(() => {});
console.log('Step 5: page url:', page.url());

console.log('Step 6: wait 8s for realtime events');
await page.waitForTimeout(8000);

console.log('---DONE---');
await browser.close();
