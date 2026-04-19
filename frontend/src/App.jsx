import { useState, useEffect, useRef } from "react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Area, AreaChart, BarChart, Bar, Cell,
} from "recharts";

/* ── Environment-driven API base (set in frontend/.env) ── */
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

/* ── Auth header helper ── */
const getHeaders = () => ({ "x-api-key": localStorage.getItem("apiKey") || "" });

/* ─────────────────────── SHARED COMPONENTS ─────────────────────── */

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
      <p style={{ margin:0, fontWeight:600, color:"#818cf8" }}>{payload[0].value} requests</p>
    </div>
  );
};

const Field = ({ iconD, placeholder, value, onChange, onKeyDown, error, hint }) => {
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? "rgba(248,113,113,.6)"
    : focused ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.07)";
  const bg = error
    ? "rgba(248,113,113,.04)"
    : focused ? "rgba(99,102,241,.05)" : "rgba(255,255,255,.03)";
  return (
    <div style={{ flex:1 }}>
      <div style={{ position:"relative" }}>
        <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", display:"flex" }}>
          <Icon d={iconD} size={15} color={error ? "#f87171" : focused ? "#6366f1" : "#334155"} />
        </span>
        <input
          placeholder={placeholder} value={value} onChange={onChange} onKeyDown={onKeyDown}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{
            width:"100%", height:44, fontFamily:"inherit",
            background:bg, border:`1px solid ${borderColor}`,
            borderRadius:11, padding:"0 14px 0 39px", color:"#f1f5f9", fontSize:14,
            outline:"none", transition:"border-color .2s, background .2s",
          }}
        />
      </div>
      {error && <p style={{ fontSize:11, color:"#f87171", marginTop:5, paddingLeft:2 }}>{error}</p>}
      {hint && !error && <p style={{ fontSize:11, color:"#4ade80", marginTop:5, paddingLeft:2 }}>{hint}</p>}
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

const InfoTip = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position:"relative", display:"inline-flex" }}
      onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      <span style={{
        width:14, height:14, borderRadius:"50%", border:"1px solid rgba(255,255,255,.15)",
        display:"inline-flex", alignItems:"center", justifyContent:"center",
        fontSize:9, color:"#475569", cursor:"default", userSelect:"none",
      }}>?</span>
      {show && (
        <span style={{
          position:"absolute", bottom:"calc(100% + 6px)", left:"50%", transform:"translateX(-50%)",
          background:"#1a1a2e", border:"1px solid rgba(255,255,255,.1)",
          borderRadius:8, padding:"7px 11px", fontSize:11.5, color:"#94a3b8",
          whiteSpace:"nowrap", zIndex:50, lineHeight:1.5,
          boxShadow:"0 8px 24px rgba(0,0,0,.4)",
        }}>{text}</span>
      )}
    </span>
  );
};

const SectionLabel = ({ children }) => (
  <p style={{ fontSize:11, fontWeight:600, color:"#334155", textTransform:"uppercase", letterSpacing:".08em", marginBottom:14 }}>
    {children}
  </p>
);

const iconBtn = {
  width:32, height:32, borderRadius:8, flexShrink:0,
  background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.08)",
  cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
};

const cardWrap = {
  background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)",
  borderRadius:14, padding:"16px 18px",
};

