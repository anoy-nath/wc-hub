import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Trophy, Radio, CalendarDays, BarChart3, GitBranch, Play, Pause, RotateCcw, Swords, Clock, Flame, RefreshCw, Wifi, WifiOff, Target } from "lucide-react";

/* ====================================================================
   2026 FIFA WORLD CUP — LIVE HUB  (Option A: free feed, no key, no backend)
   On deploy it fetches the open openfootball feed; in the chat preview the
   sandbox blocks fetch, so it falls back to the embedded Jun-15 snapshot.
==================================================================== */
const FEED_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
// Faster-updating mirror (same schema):
// const FEED_URL = "https://raw.githubusercontent.com/upbound-web/worldcup-live.json/main/2026/worldcup.json";
const REFRESH_MS = 60000;

const RANK = {
  Mexico:15,"South Korea":22,Czechia:44,"South Africa":61,Canada:30,"Bosnia & Herz.":74,Qatar:52,Switzerland:20,
  Scotland:38,Morocco:12,Brazil:5,Haiti:85,USA:14,Australia:26,"Türkiye":25,Paraguay:39,
  Germany:9,Ecuador:24,"Ivory Coast":40,"Curaçao":82,Netherlands:7,Japan:17,Sweden:33,Tunisia:45,
  Belgium:8,Iran:18,Egypt:36,"New Zealand":86,Spain:3,Uruguay:11,"Saudi Arabia":58,"Cape Verde":70,
  France:2,Senegal:19,Norway:28,Iraq:55,Argentina:1,Austria:23,Algeria:37,Jordan:64,
  Portugal:6,Colombia:13,"DR Congo":56,Uzbekistan:50,England:4,Croatia:10,Ghana:48,Panama:42,
};
const FLAG = {
  Mexico:"🇲🇽","South Korea":"🇰🇷",Czechia:"🇨🇿","South Africa":"🇿🇦",Canada:"🇨🇦","Bosnia & Herz.":"🇧🇦",Qatar:"🇶🇦",Switzerland:"🇨🇭",
  Scotland:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",Morocco:"🇲🇦",Brazil:"🇧🇷",Haiti:"🇭🇹",USA:"🇺🇸",Australia:"🇦🇺","Türkiye":"🇹🇷",Paraguay:"🇵🇾",
  Germany:"🇩🇪",Ecuador:"🇪🇨","Ivory Coast":"🇨🇮","Curaçao":"🇨🇼",Netherlands:"🇳🇱",Japan:"🇯🇵",Sweden:"🇸🇪",Tunisia:"🇹🇳",
  Belgium:"🇧🇪",Iran:"🇮🇷",Egypt:"🇪🇬","New Zealand":"🇳🇿",Spain:"🇪🇸",Uruguay:"🇺🇾","Saudi Arabia":"🇸🇦","Cape Verde":"🇨🇻",
  France:"🇫🇷",Senegal:"🇸🇳",Norway:"🇳🇴",Iraq:"🇮🇶",Argentina:"🇦🇷",Austria:"🇦🇹",Algeria:"🇩🇿",Jordan:"🇯🇴",
  Portugal:"🇵🇹",Colombia:"🇨🇴","DR Congo":"🇨🇩",Uzbekistan:"🇺🇿",England:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",Croatia:"🇭🇷",Ghana:"🇬🇭",Panama:"🇵🇦",
};
const RK = t => RANK[t] ?? 50;
const FL = t => FLAG[t] || "🏳️";
const ALIAS = {
  "Czech Republic":"Czechia","Korea Republic":"South Korea","Korea, South":"South Korea","IR Iran":"Iran",
  "United States":"USA","United States of America":"USA","Côte d'Ivoire":"Ivory Coast","Cote d'Ivoire":"Ivory Coast",
  "Bosnia and Herzegovina":"Bosnia & Herz.","Bosnia-Herzegovina":"Bosnia & Herz.","Turkey":"Türkiye",
  "Cabo Verde":"Cape Verde","Congo DR":"DR Congo","Democratic Republic of the Congo":"DR Congo","Curacao":"Curaçao",
};
function normName(n){
  if(!n) return n; if(RANK[n]!=null) return n; if(ALIAS[n]) return ALIAS[n];
  const lo=n.toLowerCase(); const hit=Object.keys(RANK).find(k=>k.toLowerCase()===lo||lo.includes(k.toLowerCase().split(" ")[0])); return hit||n;
}

