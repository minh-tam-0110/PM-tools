import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import _ from "lodash";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
  PieChart, Pie, Line
} from "recharts";

/* ═══════════════════════════════════════════════════════════════
   THEME TOKENS
   ═══════════════════════════════════════════════════════════════ */
const T = {
  bg: "#0C0F17", surface: "#111827", card: "#151C2C", cardAlt: "#1A2236",
  border: "#1F2A40", borderLight: "#293550",
  text: "#E8ECF4", textSec: "#8B95AB", textMuted: "#566075",
  accent: "#7C6AEF", accentSoft: "rgba(124,106,239,0.12)",
  ok: "#34D399", okSoft: "rgba(52,211,153,0.1)",
  warn: "#FBBF24", warnSoft: "rgba(251,191,36,0.1)",
  danger: "#F87171", dangerSoft: "rgba(248,113,113,0.1)",
  info: "#60A5FA", infoSoft: "rgba(96,165,250,0.1)",
  cyan: "#22D3EE", pink: "#F472B6",
};

const prioC = {
  Critical: { c: "#EF4444", bg: "rgba(239,68,68,0.1)" },
  High: { c: "#F97316", bg: "rgba(249,115,22,0.1)" },
  Medium: { c: "#EAB308", bg: "rgba(234,179,8,0.1)" },
  Low: { c: "#6B7280", bg: "rgba(107,114,128,0.08)" },
};

const stCfg = {
  Backlog:       { c: "#6B7280", bg: "rgba(107,114,128,0.1)", i: "○" },
  "To Do":       { c: "#A78BFA", bg: "rgba(167,139,250,0.1)", i: "◔" },
  "In Progress": { c: "#60A5FA", bg: "rgba(96,165,250,0.1)",  i: "◐" },
  Review:        { c: "#FBBF24", bg: "rgba(251,191,36,0.1)",  i: "◑" },
  Done:          { c: "#34D399", bg: "rgba(52,211,153,0.1)",  i: "●" },
};
const stOf = s => stCfg[s] || stCfg.Backlog;

const STATUSES = Object.keys(stCfg);
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const MODULES = ["Battle System", "UI/HUD", "Backend API", "Matchmaking", "Shop & IAP", "Analytics"];
const TODAY = new Date();
const fmtD = d => d.toISOString().split("T")[0];

/* ═══════════════════════════════════════════════════════════════
   SAMPLE DATA  (used when no real data loaded)
   ═══════════════════════════════════════════════════════════════ */
const TEAM0 = [
  { id: 1, name: "Minh Trí",   role: "Frontend Dev",   av: "MT" },
  { id: 2, name: "Thanh Hà",   role: "Backend Dev",    av: "TH" },
  { id: 3, name: "Quốc Bảo",   role: "Game Designer",  av: "QB" },
  { id: 4, name: "Mai Linh",   role: "QA Engineer",    av: "ML" },
  { id: 5, name: "Đức Anh",    role: "UI/UX Designer", av: "DA" },
  { id: 6, name: "Phương Nhi", role: "Backend Dev",    av: "PN" },
];

const SPRINTS0 = [
  { id: "s0", name: "Sprint 18", start: "2026-03-16", end: "2026-03-29", status: "completed", committed: 42, completed: 38 },
  { id: "s1", name: "Sprint 19", start: "2026-03-30", end: "2026-04-12", status: "completed", committed: 45, completed: 43 },
  { id: "s2", name: "Sprint 20", start: "2026-04-13", end: "2026-04-26", status: "completed", committed: 48, completed: 41 },
  { id: "s3", name: "Sprint 21", start: "2026-04-27", end: "2026-05-10", status: "active",    committed: 50, completed: 32 },
  { id: "s4", name: "Sprint 22", start: "2026-05-11", end: "2026-05-24", status: "upcoming",  committed: 46, completed: 0  },
];

function seed(s){let h=s;return()=>{h=(h*16807)%2147483647;return(h-1)/2147483646;};}
const R = seed(42);

const TN = {
  "Battle System":["Fix damage calc","Combo system","Balance stats","Skill VFX","Hit detection","Refactor SM","Battle replay","Turn order fix"],
  "UI/HUD":["Health bar v2","Minimap","Tooltip fix","Chat UI","Loading screen","Settings v2","Responsive fix","Toast system"],
  "Backend API":["Match query opt","Rate limiting","Auth refresh","Leaderboard API","WS events","DB migration","Concurrency fix","Cache layer"],
  Matchmaking:["ELO fix","Rank decay","Party queue","Timeout fix","Region filter","Queue optimize","Rank display","Season reset"],
  "Shop & IAP":["Bundle UI","Purchase valid","Daily deals","Gift system","Receipt verify","Coin anim","Refund flow","Price fix"],
  Analytics:["Funnel track","Event logging","A/B framework","Retention dash","Session track","Crash report","GDPR export","Attribution fix"],
};

function genSample(){
  const tasks=[];let id=1;
  TEAM0.forEach(m=>{
    const n=5+Math.floor(R()*4);
    for(let i=0;i<n;i++){
      const sp=SPRINTS0[1+Math.floor(R()*(SPRINTS0.length-1))];
      const st=STATUSES[Math.floor(R()*STATUSES.length)];
      const pr=PRIORITIES[Math.floor(R()*PRIORITIES.length)];
      const mod=MODULES[Math.floor(R()*MODULES.length)];
      const d=new Date(TODAY);d.setDate(d.getDate()+Math.floor(R()*22)-7);
      const overdue=st!=="Done"&&d<TODAY;
      const prog=st==="Done"?100:st==="Review"?80+Math.floor(R()*20):st==="In Progress"?20+Math.floor(R()*55):st==="To Do"?Math.floor(R()*10):0;
      const pts=[1,2,3,5,8][Math.floor(R()*5)];
      tasks.push({id:`T-${String(id++).padStart(3,"0")}`,title:(TN[mod]||TN["UI/HUD"])[i%8],assignee:m,sprint:sp,status:st,priority:pr,module:mod,deadline:fmtD(d),isOverdue:overdue,progress:prog,sp:pts,source:"sample"});
    }
  });
  return tasks;
}

/* ═══════════════════════════════════════════════════════════════
   DATA NORMALIZER  (for imported / scraped data)
   ═══════════════════════════════════════════════════════════════ */
