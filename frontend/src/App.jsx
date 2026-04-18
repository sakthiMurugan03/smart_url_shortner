import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Area, AreaChart,
} from "recharts";

const API = "http://127.0.0.1:8000";

const Icon = ({ d, size = 15, color = "#475569" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d={d} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Spinner = ({ size = 13, color = "#fff" }) => (
  <span style={{
    display:"inline-block", width:size, height:size,
    border:"2px solid rgba(255,255,255,.2)", borderTopColor:color,
    borderRadius:"50%", animation:"spin .65s linear infinite", flexShrink:0,
  }} />
);

const LiveDot = ({ on }) => (
  <span style={{ position:"relative", display:"inline-flex", width:8, height:8, flexShrink:0 }}>
    {on && <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:"rgba(74,222,128,.4)", animation:"ping 1.4s ease-out infinite" }} />}
    <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:on?"#4ade80":"#374151", transition:"background .4s" }} />
  </span>
);

const Toast = ({ msg, type }) => {
  if (!msg) return null;
  const ok = type !== "error";
  return (
    <div style={{
      position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
      background:ok?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)",
      border:`1px solid ${ok?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`,
      color:ok?"#4ade80":"#f87171",
      borderRadius:10, padding:"9px 20px", fontSize:13.5, fontWeight:500,
      zIndex:999, whiteSpace:"nowrap", animation:"slideUp .22s ease",
    }}>{msg}</div>
  );
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0d0d18", border:"1px solid rgba(255,255,255,.08)", borderRadius:9, padding:"8px 14px", fontSize:12.5 }}>
      <p style={{ margin:"0 0 3px", color:"#475569" }}>{label}</p>
      <p style={{ margin:0, fontWeight:600, color:"#818cf8" }}>{payload[0].value} clicks</p>
    </div>
  );
};

const Field = ({ iconD, placeholder, value, onChange, onKeyDown }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position:"relative", flex:1 }}>
      <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", display:"flex" }}>
        <Icon d={iconD} size={15} color={focused?"#6366f1":"#334155"} />
      </span>
      <input
        placeholder={placeholder} value={value} onChange={onChange} onKeyDown={onKeyDown}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{
          width:"100%", height:44, fontFamily:"inherit",
          background:focused?"rgba(99,102,241,.05)":"rgba(255,255,255,.03)",
          border:`1px solid ${focused?"rgba(99,102,241,.4)":"rgba(255,255,255,.07)"}`,
          borderRadius:11, padding:"0 14px 0 39px", color:"#f1f5f9", fontSize:14,
          outline:"none", transition:"border-color .2s, background .2s",
        }}
      />
    </div>
  );
};

const StatCard = ({ label, value, sub, accent="#818cf8", flash=false }) => (
  <div style={{
    flex:1, background:"rgba(255,255,255,.03)",
    border:`1px solid ${flash?"rgba(99,102,241,.35)":"rgba(255,255,255,.06)"}`,
    borderRadius:12, padding:"14px 15px", transition:"border-color .35s",
  }}>
    <p style={{ fontSize:10.5, color:"#334155", textTransform:"uppercase", letterSpacing:".07em", marginBottom:7 }}>{label}</p>
    <p style={{ fontSize:24, fontWeight:600, color:accent, letterSpacing:"-.5px", lineHeight:1, animation:flash?"flashPop .5s ease":"none" }}>
      {value ?? "—"}
    </p>
    {sub && <p style={{ fontSize:11, color:"#334155", marginTop:5 }}>{sub}</p>}
  </div>
);

const iconBtn = {
  width:32, height:32, borderRadius:8, flexShrink:0,
  background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.08)",
  cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
};