/* ---------- snapshot fallback ---------- */
const M=(h,a,date,hs=null,as=null,status="SCHED",time="")=>({h,a,date,hs,as,status,time});
const RAW={
  A:{teams:["Mexico","South Korea","Czechia","South Africa"],matches:[
    M("Mexico","South Africa","Jun 11",2,0,"FT","16:00"),M("South Korea","Czechia","Jun 11",2,1,"FT","20:00"),
    M("Czechia","South Africa","Jun 18",null,null,"SCHED","12:00"),M("Mexico","South Korea","Jun 18",null,null,"SCHED","21:00"),
    M("Czechia","Mexico","Jun 24",null,null,"SCHED","21:00"),M("South Africa","South Korea","Jun 24",null,null,"SCHED","21:00")]},
  B:{teams:["Canada","Bosnia & Herz.","Qatar","Switzerland"],matches:[
    M("Canada","Bosnia & Herz.","Jun 12",1,1,"FT","18:00"),M("Qatar","Switzerland","Jun 13",1,1,"FT","15:00"),
    M("Switzerland","Bosnia & Herz.","Jun 18",null,null,"SCHED","15:00"),M("Canada","Qatar","Jun 18",null,null,"SCHED","18:00"),M("Switzerland","Canada","Jun 24"),M("Bosnia & Herz.","Qatar","Jun 24")]},
  C:{teams:["Scotland","Morocco","Brazil","Haiti"],matches:[
    M("Brazil","Morocco","Jun 13",1,1,"FT","21:00"),M("Scotland","Haiti","Jun 13",1,0,"FT","18:00"),
    M("Scotland","Morocco","Jun 19",null,null,"SCHED","15:00"),M("Brazil","Haiti","Jun 19",null,null,"SCHED","18:00"),M("Scotland","Brazil","Jun 24"),M("Morocco","Haiti","Jun 24")]},
  D:{teams:["USA","Australia","Türkiye","Paraguay"],matches:[
    M("USA","Paraguay","Jun 12",4,1,"FT","20:00"),M("Australia","Türkiye","Jun 13",2,1,"FT","21:00"),
    M("USA","Australia","Jun 19",null,null,"SCHED","15:00"),M("Türkiye","Paraguay","Jun 19",null,null,"SCHED","12:00"),M("Türkiye","USA","Jun 25"),M("Paraguay","Australia","Jun 25")]},
  E:{teams:["Germany","Ecuador","Ivory Coast","Curaçao"],matches:[
    M("Germany","Curaçao","Jun 14",7,1,"FT","13:00"),M("Ivory Coast","Ecuador","Jun 14",1,0,"FT","19:00"),
    M("Germany","Ivory Coast","Jun 20",null,null,"SCHED","15:00"),M("Ecuador","Curaçao","Jun 20",null,null,"SCHED","18:00"),M("Ecuador","Germany","Jun 25"),M("Curaçao","Ivory Coast","Jun 25")]},
  F:{teams:["Netherlands","Japan","Sweden","Tunisia"],matches:[
    M("Netherlands","Japan","Jun 14",2,2,"FT","16:00"),M("Sweden","Tunisia","Jun 14",5,1,"FT","22:00"),
    M("Netherlands","Sweden","Jun 20",null,null,"SCHED","15:00"),M("Tunisia","Japan","Jun 20",null,null,"SCHED","12:00"),M("Japan","Sweden","Jun 25"),M("Tunisia","Netherlands","Jun 25")]},
  G:{teams:["Belgium","Iran","Egypt","New Zealand"],matches:[
    M("Belgium","Egypt","Jun 15",null,null,"TODAY","15:00"),M("Iran","New Zealand","Jun 15",null,null,"TODAY","21:00"),
    M("Belgium","Iran","Jun 21",null,null,"SCHED","15:00"),M("New Zealand","Egypt","Jun 21",null,null,"SCHED","18:00"),M("Egypt","Iran","Jun 26"),M("New Zealand","Belgium","Jun 26")]},
  H:{teams:["Spain","Uruguay","Saudi Arabia","Cape Verde"],matches:[
    M("Spain","Cape Verde","Jun 15",null,null,"TODAY","13:00"),M("Saudi Arabia","Uruguay","Jun 15",null,null,"TODAY","18:00"),
    M("Spain","Saudi Arabia","Jun 21",null,null,"SCHED","15:00"),M("Uruguay","Cape Verde","Jun 21",null,null,"SCHED","18:00"),M("Cape Verde","Saudi Arabia","Jun 26"),M("Uruguay","Spain","Jun 26")]},
  I:{teams:["France","Senegal","Norway","Iraq"],matches:[
    M("France","Senegal","Jun 16",null,null,"SCHED","15:00"),M("Iraq","Norway","Jun 16",null,null,"SCHED","18:00"),
    M("France","Iraq","Jun 22"),M("Norway","Senegal","Jun 22"),M("Norway","France","Jun 26"),M("Senegal","Iraq","Jun 26")]},
  J:{teams:["Argentina","Austria","Algeria","Jordan"],matches:[
    M("Argentina","Algeria","Jun 16",null,null,"SCHED","21:00"),M("Austria","Jordan","Jun 16",null,null,"SCHED","12:00"),
    M("Argentina","Austria","Jun 22"),M("Jordan","Algeria","Jun 22"),M("Algeria","Austria","Jun 27"),M("Jordan","Argentina","Jun 27")]},
  K:{teams:["Portugal","Colombia","DR Congo","Uzbekistan"],matches:[
    M("Portugal","DR Congo","Jun 17",null,null,"SCHED","13:00"),M("Uzbekistan","Colombia","Jun 17",null,null,"SCHED","16:00"),
    M("Portugal","Uzbekistan","Jun 23"),M("Colombia","DR Congo","Jun 23"),M("Colombia","Portugal","Jun 27"),M("DR Congo","Uzbekistan","Jun 27")]},
  L:{teams:["England","Croatia","Ghana","Panama"],matches:[
    M("England","Croatia","Jun 17",null,null,"SCHED","15:00"),M("Ghana","Panama","Jun 17",null,null,"SCHED","18:00"),
    M("England","Ghana","Jun 23"),M("Panama","Croatia","Jun 23"),M("Panama","England","Jun 27"),M("Croatia","Ghana","Jun 27")]},
};
const SCORERS={
  "Mexico|South Africa":[{t:"Mexico",n:"Quiñones",m:9},{t:"Mexico",n:"Jiménez",m:67}],
  "South Korea|Czechia":[{t:"South Korea",n:"Hwang In-Beom",m:67},{t:"South Korea",n:"Oh Hyeon-Gyu",m:80},{t:"Czechia",n:"Krejčí",m:59}],
  "Australia|Türkiye":[{t:"Australia",n:"Irankunda",m:27},{t:"Australia",n:"Metcalfe",m:75}],
  "Germany|Curaçao":[{t:"Germany",n:"Havertz",m:45},{t:"Germany",n:"Havertz",m:88},{t:"Germany",n:"Nmecha",m:6},{t:"Germany",n:"Schlotterbeck",m:38},{t:"Germany",n:"Musiala",m:47},{t:"Germany",n:"Undav",m:78},{t:"Curaçao",n:"Comenencia",m:21}],
  "Netherlands|Japan":[{t:"Netherlands",n:"van Dijk",m:51},{t:"Netherlands",n:"Summerville",m:64},{t:"Japan",n:"Nakamura",m:57},{t:"Japan",n:"Kamada",m:88}],
};
const MONTHS={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
const isoStatic=(date,time,off=-4)=>{ if(!date)return null; const [mo,dd]=date.split(" "); const m=MONTHS[mo]; if(m==null)return null;
  const hh=time?+time.split(":")[0]:12, mm=time?+time.split(":")[1]:0; return new Date(Date.UTC(2026,m,+dd,hh-off,mm)).toISOString(); };
function buildStatic(){ const out={};
  Object.keys(RAW).forEach(L=>{ out[L]={teams:RAW[L].teams.slice(),matches:RAW[L].matches.map(m=>({...m,iso:isoStatic(m.date,m.time),t:m.time||"",scorers:SCORERS[`${m.h}|${m.a}`]||[]}))};}); return out; }
function parseFeedTime(t){ if(!t)return{hh:12,mm:0,off:0,hasT:false}; const p=t.trim().split(/\s+/); const[a,b]=p[0].split(":");
  let off=0; if(p[1]&&p[1].startsWith("UTC"))off=parseInt(p[1].slice(3),10)||0; return{hh:parseInt(a,10),mm:parseInt(b||"0",10),off,hasT:true}; }
function parseFeed(j){ if(!j||!Array.isArray(j.matches))return null; const g={};
  j.matches.forEach(mt=>{ const grp=mt.group; if(!grp||!grp.startsWith("Group "))return; const L=grp.replace("Group ","").trim(); if(!/^[A-L]$/.test(L))return;
    const h=normName(mt.team1),a=normName(mt.team2); if(!g[L])g[L]={teams:[],matches:[]};
    [h,a].forEach(t=>{ if(!g[L].teams.includes(t))g[L].teams.push(t); });
    const ft=mt.score&&mt.score.ft, fin=Array.isArray(ft)&&typeof ft[0]==="number";
    const ymd=(mt.date||"").split("-").map(Number), {hh,mm,off,hasT}=parseFeedTime(mt.time);
    let iso=null; if(ymd.length===3)iso=new Date(Date.UTC(ymd[0],ymd[1]-1,ymd[2],hh-off,mm)).toISOString();
    const scorers=[]; (mt.goals1||[]).forEach(x=>scorers.push({t:h,n:x.name,m:x.minute})); (mt.goals2||[]).forEach(x=>scorers.push({t:a,n:x.name,m:x.minute}));
    g[L].matches.push({h,a,iso,t:hasT?mt.time:"",hs:fin?ft[0]:null,as:fin?ft[1]:null,status:fin?"FT":"SCHED",scorers}); });
  return Object.keys(g).filter(L=>g[L].teams.length>=2).length>=12?g:null;
}

/* ---------- viewer-local date/time ---------- */
const fmtT=iso=>iso?new Date(iso).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"";
const fmtD=iso=>iso?new Date(iso).toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"}):"";
const fmtDs=iso=>iso?new Date(iso).toLocaleDateString([],{month:"short",day:"numeric"}):"";
const isToday=iso=>{ if(!iso)return false; const d=new Date(iso),n=new Date(); return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate(); };
const TZ=(()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone;}catch(e){return "local";}})();

