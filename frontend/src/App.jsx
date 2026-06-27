import { useState, useEffect, useRef, useCallback } from "react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area,
} from "recharts";
import { motion, AnimatePresence, useSpring, useTransform, useMotionValue } from "framer-motion";
import {
  Link2, Copy, Check, ExternalLink, RefreshCw, Key,
  Zap, BarChart2, Monitor, Smartphone, Clock,
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
  surface: "rgba(255,255,255,.04)",
  surfaceHover: "rgba(255,255,255,.065)",
  border: "rgba(255,255,255,.08)",
  borderStrong: "rgba(255,255,255,.12)",
  borderFocus: "rgba(99,102,241,.6)",
  primary: "#6366F1",
  primaryBright: "#818CF8",
  cyan: "#22D3EE",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
  purple: "#A78BFA",
  text: "#F5F5FF",
  textMuted: "#8B8FA3",
  textDim: "#4B5066",
  radius: { sm: 10, md: 14, lg: 18, xl: 22 },
};

/* ─── Micro components ─────────────────────────────── */

const Spinner = ({ size = 16, color = "#fff" }) => (
  <span style={{
    display: "inline-block", width: size, height: size,
    border: `1.5px solid rgba(255,255,255,.14)`, borderTopColor: color,
    borderRadius: "50%", animation: "spin .65s linear infinite", flexShrink: 0,
  }} />
);

const LivePulse = ({ on }) => (
  <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8, flexShrink: 0 }}>
    {on && <span style={{
      position: "absolute", inset: 0, borderRadius: "50%",
      background: "rgba(34,197,94,.55)", animation: "ping 1.6s ease-out infinite"
    }} />}
    <span style={{
      position: "absolute", inset: 0, borderRadius: "50%",
      background: on ? T.green : T.textDim,
      boxShadow: on ? `0 0 8px ${T.green}, 0 0 2px ${T.green}` : "none",
      transition: "background .4s, box-shadow .4s"
    }} />
  </span>
);

const Toast = ({ msg, type }) => {
  if (!msg) return null;
  const ok = type !== "error";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, x: "-50%", scale: 0.96 }}
      animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
      exit={{ opacity: 0, y: 6, x: "-50%", scale: 0.97 }}
      transition={{ type: "spring", damping: 22, stiffness: 320 }}
      style={{
        position: "fixed", bottom: 32, left: "50%",
        background: ok ? "rgba(20,30,24,.92)" : "rgba(32,18,18,.92)",
        border: `1px solid ${ok ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}`,
        color: ok ? "#6EE7A0" : "#FCA5A5",
        borderRadius: T.radius.md, padding: "11px 22px",
        fontSize: 13, fontWeight: 500,
        zIndex: 9999, whiteSpace: "nowrap", backdropFilter: "blur(24px)",
        boxShadow: `0 20px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(0,0,0,.2)`,
      }}
    >{msg}</motion.div>
  );
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(8,8,16,.98)", border: `1px solid ${T.borderStrong}`,
      borderRadius: T.radius.sm, padding: "10px 16px", fontSize: 12,
      backdropFilter: "blur(16px)", boxShadow: "0 12px 40px rgba(0,0,0,.65)",
    }}>
      <p style={{ margin: "0 0 4px", color: T.textMuted, fontSize: 10.5, fontWeight: 600, letterSpacing: ".04em" }}>{label}</p>
      <p style={{ margin: 0, fontWeight: 700, color: T.primaryBright, fontSize: 14 }}>{payload[0].value} <span style={{ color: T.textMuted, fontWeight: 500, fontSize: 12 }}>clicks</span></p>
    </div>
  );
};

const Badge = ({ children, color = T.primary, bg }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    background: bg || `${color}16`,
    border: `1px solid ${color}2e`,
    color, borderRadius: 20, padding: "3px 10px",
    fontSize: 10.5, fontWeight: 650, letterSpacing: ".04em",
    whiteSpace: "nowrap",
  }}>{children}</span>
);

