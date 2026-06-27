import { useState, useEffect, useRef, useCallback } from "react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2, Copy, Check, ExternalLink, RefreshCw, Key,
  Zap, BarChart2, Globe, Monitor, Smartphone, Clock,
  Download, Activity, Shield, Wifi, ChevronRight,
  TrendingUp, MousePointer, Users, AlertTriangle,
} from "lucide-react";

const BASE_URL = "https://smart-url-shortner.onrender.com";

const getHeaders = () => ({
  "Content-Type": "application/json",
  "x-api-key": localStorage.getItem("apiKey") || ""
});

/* ─── Tokens ──────────────────────────────────────── */
const T = {
  bg: "#07070F",
  surface: "rgba(255,255,255,.035)",
  surfaceHover: "rgba(255,255,255,.055)",
  border: "rgba(255,255,255,.07)",
  borderFocus: "rgba(99,102,241,.55)",
  primary: "#6366F1",
  cyan: "#22D3EE",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
  purple: "#A78BFA",
  text: "#F0F0FF",
  textMuted: "#6B7280",
  textDim: "#374151",
  radius: { sm: 10, md: 14, lg: 18, xl: 22 },
};

/* ─── Micro components ─────────────────────────────── */

const Spinner = ({ size = 16, color = "#fff" }) => (
  <span style={{
    display: "inline-block", width: size, height: size,
    border: `1.5px solid rgba(255,255,255,.12)`, borderTopColor: color,
    borderRadius: "50%", animation: "spin .65s linear infinite", flexShrink: 0,
  }} />
);

const LivePulse = ({ on }) => (
  <span style={{ position: "relative", display: "inline-flex", width: 7, height: 7, flexShrink: 0 }}>
    {on && <span style={{
      position: "absolute", inset: 0, borderRadius: "50%",
      background: "rgba(34,197,94,.5)", animation: "ping 1.5s ease-out infinite"
    }} />}
    <span style={{
      position: "absolute", inset: 0, borderRadius: "50%",
      background: on ? T.green : T.textDim, transition: "background .4s"
    }} />
  </span>
);

const Toast = ({ msg, type }) => {
  if (!msg) return null;
  const ok = type !== "error";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, x: "-50%" }}
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      exit={{ opacity: 0, y: 6, x: "-50%" }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      style={{
        position: "fixed", bottom: 32, left: "50%",
        background: ok ? "rgba(34,197,94,.09)" : "rgba(239,68,68,.09)",
        border: `1px solid ${ok ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.25)"}`,
        color: ok ? T.green : T.red,
        borderRadius: T.radius.md, padding: "10px 24px",
        fontSize: 13, fontWeight: 500,
        zIndex: 9999, whiteSpace: "nowrap", backdropFilter: "blur(20px)",
        boxShadow: "0 16px 48px rgba(0,0,0,.5)",
      }}
    >{msg}</motion.div>
  );
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(10,10,20,.97)", border: `1px solid ${T.border}`,
      borderRadius: T.radius.sm, padding: "9px 15px", fontSize: 12,
      backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,.6)",
    }}>
      <p style={{ margin: "0 0 3px", color: T.textMuted, fontSize: 11 }}>{label}</p>
      <p style={{ margin: 0, fontWeight: 700, color: T.primary }}>{payload[0].value} clicks</p>
    </div>
  );
};

const Badge = ({ children, color = T.primary, bg }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    background: bg || `${color}14`,
    border: `1px solid ${color}28`,
    color, borderRadius: 20, padding: "2px 9px",
    fontSize: 10.5, fontWeight: 600, letterSpacing: ".04em",
    whiteSpace: "nowrap",
  }}>{children}</span>
);

/* ─── Card wrapper ─────────────────────────────── */
const Card = ({ children, style = {}, glow = false }) => (
  <div style={{
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: T.radius.lg,
    padding: "22px 24px",
    backdropFilter: "blur(16px)",
    boxShadow: glow
      ? `0 0 0 1px rgba(99,102,241,.12), 0 8px 40px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.04)`
      : `0 4px 24px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.04)`,
    position: "relative",
    overflow: "hidden",
    ...style,
  }}>
    {/* Subtle scan-line texture — the signature element */}
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,.008) 2px, rgba(255,255,255,.008) 4px)",
      borderRadius: "inherit",
    }} />
    <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
  </div>
);

/* ─── Section label ─────────────────────────────── */
const Label = ({ children, style = {} }) => (
  <p style={{
    fontSize: 10.5, fontWeight: 700, color: T.textDim,
    textTransform: "uppercase", letterSpacing: ".12em",
    marginBottom: 14, ...style,
  }}>{children}</p>
);

