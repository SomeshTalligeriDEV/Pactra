/** Isolated demonstration: real Pactra bytecode, local Anvil, mock token/Gateway.
 * No external transactions or configured wallet credentials are used. */
import { startChain, ERC20, localTestKey } from '../../packages/daemon/test/harness.ts';
import { MandateRegistryAbi, TreeVaultAbi } from '../../packages/daemon/src/abi.gen.ts';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const world = await startChain(8659);
process.on('uncaughtException', error => { world.kill(); console.error(error.message); process.exit(1); });
const { asOwner, owner, publicClient, registry, vault, usdc } = world;
const send = async (address: any, abi: any, functionName: any, args: any[]) => {
  const hash = await asOwner.writeContract({address, abi, functionName, args} as any);
  return await publicClient.waitForTransactionReceipt({hash});
};
const operator=world.walletFor(localTestKey(1));
const seller='0x0000000000000000000000000000000000000123';
await send(usdc,ERC20,'mint',[owner.address,50_000_000n]);
let root: any = null;
let children: any[]=[];
const discover=async()=>{
 const logs=await publicClient.getContractEvents({address:registry,abi:MandateRegistryAbi,eventName:'MandateOpened',fromBlock:0n});
 root=(logs[0] as any)?.args.node;
 const spawned=await publicClient.getContractEvents({address:registry,abi:MandateRegistryAbi,eventName:'MandateSpawned',fromBlock:0n});
 children=spawned.map((log:any)=>log.args.node);
};
const draw=async(node:any,amount:bigint)=>{
 const hash=await operator.writeContract({address:vault,abi:TreeVaultAbi,functionName:'draw',args:[node,seller,amount]});
 await publicClient.waitForTransactionReceipt({hash});
};
let loopDone=false;
const server=createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:5375');
 res.setHeader('Content-Type','application/json');
 try {
  await discover();
  if(req.method==='POST' && req.url==='/work'){
   if(children.length!==3) throw new Error('Create three workers in the connected wallet UI first');
   await draw(children[1],350000n);await draw(children[2],420000n);
  }
  if(req.method==='POST' && req.url==='/loop' && !loopDone){
   if(children.length!==3) throw new Error('Create three workers first');
   loopDone=true;
   for(let i=0;i<7;i++) await draw(children[0],510000n);
  }
  const spent=root ? await publicClient.readContract({address:vault,abi:TreeVaultAbi,functionName:'lifetimeSpent',args:[root]}) : 0n;
  res.end(JSON.stringify({environment:'Local Anvil; mock token and Gateway',root,children,operator:operator.account.address,loopDone,rootSpent6:String(spent)}));
 }catch(e){res.statusCode=500;res.end(JSON.stringify({error:String(e)}));}
});
server.listen(8660,'127.0.0.1');
const temporary=mkdtempSync(join(tmpdir(),'pactra-local-demo-'));
const config=join(temporary,'public-config.json');
writeFileSync(config,JSON.stringify({rpc:world.rpc,owner:owner.address,registry,vault,record:world.record,usdc,identity:world.identity,reputation:world.reputation}));
const vite=spawn('npm',['run','dev','--','--host','127.0.0.1'],{cwd:new URL('../../packages/console/',import.meta.url),env:{...process.env,PORT:'5375',VITE_PRIVY_APP_ID:'local-demo',PACTRA_LOCAL_DEMO_CONFIG:config},stdio:'inherit'});
console.log('Local demo: http://127.0.0.1:5375/console/ — POST http://127.0.0.1:8660/loop runs seven real local draws.');
const stop=()=>{vite.kill();world.kill();server.close();process.exit(0);};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