/* ═══════════════════════════════ APP ═══════════════════════════════ */
export default function App() {
  const [url, setUrl]               = useState("");
  const [alias, setAlias]           = useState("");
  const [aliasError, setAliasError] = useState("");
  const [aliasHint, setAliasHint]   = useState("");
  const [shortUrl, setShortUrl]     = useState("");
  const [stats, setStats]           = useState(null);
  const [wsStatus, setWsStatus]     = useState("connecting");
  const [loading, setLoading]       = useState(false);
  const [aLoading, setALoading]     = useState(false);
  const [copied, setCopied]         = useState(false);
  const [liveHits, setLiveHits]     = useState(0);
  const [flash, setFlash]           = useState(false);
  const [toast, setToast]           = useState({ msg:"", type:"ok" });
  const [apiKey, setApiKey]         = useState(localStorage.getItem("apiKey") || "");
  const [apiStats, setApiStats]     = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [spike, setSpike]           = useState(false);
  const [simulating, setSimulating] = useState(false);
  const shortUrlRef                 = useRef(shortUrl);
  shortUrlRef.current = shortUrl;

  const showToast = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast({msg:"",type:"ok"}),3500); };
  const triggerFlash = () => { setFlash(true); setTimeout(()=>setFlash(false),700); };

  /* ── Auto-generate API key on first load ── */
  useEffect(() => {
    const key = localStorage.getItem("apiKey");
    if (!key) {
      fetch(`${API}/api/generate-api-key`, { method:"POST" })
        .then(res => { if (!res.ok) throw new Error("Failed"); return res.json(); })
        .then(data => {
          localStorage.setItem("apiKey", data.api_key);
          setApiKey(data.api_key);
        })
        .catch(() => showToast("Failed to generate API key", "error"));
    }
  }, []);

  /* ── Regenerate key manually ── */
  const generateKey = async () => {
    try {
      const res  = await fetch(`${API}/api/generate-api-key`, { method:"POST" });
      if (!res.ok) throw new Error("Failed to generate key");
      const data = await res.json();
      localStorage.setItem("apiKey", data.api_key);
      setApiKey(data.api_key);
      showToast("API key generated");
    } catch {
      showToast("Failed to generate API key", "error");
    }
  };

  /* ── Fetch rate-limit usage ── */
  const fetchUsage = async () => {
    try {
      const res = await fetch(`${API}/api/api-usage`, { headers: getHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const used      = data.current_window ?? data.total_usage ?? data.used ?? data.requests ?? 0;
      const limit     = data.limit ?? data.max ?? 10;
      const remaining = data.remaining ?? Math.max(0, limit - used);
      const backendSaysThrottled =
        data.status === "throttled" ||
        data.status === "rate_limited" ||
        data.throttled === true ||
        data.rate_limited === true;
      const resolvedStatus = (backendSaysThrottled || remaining <= 0) ? "throttled" : "active";
      setApiStats({ current_window: used, remaining, limit, status: resolvedStatus });
    } catch {}
  };

  /* ── Poll usage every 3 s; tick countdown every 1 s ── */
  useEffect(() => {
    if (!apiKey) return;
    fetchUsage();
    const usageInterval = setInterval(fetchUsage, 3000);
    const countInterval = setInterval(() => setSecondsLeft(s => s <= 1 ? 60 : s - 1), 1000);
    return () => { clearInterval(usageInterval); clearInterval(countInterval); };
  }, [apiKey]);

  /* ── WebSocket — dynamic URL derived from API env var, with auto-reconnect ── */
  useEffect(() => {
    let ws;
    const connect = () => {
      const WS = API.startsWith("https") ? API.replace("https", "wss") : API.replace("http", "ws");
      ws = new WebSocket(`${WS}/ws`);
      ws.onopen    = () => setWsStatus("live");
      ws.onclose   = () => {
        setWsStatus("disconnected");
        setTimeout(connect, 2000);
      };
      ws.onerror   = () => ws.close();
      ws.onmessage = () => {
        if (!shortUrlRef.current) return;
        setLiveHits(n => n + 1);
        triggerFlash();
        (async () => {
          try {
            const code = shortUrlRef.current.split("/").pop();
            const res  = await fetch(`${API}/api/analytics/${code}`, { headers: getHeaders() });
            if (res.ok) setStats(await res.json());
          } catch {}
        })();
      };
    };
    connect();
    return () => ws?.close();
  }, []);

  /* ── Shorten ── */
  const shorten = async () => {
    setAliasError(""); setAliasHint("");
    if (!url.trim()) return showToast("Enter a valid URL", "error");
    const fixedUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/shorten`, {
        method: "POST",
        headers: { "Content-Type":"application/json", ...getHeaders() },
        body: JSON.stringify({ long_url: fixedUrl, alias: alias.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) { showToast("Too many requests. Please wait for reset", "error"); setLoading(false); return; }
        if (res.status === 401) { showToast("API key missing or invalid", "error"); setLoading(false); return; }
        if (res.status === 409) { setAliasError("Alias already taken"); showToast("Alias already taken", "error"); setLoading(false); return; }
        throw new Error(data.detail || "Error");
      }
      setShortUrl(data.short_url);
      setStats(null); setLiveHits(0);
      if (alias.trim()) setAliasHint("Custom alias applied");
      showToast("Short link generated successfully");
      setSpike(true); setTimeout(() => setSpike(false), 500);
      setSecondsLeft(60); fetchUsage();
    } catch (err) {
      showToast(err.message || "Something went wrong. Please try again", "error");
    }
    setLoading(false);
  };

  /* ── Load analytics ── */
  const loadAnalytics = async () => {
    setALoading(true);
    try {
      const code = shortUrl.split("/").pop();
      const res  = await fetch(`${API}/api/analytics/${code}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStats({
          total:     data.total     ?? 0,
          unique:    data.unique    ?? 0,
          daily:     data.daily     ?? [],
          hourly:    data.hourly    ?? [],
          devices:   data.devices   ?? [],
          countries: data.countries ?? [],
          recent:    data.recent    ?? [],
        });
      } else {
        showToast("Something went wrong. Please try again", "error");
      }
    } catch {
      showToast("Something went wrong. Please try again", "error");
    }
    setALoading(false);
  };

  /* ── Export CSV ── */
  const downloadCSV = () => {
    const code = shortUrl.split("/").pop();
    window.open(`${API}/api/export/${code}`);
  };

  /* ── Traffic simulator — sends 10 sequential pings to /api/ping/:code ── */
  const simulateTraffic = async () => {
    if (!shortUrl) return showToast("Create a link first", "error");
    setSimulating(true);
    const code = shortUrl.split("/").pop();
    try {
      for (let i = 0; i < 10; i++) {
        await fetch(`${API}/api/ping/${code}`, { headers: getHeaders() });
      }
      showToast("Traffic simulation complete");
    } catch {
      showToast("Simulation failed. Try again.", "error");
    }
    setSimulating(false);
  };

  /* ── Copy short link ── */
  const copy = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast("Link copied to clipboard");
  };

  /* ── Icon paths ── */
  const ICONS = {
    link:    "M6.5 9.5a4 4 0 005.657-5.657L10.5 2.19A4 4 0 004.843 7.847L6.5 9.5zm3 0a4 4 0 00-5.657 5.657l1.657 1.653A4 4 0 0011.157 8.153L9.5 9.5",
    copy:    "M5 5h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM3 11V3h8",
    check:   "M3 8l3.5 3.5 6.5-7",
    clock:   "M8 4v4l2.5 2.5M8 2a6 6 0 100 12A6 6 0 008 2z",
    user:    "M8 7a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0",
    chart:   "M2 12l4-4 3 2 5-6",
    arrow:   "M2 8h12M10 4l4 4-4 4",
    ext:     "M11 2h3v3M14 2L8 8M6 3H3v10h10V10",
    key:     "M11 5a2 2 0 11-4 0 2 2 0 014 0zM3 13l3.5-3.5M8.5 9.5L7 11l1 1M5 12l1 1",
    refresh: "M2 8a6 6 0 0110.93-3M14 8a6 6 0 01-10.93 3M14 5v3h-3M2 11v-3h3",
    zap:     "M9 2L4 9h4l-1 5 7-7H10l1-5z",
    at:      "M8 10a2 2 0 100-4 2 2 0 000 4zm4-2a4 4 0 11-8 0 4 4 0 018 0zm2 0c0 1.1-.3 2-.8 2.7-.5.6-1.2.9-2 .5-.8-.4-.8-1.2-.7-2.2",
    globe:   "M8 2a6 6 0 100 12A6 6 0 008 2zM2 8h12M8 2c-1.5 2-2.5 3.8-2.5 6s1 4 2.5 6M8 2c1.5 2 2.5 3.8 2.5 6s-1 4-2.5 6",
    mobile:  "M5 2h6a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1zm3 10h.01",
    desktop: "M2 3h12a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1zm4 9h4m-2 0v1",
    download:"M8 2v8m-3-3l3 3 3-3M3 13h10",
  };

  /* ── Derived display values ── */
  const wsColor = { live:"#4ade80", connecting:"#fbbf24", disconnected:"#f87171" }[wsStatus];
  const wsLabel = { live:"Live", connecting:"Connecting…", disconnected:"Disconnected" }[wsStatus];
  const apiKeyDisplay = apiKey ? `${apiKey.slice(0,8)}••••••••${apiKey.slice(-4)}` : "Generating…";
  const usagePct    = apiStats ? Math.min((apiStats.current_window / apiStats.limit) * 100, 100) : 0;
  const isThrottled = apiStats != null && apiStats.status === "throttled";
  const barColor    = isThrottled ? "#f87171" : usagePct > 80 ? "linear-gradient(90deg,#f97316,#f87171)" : "linear-gradient(90deg,#6366f1,#34d399)";

  const deviceData   = stats?.devices || [];
  const mobileCount  = deviceData.find(d => d.device === "mobile")?.count  || 0;
  const desktopCount = deviceData.find(d => d.device === "desktop")?.count || 0;
  const totalDevice  = mobileCount + desktopCount || 1;
  const mobilePct    = Math.round((mobileCount  / totalDevice) * 100);
  const desktopPct   = Math.round((desktopCount / totalDevice) * 100);
  const peakHour     = stats?.hourly?.length
    ? stats.hourly.reduce((a, b) => b.clicks > a.clicks ? b : a, stats.hourly[0])
    : null;

  /* ══════════════════════════ RENDER ══════════════════════════ */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#07070f;}
        input::placeholder{color:#1e293b;}
        @keyframes spin      {to{transform:rotate(360deg);}}
        @keyframes ping      {0%{transform:scale(1);opacity:.7;}100%{transform:scale(2.4);opacity:0;}}
        @keyframes slideUp   {from{opacity:0;transform:translateY(8px) translateX(-50%);}to{opacity:1;transform:translateY(0) translateX(-50%);}}
        @keyframes fadeIn    {from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
        @keyframes flashPop  {0%,100%{transform:scale(1);}40%{transform:scale(1.1);}}
        @keyframes spikeAnim {0%{transform:scale(1);}40%{transform:scale(1.12);}100%{transform:scale(1);}}
        @keyframes simPulse  {0%,100%{opacity:1;}50%{opacity:.35;}}
        .key-btn:hover    { background:rgba(255,255,255,.08) !important; border-color:rgba(255,255,255,.15) !important; }
        .copy-key-btn:hover { color:#a5b4fc !important; }
        .action-btn:hover { background:rgba(255,255,255,.08) !important; border-color:rgba(255,255,255,.14) !important; color:#e2e8f0 !important; }
        .shorten-btn:hover { opacity:.88 !important; }
        .shorten-btn:active { transform:scale(.98); }
      `}</style>

      <div style={{
        minHeight:"100vh", background:"#07070f",
        fontFamily:"'Sora',-apple-system,sans-serif",
        display:"flex", alignItems:"flex-start", justifyContent:"center",
        padding:"44px 16px 80px", position:"relative", overflow:"hidden",
      }}>
        {/* Ambient glows */}
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse 55% 45% at 15% 0%,rgba(99,102,241,.13),transparent 70%)" }} />
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse 45% 40% at 85% 100%,rgba(16,185,129,.08),transparent 70%)" }} />

        <div style={{ width:"100%", maxWidth:540, position:"relative", zIndex:1 }}>

          {/* ── NAV ── */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:38 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:35, height:35, borderRadius:10, background:"linear-gradient(135deg,#6366f1,#06b6d4)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon d={ICONS.link} size={16} color="white" />
              </div>
              <div>
                <span style={{ fontSize:16, fontWeight:600, color:"#f1f5f9", letterSpacing:"-.3px", display:"block" }}>sniplink</span>
                <span style={{ fontSize:9.5, color:"#1e293b", letterSpacing:".08em", textTransform:"uppercase" }}>rate-limited · real-time</span>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:7, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, padding:"5px 13px" }}>
              <LiveDot on={wsStatus==="live"} />
              <span style={{ fontSize:12, fontWeight:500, color:wsColor }}>{wsLabel}</span>
            </div>
          </div>

          {/* ── HERO ── */}
          <div style={{ marginBottom:32, textAlign:"center" }}>
            <h1 style={{ fontSize:33, fontWeight:600, color:"#f8fafc", letterSpacing:"-.8px", lineHeight:1.18, marginBottom:10 }}>
              Rate-Limited Smart Links<br />with Real-Time Analytics
            </h1>
            <p style={{ fontSize:14.5, color:"#475569", lineHeight:1.7, maxWidth:480, margin:"0 auto" }}>
              Create controlled, customizable short links with API-key access, rate limiting, and live analytics streaming.
            </p>
          </div>

          {/* ── API KEY PANEL ── */}
          <div style={{ marginBottom:10, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", borderRadius:13, padding:"14px 16px", animation:"fadeIn .3s ease" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
              <p style={{ fontSize:11, fontWeight:600, color:"#475569", textTransform:"uppercase", letterSpacing:".1em" }}>API Access Key</p>
              <InfoTip text="Required for all requests. Tracks usage and prevents abuse." />
            </div>

            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:9, minWidth:0 }}>
                <div style={{
                  width:30, height:30, borderRadius:8, flexShrink:0,
                  background: apiKey ? "rgba(99,102,241,.12)" : "rgba(251,191,36,.1)",
                  border:`1px solid ${apiKey?"rgba(99,102,241,.2)":"rgba(251,191,36,.2)"}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  {apiKey ? <Icon d={ICONS.key} size={13} color="#818cf8" /> : <Spinner size={11} color="#fbbf24" />}
                </div>
                <div style={{ minWidth:0 }}>
                  <p style={{ fontSize:11.5, color:apiKey?"#64748b":"#fbbf24", fontFamily:"'Courier New',monospace", letterSpacing:".04em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{apiKeyDisplay}</p>
                  <p style={{ fontSize:10, color:"#2d3748", marginTop:2 }}>Authenticates requests and enforces rate limits per user</p>
                </div>
              </div>
              <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                {apiKey && (
                  <button className="copy-key-btn" onClick={()=>{ navigator.clipboard.writeText(apiKey); showToast("API key copied"); }} title="Copy full key"
                    style={{ ...iconBtn, width:28, height:28, borderRadius:7, transition:"color .2s" }}>
                    <Icon d={ICONS.copy} size={12} color="#334155" />
                  </button>
                )}
                <button className="key-btn" onClick={generateKey} title="Regenerate API key"
                  style={{ height:28, padding:"0 10px", borderRadius:7, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", color:"#475569", fontSize:11, fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center", gap:5, transition:"all .2s" }}>
                  <Icon d={ICONS.refresh} size={11} color="#475569" />
                  Regenerate
                </button>
              </div>
            </div>

            {/* Rate limit bar */}
            {apiStats && (
              <div style={{ marginTop:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <span style={{ fontSize:11, color:"#475569" }}>
                      Requests (current window):{" "}
                      <span style={{ color:isThrottled?"#f87171":"#94a3b8", fontWeight:600 }}>{apiStats.current_window}</span>
                      <span style={{ color:"#2d3748" }}>/{apiStats.limit}</span>
                    </span>
                    <span style={{
                      fontSize:9.5, fontWeight:600, letterSpacing:".07em", textTransform:"uppercase",
                      color:isThrottled?"#f87171":"#4ade80",
                      background:isThrottled?"rgba(248,113,113,.08)":"rgba(74,222,128,.08)",
                      border:`1px solid ${isThrottled?"rgba(248,113,113,.2)":"rgba(74,222,128,.15)"}`,
                      borderRadius:20, padding:"2px 8px",
                    }}>
                      {isThrottled ? "System status: Throttled" : "System status: Active"}
                    </span>
                  </div>
                  <span style={{ fontSize:11, color:"#2d3748", fontFamily:"'Courier New',monospace" }}>
                    Window resets in {secondsLeft}s
                  </span>
                </div>
                <div style={{ width:"100%", height:5, background:"rgba(255,255,255,.05)", borderRadius:10, overflow:"hidden" }}>
                  <div style={{ width:`${usagePct}%`, height:"100%", background:barColor, borderRadius:10, transition:"width .4s ease", animation:spike?"spikeAnim .4s ease":"none" }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                  <span style={{ fontSize:11, color:"#2d3748" }}>Requests remaining: <span style={{ color:"#475569" }}>{apiStats.remaining}</span></span>
                  <span style={{ fontSize:11, color:"#2d3748" }}>{Math.round(usagePct)}% used</span>
                </div>
                {isThrottled && (
                  <div style={{ marginTop:8, padding:"7px 11px", borderRadius:8, background:"rgba(248,113,113,.06)", border:"1px solid rgba(248,113,113,.18)", fontSize:11.5, color:"#f87171" }}>
                    ⚠ Rate limit reached. Try again after reset.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── INPUT CARD ── */}
          <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:15, padding:18 }}>
            <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
              <Field iconD={ICONS.link} placeholder="Paste your long URL here…" value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&shorten()} />
              <button onClick={shorten} disabled={loading} className="shorten-btn" style={{
                height:44, padding:"0 20px", flexShrink:0,
                background:"linear-gradient(135deg,#6366f1,#06b6d4)",
                border:"none", borderRadius:11, color:"#fff", fontSize:13.5, fontWeight:500,
                cursor:"pointer", display:"flex", alignItems:"center", gap:7, opacity:loading?.7:1,
                transition:"opacity .2s, transform .15s", whiteSpace:"nowrap",
              }}>
                {loading ? <Spinner /> : <><Icon d={ICONS.arrow} size={14} color="white" />Generate Short Link</>}
              </button>
            </div>

            {/* Alias field */}
            <div style={{ marginTop:10 }}>
              <Field
                iconD={ICONS.at}
                placeholder="Custom alias (optional)"
                value={alias}
                onChange={e=>{ setAlias(e.target.value); setAliasError(""); setAliasHint(""); }}
                error={aliasError}
                hint={aliasHint}
              />
              {!aliasError && !aliasHint && (
                <p style={{ fontSize:11, color:"#2d3748", marginTop:5, paddingLeft:2 }}>
                  Create a personalized short link instead of a random code
                </p>
              )}
            </div>

            {/* Result */}
            {shortUrl && (
              <div style={{ marginTop:14, background:"rgba(99,102,241,.07)", border:"1px solid rgba(99,102,241,.18)", borderRadius:11, padding:"13px 14px", animation:"fadeIn .3s ease" }}>
                <p style={{ fontSize:10, color:"#6366f1", textTransform:"uppercase", letterSpacing:".1em", fontWeight:600, marginBottom:6 }}>Generated Short Link</p>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:8 }}>
                  <a href={shortUrl} target="_blank" rel="noreferrer" style={{ fontSize:13.5, color:"#818cf8", wordBreak:"break-all", flex:1 }}>{shortUrl}</a>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <button onClick={copy} title="Copy link" style={iconBtn}>
                      <Icon d={copied?ICONS.check:ICONS.copy} size={14} color={copied?"#4ade80":"#64748b"} />
                    </button>
                    <a href={shortUrl} target="_blank" rel="noreferrer" title="Open link" style={{ ...iconBtn, textDecoration:"none" }}>
                      <Icon d={ICONS.ext} size={14} color="#64748b" />
                    </a>
                  </div>
                </div>
                <p style={{ fontSize:11, color:"#334155", marginBottom:10 }}>Share or test this link to generate live analytics</p>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  <button onClick={loadAnalytics} disabled={aLoading} className="action-btn"
                    style={{ ...iconBtn, width:"auto", padding:"0 12px", gap:6, color:"#64748b", fontSize:12.5, fontWeight:500, transition:"all .2s" }}>
                    {aLoading ? <Spinner size={11} /> : <Icon d={ICONS.chart} size={13} color="#64748b" />}
                    {aLoading ? "Loading…" : "View Analytics"}
                  </button>
                  <button onClick={simulateTraffic} disabled={simulating} className="action-btn"
                    style={{ ...iconBtn, width:"auto", padding:"0 12px", gap:6, color:"#64748b", fontSize:12.5, fontWeight:500, transition:"all .2s" }}>
                    <Icon d={ICONS.zap} size={13} color={simulating?"#f97316":"#64748b"} />
                    <span style={{ animation:simulating?"simPulse 1s ease infinite":"none", color:simulating?"#f97316":"inherit" }}>
                      {simulating ? "Simulating traffic…" : "Simulate Traffic"}
                    </span>
                  </button>
                  <button onClick={downloadCSV} className="action-btn"
                    style={{ ...iconBtn, width:"auto", padding:"0 12px", gap:6, color:"#64748b", fontSize:12.5, fontWeight:500, transition:"all .2s" }}>
                    <Icon d={ICONS.download} size={13} color="#64748b" />
                    Export CSV
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── ANALYTICS DASHBOARD ── */}
          {stats ? (
            <div style={{ marginTop:14, animation:"fadeIn .35s ease", display:"flex", flexDirection:"column", gap:12 }}>

              {/* Stat cards */}
              <div style={{ display:"flex", gap:10 }}>
                <StatCard label="Total Requests"          value={stats.total}  accent="#818cf8" flash={flash} />
                <StatCard label="Unique Clients"          value={stats.unique} accent="#34d399" />
                <StatCard label="Live Events (WebSocket)" value={liveHits}     accent="#f97316" sub="this session" flash={flash} />
              </div>

              {/* Daily trend */}
              {stats.daily?.length > 0 && (
                <div style={cardWrap}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                    <SectionLabel>Request Trend (Daily)</SectionLabel>
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

              {/* Hourly bar chart */}
              {stats.hourly?.length > 0 && (
                <div style={cardWrap}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                    <SectionLabel>Traffic by Hour</SectionLabel>
                    {peakHour && (
                      <span style={{ fontSize:11, color:"#f97316", background:"rgba(249,115,22,.08)", border:"1px solid rgba(249,115,22,.2)", borderRadius:20, padding:"2px 9px" }}>
                        Peak: {peakHour.hour}
                      </span>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={130}>
                    <BarChart data={stats.hourly} margin={{ top:4, right:4, left:-24, bottom:0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fill:"#334155", fontSize:10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:"#334155", fontSize:10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="clicks" radius={[4,4,0,0]}>
                        {stats.hourly.map((entry, i) => (
                          <Cell key={i} fill={entry === peakHour ? "#f97316" : "rgba(99,102,241,.5)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Device + Countries row */}
              <div style={{ display:"flex", gap:12 }}>
                <div style={{ ...cardWrap, flex:1 }}>
                  <SectionLabel>Device Breakdown</SectionLabel>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {[
                      { label:"Desktop", pct:desktopPct, count:desktopCount, color:"#818cf8", icon:ICONS.desktop },
                      { label:"Mobile",  pct:mobilePct,  count:mobileCount,  color:"#34d399", icon:ICONS.mobile  },
                    ].map(({ label, pct, count, color, icon }) => (
                      <div key={label}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <Icon d={icon} size={12} color={color} />
                            <span style={{ fontSize:12, color:"#475569" }}>{label}</span>
                          </div>
                          <span style={{ fontSize:12, color, fontWeight:600 }}>{count} <span style={{ color:"#334155", fontWeight:400 }}>({pct}%)</span></span>
                        </div>
                        <div style={{ width:"100%", height:4, background:"rgba(255,255,255,.05)", borderRadius:10, overflow:"hidden" }}>
                          <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:10, transition:"width .5s ease" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {stats.countries?.length > 0 && (
                  <div style={{ ...cardWrap, flex:1 }}>
                    <SectionLabel>Top Countries</SectionLabel>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {stats.countries.map((c, i) => {
                        const maxCount = stats.countries[0].count;
                        const pct = Math.round((c.count / maxCount) * 100);
                        const colors = ["#818cf8","#34d399","#f97316","#f87171","#fbbf24"];
                        return (
                          <div key={i}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <Icon d={ICONS.globe} size={11} color={colors[i]} />
                                <span style={{ fontSize:12, color:"#475569" }}>{c.country}</span>
                              </div>
                              <span style={{ fontSize:12, color:colors[i], fontWeight:600 }}>{c.count}</span>
                            </div>
                            <div style={{ width:"100%", height:3, background:"rgba(255,255,255,.05)", borderRadius:10, overflow:"hidden" }}>
                              <div style={{ width:`${pct}%`, height:"100%", background:colors[i], borderRadius:10, transition:"width .5s ease" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Recent access logs */}
              {stats.recent?.length > 0 && (
                <div style={cardWrap}>
                  <SectionLabel>Recent Access Logs</SectionLabel>
                  <div style={{ display:"flex", flexDirection:"column" }}>
                    {stats.recent.map((r, i) => (
                      <div key={i} style={{
                        display:"flex", justifyContent:"space-between", alignItems:"center",
                        padding:"10px 0",
                        borderBottom: i < stats.recent.length-1 ? "1px solid rgba(255,255,255,.04)" : "none",
                      }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(99,102,241,.12)", border:"1px solid rgba(99,102,241,.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <Icon d={ICONS.user} size={13} color="#818cf8" />
                          </div>
                          <div>
                            <p style={{ fontSize:13, color:"#e2e8f0", fontWeight:500, fontFamily:"'Courier New',monospace" }}>{r.ip}</p>
                            <div style={{ display:"flex", gap:8, marginTop:2 }}>
                              {r.device  && <span style={{ fontSize:10, color:"#475569" }}>{r.device}</span>}
                              {r.country && <span style={{ fontSize:10, color:"#475569" }}>· {r.country}</span>}
                            </div>
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

          ) : shortUrl ? (
            <div style={{ marginTop:14, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.05)", borderRadius:14, padding:"28px 16px", textAlign:"center", animation:"fadeIn .3s ease" }}>
              <p style={{ fontSize:13, color:"#2d3748" }}>No analytics yet. Generate traffic to see data.</p>
            </div>
          ) : null}

          {/* ── FOOTER ── */}
          <div style={{ marginTop:36, textAlign:"center" }}>
            <p style={{ fontSize:12, color:"#1e293b", marginBottom:5 }}>Real-time event streaming powered by WebSockets and Redis</p>
            <p style={{ fontSize:10.5, color:"#161622", letterSpacing:".03em" }}>Built with Redis caching · API-key authentication · rate limiting · real-time analytics pipeline</p>
          </div>

        </div>
      </div>

      <Toast msg={toast.msg} type={toast.type} />
    </>
  );
}