/* ─── Field ─────────────────────────────── */
const Field = ({ icon: Icon_, placeholder, value, onChange, onKeyDown, error, hint, type = "text" }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ flex: 1 }}>
      <div style={{ position: "relative" }}>
        <span style={{
          position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
          pointerEvents: "none", display: "flex",
          color: error ? T.red : focused ? T.primary : T.textDim,
          transition: "color .2s",
        }}>
          <Icon_ size={15} />
        </span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%", height: 46, fontFamily: "inherit",
            background: focused ? "rgba(99,102,241,.05)" : "rgba(255,255,255,.025)",
            border: `1px solid ${error ? "rgba(239,68,68,.45)" : focused ? T.borderFocus : T.border}`,
            borderRadius: T.radius.sm, padding: "0 14px 0 42px",
            color: T.text, fontSize: 14, outline: "none",
            transition: "border-color .18s, background .18s",
            boxShadow: focused ? `0 0 0 3px rgba(99,102,241,.08)` : "none",
          }}
        />
      </div>
      {error && <p style={{ fontSize: 11, color: T.red, marginTop: 5, paddingLeft: 2 }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: 11, color: T.green, marginTop: 5, paddingLeft: 2 }}>{hint}</p>}
    </div>
  );
};

/* ─── MetricCard ─────────────────────────────── */
const MetricCard = ({ icon: Icon_, label, value, sub, accent = T.primary, flash = false }) => (
  <motion.div
    whileHover={{ y: -3, boxShadow: `0 16px 48px rgba(0,0,0,.45), 0 0 0 1px ${accent}20` }}
    transition={{ duration: 0.18 }}
    style={{
      flex: 1, minWidth: 0,
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.radius.lg,
      padding: "20px",
      backdropFilter: "blur(16px)",
      boxShadow: "0 4px 20px rgba(0,0,0,.25)",
      position: "relative", overflow: "hidden",
    }}
  >
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 1,
      background: `linear-gradient(90deg, transparent, ${accent}40, transparent)`,
    }} />
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9,
        background: `${accent}16`, border: `1px solid ${accent}28`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: accent, flexShrink: 0,
      }}>
        <Icon_ size={16} />
      </div>
      {flash && (
        <span style={{
          width: 6, height: 6, borderRadius: "50%", background: T.green,
          boxShadow: `0 0 10px ${T.green}`, animation: "ping 1.5s ease-out infinite",
        }} />
      )}
    </div>
    <motion.p
      key={value}
      initial={{ scale: flash ? 1.1 : 1 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.25 }}
      style={{
        fontSize: 28, fontWeight: 800, color: T.text,
        letterSpacing: "-1px", lineHeight: 1, marginBottom: 6,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value ?? "—"}
    </motion.p>
    <p style={{ fontSize: 12.5, color: T.textMuted, fontWeight: 500 }}>{label}</p>
    {sub && <p style={{ fontSize: 11, color: accent, marginTop: 3, opacity: 0.75 }}>{sub}</p>}
  </motion.div>
);

/* ─── PrimaryButton ─────────────────────────────── */
const PrimaryButton = ({ onClick, disabled, loading, children, style = {} }) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    whileHover={!disabled ? { scale: 1.015 } : {}}
    whileTap={!disabled ? { scale: 0.975 } : {}}
    style={{
      background: "linear-gradient(135deg, #6366F1 0%, #818cf8 50%, #06B6D4 100%)",
      backgroundSize: "200% 200%",
      border: "none", borderRadius: T.radius.sm, color: "#fff",
      fontSize: 13.5, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", gap: 7,
      padding: "0 20px", height: 46,
      opacity: disabled ? 0.55 : 1,
      boxShadow: disabled ? "none" : "0 4px 20px rgba(99,102,241,.38), inset 0 1px 0 rgba(255,255,255,.15)",
      whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit",
      letterSpacing: ".01em",
      ...style,
    }}
  >
    {loading ? <Spinner size={14} /> : children}
  </motion.button>
);

/* ─── IconButton ─────────────────────────────── */
const IconButton = ({ onClick, title, children, style = {} }) => (
  <motion.button
    onClick={onClick}
    title={title}
    whileHover={{ scale: 1.06, background: "rgba(255,255,255,.09)" }}
    whileTap={{ scale: 0.93 }}
    style={{
      width: 34, height: 34, borderRadius: 8, flexShrink: 0,
      background: "rgba(255,255,255,.04)", border: `1px solid ${T.border}`,
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      color: T.textMuted, transition: "background .15s",
      fontFamily: "inherit", ...style,
    }}
  >
    {children}
  </motion.button>
);