function mapStatus(s){
  if(!s)return "Backlog";const l=s.toLowerCase();
  if(l.includes("done")||l.includes("complete")||l.includes("closed"))return "Done";
  if(l.includes("review")||l.includes("testing")||l.includes("qa"))return "Review";
  if(l.includes("progress")||l.includes("doing")||l.includes("active"))return "In Progress";
  if(l.includes("todo")||l.includes("to do")||l.includes("open")||l.includes("new"))return "To Do";
  return "Backlog";
}
function mapPrio(p){
  if(!p)return "Medium";const l=(p+"").toLowerCase();
  if(l.includes("critical")||l.includes("urgent")||l==="1")return "Critical";
  if(l.includes("high")||l==="2")return "High";
  if(l.includes("low")||l==="4")return "Low";
  return "Medium";
}
function hashS(s){return(s||"").split("").reduce((a,c)=>a+c.charCodeAt(0),0);}
function initials(name){return(name||"??").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();}

function normTask(t,idx){
  const a=typeof t.assignee==="string"?{id:hashS(t.assignee),name:t.assignee,role:t.role||"",av:initials(t.assignee)}:t.assignee||{id:0,name:"Unassigned",role:"",av:"??"};
  const sp=typeof t.sprint==="string"?{id:"s"+hashS(t.sprint),name:t.sprint,start:t.sprintStart||"",end:t.sprintEnd||"",status:t.sprintStatus||"active",committed:0,completed:0}:t.sprint||{id:"s0",name:"Backlog",start:"",end:"",status:"active",committed:0,completed:0};
  const dl=t.deadline||t.dueDate||t.due||fmtD(new Date(Date.now()+7*864e5));
  const st=mapStatus(t.status);
  return{id:t.id||t.taskId||`T-${String(idx+1).padStart(3,"0")}`,title:t.title||t.name||t.summary||"Untitled",assignee:a,sprint:sp,status:st,priority:mapPrio(t.priority),module:t.module||t.category||t.label||"General",deadline:dl,isOverdue:st!=="Done"&&new Date(dl)<TODAY,progress:t.progress||t.percent||(st==="Done"?100:st==="Review"?85:st==="In Progress"?30:0),sp:t.sp||t.storyPoints||t.points||3,source:"imported"};
}

function normImport(raw){
  const arr=Array.isArray(raw)?raw:raw.tasks||[];
  const tasks=arr.map(normTask);
  const teamMap=new Map();
  tasks.forEach(t=>{if(t.assignee?.name&&!teamMap.has(t.assignee.name))teamMap.set(t.assignee.name,{...t.assignee,id:teamMap.size+1});});
  const sprintMap=new Map();
  tasks.forEach(t=>{if(t.sprint?.name&&!sprintMap.has(t.sprint.name))sprintMap.set(t.sprint.name,{...t.sprint,id:"s"+sprintMap.size});});
  return{tasks,team:teamMap.size?Array.from(teamMap.values()):null,sprints:sprintMap.size?Array.from(sprintMap.values()):null};
}

/* ═══════════════════════════════════════════════════════════════
   DATA BRIDGE HOOK
   ═══════════════════════════════════════════════════════════════ */
function useDataBridge(){
  const[tasks,setTasks]=useState(genSample);
  const[team,setTeam]=useState(TEAM0);
  const[sprints,setSprints]=useState(SPRINTS0);
  const[src,setSrc]=useState("sample");
  const[lastSync,setLastSync]=useState(null);
  const[iframeSt,setIframeSt]=useState("idle");
  const iframeRef=useRef(null);
  const timerRef=useRef(null);

  useEffect(()=>{
    const handler=e=>{
      if(e.origin!=="https://wolffun-review.web.app")return;
      try{
        const m=typeof e.data==="string"?JSON.parse(e.data):e.data;
        if(m.type==="WOLFFUN_DATA"){
          const n=normImport(m);
          setTasks(n.tasks);if(n.team)setTeam(n.team);if(n.sprints)setSprints(n.sprints);
          setSrc("iframe");setIframeSt("connected");setLastSync(new Date());
        }
        if(m.type==="WOLFFUN_AUTH_OK")setIframeSt("connected");
        if(m.type==="WOLFFUN_ERROR")setIframeSt("error");
      }catch(err){}
    };
    window.addEventListener("message",handler);
    return()=>window.removeEventListener("message",handler);
  },[]);

  useEffect(()=>{
    if(src!=="iframe")return;
    timerRef.current=setInterval(()=>{reqScrape();},5*60*1000);
    return()=>clearInterval(timerRef.current);
  },[src]);

  function reqScrape(){
    if(iframeRef.current?.contentWindow)
      iframeRef.current.contentWindow.postMessage(JSON.stringify({type:"REQUEST_SCRAPE"}),"https://wolffun-review.web.app");
  }

  function refresh(){if(src==="iframe")reqScrape();setLastSync(new Date());}

  function importJSON(str){
    try{
      const d=JSON.parse(str);const n=normImport(d);
      setTasks(n.tasks);if(n.team)setTeam(n.team);if(n.sprints)setSprints(n.sprints);
      setSrc("manual");setLastSync(new Date());
      return{ok:true,count:n.tasks.length};
    }catch(e){return{ok:false,err:e.message};}
  }

  function addTask(t){
    const nid=`T-${String(tasks.length+1).padStart(3,"0")}`;
    const nt={...t,id:nid,isOverdue:t.status!=="Done"&&new Date(t.deadline)<TODAY,progress:t.status==="Done"?100:t.status==="Review"?85:t.status==="In Progress"?30:0,source:"created"};
    setTasks(p=>[...p,nt]);
    if(src==="iframe"&&iframeRef.current?.contentWindow)
      iframeRef.current.contentWindow.postMessage(JSON.stringify({type:"CREATE_TASK",task:nt}),"https://wolffun-review.web.app");
    return nt;
  }

  return{tasks,team,sprints,src,lastSync,iframeSt,setIframeSt,iframeRef,refresh,importJSON,addTask};
}

/* ═══════════════════════════════════════════════════════════════
   SHARED UI ATOMS
   ═══════════════════════════════════════════════════════════════ */
