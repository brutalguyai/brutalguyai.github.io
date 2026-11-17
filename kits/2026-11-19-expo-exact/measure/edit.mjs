import { chromium } from '/home/claude/ex/repo/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
const F='/home/claude/ex/todo/app.contract'; const orig=fs.readFileSync(F,'utf8');
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-proxy-server']});
const p=await (await b.newContext({viewport:{width:420,height:900},deviceScaleFactor:2})).newPage();
await p.goto('http://127.0.0.1:8765/',{waitUntil:'load'}); await p.waitForTimeout(1500);
const out=[];
for(let i=1;i<=6;i++){
  const word=`Add${i}`; const prev=i==1?'"Add"':`"Add${i-1}"`;
  const src=fs.readFileSync(F,'utf8').replace(/text "Add\d*"/,`text "${word}"`);
  const t0=performance.now(); fs.writeFileSync(F,src);
  await p.waitForFunction(w=>document.body.innerText.includes(w),word,{timeout:20000,polling:'raf'}).catch(()=>{});
  // page may reload: wait until text present after navigation
  for(let k=0;k<200;k++){ try{ if(await p.evaluate(w=>document.body.innerText.includes(w),word)) break;}catch{} await p.waitForTimeout(5);}
  out.push(Math.round(performance.now()-t0)); await p.waitForTimeout(700);
}
if(process.argv[2]) await p.screenshot({path:process.argv[2]});
fs.writeFileSync(F,orig); console.log('edit_to_page_ms',out.join(','));
await b.close();