/* ─── GhostButton ─────────────────────────────── */
const GhostButton = ({ onClick, disabled, children, style = {} }) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    whileHover={!disabled ? { background: "rgba(255,255,255,.07)", color: "#E5E7EB" } : {}}
    whileTap={!disabled ? { scale: 0.97 } : {}}
    style={{
      height: 34, padding: "0 13px", borderRadius: 8,
      background: "rgba(255,255,255,.03)", border: `1px solid ${T.border}`,
      color: T.textMuted, fontSize: 12, fontWeight: 500,
      cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", gap: 6,
      opacity: disabled ? 0.45 : 1,
      transition: "background .15s, color .15s",
      fontFamily: "inherit", whiteSpace: "nowrap", ...style,
    }}
  >
    {children}
  </motion.button>
);

/* ─── InfoTip ─────────────────────────────── */
const InfoTip = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{
        width: 14, height: 14, borderRadius: "50%", border: `1px solid ${T.border}`,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 8.5, color: T.textDim, cursor: "default", userSelect: "none",
      }}>?</span>
      <AnimatePresence>
        {show && (
          <motion.span
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
              background: "#0D0D1A", border: `1px solid ${T.border}`,
              borderRadius: T.radius.sm, padding: "8px 12px",
              fontSize: 11.5, color: "#9CA3AF",
              whiteSpace: "nowrap", zIndex: 50, lineHeight: 1.5,
              boxShadow: "0 12px 40px rgba(0,0,0,.6)", pointerEvents: "none",
            }}
          >{text}</motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};