function Avatar({name,initials:ini,size=28}){
  const h=(name||"").split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360;
  return<div style={{width:size,height:size,borderRadius:"50%",background:`hsl(${h},50%,42%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.36,fontWeight:700,color:"#fff",flexShrink:0}}>{ini}</div>;
}
function Bdg({children,color,bg,small}){
  return<span style={{display:"inline-flex",alignItems:"center",padding:small?"1px 6px":"3px 9px",borderRadius:5,fontSize:small?10:11,fontWeight:600,color,background:bg,whiteSpace:"nowrap"}}>{children}</span>;
}
function PBar({value,color,h=5}){
  return<div style={{flex:1,height:h,background:"rgba(255,255,255,0.06)",borderRadius:h,overflow:"hidden"}}><div style={{width:`${Math.min(value,100)}%`,height:"100%",background:color||T.accent,borderRadius:h,transition:"width .5s"}}/></div>;
}
function Card({children,style,glow}){
  return<div style={{background:T.card,border:`1px solid ${glow?"rgba(124,106,239,0.3)":T.border}`,borderRadius:14,padding:22,...style}}>{children}</div>;
}
function Sec({children,sub,right}){
  return<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16}}><div><div style={{fontSize:15,fontWeight:700,color:T.text}}>{children}</div>{sub&&<div style={{fontSize:12,color:T.textMuted,marginTop:2}}>{sub}</div>}</div>{right}</div>;
}
function Metric({label,value,sub,color,icon}){
  return<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"18px 20px",flex:1,minWidth:150,position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:0,left:0,right:0,height:2,background:color||T.accent}}/><div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:11,color:T.textMuted,letterSpacing:.8,textTransform:"uppercase",marginBottom:6,fontWeight:600}}>{label}</div><div style={{fontSize:28,fontWeight:800,color:color||T.text,letterSpacing:-1,lineHeight:1}}>{value}</div>{sub&&<div style={{fontSize:11,color:T.textSec,marginTop:5}}>{sub}</div>}</div>{icon&&<div style={{fontSize:18,opacity:.5}}>{icon}</div>}</div></div>;
}
function TabBar({tabs,active,onChange}){
  return<div style={{display:"flex",gap:2,background:T.surface,borderRadius:10,padding:3,border:`1px solid ${T.border}`,flexWrap:"wrap"}}>{tabs.map(t=><button key={t.id} onClick={()=>onChange(t.id)} style={{padding:"8px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,background:active===t.id?T.accent:"transparent",color:active===t.id?"#fff":T.textSec,transition:"all .2s"}}>{t.icon} {t.label}</button>)}</div>;
}
const CTip=({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return<div style={{background:T.card,border:`1px solid ${T.borderLight}`,borderRadius:10,padding:"10px 14px",fontSize:12,boxShadow:"0 8px 30px rgba(0,0,0,.4)"}}>
    <div style={{fontWeight:700,color:T.text,marginBottom:6}}>{label}</div>
    {payload.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><div style={{width:8,height:8,borderRadius:2,background:p.color}}/><span style={{color:T.textSec}}>{p.name}:</span><span style={{color:T.text,fontWeight:700}}>{p.value}</span></div>)}
  </div>;
};

function applyF(tasks,f){
  return tasks.filter(t=>{
    if(f.sprint!=="all"&&t.sprint?.id!==f.sprint)return false;
    if(f.member!=="all"&&t.assignee?.id!==Number(f.member))return false;
    if(f.priority!=="all"&&t.priority!==f.priority)return false;
    if(f.module!=="all"&&t.module!==f.module)return false;
    return true;
  });
}

/* ═══════════════════════════════════════════════════════════════
   CONNECTION PANEL (iframe + manual JSON)
   ═══════════════════════════════════════════════════════════════ */
function ConnPanel({br,onClose}){
  const[tab,setTab]=useState("iframe");
  const[json,setJson]=useState("");
  const[res,setRes]=useState(null);

  const sample=JSON.stringify([
    {id:"TASK-001",title:"Fix login bug",assignee:"Minh Trí",status:"In Progress",priority:"High",module:"Backend API",deadline:"2026-05-12",sprint:"Sprint 21",sp:5},
    {id:"TASK-002",title:"Design new HUD",assignee:"Đức Anh",status:"To Do",priority:"Medium",module:"UI/HUD",deadline:"2026-05-15",sprint:"Sprint 21",sp:3},
  ],null,2);

  return<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}}>
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:16,width:600,maxHeight:"82vh",overflow:"auto",padding:28}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><div style={{fontSize:18,fontWeight:800,color:T.text}}>Kết nối dữ liệu</div><div style={{fontSize:12,color:T.textSec,marginTop:2}}>Lấy data từ Review 360° về dashboard</div></div>
        <button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:`1px solid ${T.border}`,background:T.surface,color:T.text,cursor:"pointer",fontSize:16}}>✕</button>
      </div>

      <div style={{display:"flex",gap:2,marginBottom:20,background:T.surface,borderRadius:8,padding:3}}>
        {[{id:"iframe",l:"🔗 Auto (iframe)"},{id:"manual",l:"📋 Manual (paste JSON)"}].map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"8px 16px",borderRadius:6,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,background:tab===t.id?T.accent:"transparent",color:tab===t.id?"#fff":T.textSec}}>{t.l}</button>)}
      </div>

      {tab==="iframe"&&<div>
        <div style={{background:T.surface,borderRadius:10,padding:16,marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:8}}>Cách hoạt động:</div>
          <div style={{fontSize:12,color:T.textSec,lineHeight:1.7}}>
            1. Nhấn "Kết nối" → iframe mở trang Review 360°<br/>
            2. Login tài khoản Wolffun trong iframe<br/>
            3. Data tự đọc từ DOM và gửi về dashboard qua postMessage<br/>
            4. Auto-refresh mỗi 5 phút + nút Refresh thủ công<br/>
            <span style={{color:T.warn,fontSize:11,display:"block",marginTop:8}}>⚠ Nếu Firebase block iframe (X-Frame-Options), hãy dùng tab "Manual"</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:10,height:10,borderRadius:"50%",background:br.iframeSt==="connected"?T.ok:br.iframeSt==="loading"?T.warn:br.iframeSt==="error"?T.danger:T.textMuted}}/>
          <span style={{fontSize:13,color:T.text,fontWeight:600}}>{br.iframeSt==="connected"?"Đã kết nối":br.iframeSt==="loading"?"Đang kết nối...":br.iframeSt==="error"?"Lỗi — thử Manual":"Chưa kết nối"}</span>
          <button onClick={()=>br.setIframeSt("loading")} style={{marginLeft:"auto",padding:"8px 20px",borderRadius:8,border:"none",background:T.accent,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>{br.iframeSt==="connected"?"Reconnect":"Kết nối"}</button>
        </div>
        {br.iframeSt==="loading"&&<div style={{marginTop:16,borderRadius:10,overflow:"hidden",border:`1px solid ${T.border}`}}>
          <iframe ref={br.iframeRef} src="https://wolffun-review.web.app/my-work" style={{width:"100%",height:400,border:"none"}} title="Review 360°"/>
        </div>}
      </div>}

      {tab==="manual"&&<div>
        <div style={{fontSize:12,color:T.textSec,marginBottom:12,lineHeight:1.6}}>
          Paste mảng JSON từ Review 360°. Tool tự map các field phổ biến: id, title/name/summary, assignee, status, priority, deadline/dueDate, sprint, sp/storyPoints...
        </div>
        <textarea value={json} onChange={e=>setJson(e.target.value)} placeholder={sample}
          style={{width:"100%",height:200,background:T.bg,color:T.text,border:`1px solid ${T.border}`,borderRadius:8,padding:12,fontSize:12,fontFamily:"monospace",resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
        <div style={{display:"flex",alignItems:"center",gap:12,marginTop:12}}>
          <button onClick={()=>setJson(sample)} style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${T.border}`,background:T.surface,color:T.textSec,fontSize:12,cursor:"pointer"}}>Xem mẫu</button>
          <button onClick={()=>{const r=br.importJSON(json);setRes(r);}} style={{marginLeft:"auto",padding:"8px 20px",borderRadius:8,border:"none",background:T.ok,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Import</button>
        </div>
        {res&&<div style={{marginTop:12,padding:10,borderRadius:8,fontSize:12,background:res.ok?T.okSoft:T.dangerSoft,color:res.ok?T.ok:T.danger}}>{res.ok?`✓ Đã import ${res.count} tasks!`:`✕ Lỗi: ${res.err}`}</div>}
      </div>}
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   CREATE TASK MODAL
   ═══════════════════════════════════════════════════════════════ */
function CreateModal({br,onClose}){
  const activeSp=br.sprints.find(s=>s.status==="active")||br.sprints[0];
  const[f,sF]=useState({title:"",assigneeId:br.team[0]?.id||1,sprintId:activeSp?.id||"s0",status:"To Do",priority:"Medium",module:MODULES[0],deadline:fmtD(new Date(Date.now()+7*864e5)),sp:3,desc:""});
  const[done,setDone]=useState(null);
  const inp={width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${T.border}`,background:T.bg,color:T.text,fontSize:13,outline:"none",boxSizing:"border-box"};

  const submit=()=>{
    if(!f.title.trim())return;
    const a=br.team.find(m=>m.id===Number(f.assigneeId))||br.team[0];
    const sp=br.sprints.find(s=>s.id===f.sprintId)||br.sprints[0];
    const t=br.addTask({...f,assignee:a,sprint:sp});
    setDone(t);setTimeout(()=>onClose(),1000);
  };

  return<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}}>
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:16,width:520,maxHeight:"85vh",overflow:"auto",padding:28}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:18,fontWeight:800,color:T.text}}>✚ Tạo Task mới</div>
        <button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:`1px solid ${T.border}`,background:T.surface,color:T.text,cursor:"pointer",fontSize:16}}>✕</button>
      </div>

      {done?<div style={{textAlign:"center",padding:"30px 0"}}><div style={{fontSize:40,marginBottom:12}}>✓</div><div style={{fontSize:16,fontWeight:700,color:T.ok}}>Tạo thành công!</div><div style={{fontSize:13,color:T.textSec,marginTop:4}}>{done.id} — {done.title}</div></div>
      :<div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><label style={{fontSize:12,color:T.textSec,fontWeight:600,display:"block",marginBottom:4}}>Tên task *</label><input value={f.title} onChange={e=>sF(p=>({...p,title:e.target.value}))} placeholder="VD: Fix login timeout bug" style={inp} autoFocus/></div>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}><label style={{fontSize:12,color:T.textSec,fontWeight:600,display:"block",marginBottom:4}}>Assignee</label><select value={f.assigneeId} onChange={e=>sF(p=>({...p,assigneeId:e.target.value}))} style={inp}>{br.team.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          <div style={{flex:1}}><label style={{fontSize:12,color:T.textSec,fontWeight:600,display:"block",marginBottom:4}}>Sprint</label><select value={f.sprintId} onChange={e=>sF(p=>({...p,sprintId:e.target.value}))} style={inp}>{br.sprints.map(s=><option key={s.id} value={s.id}>{s.name}{s.status==="active"?" ●":""}</option>)}</select></div>
        </div>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}><label style={{fontSize:12,color:T.textSec,fontWeight:600,display:"block",marginBottom:4}}>Status</label><select value={f.status} onChange={e=>sF(p=>({...p,status:e.target.value}))} style={inp}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
          <div style={{flex:1}}><label style={{fontSize:12,color:T.textSec,fontWeight:600,display:"block",marginBottom:4}}>Priority</label><select value={f.priority} onChange={e=>sF(p=>({...p,priority:e.target.value}))} style={inp}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></div>
        </div>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}><label style={{fontSize:12,color:T.textSec,fontWeight:600,display:"block",marginBottom:4}}>Module</label><select value={f.module} onChange={e=>sF(p=>({...p,module:e.target.value}))} style={inp}>{MODULES.map(m=><option key={m}>{m}</option>)}</select></div>
          <div style={{flex:1}}><label style={{fontSize:12,color:T.textSec,fontWeight:600,display:"block",marginBottom:4}}>Story Points</label><select value={f.sp} onChange={e=>sF(p=>({...p,sp:Number(e.target.value)}))} style={inp}>{[1,2,3,5,8,13].map(v=><option key={v} value={v}>{v} SP</option>)}</select></div>
        </div>
        <div><label style={{fontSize:12,color:T.textSec,fontWeight:600,display:"block",marginBottom:4}}>Deadline</label><input type="date" value={f.deadline} onChange={e=>sF(p=>({...p,deadline:e.target.value}))} style={inp}/></div>
        <div><label style={{fontSize:12,color:T.textSec,fontWeight:600,display:"block",marginBottom:4}}>Mô tả</label><textarea value={f.desc} onChange={e=>sF(p=>({...p,desc:e.target.value}))} rows={2} placeholder="Chi tiết..." style={{...inp,resize:"vertical"}}/></div>
        <button onClick={submit} disabled={!f.title.trim()} style={{padding:"12px 24px",borderRadius:10,border:"none",background:f.title.trim()?T.accent:T.borderLight,color:"#fff",fontSize:14,fontWeight:700,cursor:f.title.trim()?"pointer":"not-allowed",marginTop:4}}>Tạo Task</button>
      </div>}
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   VIEW: OVERVIEW
   ═══════════════════════════════════════════════════════════════ */
function VOverview({tasks,filters}){
  const ft=applyF(tasks,filters);
  const total=ft.length,done=ft.filter(t=>t.status==="Done").length;
  const over=ft.filter(t=>t.isOverdue).length;
  const prog=ft.filter(t=>t.status==="In Progress").length;
  const rev=ft.filter(t=>t.status==="Review").length;
  const tSP=_.sumBy(ft,"sp"),dSP=_.sumBy(ft.filter(t=>t.status==="Done"),"sp");
  const pct=total?Math.round(done/total*100):0;
  const sts=[...new Set(ft.map(t=>t.status))];
  const mods=Object.entries(_.groupBy(ft,"module")).map(([m,ts])=>({m,total:ts.length,done:ts.filter(t=>t.status==="Done").length,over:ts.filter(t=>t.isOverdue).length}));

  return<div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <Metric label="Hoàn thành" value={`${pct}%`} sub={`${done}/${total} tasks`} color={T.ok} icon="✓"/>
      <Metric label="Overdue" value={over} sub="cần xử lý" color={over>0?T.danger:T.ok} icon="⚠"/>
      <Metric label="Đang làm" value={prog} sub={`${rev} đang review`} color={T.info} icon="◐"/>
      <Metric label="Story Points" value={`${dSP}/${tSP}`} sub="SP done" color={T.accent} icon="◆"/>
    </div>
    <Card>
      <Sec>Phân bố trạng thái</Sec>
      <div style={{display:"flex",gap:3,height:26,borderRadius:7,overflow:"hidden",marginBottom:12}}>
        {sts.map(s=>{const c=ft.filter(t=>t.status===s).length;const p=total?c/total*100:0;if(!p)return null;return<div key={s} style={{width:`${p}%`,background:stOf(s).c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",minWidth:p>6?30:0}}>{p>8&&`${Math.round(p)}%`}</div>;})}
      </div>
      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>{sts.map(s=><div key={s} style={{display:"flex",alignItems:"center",gap:5,fontSize:12}}><div style={{width:9,height:9,borderRadius:2,background:stOf(s).c}}/><span style={{color:T.textSec}}>{s}</span><span style={{color:T.text,fontWeight:700}}>{ft.filter(t=>t.status===s).length}</span></div>)}</div>
    </Card>
    <Card>
      <Sec>Tiến độ theo Module</Sec>
      {mods.sort((a,b)=>b.total-a.total).map(m=>{const p=m.total?Math.round(m.done/m.total*100):0;return<div key={m.m} style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
        <span style={{width:110,fontSize:13,color:T.text,fontWeight:500,flexShrink:0}}>{m.m}</span>
        <PBar value={p} color={p===100?T.ok:p>60?T.info:T.warn}/>
        <span style={{minWidth:38,textAlign:"right",fontSize:13,fontWeight:700,color:p===100?T.ok:T.text}}>{p}%</span>
        <span style={{minWidth:50,textAlign:"right",fontSize:11,color:T.textSec}}>{m.done}/{m.total}</span>
        {m.over>0&&<Bdg color={T.danger} bg={T.dangerSoft} small>⚠{m.over}</Bdg>}
      </div>;})}
    </Card>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   VIEW: CHARTS
   ═══════════════════════════════════════════════════════════════ */
function VCharts({tasks,filters,sprints,team}){
  const ft=applyF(tasks,filters);
  const pieData=[...new Set(ft.map(t=>t.status))].map(s=>({name:s,value:ft.filter(t=>t.status===s).length,color:stOf(s).c}));
  const perPerson=team.map(m=>{const mt=ft.filter(t=>t.assignee?.id===m.id);const o={name:m.name.split(" ").pop()};STATUSES.forEach(s=>o[s]=mt.filter(t=>t.status===s).length);return o;});
  const velData=sprints.filter(s=>s.status!=="upcoming"&&s.committed>0).map(s=>({name:s.name.replace("Sprint ","S"),committed:s.committed,completed:s.completed||0}));

  // Burndown for active sprint
  const active=sprints.find(s=>s.status==="active");
  const burn=useMemo(()=>{
    if(!active)return[];
    const start=new Date(active.start||TODAY);const total=active.committed||50;let rem=total;const days=14;
    return Array.from({length:Math.min(12,days+1)},(_, i)=>{
      const d=new Date(start);d.setDate(d.getDate()+i);
      const ideal=Math.round((total-total/days*i)*10)/10;
      if(i>0)rem=Math.max(0,rem-(1+Math.floor(Math.random()*3)));
      return{day:`${d.getDate()}/${d.getMonth()+1}`,ideal,actual:rem};
    });
  },[active]);

  return<div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
      {burn.length>0&&<Card style={{flex:1.2,minWidth:320}} glow>
        <Sec sub={active?`${active.name} • ${active.start} → ${active.end}`:""}>🔥 Sprint Burndown</Sec>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={burn} margin={{top:5,right:10,left:-10,bottom:0}}>
            <defs><linearGradient id="ba" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.info} stopOpacity={.3}/><stop offset="95%" stopColor={T.info} stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="day" tick={{fill:T.textMuted,fontSize:11}} stroke={T.border}/><YAxis tick={{fill:T.textMuted,fontSize:11}} stroke={T.border}/><Tooltip content={<CTip/>}/>
            <Line type="monotone" dataKey="ideal" stroke={T.textMuted} strokeDasharray="6 4" strokeWidth={2} dot={false} name="Lý tưởng"/>
            <Area type="monotone" dataKey="actual" stroke={T.info} strokeWidth={2.5} fill="url(#ba)" dot={{r:3,fill:T.info,strokeWidth:0}} name="Thực tế"/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>}
      {velData.length>0&&<Card style={{flex:1,minWidth:280}}>
        <Sec sub="Committed vs Completed SP">⚡ Velocity</Sec>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={velData} margin={{top:5,right:10,left:-10,bottom:0}} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="name" tick={{fill:T.textMuted,fontSize:11}} stroke={T.border}/><YAxis tick={{fill:T.textMuted,fontSize:11}} stroke={T.border}/><Tooltip content={<CTip/>}/>
            <Bar dataKey="committed" name="Committed" radius={[4,4,0,0]} fill={T.borderLight} barSize={20}/>
            <Bar dataKey="completed" name="Completed" radius={[4,4,0,0]} barSize={20}>{velData.map((e,i)=><Cell key={i} fill={e.completed>=e.committed?T.ok:T.warn}/>)}</Bar>
            <ReferenceLine y={Math.round(_.meanBy(velData,"completed"))} stroke={T.accent} strokeDasharray="5 3"/>
          </BarChart>
        </ResponsiveContainer>
        <div style={{textAlign:"center",fontSize:12,color:T.textSec,marginTop:6}}>Avg: <span style={{color:T.accent,fontWeight:700}}>{Math.round(_.meanBy(velData,"completed"))} SP/sprint</span></div>
      </Card>}
    </div>
    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
      <Card style={{flex:1.2,minWidth:320}}>
        <Sec sub="Task theo trạng thái mỗi người">👥 Team Distribution</Sec>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={perPerson} margin={{top:5,right:10,left:-10,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="name" tick={{fill:T.textMuted,fontSize:11}} stroke={T.border}/><YAxis tick={{fill:T.textMuted,fontSize:11}} stroke={T.border}/><Tooltip content={<CTip/>}/>
            {STATUSES.map(s=><Bar key={s} dataKey={s} stackId="a" fill={stOf(s).c} name={s} barSize={26}/>)}
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card style={{flex:1,minWidth:260}}>
        <Sec>📊 Status</Sec>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <ResponsiveContainer width="50%" height={200}><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none" paddingAngle={3}>{pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip content={<CTip/>}/></PieChart></ResponsiveContainer>
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>{pieData.map(p=><div key={p.name} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:9,height:9,borderRadius:3,background:p.color}}/><span style={{fontSize:12,color:T.textSec,flex:1}}>{p.name}</span><span style={{fontSize:14,fontWeight:800,color:T.text}}>{p.value}</span></div>)}</div>
        </div>
      </Card>
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   VIEW: CALENDAR
   ═══════════════════════════════════════════════════════════════ */
function VCalendar({tasks,filters}){
  const ft=applyF(tasks,filters);
  const[mode,setMode]=useState("week");
  const[off,setOff]=useState(0);
  const base=new Date(TODAY);mode==="week"?base.setDate(base.getDate()+off*7):base.setMonth(base.getMonth()+off);

  const getW=d=>{const dd=new Date(d);const day=dd.getDay();const mon=new Date(dd);mon.setDate(dd.getDate()-(day===0?6:day-1));return Array.from({length:7},(_,i)=>{const r=new Date(mon);r.setDate(mon.getDate()+i);return r;});};
  const getM=(y,m)=>{const f=new Date(y,m,1);const sd=f.getDay()===0?6:f.getDay()-1;const s=new Date(f);s.setDate(1-sd);return Array.from({length:42},(_,i)=>{const r=new Date(s);r.setDate(s.getDate()+i);return r;});};
  const same=(a,b)=>fmtD(a)===fmtD(b);

  const wk=getW(base);const mo=base.getMonth();const yr=base.getFullYear();const moDates=getM(yr,mo);
  const byDate=_.groupBy(ft,"deadline");
  const dns=["T2","T3","T4","T5","T6","T7","CN"];
  const hLabel=mode==="week"?`${wk[0].toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit"})} — ${wk[6].toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"})}`:base.toLocaleDateString("vi-VN",{month:"long",year:"numeric"});

  return<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button onClick={()=>setOff(o=>o-1)} style={{width:32,height:32,borderRadius:7,border:`1px solid ${T.border}`,background:T.surface,color:T.text,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <span style={{fontSize:15,fontWeight:700,color:T.text,minWidth:190,textAlign:"center"}}>{hLabel}</span>
          <button onClick={()=>setOff(o=>o+1)} style={{width:32,height:32,borderRadius:7,border:`1px solid ${T.border}`,background:T.surface,color:T.text,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
          <button onClick={()=>setOff(0)} style={{padding:"5px 12px",borderRadius:7,border:`1px solid ${T.accent}`,background:T.accentSoft,color:T.accent,cursor:"pointer",fontSize:12,fontWeight:600,marginLeft:6}}>Hôm nay</button>
        </div>
        <div style={{display:"flex",gap:2,background:T.surface,borderRadius:7,padding:2,border:`1px solid ${T.border}`}}>
          {[{id:"week",l:"Tuần"},{id:"month",l:"Tháng"}].map(m=><button key={m.id} onClick={()=>{setMode(m.id);setOff(0);}} style={{padding:"5px 14px",borderRadius:5,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:mode===m.id?T.accent:"transparent",color:mode===m.id?"#fff":T.textSec}}>{m.l}</button>)}
        </div>
      </div>
    </Card>

    {mode==="week"&&<div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>
      {wk.map((day,i)=>{const k=fmtD(day);const dt=byDate[k]||[];const isT=same(day,TODAY);const isWe=i>=5;
        return<div key={k} style={{background:isT?T.cardAlt:T.card,border:`1px solid ${isT?"rgba(124,106,239,.35)":T.border}`,borderRadius:10,minHeight:280,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"10px 10px 6px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:10,color:isWe?T.pink:T.textMuted,fontWeight:600}}>{dns[i]}</span><span style={{fontSize:16,fontWeight:800,color:isT?T.accent:T.text,background:isT?T.accentSoft:"transparent",width:isT?28:"auto",height:isT?28:"auto",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>{day.getDate()}</span></div>
            {dt.length>0&&<span style={{fontSize:10,fontWeight:700,color:T.textMuted,background:"rgba(255,255,255,.06)",padding:"1px 5px",borderRadius:3}}>{dt.length}</span>}
          </div>
          <div style={{padding:6,flex:1,display:"flex",flexDirection:"column",gap:3,overflowY:"auto"}}>
            {dt.sort((a,b)=>PRIORITIES.indexOf(a.priority)-PRIORITIES.indexOf(b.priority)).map(t=><div key={t.id} style={{padding:"5px 7px",borderRadius:6,background:t.isOverdue?T.dangerSoft:"rgba(255,255,255,.03)",border:t.isOverdue?"1px solid rgba(248,113,113,.15)":"1px solid transparent"}}>
              <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:3}}><span style={{color:stOf(t.status).c,fontSize:9}}>{stOf(t.status).i}</span><span style={{fontSize:9,color:T.textMuted,fontWeight:600}}>{t.id}</span>{t.isOverdue&&<span style={{fontSize:8,color:T.danger,fontWeight:700,marginLeft:"auto"}}>OVERDUE</span>}</div>
              <div style={{fontSize:10,fontWeight:600,color:T.text,lineHeight:1.3,marginBottom:3}}>{t.title}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:3}}><Avatar name={t.assignee?.name||"?"} initials={t.assignee?.av||"?"} size={16}/><span style={{fontSize:9,color:T.textMuted}}>{(t.assignee?.name||"").split(" ").pop()}</span></div><Bdg color={prioC[t.priority]?.c||T.textMuted} bg={prioC[t.priority]?.bg||T.surface} small>{t.priority?.[0]}</Bdg></div>
            </div>)}
          </div>
        </div>;})}
    </div>}

    {mode==="month"&&<Card style={{padding:12}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:4}}>{dns.map((d,i)=><div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:i>=5?T.pink:T.textMuted,padding:"5px 0"}}>{d}</div>)}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {moDates.map((day,idx)=>{const k=fmtD(day);const dt=byDate[k]||[];const isT=same(day,TODAY);const isCur=day.getMonth()===mo;
          return<div key={idx} style={{minHeight:72,padding:5,borderRadius:6,background:isT?T.cardAlt:isCur?T.card:"rgba(255,255,255,.01)",border:`1px solid ${isT?"rgba(124,106,239,.3)":isCur?T.border:"transparent"}`,opacity:isCur?1:.3}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,fontWeight:isT?800:600,color:isT?T.accent:T.text,background:isT?T.accentSoft:"transparent",width:isT?22:"auto",height:isT?22:"auto",borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{day.getDate()}</span>{dt.filter(t=>t.isOverdue).length>0&&<span style={{fontSize:8,color:T.danger,fontWeight:800}}>⚠{dt.filter(t=>t.isOverdue).length}</span>}</div>
            {dt.slice(0,2).map(t=><div key={t.id} style={{display:"flex",alignItems:"center",gap:3,padding:"1px 4px",borderRadius:3,background:t.isOverdue?"rgba(248,113,113,.1)":stOf(t.status).bg,fontSize:9,color:t.isOverdue?T.danger:stOf(t.status).c,marginBottom:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}><span style={{fontSize:7}}>{stOf(t.status).i}</span><span style={{overflow:"hidden",textOverflow:"ellipsis"}}>{t.title}</span></div>)}
            {dt.length>2&&<span style={{fontSize:9,color:T.textMuted}}>+{dt.length-2}</span>}
          </div>;})}
      </div>
    </Card>}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   VIEW: TEAM
   ═══════════════════════════════════════════════════════════════ */
function VTeam({tasks,filters,team}){
  const ft=applyF(tasks,filters);const byP=_.groupBy(ft,t=>t.assignee?.id);
  return<div style={{display:"flex",flexDirection:"column",gap:12}}>
    {team.map(m=>{const mt=byP[m.id]||[];const d=mt.filter(t=>t.status==="Done").length;const ov=mt.filter(t=>t.isOverdue).length;const p=mt.length?Math.round(d/mt.length*100):0;
      return<Card key={m.id}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <Avatar name={m.name} initials={m.av} size={38}/>
          <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14,fontWeight:700,color:T.text}}>{m.name}</span><span style={{fontSize:11,color:T.textMuted,background:"rgba(255,255,255,.04)",padding:"1px 6px",borderRadius:4}}>{m.role}</span></div><div style={{display:"flex",gap:10,marginTop:3,fontSize:12,color:T.textSec}}><span>{mt.length} tasks</span>{ov>0&&<Bdg color={T.danger} bg={T.dangerSoft} small>⚠{ov} overdue</Bdg>}</div></div>
          <div style={{fontSize:24,fontWeight:800,color:p===100?T.ok:p>60?T.info:p>30?T.warn:T.danger}}>{p}%</div>
        </div>
        <PBar value={p} color={p===100?T.ok:p>60?T.info:T.warn} h={4}/>
        <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:2}}>
          {mt.sort((a,b)=>PRIORITIES.indexOf(a.priority)-PRIORITIES.indexOf(b.priority)).map(t=><div key={t.id} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 8px",borderRadius:6,background:t.isOverdue?"rgba(248,113,113,.05)":"rgba(255,255,255,.02)",border:t.isOverdue?"1px solid rgba(248,113,113,.1)":"1px solid transparent",fontSize:12}}>
            <span style={{color:stOf(t.status).c,fontSize:12}}>{stOf(t.status).i}</span>
            <span style={{color:T.textMuted,fontWeight:600,minWidth:42}}>{t.id}</span>
            <span style={{flex:1,color:T.text,fontWeight:500}}>{t.title}</span>
            <Bdg color={prioC[t.priority]?.c||T.textMuted} bg={prioC[t.priority]?.bg||T.surface} small>{t.priority}</Bdg>
            <span style={{color:t.isOverdue?T.danger:T.textMuted,fontSize:11,minWidth:65,textAlign:"right",fontWeight:t.isOverdue?600:400}}>{t.isOverdue?"⚠ ":""}{t.deadline}</span>
            <div style={{width:40}}><PBar value={t.progress} color={t.isOverdue?T.danger:stOf(t.status).c} h={3}/></div>
          </div>)}
        </div>
      </Card>;})}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   VIEW: KANBAN
   ═══════════════════════════════════════════════════════════════ */
function VKanban({tasks,filters}){
  const ft=applyF(tasks,filters);
  const cols=[...new Set(ft.map(t=>t.status))].sort((a,b)=>STATUSES.indexOf(a)-STATUSES.indexOf(b));
  return<div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:8,minHeight:360}}>
    {cols.map(st=>{const col=ft.filter(t=>t.status===st).sort((a,b)=>PRIORITIES.indexOf(a.priority)-PRIORITIES.indexOf(b.priority));const cfg=stOf(st);
      return<div key={st} style={{flex:1,minWidth:210,display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,padding:"0 4px"}}><div style={{width:8,height:8,borderRadius:2,background:cfg.c}}/><span style={{fontSize:13,fontWeight:700,color:T.text}}>{st}</span><span style={{fontSize:11,fontWeight:700,color:T.textMuted,background:"rgba(255,255,255,.05)",padding:"1px 6px",borderRadius:8,marginLeft:"auto"}}>{col.length}</span></div>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:6,padding:4,background:"rgba(255,255,255,.01)",borderRadius:9,border:`1px solid ${T.border}`}}>
          {col.map(t=><div key={t.id} style={{background:T.card,border:`1px solid ${t.isOverdue?"rgba(248,113,113,.2)":T.border}`,borderRadius:8,padding:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:10,color:T.textMuted,fontWeight:600}}>{t.id}</span><Bdg color={prioC[t.priority]?.c||T.textMuted} bg={prioC[t.priority]?.bg||T.surface} small>{t.priority}</Bdg></div>
            <div style={{fontSize:12,fontWeight:600,color:T.text,lineHeight:1.3,marginBottom:7}}>{t.title}</div>
            <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:6,fontSize:10,color:T.textMuted}}><span style={{background:"rgba(255,255,255,.04)",padding:"1px 5px",borderRadius:3}}>{t.module}</span><span>•</span><span>{t.sp} SP</span></div>
            <PBar value={t.progress} color={t.isOverdue?T.danger:cfg.c} h={3}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:7}}><div style={{display:"flex",alignItems:"center",gap:4}}><Avatar name={t.assignee?.name||"?"} initials={t.assignee?.av||"?"} size={18}/><span style={{fontSize:10,color:T.textSec}}>{t.assignee?.name}</span></div><span style={{fontSize:9,color:t.isOverdue?T.danger:T.textMuted}}>{t.deadline}</span></div>
          </div>)}
        </div>
      </div>;})}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════ */
export default function App(){
  const br=useDataBridge();
  const[view,setView]=useState("overview");
  const[filters,setFilters]=useState({sprint:"all",member:"all",priority:"all",module:"all"});
  const[search,setSearch]=useState("");
  const[showConn,setShowConn]=useState(false);
  const[showCreate,setShowCreate]=useState(false);

  const VIEWS=[
    {id:"overview",label:"Tổng quan",icon:"◫"},
    {id:"charts",label:"Charts",icon:"📊"},
    {id:"calendar",label:"Calendar",icon:"📅"},
    {id:"team",label:"Team",icon:"◉"},
    {id:"kanban",label:"Kanban",icon:"▦"},
  ];

  const filtered=useMemo(()=>{
    let r=applyF(br.tasks,filters);
    if(search){const q=search.toLowerCase();r=r.filter(t=>t.title.toLowerCase().includes(q)||t.id.toLowerCase().includes(q)||(t.assignee?.name||"").toLowerCase().includes(q));}
    return r;
  },[br.tasks,filters,search]);

  const modules=[...new Set(br.tasks.map(t=>t.module))];
  const sel={padding:"5px 9px",borderRadius:7,border:`1px solid ${T.border}`,background:T.surface,color:T.text,fontSize:12,outline:"none",cursor:"pointer"};

  return(
    <div style={{fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:T.bg,color:T.text,minHeight:"100vh",paddingBottom:40}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:${T.borderLight};border-radius:3px}::selection{background:${T.accent};color:#fff}`}</style>

      {showConn&&<ConnPanel br={br} onClose={()=>setShowConn(false)}/>}
      {showCreate&&<CreateModal br={br} onClose={()=>setShowCreate(false)}/>}

      {/* ── HEADER ──────────────────────────────────────────── */}
      <div style={{background:`linear-gradient(135deg,${T.surface},${T.card})`,borderBottom:`1px solid ${T.border}`,padding:"20px 24px 16px",marginBottom:20}}>
        <div style={{maxWidth:1240,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:br.src==="iframe"?T.ok:br.src==="manual"?T.info:T.warn,boxShadow:`0 0 8px ${br.src==="iframe"?T.ok:T.warn}`}}/>
                <span style={{fontSize:10,color:br.src==="iframe"?T.ok:T.textSec,fontWeight:600,letterSpacing:1.2,textTransform:"uppercase"}}>{br.src==="iframe"?"Live Connected":br.src==="manual"?"Manual Import":"Sample Data"}</span>
                {br.lastSync&&<span style={{fontSize:10,color:T.textMuted}}>• {br.lastSync.toLocaleTimeString("vi-VN")}</span>}
              </div>
              <h1 style={{fontSize:22,fontWeight:800,color:T.text,letterSpacing:-.5}}>Project Task Progress</h1>
              <p style={{fontSize:12,color:T.textSec,marginTop:2}}>Wolffun Game — Review 360° Integration</p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <div style={{position:"relative"}}><input type="text" placeholder="Tìm task, người..." value={search} onChange={e=>setSearch(e.target.value)} style={{padding:"7px 10px 7px 30px",borderRadius:8,border:`1px solid ${T.border}`,background:T.bg,color:T.text,fontSize:12,width:180,outline:"none"}}/><span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:13}}>⌕</span></div>
              <button onClick={()=>br.refresh()} style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${T.border}`,background:T.surface,color:T.textSec,fontSize:12,fontWeight:600,cursor:"pointer"}} title="Refresh data">↻ Refresh</button>
              <button onClick={()=>setShowConn(true)} style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${T.accent}`,background:T.accentSoft,color:T.accent,fontSize:12,fontWeight:600,cursor:"pointer"}}>🔗 Kết nối</button>
              <button onClick={()=>setShowCreate(true)} style={{padding:"7px 14px",borderRadius:8,border:"none",background:T.accent,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>✚ Tạo Task</button>
            </div>
          </div>
          <TabBar tabs={VIEWS} active={view} onChange={setView}/>
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────── */}
      <div style={{maxWidth:1240,margin:"0 auto",padding:"0 24px"}}>
        <div style={{display:"flex",gap:7,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:11,color:T.textMuted,fontWeight:600}}>Lọc:</span>
          <select value={filters.sprint} onChange={e=>setFilters(f=>({...f,sprint:e.target.value}))} style={sel}><option value="all">Tất cả Sprint</option>{br.sprints.map(s=><option key={s.id} value={s.id}>{s.name}{s.status==="active"?" ●":""}</option>)}</select>
          <select value={filters.member} onChange={e=>setFilters(f=>({...f,member:e.target.value}))} style={sel}><option value="all">Tất cả người</option>{br.team.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
          <select value={filters.priority} onChange={e=>setFilters(f=>({...f,priority:e.target.value}))} style={sel}><option value="all">Priority</option>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select>
          <select value={filters.module} onChange={e=>setFilters(f=>({...f,module:e.target.value}))} style={sel}><option value="all">Module</option>{modules.map(m=><option key={m}>{m}</option>)}</select>
          {Object.values(filters).some(v=>v!=="all")&&<button onClick={()=>setFilters({sprint:"all",member:"all",priority:"all",module:"all"})} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${T.danger}`,background:T.dangerSoft,color:T.danger,fontSize:11,fontWeight:600,cursor:"pointer"}}>✕ Xóa</button>}
          <span style={{marginLeft:"auto",fontSize:12,color:T.textMuted}}>{filtered.length} tasks</span>
        </div>

        {view==="overview"&&<VOverview tasks={br.tasks} filters={filters}/>}
        {view==="charts"&&<VCharts tasks={br.tasks} filters={filters} sprints={br.sprints} team={br.team}/>}
        {view==="calendar"&&<VCalendar tasks={br.tasks} filters={filters}/>}
        {view==="team"&&<VTeam tasks={br.tasks} filters={filters} team={br.team}/>}
        {view==="kanban"&&<VKanban tasks={br.tasks} filters={filters}/>}
      </div>
    </div>
  );
}
