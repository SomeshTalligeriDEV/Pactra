/** Development-only wallet adapter selected by vite.config.ts for local demos.
 * Uses a PUBLIC deterministic test identity. It signs real local transactions
 * after an explicit confirmation. Never bundled into the production console.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { createWalletClient, defineChain, http, keccak256, stringToHex, decodeFunctionData, parseAbi, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ARC } from '@pactra/fixtures';
import { MandateRegistryAbi, TreeVaultAbi } from '../../../daemon/src/abi.gen.ts';

const enabled = import.meta.env.DEV && Number(ARC.chainId) === 31337 && new URL(ARC.rpc).hostname === '127.0.0.1';
if (!enabled) throw new Error('Local test wallet is only permitted on the isolated loopback demo');
const account=privateKeyToAccount(keccak256(stringToHex('pactra:publication-local-test:0')));
const chain=defineChain({id:31337,name:'Local Anvil demo',nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},rpcUrls:{default:{http:[ARC.rpc]}}});
const signer=createWalletClient({account,chain,transport:http(ARC.rpc)});
const Context=createContext<any>(null);
const store='pactra.local-demo.connected';
export function PrivyProvider({children}: {children:ReactNode;[key:string]:unknown}) {
 const [connected,setConnected]=useState(()=>sessionStorage.getItem(store)==='yes');
 const [pending,setPending]=useState<any>(null);
 const [busy,setBusy]=useState(false);
 const provider=useMemo(()=>({request:async({method,params=[]}: {method:string;params?:any[]})=>{
  if(method==='eth_accounts'||method==='eth_requestAccounts')return [account.address];
  if(method==='eth_chainId')return '0x7a69';
  if(method==='wallet_switchEthereumChain'){if(params[0]?.chainId!=='0x7a69')throw new Error('Local chain only');return null;}
  if(method==='eth_sendTransaction') {
   const tx=params[0];if(tx.from?.toLowerCase()!==account.address.toLowerCase())throw new Error('Wrong local signer');
   let action='Contract transaction';
   for(const abi of [MandateRegistryAbi,TreeVaultAbi,parseAbi(['function approve(address,uint256) returns (bool)'])]) {
    try{action=decodeFunctionData({abi,data:tx.data}).functionName;break;}catch{}
   }
   return await new Promise((resolve,reject)=>setPending({tx,action,resolve,reject}));
  }
  const response=await fetch(ARC.rpc,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  const body=await response.json();if(body.error)throw new Error(body.error.message);return body.result;
 }}),[]);
 const sign=async()=>{
  if(!pending||busy)return;setBusy(true);
  try {
   const tx=pending.tx;
   const hash=await signer.sendTransaction({to:tx.to,data:tx.data as Hex,value:BigInt(tx.value||0),...(tx.gas?{gas:BigInt(tx.gas)}:{})});
   const log=JSON.parse(sessionStorage.getItem('pactra.local-demo.transactions')||'[]');log.push({action:pending.action,hash,from:account.address,to:tx.to});sessionStorage.setItem('pactra.local-demo.transactions',JSON.stringify(log));
   pending.resolve(hash);
  }catch(e){pending.reject(e);}finally{setPending(null);setBusy(false);}
 };
 const wallet=useMemo(()=>({address:account.address,switchChain:async(id:number)=>{if(id!==31337)throw new Error('Local chain only');},getEthereumProvider:async()=>provider}),[provider]);
 return <Context.Provider value={{ready:true,authenticated:connected,user:connected?{wallet:{address:account.address}}:null,login:()=>{sessionStorage.setItem(store,'yes');setConnected(true);},logout:()=>{sessionStorage.removeItem(store);setConnected(false);},wallets:connected?[wallet]:[]}}>
  {children}
  {pending&&<div role="dialog" aria-modal="true" aria-label="Local wallet confirmation" style={{position:'fixed',inset:0,zIndex:99999,background:'#111827aa',display:'grid',placeItems:'center'}}>
   <div style={{background:'#faf8f4',color:'#242433',padding:36,borderRadius:20,width:530,boxShadow:'0 20px 90px #0006'}}>
    <p style={{fontSize:13,letterSpacing:2}}>LOCAL TEST WALLET · CHAIN 31337</p>
    <h2 style={{fontSize:30,margin:'16px 0'}}>Sign {pending.action} transaction</h2>
    <p>A real signed transaction on isolated Anvil. Mock funds only.</p>
    <p style={{marginTop:24}}>From</p><code style={{fontSize:13}}>{account.address}</code>
    <p>Contract</p><code style={{fontSize:13}}>{pending.tx.to}</code>
    <div style={{display:'flex',gap:16,marginTop:28}}>
     <button disabled={busy} onClick={()=>{pending.reject(new Error('User rejected the local transaction'));setPending(null);}} style={{padding:'12px 24px'}}>Reject</button>
     <button disabled={busy} onClick={()=>void sign()} style={{padding:'12px 24px',background:'#553777',color:'white',border:0,borderRadius:8}}>{busy?'Signing…':'Confirm local transaction'}</button>
    </div>
   </div>
  </div>}
 </Context.Provider>;
}
export function usePrivy(){return useContext(Context);}
export function useWallets(){return {wallets:useContext(Context)?.wallets||[]};}