/* ─── Progress bar ─────────────────────────────── */
const ProgressBar = ({ pct, color = T.primary, glow = false, height = 5 }) => (
  <div style={{ width: "100%", height, background: "rgba(255,255,255,.05)", borderRadius: 99, overflow: "hidden" }}>
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(pct, 100)}%` }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      style={{
        height: "100%", borderRadius: 99,
        background: color,
        boxShadow: glow ? `0 0 10px ${color}80` : "none",
      }}
    />
  </div>
);

/* ═══════════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════════ */
export default function App() {
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [aliasError, setAliasError] = useState("");
  const [aliasHint, setAliasHint] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [stats, setStats] = useState(null);
  const [wsStatus, setWsStatus] = useState("connecting");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [aLoading, setALoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [totalClicks, setTotalClicks] = useState(0);
  const [uniqueClients, setUniqueClients] = useState(0);
  const [liveEvents, setLiveEvents] = useState(0);
  const [liveChart, setLiveChart] = useState([]);

  const [flash, setFlash] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "ok" });
  const [apiKey, setApiKey] = useState(localStorage.getItem("apiKey") || "");
  const [apiStats, setApiStats] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [spike, setSpike] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  const shortUrlRef = useRef(shortUrl);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const fallbackTimer = useRef(null);
  shortUrlRef.current = shortUrl;

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "ok" }), 3500);
  };

  const triggerFlash = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 700);
  };

  useEffect(() => {
    const key = localStorage.getItem("apiKey");
    if (!key) {
      fetch(`${BASE_URL}/api/generate-api-key`, { method: "POST" })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => {
          localStorage.setItem("apiKey", data.api_key);
          setApiKey(data.api_key);
        })
        .catch(() => showToast("Failed to generate API key", "error"));
    }
  }, []);

  const generateKey = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/generate-api-key`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      localStorage.setItem("apiKey", data.api_key);
      setApiKey(data.api_key);
      showToast("API key regenerated");
    } catch {
      showToast("Failed to generate API key", "error");
    }
  };

  const fetchUsage = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/api-usage`, { headers: getHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const used = data.current_window ?? data.total_usage ?? data.used ?? data.requests ?? 0;
      const limit = data.limit ?? data.max ?? 10;
      const remaining = data.remaining ?? Math.max(0, limit - used);
      const throttled = data.status === "throttled" || data.status === "rate_limited" || data.throttled === true || data.rate_limited === true;
      setApiStats({
        current_window: used, remaining, limit,
        status: (throttled || remaining <= 0) ? "throttled" : "active"
      });
    } catch { }
  };

  useEffect(() => {
    if (!apiKey) return;
    fetchUsage();
    const usageIv = setInterval(fetchUsage, 3000);
    const countIv = setInterval(() => setSecondsLeft(s => s <= 1 ? 60 : s - 1), 1000);
    return () => { clearInterval(usageIv); clearInterval(countIv); };
  }, [apiKey]);

  const syncFromBackend = useCallback(async () => {
    const code = shortUrlRef.current?.split("/").pop();
    if (!code) return;
    try {
      const res = await fetch(`${BASE_URL}/api/analytics/${code}`, { headers: getHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setStats(prev => ({
        ...(prev || {}),
        devices: data.devices || {},
        countries: data.countries || {},
        recent: (data.clicks || []).map(c => ({
          ip: c.ip, device: c.device, country: c.country,
          time: new Date(c.timestamp).toLocaleTimeString()
        }))
      }));
      setTotalClicks(prev => Math.max(prev, data.total ?? 0));
      setUniqueClients(data.unique ?? 0);
    } catch { }
  }, []);

  useEffect(() => {
    if (fallbackTimer.current) clearInterval(fallbackTimer.current);
    if (!shortUrl) return;
    fallbackTimer.current = setInterval(syncFromBackend, 10000);
    return () => clearInterval(fallbackTimer.current);
  }, [shortUrl, syncFromBackend]);

  const connectWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
    }
    if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
    const ws = new WebSocket("wss://smart-url-shortner.onrender.com/ws");
    wsRef.current = ws;
    ws.onopen = () => { setWsStatus("live"); setReconnectAttempts(0); };
    ws.onclose = () => {
      setWsStatus("disconnected");
      setReconnectAttempts(n => n + 1);
      reconnectTimer.current = setTimeout(connectWs, 3000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.event !== "click") return;
      if (!shortUrl) return;
      const code = shortUrl.split("/").pop();
      if (msg.short_code !== code) return;
      setTotalClicks(prev => prev + 1);
      setLiveEvents(prev => prev + 1);
      setLiveChart(prev => {
        const lastCount = prev.length ? prev[prev.length - 1].count : 0;
        const point = { time: new Date().toLocaleTimeString(), count: lastCount + 1 };
        const updated = [...prev, point];
        return updated.length > 30 ? updated.slice(-30) : updated;
      });
      triggerFlash();
    };
  }, [shortUrl]);

  useEffect(() => {
    connectWs();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      }
    };
  }, [connectWs]);

  const shorten = async () => {
    setAliasError(""); setAliasHint("");
    if (!url.trim()) return showToast("Enter a valid URL", "error");
    const fixedUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/shorten`, {
        method: "POST", headers: getHeaders(),
        body: JSON.stringify({ long_url: fixedUrl, alias: alias.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) { showToast("Rate limit reached. Wait for reset.", "error"); setLoading(false); return; }
        if (res.status === 401) { showToast("API key missing or invalid", "error"); setLoading(false); return; }
        if (res.status === 409) { setAliasError("Alias already taken"); showToast("Alias already taken", "error"); setLoading(false); return; }
        throw new Error(data.detail || "Error");
      }
      setShortUrl(data.short_url);
      setStats(null);
      setTotalClicks(0); setUniqueClients(0); setLiveEvents(0); setLiveChart([]);
      if (alias.trim()) setAliasHint("Custom alias applied ✓");
      showToast("Short link created");
      setSpike(true); setTimeout(() => setSpike(false), 500);
      setSecondsLeft(60); fetchUsage();
    } catch (err) { showToast(err.message || "Something went wrong", "error"); }
    setLoading(false);
  };

  const loadAnalytics = async () => {
    setALoading(true);
    try {
      const code = shortUrl.split("/").pop();
      const res = await fetch(`${BASE_URL}/api/analytics/${code}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStats({
          total: data.total ?? 0, unique: data.unique ?? 0,
          devices: data.devices ?? {}, countries: data.countries ?? {},
          recent: (data.clicks || []).map(c => ({
            ip: c.ip, device: c.device, country: c.country,
            time: new Date(c.timestamp).toLocaleTimeString()
          }))
        });
        setTotalClicks(prev => Math.max(prev, data.total ?? 0));
        setUniqueClients(data.unique ?? 0);
      } else { showToast("Failed to load analytics", "error"); }
    } catch { showToast("Something went wrong", "error"); }
    setALoading(false);
  };

  const downloadCSV = () => window.open(`${BASE_URL}/api/export/${shortUrl.split("/").pop()}`);

  const handleSimulateTraffic = async () => {
    if (!shortUrlRef.current || simulating) return;
    setSimulating(true);
    const code = shortUrlRef.current.split("/").pop();
    try {
      for (let i = 0; i < 10; i++) {
        await fetch(`${BASE_URL}/api/ping/${code}`, { headers: getHeaders() });
        setTotalClicks(prev => prev + 1);
        await new Promise(res => setTimeout(res, 300));
      }
      await loadAnalytics();
      alert("Traffic simulation complete");
    } catch (err) {
      console.error("Simulation failed", err);
      showToast("Simulation failed", "error");
    }
    setSimulating(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast("Copied to clipboard");
  };

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
    showToast("API key copied");
  };

  /* ── derived ── */
  const apiKeyDisplay = apiKey ? `${apiKey.slice(0, 10)}••••••${apiKey.slice(-4)}` : "Generating…";
  const usagePct = apiStats ? Math.min((apiStats.current_window / apiStats.limit) * 100, 100) : 0;
  const isThrottled = apiStats != null && apiStats.status === "throttled";

  const deviceList = Object.entries(stats?.devices || {}).map(([device, count]) => ({ device, count: Number(count) || 0 }));
  const countryList = Object.entries(stats?.countries || {}).map(([country, count]) => ({ country, count: Number(count) || 0 })).sort((a, b) => b.count - a.count);
  const mobileCount = deviceList.find(d => d.device === "mobile")?.count || 0;
  const desktopCount = deviceList.find(d => d.device === "desktop")?.count || 0;
  const totalDevice = mobileCount + desktopCount || 1;

  const wsStatusLabel = wsStatus === "live" ? "Live" : wsStatus === "connecting" ? "Connecting" : `Retry ${reconnectAttempts}`;
  const wsColor = { live: T.green, connecting: T.amber, disconnected: T.red }[wsStatus];

  const COUNTRY_FLAGS = {
    "India": "🇮🇳", "United States": "🇺🇸", "United Kingdom": "🇬🇧",
    "Germany": "🇩🇪", "France": "🇫🇷", "Japan": "🇯🇵", "Canada": "🇨🇦",
    "Australia": "🇦🇺", "Brazil": "🇧🇷", "China": "🇨🇳", "Singapore": "🇸🇬",
    "Netherlands": "🇳🇱", "Russia": "🇷🇺", "South Korea": "🇰🇷", "Unknown": "🌐",
  };
  const getFlag = (country) => COUNTRY_FLAGS[country] || "🌐";

  const ACCENTS = [T.primary, T.green, T.amber, T.red, T.cyan];

  const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.38, ease: "easeOut" } })
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; font-family: 'Inter', -apple-system, sans-serif; color: ${T.text}; }
        input { color: ${T.text}; }
        input::placeholder { color: ${T.textDim}; }
        a { text-decoration: none; }
        button { font-family: 'Inter', -apple-system, sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ping {
          0% { transform: scale(1); opacity: .75; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes gradientShift {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 99px; }
      `}</style>

      {/* ── Ambient blobs ── */}
      <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "-15%", left: "-10%",
          width: 800, height: 800, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,.065) 0%, transparent 65%)",
          filter: "blur(1px)",
        }} />
        <div style={{
          position: "absolute", bottom: "-15%", right: "-8%",
          width: 700, height: 700, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,211,238,.045) 0%, transparent 65%)",
          filter: "blur(1px)",
        }} />
        <div style={{
          position: "absolute", top: "40%", right: "15%",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(167,139,250,.03) 0%, transparent 70%)",
        }} />
      </div>

      <div style={{
        minHeight: "100vh", position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "0 16px 100px",
      }}>

        {/* ── Nav ── */}
        <motion.nav
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            width: "100%", maxWidth: 800,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 0", marginBottom: 32,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #6366F1, #22D3EE)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(99,102,241,.45)",
            }}>
              <Link2 size={14} color="white" />
            </div>
            <div>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: T.text, letterSpacing: "-.4px" }}>sniplink</span>
              <span style={{
                display: "block", fontSize: 9.5, color: T.textDim,
                letterSpacing: ".1em", textTransform: "uppercase",
              }}>v2.0</span>
            </div>
          </div>

          {/* Status pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 99, padding: "6px 14px",
          }}>
            <LivePulse on={wsStatus === "live"} />
            <span style={{ fontSize: 12, fontWeight: 600, color: wsColor }}>{wsStatusLabel}</span>
            <span style={{ fontSize: 11.5, color: T.textDim }}>WebSocket</span>
          </div>
        </motion.nav>

        <div style={{ width: "100%", maxWidth: 800 }}>

          {/* ── Hero ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            style={{ textAlign: "center", marginBottom: 44 }}
          >
            {/* Feature chips */}
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 7, marginBottom: 22 }}>
              {[
                { icon: <Activity size={10} />, label: "Realtime", color: T.green },
                { icon: <BarChart2 size={10} />, label: "Analytics", color: T.primary },
                { icon: <Zap size={10} />, label: "Redis", color: T.amber },
                { icon: <Wifi size={10} />, label: "WebSocket", color: T.cyan },
                { icon: <Shield size={10} />, label: "API Keys", color: T.purple },
                { icon: <TrendingUp size={10} />, label: "Rate Limited", color: T.red },
              ].map(({ icon, label, color }) => (
                <motion.span
                  key={label}
                  whileHover={{ scale: 1.06, y: -1 }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: T.surface, border: `1px solid ${T.border}`,
                    borderRadius: 99, padding: "4px 11px",
                    fontSize: 11.5, color: T.textMuted, cursor: "default", userSelect: "none",
                  }}
                >
                  <span style={{ color }}>{icon}</span>
                  {label}
                </motion.span>
              ))}
            </div>

            <h1 style={{
              fontSize: "clamp(30px, 5vw, 50px)", fontWeight: 800,
              color: T.text, letterSpacing: "-1.5px", lineHeight: 1.08,
              marginBottom: 14,
            }}>
              Shorten. Track.{" "}
              <span style={{
                background: "linear-gradient(90deg, #818cf8, #22D3EE, #6366F1)",
                backgroundSize: "300% 100%",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "gradientShift 5s ease infinite",
              }}>Know Everything.</span>
            </h1>
            <p style={{ fontSize: 16, color: T.textMuted, lineHeight: 1.7, maxWidth: 440, margin: "0 auto" }}>
              Real-time click analytics, API-key auth, Redis-powered redirects — built for developers.
            </p>
          </motion.div>

          {/* ── Main stack ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* ── API Key Card ── */}
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
              <Card glow>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 7,
                    background: `${T.primary}18`, border: `1px solid ${T.primary}28`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Key size={12} color={T.primary} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#D1D5DB" }}>API Access Key</span>
                  <InfoTip text="Required for all requests. Tracks usage and enforces rate limits." />
                  <div style={{ marginLeft: "auto" }}>
                    {apiStats && (
                      <Badge
                        color={isThrottled ? T.red : T.green}
                        bg={isThrottled ? "rgba(239,68,68,.09)" : "rgba(34,197,94,.09)"}
                      >
                        <span style={{
                          display: "inline-block", width: 5, height: 5, borderRadius: "50%",
                          background: isThrottled ? T.red : T.green, marginRight: 3,
                        }} />
                        {isThrottled ? "Throttled" : "Active"}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Key row */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "rgba(0,0,0,.2)", border: `1px solid ${T.border}`,
                  borderRadius: T.radius.sm, padding: "11px 14px", marginBottom: 16,
                }}>
                  {apiKey
                    ? <Key size={13} color={T.primary} style={{ flexShrink: 0 }} />
                    : <Spinner size={13} color={T.amber} />
                  }
                  <code style={{
                    flex: 1, fontSize: 12.5, color: apiKey ? "#7C7CA8" : T.amber,
                    letterSpacing: ".06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
                  }}>{apiKeyDisplay}</code>
                  <div style={{ display: "flex", gap: 6 }}>
                    {apiKey && (
                      <IconButton onClick={copyKey} title="Copy API key">
                        {keyCopied ? <Check size={13} color={T.green} /> : <Copy size={13} />}
                      </IconButton>
                    )}
                    <GhostButton onClick={generateKey}>
                      <RefreshCw size={11} />Regenerate
                    </GhostButton>
                  </div>
                </div>

                {/* Usage */}
                {apiStats && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                      <span style={{ fontSize: 12, color: T.textMuted }}>
                        <span style={{ color: isThrottled ? T.red : T.text, fontWeight: 700 }}>{apiStats.current_window}</span>
                        <span style={{ color: T.textDim }}>/{apiStats.limit}</span>
                        <span style={{ marginLeft: 6 }}>requests this window</span>
                      </span>
                      <span style={{ fontSize: 11.5, color: T.textDim, fontVariantNumeric: "tabular-nums" }}>
                        Resets in {secondsLeft}s
                      </span>
                    </div>
                    <ProgressBar
                      pct={usagePct}
                      color={isThrottled ? T.red : usagePct > 80
                        ? `linear-gradient(90deg,${T.amber},${T.red})`
                        : `linear-gradient(90deg,${T.primary},${T.cyan})`}
                      glow
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7 }}>
                      <span style={{ fontSize: 11, color: T.textDim }}>{apiStats.remaining} remaining</span>
                      <span style={{ fontSize: 11, color: T.textDim }}>{Math.round(usagePct)}% used</span>
                    </div>
                    <AnimatePresence>
                      {isThrottled && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          style={{
                            marginTop: 12, padding: "10px 13px", borderRadius: T.radius.sm,
                            background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.18)",
                            fontSize: 12, color: T.red, display: "flex", alignItems: "center", gap: 8,
                          }}
                        >
                          <AlertTriangle size={12} />
                          Rate limit reached — new requests are queued until the window resets.
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* ── Shortener Card ── */}
            <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
              <Card>
                <Label>Shorten a URL</Label>
                <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 10 }}>
                  <Field
                    icon={Link2}
                    placeholder="Paste your long URL…"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && shorten()}
                  />
                  <PrimaryButton onClick={shorten} disabled={loading} loading={loading}>
                    {!loading && <><ChevronRight size={15} />Generate</>}
                  </PrimaryButton>
                </div>
                <Field
                  icon={Link2}
                  placeholder="Custom alias (optional)"
                  value={alias}
                  onChange={e => { setAlias(e.target.value); setAliasError(""); setAliasHint(""); }}
                  error={aliasError}
                  hint={aliasHint}
                />
                {!aliasError && !aliasHint && (
                  <p style={{ fontSize: 11.5, color: T.textDim, marginTop: 7, paddingLeft: 2 }}>
                    Optional — set a custom slug instead of a random code
                  </p>
                )}

                {/* Generated link */}
                <AnimatePresence>
                  {shortUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: .985 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", damping: 22, stiffness: 280 }}
                      style={{
                        marginTop: 16,
                        background: "linear-gradient(135deg, rgba(99,102,241,.07) 0%, rgba(34,211,238,.04) 100%)",
                        border: `1px solid rgba(99,102,241,.22)`,
                        borderRadius: T.radius.md, padding: "16px 18px",
                        boxShadow: "0 0 0 1px rgba(99,102,241,.08), 0 8px 32px rgba(99,102,241,.1)",
                        position: "relative", overflow: "hidden",
                      }}
                    >
                      <div style={{
                        position: "absolute", top: 0, left: 0, right: 0, height: 1,
                        background: "linear-gradient(90deg, transparent, rgba(99,102,241,.5), transparent)",
                      }} />
                      <p style={{
                        fontSize: 10, color: T.primary, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 10,
                      }}>
                        ✦ Link created
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <a href={shortUrl} target="_blank" rel="noreferrer"
                          style={{
                            fontSize: 14, color: "#818cf8", wordBreak: "break-all", flex: 1, fontWeight: 500,
                            fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
                          }}>
                          {shortUrl}
                        </a>
                        <div style={{ display: "flex", gap: 5 }}>
                          <IconButton onClick={copy} title="Copy link">
                            {copied ? <Check size={13} color={T.green} /> : <Copy size={13} />}
                          </IconButton>
                          <a href={shortUrl} target="_blank" rel="noreferrer">
                            <IconButton title="Open in new tab">
                              <ExternalLink size={13} />
                            </IconButton>
                          </a>
                        </div>
                      </div>
                      <p style={{ fontSize: 11.5, color: T.textDim, marginBottom: 13 }}>
                        Share this link — analytics update in real time.
                      </p>
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                        <GhostButton onClick={loadAnalytics} disabled={aLoading}>
                          {aLoading ? <Spinner size={11} color={T.textMuted} /> : <BarChart2 size={12} />}
                          {aLoading ? "Loading…" : "View Analytics"}
                        </GhostButton>
                        <GhostButton onClick={handleSimulateTraffic} disabled={simulating}>
                          <Zap size={12} color={simulating ? T.amber : undefined} />
                          {simulating ? "Simulating…" : "Simulate Traffic"}
                        </GhostButton>
                        <GhostButton onClick={downloadCSV}>
                          <Download size={12} />Export CSV
                        </GhostButton>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>

            {/* ── Analytics ── */}
            <AnimatePresence>
              {shortUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.38, delay: 0.08 }}
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  {/* Metric cards */}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <MetricCard icon={MousePointer} label="Total Requests" value={totalClicks} accent={T.primary} flash={flash} />
                    <MetricCard icon={Users} label="Unique Clients" value={uniqueClients} accent={T.green} />
                    <MetricCard icon={Activity} label="Live Events" value={liveEvents} accent={T.amber} sub="This session" flash={flash} />
                  </div>

                  {/* Live chart */}
                  {liveChart.length > 0 && (
                    <Card>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                        <Label style={{ marginBottom: 0 }}>Live Click Stream</Label>
                        <Badge color={T.green} bg="rgba(34,197,94,.09)">
                          <LivePulse on /> WebSocket · Live
                        </Badge>
                      </div>
                      <ResponsiveContainer width="100%" height={175}>
                        <AreaChart data={liveChart} margin={{ top: 4, right: 4, left: -26, bottom: 0 }}>
                          <defs>
                            <linearGradient id="liveGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={T.primary} stopOpacity={0.28} />
                              <stop offset="95%" stopColor={T.primary} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="rgba(255,255,255,.035)" vertical={false} />
                          <XAxis dataKey="time" tick={{ fill: T.textDim, fontSize: 9.5 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fill: T.textDim, fontSize: 9.5 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Area
                            type="monotone" dataKey="count"
                            stroke={T.primary} strokeWidth={2}
                            fill="url(#liveGrad)"
                            dot={false}
                            activeDot={{ r: 4, fill: T.primary, stroke: T.bg, strokeWidth: 2 }}
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Card>
                  )}

                  {/* Device + Countries */}
                  {stats && (
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {/* Device Breakdown */}
                      <Card style={{ flex: 1, minWidth: 240 }}>
                        <Label>Device Breakdown</Label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          {deviceList.length > 0 ? deviceList.map(({ device, count }) => {
                            const pct = Math.round((count / totalDevice) * 100);
                            const isM = device === "mobile";
                            const color = isM ? T.green : T.primary;
                            const Icon_ = isM ? Smartphone : Monitor;
                            return (
                              <div key={device}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                    <div style={{
                                      width: 28, height: 28, borderRadius: 7,
                                      background: `${color}14`, border: `1px solid ${color}22`,
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                      <Icon_ size={13} color={color} />
                                    </div>
                                    <span style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 500, textTransform: "capitalize" }}>{device}</span>
                                  </div>
                                  <span style={{ fontSize: 13, color, fontWeight: 700 }}>
                                    {count}
                                    <span style={{ color: T.textDim, fontWeight: 400, fontSize: 11.5 }}> · {pct}%</span>
                                  </span>
                                </div>
                                <ProgressBar pct={pct} color={color} glow />
                              </div>
                            );
                          }) : (
                            <p style={{ fontSize: 13, color: T.textDim, textAlign: "center", padding: "20px 0" }}>
                              No device data yet
                            </p>
                          )}
                        </div>
                      </Card>

                      {/* Countries */}
                      {countryList.length > 0 && (
                        <Card style={{ flex: 1, minWidth: 240 }}>
                          <Label>Top Countries</Label>
                          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {countryList.slice(0, 5).map((c, i) => {
                              const maxCount = countryList[0].count;
                              const pct = Math.round((c.count / maxCount) * 100);
                              const color = ACCENTS[i % ACCENTS.length];
                              return (
                                <div key={i}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                      <span style={{ fontSize: 17 }}>{getFlag(c.country)}</span>
                                      <span style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 500 }}>{c.country}</span>
                                    </div>
                                    <span style={{ fontSize: 13, color, fontWeight: 700 }}>{c.count}</span>
                                  </div>
                                  <ProgressBar pct={pct} color={color} />
                                </div>
                              );
                            })}
                          </div>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* Recent Access Logs */}
                  {stats?.recent?.length > 0 && (
                    <Card>
                      <Label>Recent Access Logs</Label>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {stats.recent.map((r, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.035 }}
                            whileHover={{ background: T.surfaceHover, x: 2 }}
                            style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              padding: "11px 13px",
                              background: "rgba(255,255,255,.02)",
                              border: `1px solid ${T.border}`,
                              borderRadius: T.radius.sm,
                              transition: "background .15s",
                              cursor: "default",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: 9,
                                background: `${T.primary}14`, border: `1px solid ${T.primary}22`,
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                              }}>
                                {r.device === "mobile"
                                  ? <Smartphone size={14} color={T.primary} />
                                  : <Monitor size={14} color={T.primary} />}
                              </div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                  <p style={{
                                    fontSize: 12.5, color: "#C4C4D0", fontWeight: 600,
                                    fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
                                  }}>{r.ip}</p>
                                  {r.country && <span style={{ fontSize: 13 }}>{getFlag(r.country)}</span>}
                                </div>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  {r.device && <Badge color={T.primary}>{r.device}</Badge>}
                                  {r.country && (
                                    <span style={{ fontSize: 11, color: T.textDim }}>{r.country}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                              <Clock size={11} color={T.textDim} />
                              <span style={{ fontSize: 11.5, color: T.textDim, fontVariantNumeric: "tabular-nums" }}>{r.time}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Empty state */}
                  {!stats && (
                    <Card style={{ textAlign: "center", padding: "44px 20px" }}>
                      <BarChart2 size={26} color={T.textDim} style={{ margin: "0 auto 12px" }} />
                      <p style={{ fontSize: 14, color: T.textDim, marginBottom: 5 }}>No analytics yet</p>
                      <p style={{ fontSize: 12.5, color: T.textDim, opacity: 0.6 }}>
                        Share your link or simulate traffic to see live data.
                      </p>
                    </Card>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Footer ── */}
          <div style={{ marginTop: 56, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: T.textDim, marginBottom: 5, letterSpacing: ".01em" }}>
              Real-time events via WebSocket · Redis-backed · API-key auth · Rate limited
            </p>
            <p style={{ fontSize: 11, color: T.textDim, opacity: 0.45, letterSpacing: ".03em" }}>
              sniplink v2.0 — built for developers
            </p>
          </div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast.msg && <Toast key={toast.msg} msg={toast.msg} type={toast.type} />}
      </AnimatePresence>
    </>
  );
}