/* ══════════════════════════════ APP ══════════════════════════════ */
export default function App() {
  const [url, setUrl]           = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [stats, setStats]       = useState(null);
  const [wsStatus, setWsStatus] = useState("connecting");
  const [loading, setLoading]   = useState(false);
  const [aLoading, setALoading] = useState(false);
  const [copied, setCopied]     = useState(false);
  const [liveHits, setLiveHits] = useState(0);
  const [flash, setFlash]       = useState(false);
  const [toast, setToast]       = useState({ msg:"", type:"ok" });
  const shortUrlRef             = useRef(shortUrl);
  shortUrlRef.current = shortUrl;

  const showToast = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast({msg:"",type:"ok"}),3000); };
  const triggerFlash = () => { setFlash(true); setTimeout(()=>setFlash(false),700); };

  /* WebSocket */
  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:8000/ws");
    ws.onopen  = () => setWsStatus("live");
    ws.onclose = () => setWsStatus("disconnected");
    ws.onerror = () => setWsStatus("disconnected");
    ws.onmessage = () => {
      if (!shortUrlRef.current) return;
      setLiveHits(n=>n+1);
      triggerFlash();
      (async () => {
        try {
          const code = shortUrlRef.current.split("/").pop();
          const res = await axios.get(`${API}/analytics/${code}`);
          setStats(res.data);
        } catch {}
      })();
    };
    return () => ws.close();
  }, []);

  /* Shorten */
  const shorten = async () => {
    if (!url.trim()) return showToast("Enter a URL first.", "error");
    setLoading(true);
    try {
      let fixedUrl = url.trim();
      if (!fixedUrl.startsWith("http")) fixedUrl = "https://" + fixedUrl;
      const res = await axios.post(`${API}/shorten`, null, { params:{ long_url:fixedUrl } });
      setShortUrl(res.data.short_url);
      setStats(null); setLiveHits(0);
      showToast("Link created!");
    } catch { showToast("Failed to shorten. Check the backend.", "error"); }
    setLoading(false);
  };

  /* Analytics */
  const loadAnalytics = async () => {
    setALoading(true);
    try {
      const code = shortUrl.split("/").pop();
      const res = await axios.get(`${API}/analytics/${code}`);
      setStats(res.data);
    } catch { showToast("Could not load analytics.", "error"); }
    setALoading(false);
  };

  const copy = () => { navigator.clipboard.writeText(shortUrl); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  const ICONS = {
    link:  "M6.5 9.5a4 4 0 005.657-5.657L10.5 2.19A4 4 0 004.843 7.847L6.5 9.5zm3 0a4 4 0 00-5.657 5.657l1.657 1.653A4 4 0 0011.157 8.153L9.5 9.5",
    copy:  "M5 5h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM3 11V3h8",
    check: "M3 8l3.5 3.5 6.5-7",
    clock: "M8 4v4l2.5 2.5M8 2a6 6 0 100 12A6 6 0 008 2z",
    user:  "M8 7a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0",
    chart: "M2 12l4-4 3 2 5-6",
    arrow: "M2 8h12M10 4l4 4-4 4",
    ext:   "M11 2h3v3M14 2L8 8M6 3H3v10h10V10",
  };

  const wsColor = wsStatus==="live"?"#4ade80":wsStatus==="connecting"?"#fbbf24":"#f87171";
  const wsLabel = wsStatus==="live"?"Live":wsStatus==="connecting"?"Connecting…":"Disconnected";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#07070f;}
        input::placeholder{color:#1e293b;}
        @keyframes spin     {to{transform:rotate(360deg);}}
        @keyframes ping     {0%{transform:scale(1);opacity:.7;}100%{transform:scale(2.4);opacity:0;}}
        @keyframes slideUp  {from{opacity:0;transform:translateY(8px) translateX(-50%);}to{opacity:1;transform:translateY(0) translateX(-50%);}}
        @keyframes fadeIn   {from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
        @keyframes flashPop {0%,100%{transform:scale(1);}40%{transform:scale(1.1);}}
      `}</style>

      <div style={{
        minHeight:"100vh", background:"#07070f",
        fontFamily:"'Sora',-apple-system,sans-serif",
        display:"flex", alignItems:"flex-start", justifyContent:"center",
        padding:"44px 16px 80px", position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse 55% 45% at 15% 0%,rgba(99,102,241,.13),transparent 70%)" }} />
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse 45% 40% at 85% 100%,rgba(16,185,129,.08),transparent 70%)" }} />

        <div style={{ width:"100%", maxWidth:520, position:"relative", zIndex:1 }}>

          {/* NAV */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:38 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:35, height:35, borderRadius:10, background:"linear-gradient(135deg,#6366f1,#06b6d4)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon d={ICONS.link} size={16} color="white" />
              </div>
              <span style={{ fontSize:16, fontWeight:600, color:"#f1f5f9", letterSpacing:"-.3px" }}>sniplink</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:7, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, padding:"5px 13px" }}>
              <LiveDot on={wsStatus==="live"} />
              <span style={{ fontSize:12, fontWeight:500, color:wsColor }}>{wsLabel}</span>
            </div>
          </div>

          {/* HERO */}
          <div style={{ marginBottom:28 }}>
            <h1 style={{ fontSize:34, fontWeight:600, color:"#f8fafc", letterSpacing:"-.8px", lineHeight:1.18, marginBottom:9 }}>
              Smart links with<br />live analytics.
            </h1>
            <p style={{ fontSize:14.5, color:"#475569", lineHeight:1.65 }}>
              Shorten any URL and get real-time click data — total, unique, daily trends &amp; recent visitors.
            </p>
          </div>

          {/* INPUT CARD */}
          <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:15, padding:18 }}>
            <div style={{ display:"flex", gap:10 }}>
              <Field iconD={ICONS.link} placeholder="Paste your long URL here…" value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&shorten()} />
              <button onClick={shorten} disabled={loading} style={{
                height:44, padding:"0 22px", flexShrink:0,
                background:"linear-gradient(135deg,#6366f1,#06b6d4)",
                border:"none", borderRadius:11, color:"#fff", fontSize:14, fontWeight:500,
                cursor:"pointer", display:"flex", alignItems:"center", gap:8, opacity:loading?.7:1,
              }}>
                {loading ? <Spinner /> : <><Icon d={ICONS.arrow} size={14} color="white" />Shorten</>}
              </button>
            </div>

            {shortUrl && (
              <div style={{
                marginTop:14, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10,
                background:"rgba(99,102,241,.07)", border:"1px solid rgba(99,102,241,.18)",
                borderRadius:11, padding:"11px 14px", animation:"fadeIn .3s ease",
              }}>
                <a href={shortUrl} target="_blank" rel="noreferrer" style={{ fontSize:13.5, color:"#818cf8", wordBreak:"break-all", flex:1 }}>
                  {shortUrl}
                </a>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <button onClick={copy} title="Copy" style={iconBtn}>
                    <Icon d={copied?ICONS.check:ICONS.copy} size={14} color={copied?"#4ade80":"#64748b"} />
                  </button>
                  <a href={shortUrl} target="_blank" rel="noreferrer" title="Open" style={{ ...iconBtn, textDecoration:"none" }}>
                    <Icon d={ICONS.ext} size={14} color="#64748b" />
                  </a>
                  <button onClick={loadAnalytics} disabled={aLoading} style={{ ...iconBtn, width:"auto", padding:"0 12px", gap:6, color:"#94a3b8", fontSize:12.5, fontWeight:500 }}>
                    {aLoading ? <Spinner size={12} /> : <Icon d={ICONS.chart} size={13} color="#64748b" />}
                    {aLoading ? "Loading…" : "Analytics"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DASHBOARD */}
          {stats && (
            <div style={{ marginTop:14, animation:"fadeIn .35s ease", display:"flex", flexDirection:"column", gap:12 }}>

              {/* Stat row */}
              <div style={{ display:"flex", gap:10 }}>
                <StatCard label="Total clicks"     value={stats.total}  accent="#818cf8" flash={flash} />
                <StatCard label="Unique visitors"  value={stats.unique} accent="#34d399" />
                <StatCard label="Live this session" value={liveHits}    accent="#f97316" sub="via WebSocket" flash={flash} />
              </div>

              {/* Area chart */}
              {stats.daily?.length > 0 && (
                <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"18px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                    <p style={{ fontSize:11, fontWeight:600, color:"#334155", textTransform:"uppercase", letterSpacing:".08em" }}>Daily clicks</p>
                    <p style={{ fontSize:11, color:"#1e293b" }}>{stats.daily.length} day{stats.daily.length!==1?"s":""}</p>
                  </div>
                  <ResponsiveContainer width="100%" height={190}>
                    <AreaChart data={stats.daily} margin={{ top:4, right:4, left:-24, bottom:0 }}>
                      <defs>
                        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.22} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%"   stopColor="#818cf8" />
                          <stop offset="100%" stopColor="#34d399" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill:"#334155", fontSize:11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:"#334155", fontSize:11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="clicks"
                        stroke="url(#lineGrad)" strokeWidth={2.5} fill="url(#areaFill)"
                        dot={{ r:3.5, fill:"#818cf8", strokeWidth:0 }}
                        activeDot={{ r:5.5, fill:"#818cf8", stroke:"#07070f", strokeWidth:2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Recent visitors */}
              {stats.recent?.length > 0 && (
                <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"16px 18px" }}>
                  <p style={{ fontSize:11, fontWeight:600, color:"#334155", textTransform:"uppercase", letterSpacing:".08em", marginBottom:14 }}>
                    Recent visitors
                  </p>
                  <div style={{ display:"flex", flexDirection:"column" }}>
                    {stats.recent.map((r, i) => (
                      <div key={i} style={{
                        display:"flex", justifyContent:"space-between", alignItems:"center",
                        padding:"10px 0",
                        borderBottom: i < stats.recent.length-1 ? "1px solid rgba(255,255,255,.04)" : "none",
                      }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{
                            width:32, height:32, borderRadius:"50%",
                            background:"rgba(99,102,241,.12)", border:"1px solid rgba(99,102,241,.2)",
                            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                          }}>
                            <Icon d={ICONS.user} size={13} color="#818cf8" />
                          </div>
                          <div>
                            <p style={{ fontSize:13, color:"#e2e8f0", fontWeight:500, fontFamily:"'Courier New',monospace" }}>{r.ip}</p>
                            <p style={{ fontSize:11, color:"#334155", marginTop:2 }}>visitor</p>
                          </div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <Icon d={ICONS.clock} size={12} color="#334155" />
                          <span style={{ fontSize:12, color:"#475569" }}>{r.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <p style={{ textAlign:"center", fontSize:12, color:"#1e293b", marginTop:28 }}>
            sniplink · events stream live via WebSocket
          </p>
        </div>
      </div>

      <Toast msg={toast.msg} type={toast.type} />
    </>
  );
}