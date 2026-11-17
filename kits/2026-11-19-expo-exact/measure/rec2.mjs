import { chromium } from '/home/claude/ex/repo/node_modules/playwright-core/index.mjs';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-proxy-server']});
const p=await (await b.newContext({viewport:{width:420,height:760},deviceScaleFactor:2})).newPage();
await p.goto('http://127.0.0.1:8790/',{waitUntil:'load'}); await p.waitForTimeout(1200);
let n=0; const shot=async(rep=1)=>{for(let i=0;i<rep;i++) await p.screenshot({path:`/home/claude/ex/foot/web/${String(n++).padStart(4,'0')}.png`});};
await shot(4);
const inp=p.locator('input:not([type=checkbox])').first();
for (const t of ['Buy milk','Walk the dog','Call mom']){ await inp.click(); for(const ch of t){ await inp.press(ch===' '?'Space':ch); await shot(1);} await p.getByText('Add',{exact:true}).click(); await p.waitForTimeout(150); await shot(4);}
const boxes=p.locator('input[type=checkbox]'); await boxes.nth(0).click(); await p.waitForTimeout(150); await shot(5); await boxes.nth(2).click(); await p.waitForTimeout(150); await shot(5);
await p.getByText('Delete').nth(0).click(); await p.waitForTimeout(200); await shot(8);
await b.close(); console.log('frames',n);