/* ─── Card wrapper ─────────────────────────────── */
// elevation: "primary" (strongest, the URL generator + API key) | "medium" (analytics/chart) | "light" (logs/secondary)
const Card = ({ children, style = {}, glow = false, elevation = "medium" }) => {
  const tier = glow ? "primary" : elevation;
  const shadows = {
    primary: `0 0 0 1px rgba(99,102,241,.16), 0 14px 52px rgba(0,0,0,.45), 0 2px 8px rgba(99,102,241,.08), inset 0 1px 0 rgba(255,255,255,.06)`,
    medium: `0 8px 32px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.045)`,
    light: `0 4px 18px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.03)`,
  };
  const hoverShadows = {
    primary: `0 0 0 1px rgba(99,102,241,.22), 0 20px 64px rgba(0,0,0,.5), 0 2px 12px rgba(99,102,241,.14), inset 0 1px 0 rgba(255,255,255,.07)`,
    medium: `0 12px 40px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.05)`,
    light: `0 6px 22px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.035)`,
  };
  const lifts = { primary: -3, medium: -2, light: -1 };
  const borders = {
    primary: T.borderStrong,
    medium: T.border,
    light: "rgba(255,255,255,.06)",
  };
  const bgs = {
    primary: "rgba(255,255,255,.05)",
    medium: T.surface,
    light: "rgba(255,255,255,.03)",
  };
  return (
    <motion.div
      whileHover={{ y: lifts[tier], boxShadow: hoverShadows[tier] }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{
        background: bgs[tier],
        border: `1px solid ${borders[tier]}`,
        borderRadius: T.radius.lg,
        padding: "20px 22px",
        backdropFilter: tier === "light" ? "blur(14px)" : "blur(18px)",
        boxShadow: shadows[tier],
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
    </motion.div>
  );
};

/* ─── Section label ─────────────────────────────── */
const Label = ({ children, style = {} }) => (
  <p style={{
    fontSize: 10.5, fontWeight: 700, color: T.textDim,
    textTransform: "uppercase", letterSpacing: ".14em",
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
          position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)",
          pointerEvents: "none", display: "flex",
          color: error ? T.red : focused ? T.primaryBright : T.textDim,
          transition: "color .2s",
        }}>
          <Icon_ size={15} strokeWidth={2} />
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
            width: "100%", height: 48, fontFamily: "inherit",
            background: focused ? "rgba(99,102,241,.06)" : "rgba(255,255,255,.03)",
            border: `1px solid ${error ? "rgba(239,68,68,.5)" : focused ? T.borderFocus : T.border}`,
            borderRadius: T.radius.sm, padding: "0 14px 0 43px",
            color: T.text, fontSize: 14, outline: "none",
            transition: "border-color .2s, background .2s, box-shadow .2s",
            boxShadow: focused ? `0 0 0 4px rgba(99,102,241,.1)` : "none",
          }}
        />
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 11.5, color: T.red, marginTop: 6, paddingLeft: 2, fontWeight: 500 }}
        >{error}</motion.p>
      )}
      {hint && !error && (
        <motion.p
          initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 11.5, color: T.green, marginTop: 6, paddingLeft: 2, fontWeight: 500 }}
        >{hint}</motion.p>
      )}
    </div>
  );
};

/* ─── CountUp ─────────────────────────────── */
// Purely cosmetic: tweens the displayed digits toward the latest numeric value via a spring.
// The actual value/state passed in is untouched — this only animates its presentation.
const CountUp = ({ value, style }) => {
  const numeric = Number(value) || 0;
  const mv = useMotionValue(numeric);
  const spring = useSpring(mv, { stiffness: 140, damping: 18, mass: 0.6 });
  const [display, setDisplay] = useState(numeric);

  useEffect(() => { mv.set(numeric); }, [numeric, mv]);
  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(Math.round(v)));
    return unsub;
  }, [spring]);

  return <span style={style}>{value === null || value === undefined ? "—" : display}</span>;
};