/* ---------- model ---------- */
const elo=r=>2000-((r||50)-1)*7.2;
function matchProbs(rH,rA){ const d=elo(rA)-elo(rH),eH=1/(1+Math.pow(10,d/400));
  let pD=0.30*(1-Math.abs(2*eH-1)),pH=eH-pD/2,pA=(1-eH)-pD/2; pH=Math.max(0.01,pH);pA=Math.max(0.01,pA); const s=pH+pD+pA; return{pH:pH/s,pD:pD/s,pA:pA/s}; }
function tableFromMatches(teams,matches){ const t={}; teams.forEach(n=>t[n]={team:n,mp:0,w:0,d:0,l:0,gf:0,ga:0,pts:0,form:[]});
  matches.forEach(m=>{ if(m.status!=="FT"||m.hs==null||!t[m.h]||!t[m.a])return; const H=t[m.h],A=t[m.a];
    H.mp++;A.mp++;H.gf+=m.hs;H.ga+=m.as;A.gf+=m.as;A.ga+=m.hs;
    if(m.hs>m.as){H.w++;A.l++;H.pts+=3;H.form.push("W");A.form.push("L");}
    else if(m.hs<m.as){A.w++;H.l++;A.pts+=3;A.form.push("W");H.form.push("L");}
    else{H.d++;A.d++;H.pts++;A.pts++;H.form.push("D");A.form.push("D");}});
  return teams.map(n=>{const r=t[n];return{...r,gd:r.gf-r.ga};}).sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||RK(a.team)-RK(b.team)); }
function advanceOdds(teams,matches){ const N=1600,base={}; teams.forEach(n=>base[n]={pts:0,gd:0,gf:0});
  matches.forEach(m=>{ if(m.status==="FT"&&m.hs!=null&&base[m.h]&&base[m.a]){ base[m.h].gf+=m.hs;base[m.h].gd+=m.hs-m.as;base[m.a].gf+=m.as;base[m.a].gd+=m.as-m.hs;
    if(m.hs>m.as)base[m.h].pts+=3; else if(m.hs<m.as)base[m.a].pts+=3; else{base[m.h].pts++;base[m.a].pts++;}}});
  const rem=matches.filter(m=>(m.status!=="FT"||m.hs==null)&&base[m.h]&&base[m.a]); const t2={},t3={}; teams.forEach(n=>{t2[n]=0;t3[n]=0;});
  for(let i=0;i<N;i++){ const s={}; teams.forEach(n=>s[n]={...base[n],r:RK(n),team:n});
    rem.forEach(m=>{ const p=matchProbs(RK(m.h),RK(m.a)),x=Math.random(),gh=1+(Math.random()*3|0),ga=1+(Math.random()*3|0);
      if(x<p.pH){s[m.h].pts+=3;s[m.h].gd+=gh;s[m.h].gf+=gh+ga;s[m.a].gd-=gh;} else if(x<p.pH+p.pD){s[m.h].pts++;s[m.a].pts++;}
      else{s[m.a].pts+=3;s[m.a].gd+=ga;s[m.a].gf+=ga+gh;s[m.h].gd-=ga;}});
    const ord=teams.slice().sort((a,b)=>s[b].pts-s[a].pts||s[b].gd-s[a].gd||s[b].gf-s[a].gf||s[a].r-s[b].r); t2[ord[0]]++;t2[ord[1]]++;t3[ord[2]]++; }
  const o={}; teams.forEach(n=>o[n]={adv:Math.round(100*t2[n]/N),third:Math.round(100*t3[n]/N)}); return o; }
function collectScorers(matches){ const map={}; matches.forEach(m=>{ if(m.status!=="FT")return; (m.scorers||[]).forEach(s=>{ const k=s.n+"|"+s.t; if(!map[k])map[k]={n:s.n,t:s.t,g:0}; map[k].g++; });});
  return Object.values(map).sort((a,b)=>b.g-a.g||a.n.localeCompare(b.n)).slice(0,8); }

/* ---------- match simulator (any fixture) ---------- */
const hashSeed=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
const mulberry32=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
function poisson(l,rng){const L=Math.exp(-l);let k=0,p=1;do{k++;p*=rng();}while(p>L);return k-1;}
function genScript(h,a){ const rng=mulberry32(hashSeed(h+"|"+a)); const d=(elo(RK(h))-elo(RK(a)))/420;
  const xgH=Math.max(0.25,1.3*Math.pow(2,d)),xgA=Math.max(0.25,1.3*Math.pow(2,-d));
  let gh=Math.min(5,poisson(xgH,rng)),ga=Math.min(5,poisson(xgA,rng)); const ev=[];
  for(let i=0;i<gh;i++)ev.push({m:1+Math.floor(rng()*89),team:"h"}); for(let i=0;i<ga;i++)ev.push({m:1+Math.floor(rng()*89),team:"a"});
  ev.sort((x,y)=>x.m-y.m); let last=0; ev.forEach(e=>{ if(e.m<=last)e.m=Math.min(90,last+1); last=e.m; }); return ev; }

