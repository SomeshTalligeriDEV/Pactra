// Capture actual application screens. The local demo must be running first.
const { chromium } = require(process.env.PACTRA_PLAYWRIGHT || 'playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const out=path.resolve(__dirname,'media');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PACTRA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:720},reducedMotion:'reduce'});
 page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));const shots={};
 async function shot(scene){await page.waitForTimeout(800);(shots[scene]??=[]).push(`${scene}-${shots[scene]?.length||0}.png`);await (scene==='paid'?page.locator('#buy .buy'):page).screenshot({path:path.join(out,shots[scene].at(-1))});}
 async function go(url){await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForTimeout(1400);}
 const site=process.env.PACTRA_SITE_URL||'http://127.0.0.1:5274';const consoleUrl='http://127.0.0.1:5375/console';
 await go(site);await shot('intro');
 const initial=await (await page.request.get('http://127.0.0.1:8660/')).json();
 await go(consoleUrl+'/new?operator='+initial.operator);
 await page.getByRole('button',{name:'Connect wallet',exact:true}).first().click();
 await page.getByRole('button',{name:'Sign mandate',exact:true}).waitFor();
 const numbers=page.locator('input[type="number"]');
 for(const [i,value] of ['20','100','5','35','3'].entries())await numbers.nth(i).fill(value);
 await shot('wallet');
 await page.getByRole('button',{name:'Sign mandate',exact:true}).click();
 await page.getByRole('button',{name:'Confirm local transaction',exact:true}).waitFor();await shot('wallet');
 await page.getByRole('button',{name:'Confirm local transaction',exact:true}).click();
 await page.getByText('Spent this window',{exact:true}).waitFor({timeout:60000});
 await go(consoleUrl+'/');
 await page.getByRole('button',{name:'Fund vault',exact:true}).click();
 await page.getByRole('dialog').locator('input').fill('20');
 await page.getByRole('dialog').getByRole('button',{name:'Fund $20.00',exact:true}).click();
 for(let i=0;i<2;i++) {
  await page.getByRole('button',{name:'Confirm local transaction',exact:true}).waitFor({timeout:60000});
  await shot('wallet');await page.getByRole('button',{name:'Confirm local transaction',exact:true}).click();
  await page.waitForTimeout(1000);
 }
 await page.waitForTimeout(6000);
 for(let i=0;i<3;i++){
  await page.getByRole('button',{name:'Spawn agent',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Spawn an agent',exact:true});
  await dialog.locator('input').first().fill(initial.operator);
  await dialog.getByRole('button',{name:'Spawn agent',exact:true}).click();
  await page.getByRole('button',{name:'Confirm local transaction',exact:true}).waitFor({timeout:60000});
  if(i===0)await shot('wallet');
  await page.getByRole('button',{name:'Confirm local transaction',exact:true}).click();
  await page.waitForTimeout(6000);
 }
 const work=await page.request.post('http://127.0.0.1:8660/work');assert(work.ok(),await work.text());
 await go(consoleUrl+'/');await page.getByText('Spent this window',{exact:true}).waitFor();assert((await page.locator('body').innerText()).includes('$0.77'));await shot('overview');
 await page.getByText('Mandate terms',{exact:true}).scrollIntoViewIfNeeded();await shot('overview');
 await go(consoleUrl+'/agents');await page.getByText('All 4',{exact:true}).waitFor();await shot('tree');await page.getByText('Tree',{exact:true}).click();await shot('tree');
 await go(site+'/#buy');await page.locator('#buy .buy').scrollIntoViewIfNeeded();await page.locator('#buy .buy__tab[data-tone="paid"]').click();
 const pause=page.getByRole('button',{name:'Pause',exact:true});if(await pause.count())await pause.click();
 for(const i of [0,2,4,6]){await page.locator('#buy .buy__step').nth(i).click();await shot('paid');}
 const response=await page.request.post('http://127.0.0.1:8660/loop');assert(response.ok());const actual=await response.json();assert.equal(actual.rootSpent6,'3830000');
 await go(consoleUrl+'/');await page.getByText('$3.83',{exact:false}).first().waitFor();await shot('loop');
 await go(consoleUrl+'/agents');await page.getByText('All 4',{exact:true}).waitFor();await shot('loop');
 await go(consoleUrl+'/refusals');await page.getByText('concentration',{exact:true}).first().waitFor();await shot('refusal');
 await page.getByText('concentration',{exact:true}).first().click();await shot('refusal');
 const signed=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('pactra.local-demo.transactions')||'[]'));assert(signed.length>=6);
 for(const tx of signed){
  const response=await page.request.post('http://127.0.0.1:8659',{data:{jsonrpc:'2.0',id:1,method:'eth_getTransactionReceipt',params:[tx.hash]}});
  const {result}=await response.json();assert.equal(result.status,'0x1');assert.equal(result.from.toLowerCase(),tx.from.toLowerCase());
  tx.receiptStatus='success';tx.blockNumber=parseInt(result.blockNumber,16);
 }
 await go(site+'/docs/mcp');await shot('mcp');await page.getByText('pactra_fetch',{exact:true}).scrollIntoViewIfNeeded();await shot('mcp');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'captures.json'),JSON.stringify(shots,null,2)+'\n');
 fs.writeFileSync(path.join(__dirname,'validation.json'),JSON.stringify({screens:Object.values(shots).flat().length,browserErrors:errors,signedTransactions:signed,localState:actual,checks:['Connected local wallet: six browser-signed transactions (open, approve, fund, three spawns)','Root initially charged 770000 base units','Four nodes read from actual local contracts','Paid walkthrough controls exercised','Seven 510000-base-unit requests: six accepted; one concentration refusal','Root final lifetime spent 3830000 base units','Refusal rendered from local contract event','MCP documentation renders']},null,2)+'\n');
 await browser.close();console.log('PASS: actual local contract values, refusal, product controls, '+Object.values(shots).flat().length+' screen captures; no browser exceptions');
})().catch(e=>{console.error(e.message);process.exit(1)});