/* ─── MetricCard ─────────────────────────────── */
const MetricCard = ({ icon: Icon_, label, value, sub, accent = T.primary, flash = false }) => (
  <motion.div
    whileHover={{ y: -4, boxShadow: `0 22px 60px rgba(0,0,0,.52), 0 0 0 1px ${accent}38` }}
    transition={{ duration: 0.2, ease: "easeOut" }}
    style={{
      flex: 1, minWidth: 0,
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.radius.lg,
      padding: "20px 22px",
      backdropFilter: "blur(18px)",
      boxShadow: "0 8px 28px rgba(0,0,0,.3)",
      position: "relative", overflow: "hidden",
      cursor: "default",
    }}
  >
    {/* subtle gradient border accent, top edge */}
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 1.5,
      background: `linear-gradient(90deg, transparent, ${accent}70, transparent)`,
    }} />
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${accent}18`, border: `1px solid ${accent}2e`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: accent, flexShrink: 0,
        boxShadow: `0 0 16px ${accent}28`,
      }}>
        <Icon_ size={17} strokeWidth={2} />
      </div>
      {flash && (
        <span style={{
          width: 6, height: 6, borderRadius: "50%", background: T.green,
          boxShadow: `0 0 10px ${T.green}`, animation: "ping 1.5s ease-out infinite",
        }} />
      )}
    </div>
    <p style={{
      fontSize: 30, fontWeight: 800, color: T.text,
      letterSpacing: "-1.2px", lineHeight: 1, marginBottom: 7,
      fontVariantNumeric: "tabular-nums",
    }}>
      <CountUp value={value} />
    </p>
    <p style={{ fontSize: 12.5, color: T.textMuted, fontWeight: 500 }}>{label}</p>
    {sub && <p style={{ fontSize: 11, color: accent, marginTop: 4, opacity: 0.8, fontWeight: 500 }}>{sub}</p>}
  </motion.div>
);

/* ─── PrimaryButton ─────────────────────────────── */
const PrimaryButton = ({ onClick, disabled, loading, children, style = {} }) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    whileHover={!disabled ? { scale: 1.02, boxShadow: "0 6px 28px rgba(99,102,241,.5), inset 0 1px 0 rgba(255,255,255,.18)" } : {}}
    whileTap={!disabled ? { scale: 0.97 } : {}}
    transition={{ duration: 0.16, ease: "easeOut" }}
    style={{
      background: "linear-gradient(135deg, #6366F1 0%, #818cf8 50%, #06B6D4 100%)",
      backgroundSize: "200% 200%",
      border: "none", borderRadius: T.radius.sm, color: "#fff",
      fontSize: 13.5, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", gap: 7,
      padding: "0 22px", height: 48,
      opacity: disabled ? 0.55 : 1,
      boxShadow: disabled ? "none" : "0 4px 22px rgba(99,102,241,.4), inset 0 1px 0 rgba(255,255,255,.15)",
      whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit",
      letterSpacing: ".01em",
      transition: "opacity .2s",
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
    whileHover={{ scale: 1.08, background: "rgba(255,255,255,.1)", borderColor: "rgba(255,255,255,.18)" }}
    whileTap={{ scale: 0.92 }}
    transition={{ duration: 0.15, ease: "easeOut" }}
    style={{
      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
      background: "rgba(255,255,255,.05)", border: `1px solid ${T.border}`,
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      color: T.textMuted,
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
    whileHover={!disabled ? { background: "rgba(255,255,255,.08)", color: "#E5E7EB", y: -1 } : {}}
    whileTap={!disabled ? { scale: 0.97 } : {}}
    transition={{ duration: 0.15, ease: "easeOut" }}
    style={{
      height: 35, padding: "0 14px", borderRadius: 9,
      background: "rgba(255,255,255,.035)", border: `1px solid ${T.border}`,
      color: T.textMuted, fontSize: 12, fontWeight: 550,
      cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", gap: 6,
      opacity: disabled ? 0.45 : 1,
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
            initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
              background: "#0D0D1A", border: `1px solid ${T.borderStrong}`,
              borderRadius: T.radius.sm, padding: "8px 12px",
              fontSize: 11.5, color: "#9CA3AF",
              whiteSpace: "nowrap", zIndex: 50, lineHeight: 1.5,
              boxShadow: "0 16px 44px rgba(0,0,0,.65)", pointerEvents: "none",
            }}
          >{text}</motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};

/* ─── Progress bar ─────────────────────────────── */
const ProgressBar = ({ pct, color = T.primary, glow = false, height = 6 }) => (
  <div style={{ width: "100%", height, background: "rgba(255,255,255,.06)", borderRadius: 99, overflow: "hidden" }}>
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(pct, 100)}%` }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      style={{
        height: "100%", borderRadius: 99,
        background: color,
        boxShadow: glow ? `0 0 12px ${typeof color === "string" && color.startsWith("#") ? color + "90" : "rgba(99,102,241,.6)"}` : "none",
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
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 99px; }
      `}</style>

      {/* ── Ambient background: blue glow, purple blob, cyan wash, noise, vignette ── */}
      <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden", background: T.bg }}>
        <div style={{
          position: "absolute", top: "-20%", left: "-12%",
          width: 900, height: 900, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,.09) 0%, transparent 62%)",
        }} />
        <div style={{
          position: "absolute", bottom: "-18%", right: "-10%",
          width: 780, height: 780, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(167,139,250,.075) 0%, transparent 65%)",
        }} />
        <div style={{
          position: "absolute", top: "32%", right: "8%",
          width: 520, height: 520, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,211,238,.05) 0%, transparent 68%)",
        }} />
        {/* light noise texture */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.035, mixBlendMode: "overlay",
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }} />
        {/* vignette */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(circle at 50% 35%, transparent 35%, rgba(0,0,0,.45) 100%)",
        }} />
      </div>

      <div style={{
        minHeight: "100vh", position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "0 16px 80px",
      }}>

        {/* ── Nav ── */}
        <motion.nav
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            width: "100%", maxWidth: 800,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 0", marginBottom: 24,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #6366F1, #22D3EE)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 18px rgba(99,102,241,.5)",
            }}>
              <Link2 size={14} color="white" strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: T.text, letterSpacing: "-.4px" }}>sniplink</span>
              <span style={{
                display: "block", fontSize: 9, color: T.textDim,
                letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600,
              }}>v2.0</span>
            </div>
          </div>

          {/* Status pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 99, padding: "7px 14px",
            boxShadow: "0 4px 16px rgba(0,0,0,.2)",
          }}>
            <LivePulse on={wsStatus === "live"} />
            <span style={{ fontSize: 12, fontWeight: 650, color: wsColor }}>{wsStatusLabel}</span>
            <span style={{ fontSize: 11.5, color: T.textDim }}>WebSocket</span>
          </div>
        </motion.nav>

        <div style={{ width: "100%", maxWidth: 800 }}>

          {/* ── Hero ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            style={{ textAlign: "center", marginBottom: 24 }}
          >
            {/* Feature chips */}
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {[
                { icon: <Activity size={12} strokeWidth={2} />, label: "Realtime", color: T.green },
                { icon: <BarChart2 size={12} strokeWidth={2} />, label: "Analytics", color: T.primary },
                { icon: <Zap size={12} strokeWidth={2} />, label: "Redis", color: T.amber },
                { icon: <Wifi size={12} strokeWidth={2} />, label: "WebSocket", color: T.cyan },
                { icon: <Shield size={12} strokeWidth={2} />, label: "API Keys", color: T.purple },
                { icon: <TrendingUp size={12} strokeWidth={2} />, label: "Rate Limited", color: T.red },
              ].map(({ icon, label, color }) => (
                <motion.span
                  key={label}
                  whileHover={{ scale: 1.07, y: -1, borderColor: `${color}40` }}
                  transition={{ duration: 0.15 }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: T.surface, border: `1px solid ${T.border}`,
                    borderRadius: 99, padding: "5px 12px",
                    fontSize: 11.5, color: T.textMuted, cursor: "default", userSelect: "none",
                    fontWeight: 500,
                  }}
                >
                  <span style={{ color }}>{icon}</span>
                  {label}
                </motion.span>
              ))}
            </div>

            <h1 style={{
              fontSize: "clamp(28px, 4.6vw, 46px)", fontWeight: 800,
              color: T.text, letterSpacing: "-2px", lineHeight: 1.04,
              marginBottom: 10,
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
            <p style={{ fontSize: 15, color: T.textMuted, lineHeight: 1.6, maxWidth: 420, margin: "0 auto", fontWeight: 400 }}>
              Real-time click analytics, API-key auth, Redis-powered redirects — built for developers.
            </p>
          </motion.div>

          {/* ── Main stack ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* ── API Key Card ── */}
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
              <Card glow>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18 }}>
                  <div style={{
                    width: 27, height: 27, borderRadius: 7.5,
                    background: `${T.primary}1c`, border: `1px solid ${T.primary}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Key size={13} color={T.primaryBright} strokeWidth={2} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 650, color: "#D9DAE5" }}>API Access Key</span>
                  <InfoTip text="Required for all requests. Tracks usage and enforces rate limits." />
                  <div style={{ marginLeft: "auto" }}>
                    {apiStats && (
                      <Badge
                        color={isThrottled ? T.red : T.green}
                        bg={isThrottled ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)"}
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
                  background: "rgba(0,0,0,.22)", border: `1px solid ${T.border}`,
                  borderRadius: T.radius.sm, padding: "12px 14px", marginBottom: 16,
                }}>
                  {apiKey
                    ? <Key size={13} color={T.primaryBright} style={{ flexShrink: 0 }} />
                    : <Spinner size={13} color={T.amber} />
                  }
                  <code style={{
                    flex: 1, fontSize: 12.5, color: apiKey ? "#9091B5" : T.amber,
                    letterSpacing: ".06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
                  }}>{apiKeyDisplay}</code>
                  <div style={{ display: "flex", gap: 6 }}>
                    {apiKey && (
                      <IconButton onClick={copyKey} title="Copy API key">
                        {keyCopied ? <Check size={13} color={T.green} strokeWidth={2} /> : <Copy size={13} strokeWidth={2} />}
                      </IconButton>
                    )}
                    <GhostButton onClick={generateKey}>
                      <RefreshCw size={12} strokeWidth={2} />Regenerate
                    </GhostButton>
                  </div>
                </div>

                {/* Usage */}
                {apiStats && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
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
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: T.textDim }}>{apiStats.remaining} remaining</span>
                      <span style={{ fontSize: 11, color: T.textDim }}>{Math.round(usagePct)}% used</span>
                    </div>
                    <AnimatePresence>
                      {isThrottled && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          style={{
                            marginTop: 12, padding: "10px 13px", borderRadius: T.radius.sm,
                            background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)",
                            fontSize: 12, color: "#FCA5A5", display: "flex", alignItems: "center", gap: 8,
                          }}
                        >
                          <AlertTriangle size={13} strokeWidth={2} />
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
              <Card elevation="primary">
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
                    {!loading && <><ChevronRight size={15} strokeWidth={2} />Generate</>}
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
                  <p style={{ fontSize: 11.5, color: T.textDim, marginTop: 8, paddingLeft: 2 }}>
                    Optional — set a custom slug instead of a random code
                  </p>
                )}

                {/* Generated link */}
                <AnimatePresence>
                  {shortUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: .98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", damping: 22, stiffness: 280 }}
                      style={{
                        marginTop: 16,
                        background: "linear-gradient(135deg, rgba(99,102,241,.09) 0%, rgba(34,211,238,.05) 100%)",
                        border: `1px solid rgba(99,102,241,.28)`,
                        borderRadius: T.radius.md, padding: "17px 19px",
                        boxShadow: "0 0 0 1px rgba(99,102,241,.1), 0 10px 36px rgba(99,102,241,.12)",
                        position: "relative", overflow: "hidden",
                      }}
                    >
                      <div style={{
                        position: "absolute", top: 0, left: 0, right: 0, height: 1,
                        background: "linear-gradient(90deg, transparent, rgba(99,102,241,.6), transparent)",
                      }} />
                      <p style={{
                        fontSize: 10, color: T.primaryBright, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 11,
                      }}>
                        ✦ Link created
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 13 }}>
                        <a href={shortUrl} target="_blank" rel="noreferrer"
                          style={{
                            fontSize: 14, color: "#A5B4FC", wordBreak: "break-all", flex: 1, fontWeight: 500,
                            fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
                          }}>
                          {shortUrl}
                        </a>
                        <div style={{ display: "flex", gap: 5 }}>
                          <IconButton onClick={copy} title="Copy link">
                            {copied ? <Check size={13} color={T.green} strokeWidth={2} /> : <Copy size={13} strokeWidth={2} />}
                          </IconButton>
                          <a href={shortUrl} target="_blank" rel="noreferrer">
                            <IconButton title="Open in new tab">
                              <ExternalLink size={13} strokeWidth={2} />
                            </IconButton>
                          </a>
                        </div>
                      </div>
                      <p style={{ fontSize: 11.5, color: T.textDim, marginBottom: 14 }}>
                        Share this link — analytics update in real time.
                      </p>
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                        <GhostButton onClick={loadAnalytics} disabled={aLoading}>
                          {aLoading ? <Spinner size={11} color={T.textMuted} /> : <BarChart2 size={13} strokeWidth={2} />}
                          {aLoading ? "Loading…" : "View Analytics"}
                        </GhostButton>
                        <GhostButton onClick={handleSimulateTraffic} disabled={simulating}>
                          <Zap size={13} strokeWidth={2} color={simulating ? T.amber : undefined} />
                          {simulating ? "Simulating…" : "Simulate Traffic"}
                        </GhostButton>
                        <GhostButton onClick={downloadCSV}>
                          <Download size={13} strokeWidth={2} />Export CSV
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
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
                  >
                    <MetricCard icon={MousePointer} label="Total Requests" value={totalClicks} accent={T.primary} flash={flash} />
                    <MetricCard icon={Users} label="Unique Clients" value={uniqueClients} accent={T.green} />
                    <MetricCard icon={Activity} label="Live Events" value={liveEvents} accent={T.amber} sub="This session" flash={flash} />
                  </motion.div>

                  {/* Live chart */}
                  {liveChart.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                    <Card>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                        <Label style={{ marginBottom: 0 }}>Live Click Stream</Label>
                        <Badge color={T.green} bg="rgba(34,197,94,.1)">
                          <LivePulse on /> WebSocket · Live
                        </Badge>
                      </div>
                      <ResponsiveContainer width="100%" height={185}>
                        <AreaChart data={liveChart} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}>
                          <defs>
                            <linearGradient id="liveGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={T.primaryBright} stopOpacity={0.35} />
                              <stop offset="95%" stopColor={T.primaryBright} stopOpacity={0} />
                            </linearGradient>
                            <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
                              <feGaussianBlur stdDeviation="3.5" result="blur" />
                              <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>
                          <CartesianGrid stroke="rgba(255,255,255,.045)" vertical={false} />
                          <XAxis dataKey="time" tick={{ fill: T.textDim, fontSize: 9.5, fontWeight: 500 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fill: T.textDim, fontSize: 9.5, fontWeight: 500 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,.18)", strokeWidth: 1, strokeDasharray: "3 3" }} />
                          <Area
                            type="monotone" dataKey="count"
                            stroke={T.primaryBright} strokeWidth={2.5}
                            fill="url(#liveGrad)"
                            dot={false}
                            activeDot={{ r: 4.5, fill: T.primaryBright, stroke: T.bg, strokeWidth: 2.5 }}
                            isAnimationActive={true}
                            animationDuration={500}
                            animationEasing="ease-out"
                            style={{ filter: "url(#lineGlow)" }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Card>
                    </motion.div>
                  )}

                  {/* Device + Countries */}
                  {stats && (
                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
                    >
                      {/* Device Breakdown */}
                      <Card style={{ flex: 1, minWidth: 240 }}>
                        <Label>Device Breakdown</Label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 17 }}>
                          {deviceList.length > 0 ? deviceList.map(({ device, count }) => {
                            const pct = Math.round((count / totalDevice) * 100);
                            const isM = device === "mobile";
                            const color = isM ? T.green : T.primaryBright;
                            const gradient = isM
                              ? `linear-gradient(90deg, ${T.green}, #4ADE80)`
                              : `linear-gradient(90deg, ${T.primary}, ${T.cyan})`;
                            const Icon_ = isM ? Smartphone : Monitor;
                            return (
                              <div key={device}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{
                                      width: 29, height: 29, borderRadius: 8,
                                      background: `${color}16`, border: `1px solid ${color}28`,
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                      <Icon_ size={14} color={color} strokeWidth={2} />
                                    </div>
                                    <span style={{ fontSize: 13, color: "#A6A8BD", fontWeight: 550, textTransform: "capitalize" }}>{device}</span>
                                  </div>
                                  <span style={{ fontSize: 13, color, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                                    {count}
                                    <span style={{ color: T.textDim, fontWeight: 450, fontSize: 11.5 }}> · {pct}%</span>
                                  </span>
                                </div>
                                <ProgressBar pct={pct} color={gradient} glow height={7} />
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
                          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                            {countryList.slice(0, 5).map((c, i) => {
                              const maxCount = countryList[0].count;
                              const pct = Math.round((c.count / maxCount) * 100);
                              const color = ACCENTS[i % ACCENTS.length];
                              return (
                                <div key={i}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      <span style={{ fontSize: 19 }}>{getFlag(c.country)}</span>
                                      <span style={{ fontSize: 13, color: "#A6A8BD", fontWeight: 550 }}>{c.country}</span>
                                    </div>
                                    <span style={{ fontSize: 13, color, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{c.count}</span>
                                  </div>
                                  <ProgressBar pct={pct} color={`linear-gradient(90deg, ${color}, ${color}99)`} glow height={7} />
                                </div>
                              );
                            })}
                          </div>
                        </Card>
                      )}
                    </motion.div>
                  )}

                  {/* Recent Access Logs */}
                  {stats?.recent?.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                    <Card elevation="light">
                      <Label>Recent Access Logs</Label>
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        {stats.recent.map((r, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.035 }}
                            whileHover={{ background: T.surfaceHover, x: 2, boxShadow: "0 4px 16px rgba(99,102,241,.08)" }}
                            style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              padding: "12px 14px",
                              background: "rgba(255,255,255,.025)",
                              border: `1px solid ${T.border}`,
                              borderRadius: T.radius.md,
                              transition: "background .15s, box-shadow .15s",
                              cursor: "default",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: `${T.primary}16`, border: `1px solid ${T.primary}28`,
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                              }}>
                                {r.device === "mobile"
                                  ? <Smartphone size={15} color={T.primaryBright} strokeWidth={2} />
                                  : <Monitor size={15} color={T.primaryBright} strokeWidth={2} />}
                              </div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                                  <p style={{
                                    fontSize: 12.5, color: "#CACBDC", fontWeight: 600,
                                    fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
                                  }}>{r.ip}</p>
                                  {r.country && <span style={{ fontSize: 14 }}>{getFlag(r.country)}</span>}
                                </div>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  {r.device && <Badge color={T.primaryBright}>{r.device}</Badge>}
                                  {r.country && (
                                    <span style={{ fontSize: 11, color: T.textDim }}>{r.country}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                              <Clock size={12} strokeWidth={2} color={T.textDim} />
                              <span style={{ fontSize: 11.5, color: T.textDim, fontVariantNumeric: "tabular-nums" }}>{r.time}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </Card>
                    </motion.div>
                  )}

                  {/* Empty state */}
                  {!stats && (
                    <Card elevation="light" style={{ textAlign: "center", padding: "44px 20px" }}>
                      <BarChart2 size={26} strokeWidth={2} color={T.textDim} style={{ margin: "0 auto 12px" }} />
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
          <div style={{ marginTop: 48, textAlign: "center" }}>
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