/* ---------- theme ---------- */
const GOLD="#f5c451",GOLD2="#e0a93a",EM="#10b981",LIVE="#ff3b5c";
const CARD={background:"rgba(255,255,255,0.045)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:16,backdropFilter:"blur(10px)"};
const css=`
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
.wc-scroll::-webkit-scrollbar{height:8px}.wc-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:8px}
.wc-tab{transition:all .18s}.wc-tab:hover{color:#fff}
.wc-card{transition:transform .18s,border-color .18s}.wc-card:hover{transform:translateY(-2px);border-color:rgba(245,196,81,.4)}
.wc-spin{animation:spin 1s linear infinite}
`;
const Flag=({t,s=20})=><span style={{fontSize:s,lineHeight:1}}>{FL(t)}</span>;
const Dot=({r})=>{const c=r==="W"?EM:r==="L"?LIVE:"#9aa3b2";return <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:c,marginRight:3}}/>;};
const btn={display:"inline-flex",alignItems:"center",gap:5,fontSize:12,padding:"6px 11px",borderRadius:9,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",color:"#dfe5ef",cursor:"pointer"};
function ProbBar({pH,pD,pA,hN,aN}){ return(<div>
  <div style={{display:"flex",height:8,borderRadius:6,overflow:"hidden",background:"rgba(255,255,255,.06)"}}><div style={{width:`${pH*100}%`,background:GOLD}}/><div style={{width:`${pD*100}%`,background:"#5a6577"}}/><div style={{width:`${pA*100}%`,background:EM}}/></div>
  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#9aa3b2",marginTop:5}}><span style={{color:GOLD}}>{hN} {Math.round(pH*100)}%</span><span>Draw {Math.round(pD*100)}%</span><span style={{color:EM}}>{Math.round(pA*100)}% {aN}</span></div>
</div>); }

/* ---------- live simulator ---------- */
function useLiveMatch(match,script){
  const [st,setSt]=useState({min:0,hs:0,as:0,running:false,done:false,events:[]});
  const key=match?`${match.grp}|${match.h}|${match.a}`:"none";
  useEffect(()=>{ setSt({min:0,hs:0,as:0,running:false,done:false,events:[]}); },[key]);
  const ref=useRef();
  useEffect(()=>{ if(!st.running||st.done)return;
    ref.current=setInterval(()=>setSt(p=>{ if(p.done)return p; const min=p.min+1; let hs=p.hs,as=p.as,events=p.events;
      const gs=script.filter(e=>e.m===min); if(gs.length){ gs.forEach(e=>{ if(e.team==="h")hs++; else as++; }); events=[...events,{m:min,team:gs[gs.length-1].team,hs,as}]; }
      if(min>=90)return{min:90,hs,as,running:false,done:true,events}; return{...p,min,hs,as,events}; }),120);
    return()=>clearInterval(ref.current); },[st.running,st.done,script]);
  return {st,play:()=>setSt(p=>({...p,running:!p.running})),reset:()=>{clearInterval(ref.current);setSt({min:0,hs:0,as:0,running:false,done:false,events:[]});}};
}
function LiveCard({live,match,pool,onPick}){
  const {st,play,reset}=live;
  const sel={fontSize:12,padding:"5px 9px",borderRadius:9,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",color:"#dfe5ef",maxWidth:240,cursor:"pointer"};
  if(!match) return(<div style={{...CARD,padding:20,color:"#9aa3b2",fontSize:13}}>No upcoming fixtures to simulate right now — check back when the next round is scheduled.</div>);
  const H=match.h,A=match.a,pre=matchProbs(RK(H),RK(A));
  const rem=Math.max(0,(92-st.min)/92),diff=st.hs-st.as;
  let imp=diff>0?0.5+Math.min(.46,.17*diff+.06):diff<0?0.5-Math.min(.46,.17*-diff+.06):0.5;
  let pH=pre.pH*rem+imp*(1-rem),pA=pre.pA*rem+(1-imp)*(1-rem),pD=Math.max(0.02,1-pH-pA); const s=pH+pD+pA; pH/=s;pD/=s;pA/=s;
  if(st.done){pH=diff>0?1:0;pA=diff<0?1:0;pD=diff===0?1:0;}
  return(<div style={{...CARD,padding:"18px 20px",position:"relative",overflow:"hidden",borderColor:st.done?"rgba(255,255,255,.09)":"rgba(255,59,92,.45)"}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:st.done?"#5a6577":LIVE}}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        {st.done?<span style={{fontSize:11,fontWeight:700,color:"#9aa3b2",letterSpacing:1}}>FULL TIME</span>
        :<span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11,fontWeight:700,color:LIVE,letterSpacing:1,animation:st.running?"pulse 1.4s infinite":"none"}}><span style={{width:7,height:7,borderRadius:"50%",background:LIVE,display:"inline-block"}}/>LIVE · {st.min}'</span>}
        <span style={{fontSize:11,color:"#6b7384"}}>Group {match.grp} · simulator</span>
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        <select value={`${match.grp}|${match.h}|${match.a}`} onChange={e=>onPick(e.target.value)} style={sel} title="Pick a match to simulate">
          {pool.map(m=><option key={`${m.grp}|${m.h}|${m.a}`} value={`${m.grp}|${m.h}|${m.a}`} style={{color:"#000"}}>{m.h} v {m.a}</option>)}
        </select>
        <button onClick={play} style={btn}>{st.running?<Pause size={13}/>:<Play size={13}/>}{st.done?"Done":st.running?"Pause":st.min>0?"Resume":"Kick off"}</button>
        <button onClick={reset} style={btn} title="Reset"><RotateCcw size={13}/></button>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:10,marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}><Flag t={H} s={30}/><span style={{fontWeight:600,fontSize:17}}>{H}</span></div>
      <div style={{fontSize:34,fontWeight:800,letterSpacing:2,textAlign:"center",minWidth:90,color:"#fff"}}>{st.hs}<span style={{color:"#4b5365",margin:"0 6px"}}>:</span>{st.as}</div>
      <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"flex-end"}}><span style={{fontWeight:600,fontSize:17}}>{A}</span><Flag t={A} s={30}/></div>
    </div>
    <ProbBar pH={pH} pD={pD} pA={pA} hN={H} aN={A}/>
    {st.events.length>0&&<div style={{marginTop:12,display:"flex",flexWrap:"wrap",gap:6}}>
      {st.events.map((e,i)=>{const tm=e.team==="h"?H:A;return<span key={i} style={{animation:"pop .4s",fontSize:11,padding:"3px 9px",borderRadius:20,background:"rgba(245,196,81,.12)",color:GOLD,border:"1px solid rgba(245,196,81,.25)"}}>⚽ {e.m}' {FL(tm)} {e.hs}-{e.as}</span>;})}
    </div>}
    {st.done&&<div style={{marginTop:10,fontSize:11,color:EM}}>✓ Simulated result locked — Group {match.grp} table & advancement odds recomputed live.</div>}
    {!st.min&&!st.running&&<div style={{marginTop:10,fontSize:11,color:"#6b7384"}}>Pick any fixture above, hit Kick off, and watch the table & odds update as it plays out.</div>}
  </div>);
}

function FixtureRow({m}){
  const finished=m.status==="FT"&&m.hs!=null; const p=matchProbs(RK(m.h),RK(m.a)); const wH=finished&&m.hs>m.as,wA=finished&&m.as>m.hs;
  return(<div style={{padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 64px 1fr",alignItems:"center",gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8,opacity:wA?.5:1}}><Flag t={m.h} s={18}/><span style={{fontSize:14,fontWeight:wH?700:500}}>{m.h}</span></div>
      <div style={{textAlign:"center"}}>
        {finished?<span style={{fontSize:16,fontWeight:800,color:"#fff"}}>{m.hs}-{m.as}</span>:<span style={{fontSize:12,color:"#cdd4e0",fontWeight:600}}>{m.t?fmtT(m.iso):fmtDs(m.iso)}</span>}
        <div style={{fontSize:9,color:"#5f6878",marginTop:1}}>{fmtDs(m.iso)}</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end",opacity:wH?.5:1}}><span style={{fontSize:14,fontWeight:wA?700:500}}>{m.a}</span><Flag t={m.a} s={18}/></div>
    </div>
    {!finished&&<div style={{marginTop:7}}><ProbBar pH={p.pH} pD={p.pD} pA={p.pA} hN={m.h.split(" ")[0]} aN={m.a.split(" ")[0]}/></div>}
  </div>);
}

function GroupCard({letter,teams,matches,odds}){ const table=tableFromMatches(teams,matches);
  return(<div className="wc-card" style={{...CARD,padding:"16px 18px"}}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><div style={{width:30,height:30,borderRadius:9,background:`linear-gradient(135deg,${GOLD},${GOLD2})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#1a1206",fontSize:15}}>{letter}</div><span style={{fontSize:13,fontWeight:600,color:"#cfd6e2"}}>Group {letter}</span></div>
    <div style={{display:"grid",gridTemplateColumns:"18px 1fr 26px 26px 30px",gap:6,fontSize:10,color:"#6b7384",padding:"0 0 6px",fontWeight:600}}><span></span><span>TEAM</span><span style={{textAlign:"center"}}>P</span><span style={{textAlign:"center"}}>GD</span><span style={{textAlign:"center"}}>PTS</span></div>
    {table.map((r,i)=>{const zone=i<2?EM:i===2?GOLD:"#5a6577";return(
      <div key={r.team} style={{display:"grid",gridTemplateColumns:"18px 1fr 26px 26px 30px",gap:6,alignItems:"center",padding:"7px 0",borderTop:"1px solid rgba(255,255,255,.05)"}}>
        <span style={{width:4,height:22,borderRadius:3,background:zone,justifySelf:"start"}}/>
        <div style={{minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:6}}><Flag t={r.team} s={15}/><span style={{fontSize:13,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.team}</span></div>
          <div style={{display:"flex",alignItems:"center",gap:1,marginTop:3,height:8}}>{r.form.slice(-4).map((f,j)=><Dot key={j} r={f}/>)}<span style={{fontSize:9,color:EM,marginLeft:5}}>{odds[r.team]?.adv??0}%</span><span style={{fontSize:9,color:"#5f6878"}}> adv</span></div></div>
        <span style={{textAlign:"center",fontSize:12,color:"#9aa3b2"}}>{r.mp}</span><span style={{textAlign:"center",fontSize:12,color:r.gd>0?EM:r.gd<0?"#d76b7a":"#9aa3b2"}}>{r.gd>0?"+":""}{r.gd}</span><span style={{textAlign:"center",fontSize:14,fontWeight:800,color:GOLD}}>{r.pts}</span>
      </div>);})}
    <details style={{marginTop:8}}><summary style={{fontSize:11,color:"#7d8696",cursor:"pointer",listStyle:"none",display:"flex",alignItems:"center",gap:4}}><CalendarDays size={11}/> Fixtures & results</summary>
      <div style={{marginTop:4}}>{matches.map((m,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"4px 0",color:"#9aa3b2"}}><span>{FL(m.h)} {m.h} v {m.a} {FL(m.a)}</span><span style={{color:m.status==="FT"&&m.hs!=null?"#fff":"#6b7384",fontWeight:m.status==="FT"?700:400}}>{m.status==="FT"&&m.hs!=null?`${m.hs}-${m.as}`:fmtDs(m.iso)}</span></div>)}</div>
    </details>
  </div>);
}

/* ---------- bracket ---------- */
function seedOrder(n){let p=[1,2];while(p.length<n){const s=p.length*2+1,o=[];p.forEach(x=>{o.push(x);o.push(s-x);});p=o;}return p;}
const winner=pair=>RK(pair[0].team)<=RK(pair[1].team)?pair[0]:pair[1];
function buildBracket(q){ const seeded=q.slice().sort((a,b)=>RK(a.team)-RK(b.team)).map((x,i)=>({...x,seed:i+1}));
  const order=seedOrder(32),slots=order.map(s=>seeded[s-1]).filter(Boolean); let round=[]; for(let i=0;i<slots.length;i+=2)round.push([slots[i],slots[i+1]]);
  const rounds=[round]; while(round.length>1){const next=[];for(let i=0;i<round.length;i+=2)next.push([winner(round[i]),winner(round[i+1])]);rounds.push(next);round=next;} return rounds; }
function BracketView({groupTables,odds}){
  const winners=[],runners=[],thirds=[];
  Object.keys(RAW).forEach(L=>{ const t=groupTables[L]; if(!t||t.length<3)return; winners.push({team:t[0].team,tag:"1"+L}); runners.push({team:t[1].team,tag:"2"+L}); thirds.push({team:t[2].team,score:elo(RK(t[2].team))+t[2].pts*40+(odds[L]?.[t[2].team]?.third||0)});});
  const best3=thirds.sort((a,b)=>b.score-a.score).slice(0,8).map(x=>({team:x.team,tag:"3rd"})); const quali=[...winners,...runners,...best3];
  const rounds=useMemo(()=>buildBracket(quali),[JSON.stringify(quali.map(q=>q.team))]);
  if(!rounds.length||!rounds[rounds.length-1][0])return <div style={{color:"#9aa3b2"}}>Building bracket…</div>;
  const names=["Round of 32","Round of 16","Quarter-finals","Semi-finals","Final"],champ=winner(rounds[rounds.length-1][0]);
  const tit=quali.map(q=>({team:q.team,w:Math.exp(elo(RK(q.team))/95)})),sum=tit.reduce((a,b)=>a+b.w,0); const top=tit.map(t=>({team:t.team,p:t.w/sum})).sort((a,b)=>b.p-a.p).slice(0,6);
  return(<div>
    <div style={{...CARD,padding:"14px 18px",marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><Trophy size={16} color={GOLD}/><span style={{fontSize:13,fontWeight:600}}>Projected title odds</span><span style={{fontSize:10,color:"#6b7384"}}>· model estimate</span></div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{top.map(t=><div key={t.team} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 12px",borderRadius:10,background:"rgba(245,196,81,.08)",border:"1px solid rgba(245,196,81,.18)"}}><Flag t={t.team} s={18}/><span style={{fontSize:13,fontWeight:500}}>{t.team}</span><span style={{fontSize:13,fontWeight:800,color:GOLD}}>{Math.round(t.p*100)}%</span></div>)}</div></div>
    <div style={{fontSize:11,color:"#7d8696",marginBottom:10,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><span style={{padding:"2px 8px",borderRadius:6,background:"rgba(255,255,255,.06)",color:GOLD,fontWeight:600}}>PROJECTED</span> Pairings finalize after the group stage. Favourites shown advancing — scroll →</div>
    <div className="wc-scroll" style={{overflowX:"auto",paddingBottom:10}}><div style={{display:"flex",gap:18,minWidth:"max-content"}}>
      {rounds.map((rnd,ri)=>(<div key={ri} style={{display:"flex",flexDirection:"column",justifyContent:"space-around",minWidth:160,gap:ri===0?8:0}}>
        <div style={{fontSize:11,fontWeight:700,color:GOLD,letterSpacing:.5,marginBottom:6,textAlign:"center"}}>{names[ri]}</div>
        {rnd.map((pair,pi)=>{const w=winner(pair);return(<div key={pi} style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{...CARD,padding:"6px 9px",borderRadius:10}}>{pair.map((tm,k)=>{const isW=tm.team===w.team;return(<div key={k} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0",opacity:isW?1:.45}}><Flag t={tm.team} s={14}/><span style={{fontSize:12,fontWeight:isW?700:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tm.team}</span>{tm.tag&&<span style={{marginLeft:"auto",fontSize:8,color:"#5f6878"}}>{tm.tag}</span>}</div>);})}</div>
        </div>);})}
      </div>))}
      <div style={{display:"flex",flexDirection:"column",justifyContent:"center",minWidth:180}}><div style={{fontSize:11,fontWeight:700,color:GOLD,textAlign:"center",marginBottom:6}}>Champion</div>
        <div style={{padding:"18px 14px",borderRadius:14,background:`linear-gradient(135deg,${GOLD},${GOLD2})`,textAlign:"center"}}><Trophy size={22} color="#1a1206"/><div style={{fontSize:30,marginTop:4}}>{FL(champ.team)}</div><div style={{fontSize:15,fontWeight:800,color:"#1a1206",marginTop:2}}>{champ.team}</div><div style={{fontSize:9,color:"#5a4615",marginTop:2}}>NY/NJ · Jul 19</div></div></div>
    </div></div>
  </div>);
}

/* ---------- compare ---------- */
function Compare({teamInfo}){
  const all=Object.keys(RANK).sort(); const [a,setA]=useState("Brazil"),[b,setB]=useState("France");
  const ia=teamInfo[a]||{},ib=teamInfo[b]||{},p=matchProbs(RK(a),RK(b)),lead=RK(a)<RK(b)?a:RK(b)<RK(a)?b:null;
  const sel={fontSize:14,padding:"9px 12px",borderRadius:10,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",color:"#fff",width:"100%"};
  const rows=[
    {label:"FIFA ranking",a:"#"+RK(a),b:"#"+RK(b),na:RK(a),nb:RK(b),dir:"low"},
    {label:"Group",a:ia.group||"—",b:ib.group||"—"},
    {label:"Played",a:ia.mp||0,b:ib.mp||0},
    {label:"Record (W-D-L)",a:`${ia.w||0}-${ia.d||0}-${ia.l||0}`,b:`${ib.w||0}-${ib.d||0}-${ib.l||0}`},
    {label:"Goals for",a:ia.gf||0,b:ib.gf||0,na:ia.gf||0,nb:ib.gf||0,dir:"high"},
    {label:"Goals against",a:ia.ga||0,b:ib.ga||0,na:ia.ga||0,nb:ib.ga||0,dir:"low"},
    {label:"Goal difference",a:(ia.gd>0?"+":"")+(ia.gd||0),b:(ib.gd>0?"+":"")+(ib.gd||0),na:ia.gd||0,nb:ib.gd||0,dir:"high"},
    {label:"Points",a:ia.pts||0,b:ib.pts||0,na:ia.pts||0,nb:ib.pts||0,dir:"high"},
    {label:"Chance to advance",a:(ia.adv??0)+"%",b:(ib.adv??0)+"%",na:ia.adv??0,nb:ib.adv??0,dir:"high"},
  ];
  const better=(r)=>{ if(r.na==null)return null; if(r.na===r.nb)return null; return r.dir==="low"?(r.na<r.nb?"a":"b"):(r.na>r.nb?"a":"b"); };
  const Scorers=({info,name})=>(<div style={{flex:1,minWidth:0}}>
    <div style={{fontSize:12,fontWeight:600,color:"#cfd6e2",marginBottom:8,display:"flex",alignItems:"center",gap:6}}><Flag t={name} s={16}/>{name} · scorers</div>
    {(info.scorers&&info.scorers.length)?info.scorers.map((s,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",color:"#9aa3b2",borderTop:i?"1px solid rgba(255,255,255,.05)":"none"}}><span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.n}</span><span style={{color:GOLD,fontWeight:700}}>{s.g}</span></div>):<div style={{fontSize:12,color:"#6b7384"}}>No goals yet</div>}
  </div>);
  return(<div style={{...CARD,padding:"20px 22px"}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 40px 1fr",gap:12,alignItems:"end",marginBottom:18}}>
      <select value={a} onChange={e=>setA(e.target.value)} style={sel}>{all.map(t=><option key={t} style={{color:"#000"}}>{t}</option>)}</select>
      <span style={{textAlign:"center",fontSize:13,color:"#6b7384",fontWeight:700,paddingBottom:9}}>VS</span>
      <select value={b} onChange={e=>setB(e.target.value)} style={sel}>{all.map(t=><option key={t} style={{color:"#000"}}>{t}</option>)}</select>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
      {[a,b].map((t,i)=><div key={i} style={{textAlign:"center",padding:"14px",borderRadius:12,background:lead===t?"rgba(245,196,81,.1)":"rgba(255,255,255,.03)",border:lead===t?"1px solid rgba(245,196,81,.3)":"1px solid rgba(255,255,255,.06)"}}>
        <Flag t={t} s={34}/><div style={{fontSize:15,fontWeight:600,marginTop:6}}>{t}</div><div style={{fontSize:11,color:"#8a93a3",marginTop:2}}>FIFA #{RK(t)} · Group {(teamInfo[t]||{}).group||"—"}</div>
        {lead===t&&<div style={{fontSize:10,color:GOLD,marginTop:4,fontWeight:700}}>↑ HIGHER RANKED</div>}</div>)}
    </div>
    {/* stat table */}
    <div style={{marginBottom:18}}>{rows.map((r,i)=>{const w=better(r);return(
      <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",padding:"8px 0",borderTop:i?"1px solid rgba(255,255,255,.05)":"none"}}>
        <span style={{textAlign:"right",fontSize:14,fontWeight:w==="a"?800:500,color:w==="a"?GOLD:"#dfe5ef"}}>{r.a}</span>
        <span style={{fontSize:11,color:"#6b7384",padding:"0 16px",textAlign:"center",minWidth:120}}>{r.label}</span>
        <span style={{textAlign:"left",fontSize:14,fontWeight:w==="b"?800:500,color:w==="b"?GOLD:"#dfe5ef"}}>{r.b}</span>
      </div>);})}</div>
    {/* form */}
    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",padding:"8px 0",borderTop:"1px solid rgba(255,255,255,.05)",marginBottom:14}}>
      <span style={{textAlign:"right"}}>{(ia.form||[]).slice(-5).map((f,j)=><Dot key={j} r={f}/>)||"—"}</span>
      <span style={{fontSize:11,color:"#6b7384",padding:"0 16px",textAlign:"center",minWidth:120}}>Recent form</span>
      <span style={{textAlign:"left"}}>{(ib.form||[]).slice(-5).map((f,j)=><Dot key={j} r={f}/>)||"—"}</span>
    </div>
    <div style={{fontSize:12,color:"#9aa3b2",marginBottom:8}}>If they met (neutral venue):</div>
    <ProbBar pH={p.pH} pD={p.pD} pA={p.pA} hN={a} aN={b}/>
    <div style={{display:"flex",gap:18,marginTop:18,paddingTop:16,borderTop:"1px solid rgba(255,255,255,.08)"}}><Scorers info={ia} name={a}/><Scorers info={ib} name={b}/></div>
    <div style={{fontSize:10,color:"#5f6878",marginTop:12}}>Scorers reflect goals in this tournament (from the live feed). Full squad ratings need a paid data API.</div>
  </div>);
}

function GoldenBoot({scorers}){ if(!scorers.length)return null; const max=scorers[0].g;
  return(<div style={{...CARD,padding:"16px 18px"}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><Target size={16} color={GOLD}/><span style={{fontSize:14,fontWeight:700}}>Golden Boot race</span><span style={{fontSize:11,color:"#6b7384"}}>top scorers</span></div>
    {scorers.map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderTop:i?"1px solid rgba(255,255,255,.05)":"none"}}><span style={{fontSize:12,color:"#6b7384",width:14}}>{i+1}</span><Flag t={s.t} s={16}/><span style={{fontSize:13,fontWeight:500,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.n}</span><div style={{width:70,height:6,borderRadius:4,background:"rgba(255,255,255,.06)",overflow:"hidden"}}><div style={{width:`${100*s.g/max}%`,height:"100%",background:`linear-gradient(90deg,${GOLD2},${GOLD})`}}/></div><span style={{fontSize:14,fontWeight:800,color:GOLD,width:16,textAlign:"right"}}>{s.g}</span></div>))}
  </div>);
}

/* ================= APP ================= */
const STATIC=buildStatic();
export default function App(){
  const [tab,setTab]=useState("today");
  const [feed,setFeed]=useState(null),[source,setSource]=useState("loading"),[updated,setUpdated]=useState(null),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{ setBusy(true);
    try{ const r=await fetch(FEED_URL,{cache:"no-store"}); const j=await r.json(); const g=parseFeed(j); if(!g)throw new Error("schema"); setFeed(g);setSource("live");setUpdated(new Date()); }
    catch(e){ setSource(s=>s==="live"?"live":"snapshot"); } finally{ setBusy(false); } },[]);
  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{ if(source!=="live")return; const id=setInterval(load,REFRESH_MS); return()=>clearInterval(id); },[source,load]);

  const active=feed||STATIC;
  // demo pool from un-injected data so a finished sim doesn't reshuffle the picker
  const demoPool=useMemo(()=>{ const a=[]; Object.keys(active).forEach(L=>active[L].matches.forEach(m=>{ if(m.status!=="FT"&&m.iso)a.push({...m,grp:L}); }));
    return a.sort((x,y)=>new Date(x.iso)-new Date(y.iso)).slice(0,16); },[active]);
  const [demoKey,setDemoKey]=useState(null);
  const demoMatch=useMemo(()=>{ if(!demoPool.length)return null; return demoPool.find(m=>`${m.grp}|${m.h}|${m.a}`===demoKey)||demoPool[0]; },[demoPool,demoKey]);
  const demoScript=useMemo(()=>demoMatch?genScript(demoMatch.h,demoMatch.a):[],[demoMatch]);
  const live=useLiveMatch(demoMatch,demoScript);

  const data=useMemo(()=>{ const g=JSON.parse(JSON.stringify(active));
    if(live.st.done&&demoMatch&&g[demoMatch.grp]){ const mt=g[demoMatch.grp].matches.find(x=>x.h===demoMatch.h&&x.a===demoMatch.a); if(mt&&mt.status!=="FT"){ mt.status="FT"; mt.hs=live.st.hs; mt.as=live.st.as; } }
    return g; },[active,live.st.done,live.st.hs,live.st.as,demoMatch]);

  const groupTables=useMemo(()=>{const o={};Object.keys(data).forEach(L=>o[L]=tableFromMatches(data[L].teams,data[L].matches));return o;},[data]);
  const odds=useMemo(()=>{const o={};Object.keys(data).forEach(L=>o[L]=advanceOdds(data[L].teams,data[L].matches));return o;},[data]);
  const allM=useMemo(()=>{const a=[];Object.keys(data).forEach(L=>data[L].matches.forEach(m=>a.push({...m,grp:L})));return a;},[data]);
  const teamInfo=useMemo(()=>{ const info={};
    Object.keys(data).forEach(L=>{ (groupTables[L]||[]).forEach(r=>{ info[r.team]={...r,group:L,adv:odds[L]?.[r.team]?.adv??0,scorers:[]}; }); });
    allM.forEach(m=>{ if(m.status!=="FT")return; (m.scorers||[]).forEach(s=>{ if(!info[s.t])return; const e=info[s.t].scorers.find(x=>x.n===s.n); if(e)e.g++; else info[s.t].scorers.push({n:s.n,g:1}); }); });
    Object.values(info).forEach(i=>i.scorers.sort((a,b)=>b.g-a.g)); return info; },[data,groupTables,odds,allM]);

  const isDemo=m=>demoMatch&&m.grp===demoMatch.grp&&m.h===demoMatch.h&&m.a===demoMatch.a;
  const today=allM.filter(m=>isToday(m.iso)&&m.status!=="FT"&&!isDemo(m)).sort((a,b)=>new Date(a.iso)-new Date(b.iso));
  const nextUp=allM.filter(m=>m.status!=="FT"&&m.iso&&new Date(m.iso)>new Date()&&!isDemo(m)).sort((a,b)=>new Date(a.iso)-new Date(b.iso)).slice(0,5);
  const recent=allM.filter(m=>m.status==="FT"&&m.hs!=null&&!isDemo(m)).sort((a,b)=>new Date(b.iso)-new Date(a.iso)).slice(0,6);
  const scorers=useMemo(()=>collectScorers(allM),[allM]);
  const tabs=[["today","Today & Live",Radio],["groups","Groups",BarChart3],["bracket","Bracket",GitBranch],["compare","Compare",Swords]];

  return(<div style={{fontFamily:"system-ui,-apple-system,sans-serif",color:"#e8edf5",background:"radial-gradient(1200px 600px at 70% -10%,#16233b 0%,#0a0e1a 55%,#070a12 100%)",minHeight:"100vh",padding:"0 0 40px"}}>
    <style>{css}</style>
    <div style={{padding:"26px 20px 20px",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
      <div style={{maxWidth:980,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{width:46,height:46,borderRadius:13,background:`linear-gradient(135deg,${GOLD},${GOLD2})`,display:"flex",alignItems:"center",justifyContent:"center"}}><Trophy size={26} color="#1a1206"/></div>
          <div><h1 style={{margin:0,fontSize:24,fontWeight:800,letterSpacing:-.5}}>FIFA World Cup 2026</h1>
            <div style={{fontSize:12,color:"#8a93a3",marginTop:2,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><span>🇺🇸🇨🇦🇲🇽 USA · Canada · Mexico</span><span style={{color:"#4b5365"}}>•</span><span>Jun 11 – Jul 19</span></div></div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:7,padding:"7px 12px",borderRadius:11,background:source==="live"?"rgba(16,185,129,.1)":"rgba(245,196,81,.08)",border:`1px solid ${source==="live"?"rgba(16,185,129,.3)":"rgba(245,196,81,.22)"}`}}>
              {source==="live"?<Wifi size={14} color={EM}/>:<WifiOff size={14} color={GOLD}/>}
              <div style={{lineHeight:1.2}}><div style={{fontSize:11,fontWeight:700,color:source==="live"?EM:GOLD}}>{source==="loading"?"Connecting…":source==="live"?"Live feed":"Snapshot · Jun 15"}</div><div style={{fontSize:9,color:"#6b7384"}}>{source==="live"&&updated?"updated "+updated.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):source==="snapshot"?"live feed connects on deploy":""}</div></div>
            </div>
            <button onClick={load} disabled={busy} title="Refresh" style={{...btn,padding:"9px"}}><RefreshCw size={14} className={busy?"wc-spin":""}/></button>
          </div>
        </div>
        <div style={{display:"flex",gap:6,marginTop:18,flexWrap:"wrap",alignItems:"center"}}>
          {tabs.map(([id,label,Icon])=>(<button key={id} className="wc-tab" onClick={()=>setTab(id)} style={{display:"inline-flex",alignItems:"center",gap:7,fontSize:13,fontWeight:600,padding:"9px 16px",borderRadius:11,cursor:"pointer",border:"1px solid",borderColor:tab===id?"rgba(245,196,81,.4)":"rgba(255,255,255,.08)",background:tab===id?"rgba(245,196,81,.12)":"rgba(255,255,255,.03)",color:tab===id?GOLD:"#9aa3b2"}}><Icon size={15}/>{label}</button>))}
          <span style={{marginLeft:"auto",display:"inline-flex",alignItems:"center",gap:5,fontSize:11,color:"#6b7384"}}><Clock size={12}/> times in your local zone · {TZ}</span>
        </div>
      </div>
    </div>
    <div style={{maxWidth:980,margin:"0 auto",padding:"22px 20px 0"}}>
      {tab==="today"&&<div style={{display:"grid",gap:16}}>
        <LiveCard live={live} match={demoMatch} pool={demoPool} onPick={setDemoKey}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
          <div style={{...CARD,padding:"16px 18px"}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><Flame size={16} color={GOLD}/><span style={{fontSize:14,fontWeight:700}}>{today.length?"Today's matches":"Next up"}</span><span style={{fontSize:11,color:"#6b7384"}}>{today.length?fmtD(new Date().toISOString()):""}</span></div>
            {(today.length?today:nextUp).map((m,i)=><FixtureRow key={i} m={m}/>)}{!today.length&&!nextUp.length&&<div style={{fontSize:12,color:"#6b7384",padding:"10px 0"}}>No upcoming matches in the dataset.</div>}</div>
          <div style={{...CARD,padding:"16px 18px"}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><Clock size={16} color={EM}/><span style={{fontSize:14,fontWeight:700}}>Recent results</span></div>{recent.map((m,i)=><FixtureRow key={i} m={m}/>)}{!recent.length&&<div style={{fontSize:12,color:"#6b7384",padding:"10px 0"}}>No results yet.</div>}</div>
        </div>
        <GoldenBoot scorers={scorers}/>
        <div style={{fontSize:11,color:"#6b7384",textAlign:"center"}}>Win % from a FIFA-ranking model · pick any fixture in the simulator to watch scores, tables & odds update in real time.</div>
      </div>}
      {tab==="groups"&&<div>
        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:14,fontSize:11,color:"#9aa3b2"}}><span style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:3,background:EM}}/>Top 2 — advance</span><span style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:3,background:GOLD}}/>3rd — best-thirds race</span><span style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:3,background:"#5a6577"}}/>4th</span><span style={{marginLeft:"auto"}}>• <b style={{color:EM}}>adv%</b> = chance to finish top-2 (simulated)</span></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>{Object.keys(data).sort().map(L=><GroupCard key={L} letter={L} teams={data[L].teams} matches={data[L].matches} odds={odds[L]}/>)}</div>
      </div>}
      {tab==="bracket"&&<BracketView groupTables={groupTables} odds={odds}/>}
      {tab==="compare"&&<Compare teamInfo={teamInfo}/>}
    </div>
  </div>);
}
