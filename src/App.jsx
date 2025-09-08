import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@supabase/supabase-js";
import {
  AppShell, Group, Button, TextInput, Table, Badge, ActionIcon,
  Paper, Title, Text, Tabs, Card, Grid, Loader, Select, Tooltip,
  Pagination, Switch, Textarea, Collapse, Slider, NumberInput,
  Modal, Divider, Anchor, PasswordInput, Progress
} from "@mantine/core";
import { useDebouncedValue, useHotkeys, useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  ExternalLink, Plus, Trash2, Filter, LogOut,
  CalendarDays, Calendar, RefreshCw, CheckCircle, RotateCcw,
  StickyNote as StickyNoteIcon, Edit3, Save, X, Settings, Volume2, Trash,
  Menu as MenuIcon
} from "lucide-react";
import { Indicator } from "@mantine/core";

import {
  format, startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, isWithinInterval
} from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, PieChart, Pie, Cell, ResponsiveContainer
} from "recharts";

/* ---------- Supabase ---------- */
function getSupabase(){
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const GLOBAL_KEY = "__sb_joblinks_client__";
  if (!globalThis[GLOBAL_KEY]){
    globalThis[GLOBAL_KEY] = createClient(url, key, {
      auth: {
        storageKey: "sb-joblinks-auth",
        persistSession: true,
        autoRefreshToken: true,
        flowType: "pkce",
      },
    });
  }
  return globalThis[GLOBAL_KEY];
}
const supabase = getSupabase();

/* ---------- tiny helpers ---------- */
const GoogleIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path fill="#EA4335" d="M9 3.48c1.69 0 2.84.73 3.49 1.34l2.37-2.3C13.54.9 11.45 0 9 0 5.48 0 2.44 2.02 1 4.96l2.79 2.17C4.38 5.24 6.48 3.48 9 3.48z"/>
    <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.83 2.2c1.7-1.57 2.69-3.88 2.69-6.62z"/>
    <path fill="#FBBC05" d="M3.79 10.13A5.54 5.54 0 0 1 3.5 9c0-.39.06-.77.15-1.13L.86 5.7A9 9 0 0 0 0 9c0 1.44.35 2.8.96 4.01l2.83-2.88z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.48-.8 5.97-2.18l-2.83-2.2c-.76.53-1.77.91-3.14.91-2.4 0-4.44-1.62-5.17-3.86L.96 13.01C2.39 15.98 5.48 18 9 18z"/>
  </svg>
);
function StatusBadge({ status }) {
  const color = status === "finished" ? "green" : status === "open" ? "blue" : "gray";
  return <Badge color={color} variant="light" tt="capitalize">{status}</Badge>;
}
function PriorityBadge({ priority }) {
  const color = priority === "high" ? "red" : priority === "medium" ? "yellow" : "blue";
  return <Badge color={color} variant="light" tt="capitalize">{priority}</Badge>;
}
const getWeek = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};
const COLORS = ["#4ade80", "#3b82f6", "#facc15"];
const avatarUrl = (email) => `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(email || "unknown")}&scale=90`;
const favicon = (url) => { try { const u = new URL(url); return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`; } catch { return null; } };

/* ---------- Mobile sheet (drawer-like) ---------- */
function useBodyScrollLock(open) {
  useEffect(() => {
    if (!open) return;
    const y = window.scrollY || 0;
    const original = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflowY: document.body.style.overflowY,
      overscrollBehavior: document.body.style.overscrollBehavior,
    };
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflowY = "scroll";
    document.body.style.overscrollBehavior = "contain";
    return () => {
      Object.assign(document.body.style, original);
      window.scrollTo(0, y);
    };
  }, [open]);
}
function MobileSheet({ open, onClose, children }) {
  useBodyScrollLock(open);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div aria-hidden={!open} style={{ position:"fixed", inset:0, zIndex:10000, pointerEvents: open ? "auto":"none" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background: open ? "rgba(0,0,0,.35)":"transparent", transition:"background .18s ease" }}/>
      <div
        onClick={(e)=>e.stopPropagation()}
        style={{
          position:"absolute", top:0, bottom:0, left:0, width:"86vw", maxWidth:360, background:"#fff",
          boxShadow:"0 8px 40px rgba(0,0,0,.25)", transform: open ? "translateX(0)" : "translateX(-105%)",
          transition:"transform .2s cubic-bezier(.2,.8,.2,1)", display:"flex", flexDirection:"column", overscrollBehavior:"contain"
        }}
      >
        <div style={{ display:"flex", alignItems:"center", padding:12, borderBottom:"1px solid #eef2f7" }}>
          <button onClick={onClose} style={{ border:0, background:"transparent", padding:"6px 10px", fontSize:16, cursor:"pointer" }} aria-label="Close navigation">✕</button>
          <div style={{ marginLeft:8, fontWeight:600 }}>Menu</div>
        </div>
        <div style={{ padding:12, overflow:"auto" }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

/* ---------- Celebration overlay (big emoji + text) ---------- */
function CelebrationOverlay({ open, emoji = "🎉", title = "Great job!", subtitle = "", onClose }) {
  if (!open) return null;
  return (
    <>
      <style>{`
        @keyframes popZoom {
          0% { transform: scale(0.2); opacity: 0; }
          35% { transform: scale(1.2); opacity: 1; }
          60% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes floatUp {
          0% { transform: translateY(8px); opacity: .85; }
          100% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
      <div style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,.35)", zIndex: 9999,
        display:"grid", placeItems:"center"
      }}
        onClick={onClose}
      >
        <div style={{ textAlign:"center", userSelect:"none" }}>
          <div style={{
            fontSize: "7rem", lineHeight:"1", animation:"popZoom .6s ease"
          }}>
            {emoji}
          </div>
          <Paper withBorder shadow="md" p="md" radius="lg" style={{ background:"#ffffffee", minWidth: 260, marginTop: 10, animation:"floatUp 1.2s ease infinite alternate" }}>
            <Title order={3} style={{ margin: 0 }}>{title}</Title>
            {subtitle ? <Text c="dimmed" mt={4}>{subtitle}</Text> : null}
          </Paper>
          <Button mt="md" variant="white" onClick={onClose}>Close</Button>
        </div>
      </div>
    </>
  );
}

/* ---------- Confetti (no deps) ---------- */
function ConfettiCanvas({ runKey = 0, mode = "burst", onEnd }) {
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(0);

  React.useEffect(() => {
    if (!runKey) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const rand = (min, max) => Math.random() * (max - min) + min;
    const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#f43f5e"];

    const isBurst = mode === "burst";
    const duration = isBurst ? 1800 : 3000;
    const gravity = 0.18;
    const drag = 0.004;
    const count = isBurst ? 160 : 220;

    const particles = [];
    const cx = W / 2;
    const cy = isBurst ? H / 2 : -10;

    for (let i = 0; i < count; i++) {
      const angle = isBurst ? rand(0, Math.PI * 2) : rand(Math.PI * 0.05, Math.PI - Math.PI * 0.05);
      const speed = isBurst ? rand(3.6, 8.5) : rand(2.5, 5.5);

      particles.push({
        x: isBurst ? cx : rand(0, W),
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: rand(6, 12),
        rot: rand(0, Math.PI * 2),
        vrot: rand(-0.2, 0.2),
        color: colors[(Math.random() * colors.length) | 0],
        life: 0,
        ttl: duration + rand(-400, 400),
        wobble: rand(0, 2 * Math.PI),
        vwobble: rand(0.08, 0.25),
      });
    }

    const start = performance.now();

    function drawRectTilted(p) {
      const c = ctx;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.fillStyle = p.color;
      c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      c.restore();
    }

    function frame(t) {
      const elapsed = t - start;
      ctx.clearRect(0, 0, W, H);

      particles.forEach((p) => {
        p.life = elapsed;
        p.vy += gravity;
        p.vx *= (1 - drag);
        p.vy *= (1 - drag * 0.6);
        p.wobble += p.vwobble;
        const wobbleX = Math.cos(p.wobble) * 0.6;
        p.x += p.vx + wobbleX;
        p.y += p.vy;
        p.rot += p.vrot;

        drawRectTilted(p);
      });

      const done = elapsed > duration + 450;
      if (!done) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, W, H);
        if (onEnd) onEnd();
      }
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      const ctx2 = canvas.getContext("2d");
      ctx2 && ctx2.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [runKey, mode, onEnd]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        pointerEvents: "none",
      }}
    />
  );
}

/* ---------- Sticky Note viewers/editors ---------- */
function TaskNoteSticky({ open, onClose, text, label }) {
  if (!open) return null;
  const bg = "#FEF3C7";
  const border = "#F59E0B";
  return (
    <div style={{ position:"fixed", right:16, bottom:16, zIndex:6000, width:420, maxWidth:"92vw" }}>
      <Paper withBorder shadow="md" p="sm" radius="md" style={{ background:bg, borderColor:border }}>
        <Group justify="space-between" align="center" mb="xs" wrap="nowrap">
          <Group gap={8} align="center"><StickyNoteIcon size={18}/><Text fw={700} size="sm" truncate="end">{label || "Task Note"}</Text></Group>
          <Tooltip label="Close"><ActionIcon variant="subtle" color="red" onClick={onClose}><X size={16}/></ActionIcon></Tooltip>
        </Group>
        <div style={{ borderRadius:8, overflow:"auto", background:"#fff", border:"1px solid #f1f1f1", maxHeight:360, padding:12 }}>
          <Text size="sm" style={{ whiteSpace:"pre-wrap" }}>{text || "No note content."}</Text>
        </div>
      </Paper>
    </div>
  );
}
function TaskNoteEditSticky({ open, initialText, label, onSave, onDelete, onClose }) {
  const [text, setText] = useState(initialText || "");
  useEffect(() => { setText(initialText || ""); }, [initialText, open]);
  if (!open) return null;
  const bg = "#FFF9C4";
  const border = "#FACC15";
  return (
    <div style={{ position:"fixed", right:16, bottom:16, zIndex:6100, width:520, maxWidth:"92vw" }}>
      <Paper withBorder shadow="md" p="sm" radius="md" style={{ background:bg, borderColor:border }}>
        <Group justify="space-between" align="center" mb="xs">
          <Group gap={8} align="center"><StickyNoteIcon size={18}/><Text fw={700} size="sm" truncate="end">{label || "Edit Note"}</Text></Group>
          <Group gap={6}>
            {Boolean(initialText) && (
              <Tooltip label="Delete note">
                <ActionIcon variant="subtle" color="red" onClick={onDelete}><Trash size={16}/></ActionIcon>
              </Tooltip>
            )}
            <Tooltip label="Save"><ActionIcon variant="subtle" onClick={() => onSave(text)}><Save size={16}/></ActionIcon></Tooltip>
            <Tooltip label="Cancel"><ActionIcon variant="subtle" color="gray" onClick={onClose}><X size={16}/></ActionIcon></Tooltip>
          </Group>
        </Group>
        <Textarea
          autosize minRows={8} maxRows={18}
          value={text}
          onChange={(e)=>setText(e.currentTarget.value)}
          placeholder="Write instructions for members about this task…"
          styles={{ input:{ background:bg } }}
        />
      </Paper>
    </div>
  );
}

/* ---------- Auth Screen ---------- */
function AuthScreen({ onGoogle, onMagic, onSignInEmail, onSignUpEmail, onForgot, busy }) {
  const [tab, setTab] = useState("signin");
  const [siEmail, setSiEmail] = useState("");
  const [siPass, setSiPass] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPass, setSuPass] = useState("");
  const [suPass2, setSuPass2] = useState("");
  const [mlEmail, setMlEmail] = useState("");
  const disabled = !!busy;

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f8fafc 0%,#eef2ff 100%)"}}>
      <AppShell header={{height:64}} padding="md">
        <AppShell.Header>
          <Group h={64} px="md" justify="space-between">
            <Title order={4}>Job Link Task Manager</Title>
          </Group>
        </AppShell.Header>
        <AppShell.Main>
          <div style={{ display:"grid", placeItems:"center", minHeight:"calc(100vh - 64px)" }}>
            <Paper withBorder p="xl" radius="lg" style={{ maxWidth: 520, width:"92vw", boxShadow:"0 18px 60px rgba(20, 40, 100, .08)" }}>
              <Group align="center" justify="space-between" mb="md" wrap="nowrap">
                <div>
                  <Title order={3}>Welcome back</Title>
                  <Text c="dimmed" size="sm">Sign in or create an account to continue.</Text>
                </div>
                <img src="https://www.google.com/s2/favicons?domain=supabase.com&sz=64" width={28} height={28} style={{opacity:.6}}/>
              </Group>

              <Button
                fullWidth
                size="md"
                leftSection={<GoogleIcon size={16} />}
                onClick={onGoogle}
                disabled={disabled}
                styles={{ root:{ background:"#fff", color:"#111827", border:"1px solid #e5e7eb" } }}
              >
                Continue with Google
              </Button>

              <Divider my="md" label="or use email" labelPosition="center" />

              <Tabs value={tab} onChange={(v)=>setTab(v || "signin")} keepMounted={false}>
                <Tabs.List grow>
                  <Tabs.Tab value="signin">Sign in</Tabs.Tab>
                  <Tabs.Tab value="signup">Register</Tabs.Tab>
                  <Tabs.Tab value="magic">Magic link</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="signin" pt="md">
                  <TextInput label="Email" placeholder="you@example.com" value={siEmail} onChange={(e)=>setSiEmail(e.currentTarget.value)} disabled={disabled} required />
                  <PasswordInput mt="sm" label="Password" placeholder="••••••••" value={siPass} onChange={(e)=>setSiPass(e.currentTarget.value)} disabled={disabled} required />
                  <Group justify="space-between" mt="xs">
                    <Anchor component="button" type="button" onClick={()=>onForgot(siEmail)} size="sm">
                      Forgot password?
                    </Anchor>
                  </Group>
                  <Button fullWidth mt="md" onClick={()=>onSignInEmail(siEmail, siPass)} loading={!!busy}>
                    Sign in
                  </Button>
                </Tabs.Panel>

                <Tabs.Panel value="signup" pt="md">
                  <TextInput label="Email" placeholder="you@example.com" value={suEmail} onChange={(e)=>setSuEmail(e.currentTarget.value)} disabled={disabled} required />
                  <PasswordInput mt="sm" label="Password" placeholder="min 6 characters" value={suPass} onChange={(e)=>setSuPass(e.currentTarget.value)} disabled={disabled} required />
                  <PasswordInput mt="sm" label="Confirm password" placeholder="repeat password" value={suPass2} onChange={(e)=>setSuPass2(e.currentTarget.value)} disabled={disabled} required />
                  <Button
                    fullWidth mt="md"
                    onClick={()=>{
                      if (suPass !== suPass2) { notifications.show({ color:"red", title:"Passwords do not match", message:"Please re-enter the same password." }); return; }
                      onSignUpEmail(suEmail, suPass);
                    }}
                    loading={!!busy}
                    variant="gradient"
                    gradient={{ from: 'indigo', to: 'cyan', deg: 90 }}
                  >
                    Create account
                  </Button>
                  <Text c="dimmed" size="xs" mt="xs">By continuing you agree to the Terms & Privacy.</Text>
                </Tabs.Panel>

                <Tabs.Panel value="magic" pt="md">
                  <TextInput label="Email for magic link" placeholder="you@example.com" value={mlEmail} onChange={(e)=>setMlEmail(e.currentTarget.value)} disabled={disabled} required />
                  <Button fullWidth mt="md" variant="light" onClick={()=>onMagic(mlEmail)} loading={!!busy}>
                    Send magic link
                  </Button>
                  <Text c="dimmed" size="xs" mt="xs">We’ll email you a link to sign in securely.</Text>
                </Tabs.Panel>
              </Tabs>
            </Paper>
          </div>
        </AppShell.Main>
      </AppShell>
    </div>
  );
}

/* ---------- Main ---------- */
export default function AppInner(){
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [roleReady, setRoleReady] = useState(false);
  const [role, setRole] = useState("member");
  const isAdmin = role === "admin";

  const [busyAuth, setBusyAuth] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, highPriority: 0 });
  const [perDay, setPerDay] = useState([]);
  const [statusDist, setStatusDist] = useState([]);
  const [logs, setLogs] = useState([]);

  const [notes, setNotes] = useState({});
  const [globalNote, setGlobalNote] = useState("");
  const [showGlobalNote, setShowGlobalNote] = useState(false);
  const [editingGlobal, setEditingGlobal] = useState(false);

  const [noteOpen, setNoteOpen] = useState({ open:false, text:"", label:"" });
  const [editNote, setEditNote] = useState({ open:false, taskId:null, text:"", label:"" });

  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [priority, setPriority] = useState("medium");

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sort, setSort] = useState({ key:'created_at', dir:'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [dq] = useDebouncedValue(query, 200);
  const searchRef = useRef(null);
  useHotkeys([['/', () => searchRef.current?.focus()]]);

  // sound
  const [soundOn, setSoundOn] = useState(true);
  const [soundSettingsOpen, setSoundSettingsOpen] = useState(false);
  const [soundType, setSoundType] = useState("ding");
  const [soundWave, setSoundWave] = useState("sine");
  const [soundFreq, setSoundFreq] = useState(880);
  const [soundVolume, setSoundVolume] = useState(0.4);
  const [soundUrl, setSoundUrl] = useState("");

  const dingRef = useRef(null);
  const customAudioRef = useRef(null);
  const lastDingRef = useRef(0);
  const lastSeenLogIdRef = useRef(null);
  const audioCtxRef = useRef(null);

  // confetti + overlay
  const [celebrate, setCelebrate] = useState(false);
  const [celebrationEmoji, setCelebrationEmoji] = useState("🎉");
  const [celebrationCopy, setCelebrationCopy] = useState({ title: "Great job!", subtitle: "" });
  const [confettiKey, setConfettiKey] = useState(0);
  const [confettiMode, setConfettiMode] = useState("burst");

  // daily target / count
  const [dailyTarget, setDailyTarget] = useState(0);
  const [dailyCount, setDailyCount] = useState(0);

  // bumped sort by recent activity
  const [bumpedAt, setBumpedAt] = useState({});

  /* ----- high-priority lock selectors ----- */
  const hasHighOpen = useMemo(
    () => tasks.some(t => t.priority === "high" && t.status === "open"),
    [tasks]
  );
  const priorityLockActive = !isAdmin && hasHighOpen;
  const getTaskById = (id) => tasks.find(t => t.id === id);
  // --- Sticky-note seen tracking (persisted)
const [noteSeen, setNoteSeen] = useState({}); // { [taskId]: ISO string }
const [globalNoteSeenAt, setGlobalNoteSeenAt] = useState("");

// existing:

// NEW:
const [globalNoteUpdatedAt, setGlobalNoteUpdatedAt] = useState(""); // version = last updated ISO time
const [globalNoteSeenVersion, setGlobalNoteSeenVersion] = useState("");

// hydrate seen version from localStorage
useEffect(() => {
  setGlobalNoteSeenVersion(localStorage.getItem("globalNoteSeenVersion") || "");
}, []);

// load from localStorage once
useEffect(() => {
  try {
    const s = JSON.parse(localStorage.getItem("noteSeen") || "{}");
    setNoteSeen(s && typeof s === "object" ? s : {});
  } catch {}
  setGlobalNoteSeenAt(localStorage.getItem("globalNoteSeenAt") || "");
}, []);

// persist helpers
const markNoteSeen = (taskId) => {
  setNoteSeen((prev) => {
    const next = { ...prev, [taskId]: new Date().toISOString() };
    localStorage.setItem("noteSeen", JSON.stringify(next));
    return next;
  });
};
const isNoteNew = (taskId) => {
  const n = notes[taskId];
  if (!n?.created_at) return false;
  const seen = noteSeen[taskId];
  return !seen || new Date(n.created_at) > new Date(seen);
};

const markGlobalSeen = () => {
  // store the specific version you’ve seen
  const v = globalNoteUpdatedAt || "";
  localStorage.setItem("globalNoteSeenVersion", v);
  setGlobalNoteSeenVersion(v);
};
// helper: is a timestamp "today" ?
const isToday = (d) => {
  if (!d) return false;
  const a = new Date(d).toDateString();
  const b = new Date().toDateString();
  return a === b;
};

// show badge if there is a note AND the stored seen-version !== current updatedAt
  
const isGlobalNew = () => {
  Boolean(globalNote) &&
  Boolean(globalNoteUpdatedAt) &&
  globalNoteSeenVersion !== globalNoteUpdatedAt;

  // if there is no global note text, nothing to show
  if (!globalNote) return false;
  // we store latest global note created_at in fetchLogs via latestGlobal.created_at
  // fall back: if no timestamp available, show badge until user opens once
  const latestAt =
    Object.values(notes).length >= 0 ? (/* we don't have a direct timestamp here */
      // In fetchLogs you already set globalNote(text) but not its timestamp in state.
      // For a robust badge, consider it "new" until viewed at least once.
      null
    ) : null;

  // simple UX rule: show badge if user hasn't opened the sticky since app load and note has content
  return !globalNoteSeenAt;
};


  /* ----- sound init ----- */
  useEffect(() => {
    dingRef.current = new Audio(
      'data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAZGF0YQAQAAAAAP8A/wD/AAABAP8AAP8A/wAAAP8A/wAAAAD/AP8A/wAAAP8A/wAAAAAA/wD/AP8A'
    );
    if (dingRef.current) dingRef.current.volume = soundVolume;
  }, []);
  useEffect(() => {
    if (dingRef.current) dingRef.current.volume = soundVolume;
    if (customAudioRef.current) customAudioRef.current.volume = soundVolume;
  }, [soundVolume]);
  useEffect(() => {
    if (!soundUrl) { customAudioRef.current = null; return; }
    const a = new Audio(soundUrl);
    a.volume = soundVolume;
    customAudioRef.current = a;
  }, [soundUrl, soundVolume]);
  useEffect(() => {
    const handler = () => { ensureAudioReady(); };
    window.addEventListener("pointerdown", handler, { once:true });
    window.addEventListener("keydown", handler, { once:true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);
  const ensureAudioReady = async () => {
    try {
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtxRef.current = new AC();
      }
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
    } catch {}
  };
  const playDing = async () => {
    if (!soundOn) return;
    const now = Date.now();
    if (now - lastDingRef.current < 500) return;
    const playTone = (ctx, { freq = soundFreq, wave = soundWave, start = 0, duration = 0.16, gain = soundVolume }) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = wave;
      o.frequency.value = freq;
      const t0 = ctx.currentTime + start;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + duration + 0.01);
    };
    try {
      await ensureAudioReady();
      if (audioCtxRef.current) {
        const ctx = audioCtxRef.current;
        switch (soundType) {
          case "ding": playTone(ctx, { freq: soundFreq, wave: soundWave, duration: 0.18 }); break;
          case "beep": playTone(ctx, { freq: 1000, wave: "square", duration: 0.12 }); break;
          case "pop": {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.type = "triangle";
            o.frequency.setValueAtTime(700, ctx.currentTime);
            o.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.12);
            g.gain.setValueAtTime(0.0001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(Math.max(0.001, soundVolume), ctx.currentTime + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.13);
            o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.14); break;
          }
          case "chime": {
            const base = soundFreq || 660;
            playTone(ctx, { freq: base, duration: 0.14, gain: soundVolume * 0.9 });
            playTone(ctx, { freq: base * 1.25, start: 0.06, duration: 0.14, gain: soundVolume * 0.8 });
            playTone(ctx, { freq: base * 1.5, start: 0.12, duration: 0.16, gain: soundVolume * 0.7, wave: "triangle" });
            break;
          }
          case "custom":
            if (customAudioRef.current) { customAudioRef.current.currentTime = 0; await customAudioRef.current.play(); lastDingRef.current = now; return; }
            else { playTone(ctx, { freq: soundFreq || 820, duration: 0.18 }); }
            break;
          default: playTone(ctx, { freq: soundFreq || 880, duration: 0.16 });
        }
        lastDingRef.current = now; return;
      }
    } catch {}
    try { if (dingRef.current) { dingRef.current.currentTime = 0; dingRef.current.volume = soundVolume; await dingRef.current.play(); lastDingRef.current = now; } } catch {}
  };

  // celebration trigger
  const triggerCelebrate = (opts = {}) => {
    const { emoji = "🎉", title = "Task finished!", subtitle = "", rain = false } = opts;
    setCelebrationEmoji(emoji);
    setCelebrationCopy({ title, subtitle });
    setCelebrate(true);

    setConfettiMode(rain ? "rain" : "burst");
    setConfettiKey(k => k + 1);

    try { playDing(); } catch {}
  };

  /* --- Auth lifecycle + reset route handling --- */
// --- Auth lifecycle + reset route handling (fixed) ---
const atResetRoute =
  typeof window !== "undefined" && window.location.pathname === "/reset";

useEffect(() => {
  let mounted = true;

  (async () => {
    const { data } = await supabase.auth.getSession();
    if (!mounted) return;
    setSession(data.session ?? null);
    setAuthChecked(true);
    if (atResetRoute) setShowResetModal(true);
  })();

  const { data } = supabase.auth.onAuthStateChange((event, s) => {
    // always keep local state in sync
    setSession(s ?? null);

    if (event === "PASSWORD_RECOVERY") setShowResetModal(true);

    if (event === "SIGNED_OUT") {
      // clean local state + route back to root
      setRole("member");
      setTasks([]);
      setShowResetModal(false);
      try {
        if (window.location.pathname !== "/") {
          window.history.replaceState({}, "", "/");
        }
        window.location.hash = "";
      } catch {}
    }
  });

  return () => data?.subscription?.unsubscribe?.();
}, [atResetRoute]);


 

  const goToRole = (r) => {
    // prevent auto routing while on /reset
    if (atResetRoute) return;
    const target = r === "admin" ? "#admin" : "#member";
    if (window.location.hash !== target) window.location.hash = target;
  };
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" && !atResetRoute) {
        goToRole(role || "member");
      }
    });
    return () => data?.subscription?.unsubscribe();
  }, [role, atResetRoute]);

  // Auth handlers
  const signInGoogle = async () => {
    try {
      setBusyAuth(true);
      localStorage.setItem("postLoginIntent", window.location.hash || "#member");
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin, queryParams: { access_type: "offline", prompt: "consent" } },
      });
    } finally { setBusyAuth(false); }
  };
  const signInEmail = async (email, password) => {
    if (!email || !password) { notifications.show({ color:"red", title:"Missing info", message:"Enter email and password." }); return; }
    try {
      setBusyAuth(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      notifications.show({ color:"green", title:"Signed in" });
    } catch (e) {
      notifications.show({ color:"red", title:"Sign in failed", message:e.message || "Try again." });
    } finally { setBusyAuth(false); }
  };
  const signUpEmail = async (email, password) => {
    if (!email || !password) { notifications.show({ color:"red", title:"Missing info", message:"Enter email and password." }); return; }
    try {
      setBusyAuth(true);
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/reset` } });
      if (error) throw error;
      notifications.show({ color:"green", title:"Check your inbox", message:"Confirm your email to finish sign up." });
    } catch (e) {
      notifications.show({ color:"red", title:"Sign up failed", message:e.message || "Try again." });
    } finally { setBusyAuth(false); }
  };
  const signInMagicLink = async (email) => {
    if (!email) { notifications.show({ color:"red", title:"Email required", message:"Enter your email." }); return; }
    try {
      setBusyAuth(true);
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
      if (error) throw error;
      notifications.show({ color:"blue", title:"Magic link sent", message:"Check your email." });
    } catch (e) {
      notifications.show({ color:"red", title:"Failed to send link", message:e.message || "Try again." });
    } finally { setBusyAuth(false); }
  };
  const forgotPassword = async (email) => {
    if (!email) { notifications.show({ color:"red", title:"Enter your email", message:"We need an email to send reset link." }); return; }
    try {
      setBusyAuth(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` });
      if (error) throw error;
      notifications.show({ color:"blue", title:"Password reset", message:"Check your email for the reset link." });
    } catch (e) {
      notifications.show({ color:"red", title:"Couldn't send reset", message:e.message || "Try again." });
    } finally { setBusyAuth(false); }
  };
  const applyNewPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      notifications.show({ color:"red", title:"Password too short", message:"Use at least 6 characters." });
      return;
    }
    try {
      setBusyAuth(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      notifications.show({ color:"green", title:"Password updated" });
      setShowResetModal(false);
      setNewPassword("");
      // after successful reset, go to role
      goToRole(role || "member");
      if (window.location.pathname === "/reset") window.history.replaceState({}, "", "/");
    } catch (e) {
      notifications.show({ color:"red", title:"Update failed", message:e.message || "Try again." });
    } finally { setBusyAuth(false); }
  };
const signOut = async () => {
  try {
    await supabase.auth.signOut();
  } finally {
    // ensure UI switches right away even before the callback fires
    setSession(null);
    setRole("member");
    setTasks([]);
    setMobileNavOpen(false);
    try {
      if (window.location.pathname !== "/") {
        window.history.replaceState({}, "", "/");
      }
      window.location.hash = "";
    } catch {}
    notifications.show({ color: "gray", title: "Signed out" });
  }
};


  /* --- Role --- */
  useEffect(() => {
    (async () => {
      if (!session?.user) { setRoleReady(false); return; }
      try {
        const { data } = await supabase
          .from("users_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (data?.role) setRole(data.role);
        else if (session.user.email === "teketselbeyene@gmail.com") setRole("admin");
        else setRole("member");
      } catch {
        if (session.user.email === "teketselbeyene@gmail.com") setRole("admin");
        else setRole("member");
      } finally {
        setRoleReady(true);
      }
    })();
  }, [session]);

  useEffect(() => {
    if (session && roleReady && !atResetRoute) {
      const intent = localStorage.getItem("postLoginIntent");
      localStorage.removeItem("postLoginIntent");
      if (intent) {
        window.location.hash = intent;
      } else {
        goToRole(role);
      }
    }
  }, [session, roleReady, role, atResetRoute]);

  /* --- load persisted dailyTarget --- */
/* --- load persisted dailyTarget (auto daily reset) --- */
useEffect(() => {
  const today = new Date().toDateString();
  const storedDate = localStorage.getItem("dailyTargetDate");
  if (storedDate !== today) {
    // New day ⇒ reset target to 0
    localStorage.setItem("dailyTargetDate", today);
    localStorage.setItem("dailyTarget", "0");
    setDailyTarget(0);
  } else {
    const v = Number(localStorage.getItem("dailyTarget") || "0");
    setDailyTarget(Number.isFinite(v) ? v : 0);
  }
}, []);

const persistDailyTarget = (v) => {
  // keep date fresh & save value
  const today = new Date().toDateString();
  localStorage.setItem("dailyTargetDate", today);
  localStorage.setItem("dailyTarget", String(v || 0));
  setDailyTarget(v || 0);
};


  /* --- Data fetching (tasks/stats/logs/notes) --- */
  const fetchTasks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("id,title,link,created_at,status,priority,finished_at")
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };
  const computeDailyCount = (list) => {
    const today = new Date().toDateString();
    const c = list.filter(t => t.finished_at && new Date(t.finished_at).toDateString() === today).length;
    setDailyCount(c);
  };
const fetchStats = async () => {
  const { data: tasksData } = await supabase.from("tasks").select("*");
  if (!tasksData) return;

  // --- Daily progress derived from DB ---
  const createdToday = tasksData.filter(t => isToday(t.created_at)).length;
  const finishedToday = tasksData.filter(t => t.finished_at && isToday(t.finished_at)).length;
  setDailyTarget(createdToday);   // denominator = jobs added today (after deletes it will drop)
  setDailyCount(finishedToday);   // numerator = jobs finished today (after reopen it will drop)

  // --- Your existing cards/calculations ---
  const today = new Date().toDateString();
  const thisMonth = new Date().getMonth();
  const thisWeek = getWeek(new Date());

  const todayCount = tasksData.filter(t => t.finished_at && new Date(t.finished_at).toDateString() === today).length;
  const weekCount  = tasksData.filter(t => t.finished_at && getWeek(t.finished_at) === thisWeek).length;
  const monthCount = tasksData.filter(t => t.finished_at && new Date(t.finished_at).getMonth() === thisMonth).length;
  const highPriority = tasksData.filter(t => t.priority === "high" && t.status === "open").length;
  setStats({ today: todayCount, week: weekCount, month: monthCount, highPriority });

  const dayMap = {};
  tasksData.forEach(t => {
    if (t.finished_at) {
      const d = new Date(t.finished_at).toLocaleDateString();
      dayMap[d] = (dayMap[d] || 0) + 1;
    }
  });
  setPerDay(Object.keys(dayMap).map(d => ({ date: d, count: dayMap[d] })));

  const statusMap = {};
  tasksData.forEach(t => { statusMap[t.status] = (statusMap[t.status] || 0) + 1; });
  setStatusDist(Object.keys(statusMap).map(s => ({ name: s, value: statusMap[s] })));
};

const fetchLogs = async () => {
  const { data: rows, error } = await supabase
    .from("task_logs")
    .select("id, action, created_at, task_id, user_email")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("fetchLogs error", error);
    setLogs([]);
    return;
  }

  const noteMap = {};
  let latestGlobal = { text: "", created_at: null };
  const displayRows = [];

  for (const r of rows ?? []) {
    const ue = typeof r.user_email === "string" ? r.user_email : "";

    // per-task note delete
    if (ue === "NOTE_DELETE") {
      const prev = noteMap[r.task_id];
      if (!prev || new Date(r.created_at) > new Date(prev.created_at)) {
        noteMap[r.task_id] = { text: "", deleted: true, created_at: r.created_at };
      }
      continue;
    }

    // per-task note upsert (payload NOTE|<encodedText>)
    if (ue.startsWith("NOTE|")) {
      const [, enc = ""] = ue.split("|");
      const text = decodeURIComponent(enc);
      const prev = noteMap[r.task_id];
      if (!prev || new Date(r.created_at) > new Date(prev.created_at)) {
        noteMap[r.task_id] = { text, deleted: false, created_at: r.created_at };
      }
      continue;
    }

    // GLOBAL sticky note upsert (payload GLOBAL_NOTE|<encodedText>)
    if (ue.startsWith("GLOBAL_NOTE|")) {
      const [, enc = ""] = ue.split("|");
      const text = decodeURIComponent(enc);
      // keep the newest GLOBAL note only
      if (!latestGlobal.created_at || new Date(r.created_at) > new Date(latestGlobal.created_at)) {
        latestGlobal = { text, created_at: r.created_at };
      }
      continue;
    }

    // normal log row
    displayRows.push(r);
  }

  // apply per-task notes
  const cleanNotes = {};
  Object.entries(noteMap).forEach(([tid, v]) => {
    if (!v.deleted && v.text) cleanNotes[tid] = { text: v.text, created_at: v.created_at };
  });
  setNotes(cleanNotes);

  // ⬇️ The two crucial lines: set global note text AND its "version"
  setGlobalNote(latestGlobal.text || "");
  setGlobalNoteUpdatedAt(latestGlobal.created_at || "");

  // activity list enrichment
  const taskMap = new Map(tasks.map(t => [t.id, t.title]));
  const enriched = displayRows.slice(0, 10).map(r => ({
    id: r.id,
    action: (r.action || "").toLowerCase(),
    created_at: r.created_at,
    task: { title: taskMap.get(r.task_id) || "Untitled Task" },
    user: { email: r.user_email || "Unknown user" }
  }));

  setLogs(enriched);

  // bump rows for sort freshness
  setBumpedAt(prev => {
    const next = { ...prev };
    for (const r of displayRows ?? []) {
      const t = new Date(r.created_at).getTime();
      if (!next[r.task_id] || t > next[r.task_id]) next[r.task_id] = t;
    }
    return next;
  });
};

  useEffect(() => {
    if (!session) return;
    fetchTasks(); fetchStats(); fetchLogs();
    const taskCh = supabase
      .channel("realtime-tasks")
      .on("postgres_changes", { event:"*", schema:"public", table:"tasks" }, () => { fetchTasks(); fetchStats(); fetchLogs(); })
      .subscribe();
    const logsCh = supabase
      .channel("realtime-task-logs")
      .on("postgres_changes", { event:"*", schema:"public", table:"task_logs" }, () => { fetchLogs(); })
      .subscribe();
    return () => { supabase.removeChannel(taskCh); supabase.removeChannel(logsCh); };
  }, [session]);

  /* --- counts / filters / sorting --- */
  const counts = useMemo(() => ({
    open: tasks.filter(t => t.status === "open").length,
    finished: tasks.filter(t => t.status === "finished").length,
    high: tasks.filter(t => t.priority === "high").length,
    medium: tasks.filter(t => t.priority === "medium").length,
    low: tasks.filter(t => t.priority === "low").length,
  }), [tasks]);

  const [dqVal] = useDebouncedValue(query, 200);

  const filtered = useMemo(() => {
    let list = tasks.slice();
    const now = new Date();
    if (tab === "today") list = list.filter(t => isWithinInterval(new Date(t.created_at), { start:startOfDay(now), end:endOfDay(now) }));
    else if (tab === "week") list = list.filter(t => isWithinInterval(new Date(t.created_at), { start:startOfWeek(now, { weekStartsOn:1 }), end:endOfWeek(now, { weekStartsOn:1 }) }));
    else if (tab === "month") list = list.filter(t => isWithinInterval(new Date(t.created_at), { start:startOfMonth(now), end:endOfMonth(now) }));
    else if (tab === "open") list = list.filter(t => t.status === "open");
    else if (tab === "finished") list = list.filter(t => t.status === "finished");

    if (statusFilter !== "all") list = list.filter(t => t.status === statusFilter);
    if (priorityFilter !== "all") list = list.filter(t => t.priority === priorityFilter);

    if (dqVal.trim()) {
      const q = dqVal.toLowerCase();
      list = list.filter(t => (`${t.title} ${t.link}`).toLowerCase().includes(q));
    }

    // High-first lock sort for members
    if (priorityLockActive) {
      list = list.slice().sort((a, b) => {
        const ah = a.priority === "high" ? 0 : 1;
        const bh = b.priority === "high" ? 0 : 1;
        if (ah !== bh) return ah - bh;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    } else {
      const dir = sort.dir === "asc" ? 1 : -1;
      const getEffectiveTime = (t) =>
        Math.max(new Date(t.created_at).getTime() || 0, bumpedAt[t.id] || 0);

      list.sort((a,b) => {
        if (sort.key === "priority") { const o = { high:0, medium:1, low:2 }; return (o[a.priority] - o[b.priority]) * dir; }
        if (sort.key === "created_at") return (getEffectiveTime(a) - getEffectiveTime(b)) * dir;
        if (sort.key === "status") return String(a.status).localeCompare(String(b.status)) * dir;
        if (sort.key === "title") return String(a.title).localeCompare(String(b.title)) * dir;
        return 0;
      });
    }

    return list;
  }, [tasks, tab, dqVal, statusFilter, priorityFilter, sort, bumpedAt, priorityLockActive]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  /* --- optimistic logs --- */
  const pushOptimisticLog = (action, taskId, email) => {
    setBumpedAt(prev => ({ ...prev, [taskId]: Date.now() }));
    const taskTitle = tasks.find(t => t.id === taskId)?.title || "Untitled Task";
    const temp = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      action: action.toLowerCase(),
      created_at: new Date().toISOString(),
      task: { title: taskTitle },
      user: { email: email || "Unknown user" },
      __optimistic: true
    };
    setLogs(prev => [temp, ...prev].slice(0, 10));
    return () => setLogs(prev => prev.filter(l => l.id !== temp.id));
  };

  /* --- actions --- */
const addTask = async (e) => {
  e.preventDefault();
  if (!title || !link) return;

  const { error } = await supabase.from("tasks").insert({ title, link, priority });
  if (error) {
    notifications.show({ color: "red", title: "Add failed", message: error.message });
    return;
  }

  // Clear inputs
  setTitle("");
  setLink("");
  setPriority("medium");

  // 🔼 Auto-increment today's target
  const today = new Date().toDateString();
  const storedDate = localStorage.getItem("dailyTargetDate");
  if (storedDate !== today) {
    // safety: if date flipped between loads
    localStorage.setItem("dailyTargetDate", today);
    persistDailyTarget(1);
  } else {
    const current = Number(localStorage.getItem("dailyTarget") || "0") || 0;
    persistDailyTarget(current + 1);
  }

  // refresh data
  fetchTasks();
  fetchStats();
};


  const onTaskFinishedCelebrate = (newDailyCount) => {
    if (dailyTarget > 0 && dailyCount < dailyTarget && newDailyCount >= dailyTarget) {
      triggerCelebrate({
        emoji: "🏆",
        title: "Daily target hit!",
        subtitle: `You finished ${newDailyCount} today — amazing!`,
        rain: true,
      });
    } else {
      triggerCelebrate({
        emoji: "✅",
        title: "Task finished!",
        subtitle: "Nice progress — keep going.",
        rain: false,
      });
    }
    // auto-close celebration after 3.5s
    setTimeout(() => setCelebrate(false), 3500);
  };

  const iApplied = async (taskId) => {
    // 🔒 hard guard against bypass: members must do high first
    const task = getTaskById(taskId);
    if (priorityLockActive && task?.priority !== "high") {
      notifications.show({
        color: "red",
        title: "Finish High priority first",
        message: "Please complete all High priority tasks before other tasks."
      });
      return;
    }

    const revert = pushOptimisticLog("applied", taskId, session?.user?.email);
    const { error } = await supabase.from("tasks").update({ status:"finished", finished_at:new Date().toISOString() }).eq("id", taskId);
    if (error) { notifications.show({ color:"red", title:"Error", message:error.message }); revert(); }
    else {
      await supabase.from("task_logs").insert({ task_id:taskId, action:"applied", user_id:session.user.id, user_email:session.user.email })
        .then(() => revert()).catch(()=>{});
      notifications.show({ color:"green", title:"Success", message:"Task submitted for review" });

      const newCount = dailyCount + 1;
      setDailyCount(newCount);
      onTaskFinishedCelebrate(newCount);

      fetchTasks(); fetchStats(); fetchLogs();
    }
  };

  const markFinished = async (taskId, currentStatus) => {
  if (currentStatus === "finished") {
  const revert = pushOptimisticLog("reopened", taskId, session?.user?.email);
  const { error } = await supabase.from("tasks")
    .update({ status:"open", finished_at:null }).eq("id", taskId);

  if (error) { notifications.show({ color:"red", title:"Error", message:error.message }); revert(); }
  else {
    await supabase.from("task_logs").insert({ task_id:taskId, action:"reopened", user_id:session.user.id, user_email:session.user.email })
      .then(() => revert()).catch(()=>{});
    notifications.show({ color:"yellow", title:"Sent back", message:"Task reopened for member" });

    // optimistic: if this was finished today, reduce numerator now
    setDailyCount(c => Math.max(0, c - 1));

    fetchTasks(); fetchStats(); fetchLogs();
  }
}

    else if (currentStatus === "open") {
      const revert = pushOptimisticLog("finished", taskId, session?.user?.email);
      const { error } = await supabase.from("tasks").update({ status:"finished", finished_at:new Date().toISOString() }).eq("id", taskId);
      if (error) { notifications.show({ color:"red", title:"Error", message:error.message }); revert(); }
      else {
        await supabase.from("task_logs").insert({ task_id:taskId, action:"finished", user_id:session.user.id, user_email:session.user.email })
          .then(() => revert()).catch(()=>{});
        notifications.show({ color:"green", title:"Task manually marked as finished" });

        const newCount = dailyCount + 1;
        setDailyCount(newCount);
        onTaskFinishedCelebrate(newCount);

        fetchTasks(); fetchStats(); fetchLogs();
      }
    }
  };

const deleteTaskAction = async (taskId) => {
  if (!confirm("Are you sure you want to delete this task?")) return;

  // find the task locally to apply optimistic correction
  const victim = tasks.find(t => t.id === taskId);

  const revert = pushOptimisticLog("deleted", taskId, session?.user?.email);
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) { notifications.show({ color:"red", title:"Error", message:error.message }); revert(); }
  else {
    await supabase.from("task_logs").insert({ task_id:taskId, action:"deleted", user_id:session.user.id, user_email:session.user.email })
      .then(() => revert()).catch(()=>{});
    notifications.show({ color:"green", title:"Task Deleted" });

    // --- optimistic: adjust daily progress immediately ---
    if (victim && isToday(victim.created_at)) {
      setDailyTarget(n => Math.max(0, n - 1));    // denominator down
    }
    if (victim && victim.finished_at && isToday(victim.finished_at)) {
      setDailyCount(n => Math.max(0, n - 1));     // numerator down
    }

    fetchTasks(); fetchStats(); fetchLogs();
    setBumpedAt(prev => { const { [taskId]: _, ...rest } = prev; return rest; });
  }
};


  const saveTaskNote = async (taskId, text) => {
    const payload = `NOTE|${encodeURIComponent(text || "")}`;
    const { error } = await supabase.from("task_logs").insert({
      task_id: taskId, action: "reopened", user_id: session.user.id, user_email: payload
    });
    if (error) notifications.show({ color:"red", title:"Failed", message:error.message });
    else { setNotes(prev => ({ ...prev, [taskId]: { text, created_at: new Date().toISOString() } })); notifications.show({ color:"green", title:"Note saved" }); fetchLogs(); }
  };
  const deleteTaskNote = async (taskId) => {
    const { error } = await supabase.from("task_logs").insert({
      task_id: taskId, action: "reopened", user_id: session.user.id, user_email: "NOTE_DELETE"
    });
    if (error) notifications.show({ color:"red", title:"Failed", message:error.message });
    else { setNotes(prev => { const n = { ...prev }; delete n[taskId]; return n; }); notifications.show({ color:"green", title:"Note deleted" }); fetchLogs(); }
  };
const upsertGlobalNote = async (text) => {
  const payload = `GLOBAL_NOTE|${encodeURIComponent(text || "")}`;
  const { error } = await supabase.from("task_logs").insert({
    task_id: null, action: "reopened", user_id: session.user.id, user_email: payload
  });
  if (!error) {
    setGlobalNote(text || "");
    // Do NOT mark seen here; we want users to see the new badge
    notifications.show({ color:"green", title:"Sticky note saved" });
    setEditingGlobal(false);
    setShowGlobalNote(true);
    fetchLogs(); // will refresh updatedAt (version)
  }
};


  /* --- LOGIN: gating screens --- */
  if (!authChecked) {
    return (
      <div style={{minHeight:"100vh",display:"grid",placeItems:"center"}}>
        <Group gap="sm" align="center">
          <Loader size="sm" />
          <Text c="dimmed">Checking your session…</Text>
        </Group>
      </div>
    );
  }

  if (!session){
    return (
      <>
        <AuthScreen
          onGoogle={signInGoogle}
          onMagic={signInMagicLink}
          onSignInEmail={signInEmail}
          onSignUpEmail={signUpEmail}
          onForgot={forgotPassword}
          busy={busyAuth}
        />
        <Modal opened={showResetModal} onClose={()=>setShowResetModal(false)} title="Set a new password" centered>
          <PasswordInput
            label="New password"
            placeholder="min 6 characters"
            value={newPassword}
            onChange={(e)=>setNewPassword(e.currentTarget.value)}
          />
          <Button fullWidth mt="md" onClick={applyNewPassword} loading={busyAuth}>Update password</Button>
        </Modal>
      </>
    );
  }

  /* --- App content --- */
  const toggleSort = (key) => setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  const sortIndicator = (key) => sort.key !== key ? '' : (sort.dir === 'asc' ? ' ↑' : ' ↓');
  const canShowGlobalToggle = isAdmin || !!globalNote;

 const SidebarContent = (
  <>
    <Tabs
      value={tab}
      onChange={(v)=>setTab(v ?? "all")}
      orientation={isMobile ? "horizontal" : "vertical"}
      variant="pills"
    >
      <Tabs.List>
        <Tabs.Tab value="all" leftSection={<Filter size={16}/>}>All</Tabs.Tab>
        <Tabs.Tab value="open">Open</Tabs.Tab>
        <Tabs.Tab value="finished">Finished</Tabs.Tab>
        <Tabs.Tab value="today" leftSection={<CalendarDays size={16}/>}>Today</Tabs.Tab>
        <Tabs.Tab value="week" leftSection={<CalendarDays size={16}/>}>This week</Tabs.Tab>
        <Tabs.Tab value="month" leftSection={<Calendar size={16}/>}>This month</Tabs.Tab>
      </Tabs.List>
    </Tabs>

    {canShowGlobalToggle && (
      <div style={{ marginTop: 12 }}>
        {/* <<< THIS is the updated button with the red badge >>> */}
        <Indicator color="red" size={16} label="1" disabled={!isGlobalNew()}>
  <Button
    size="xs"
    variant="light"
    fullWidth
    leftSection={<StickyNoteIcon size={14} />}
    onClick={() => {
      setShowGlobalNote((prev) => {
        const next = !prev;
        if (next) markGlobalSeen(); // mark THIS version as read
        return next;
      });
    }}
  >
    {showGlobalNote ? "Hide sticky note" : "Sticky Note"}
  </Button>
</Indicator>


        <Collapse in={showGlobalNote}>
          <Paper withBorder shadow="xs" p="sm" mt="xs" radius="md" style={{ background:"#FFF9C4", borderColor:"#FACC15" }}>
            <Group justify="space-between" align="center" mb="xs">
              <Text fw={700} size="sm">Team Sticky Note</Text>
              {isAdmin && (
                editingGlobal ? (
                  <Group gap={6}>
                    <Tooltip label="Save"><ActionIcon variant="subtle" onClick={() => upsertGlobalNote(globalNote)}><Save size={16}/></ActionIcon></Tooltip>
                    <Tooltip label="Cancel"><ActionIcon variant="subtle" color="gray" onClick={() => setEditingGlobal(false)}><X size={16}/></ActionIcon></Tooltip>
                  </Group>
                ) : (
                  <Tooltip label="Edit"><ActionIcon variant="subtle" onClick={() => setEditingGlobal(true)}><Edit3 size={16}/></ActionIcon></Tooltip>
                )
              )}
            </Group>

            {isAdmin && editingGlobal ? (
              <Textarea autosize minRows={5} maxRows={12} value={globalNote} onChange={(e)=>setGlobalNote(e.currentTarget.value)} placeholder="Write instructions for everyone…" styles={{ input:{ background:"#FFF9C4" } }}/>
            ) : (
              <Text size="sm" style={{ whiteSpace:"pre-wrap" }}>
                {globalNote || (isAdmin ? "No instructions yet. Click edit to add." : "No instructions to show.")}
              </Text>
            )}
          </Paper>
        </Collapse>
      </div>
    )}
  </>
);


  return (
    <>
      {/* Confetti + Celebration overlays */}
      <ConfettiCanvas runKey={confettiKey} mode={confettiMode} />
      <CelebrationOverlay
        open={celebrate}
        emoji={celebrationEmoji}
        title={celebrationCopy.title}
        subtitle={celebrationCopy.subtitle}
        onClose={()=>setCelebrate(false)}
      />

      <Modal opened={showResetModal} onClose={()=>setShowResetModal(false)} title="Set a new password" centered>
        <PasswordInput
          label="New password"
          placeholder="min 6 characters"
          value={newPassword}
          onChange={(e)=>setNewPassword(e.currentTarget.value)}
        />
        <Button fullWidth mt="md" onClick={applyNewPassword} loading={busyAuth}>Update password</Button>
      </Modal>

      <AppShell padding="md" header={{height:64}} navbar={isMobile ? undefined : { width:260, breakpoint:"sm" }}>
        <AppShell.Header>
          <Group h={64} px="md" justify="space-between">
            <Group gap="xs" align="center">
              {isMobile && (
                <ActionIcon variant="subtle" onClick={() => setMobileNavOpen(true)} aria-label="Open menu">
                  <MenuIcon size={20}/>
                </ActionIcon>
              )}
              <Title order={4}>Job Link Task Manager</Title>
              <Badge variant="light">{role}</Badge>
            </Group>
            <Group>
              <Button variant="subtle" onClick={async ()=>{ await ensureAudioReady(); fetchTasks(); fetchStats(); fetchLogs(); }} leftSection={<RefreshCw size={16}/>}>Refresh</Button>
              <Button variant="default" leftSection={<LogOut size={16}/>} onClick={signOut}>Sign out</Button>
            </Group>
          </Group>
        </AppShell.Header>

        {!isMobile && <AppShell.Navbar p="md">{SidebarContent}</AppShell.Navbar>}
        {isMobile && <MobileSheet open={mobileNavOpen} onClose={() => setMobileNavOpen(false)}>{SidebarContent}</MobileSheet>}

        <AppShell.Main>
          {/* Sticky note overlays */}
          <TaskNoteSticky open={noteOpen.open} text={noteOpen.text} label={noteOpen.label} onClose={()=>setNoteOpen({ open:false, text:"", label:"" })}/>
          <TaskNoteEditSticky
            open={editNote.open}
            initialText={editNote.text}
            label={editNote.label}
            onSave={async (text) => { await saveTaskNote(editNote.taskId, text); setEditNote({ open:false, taskId:null, text:"", label:"" }); }}
            onDelete={async () => { if (confirm("Delete this note?")) { await deleteTaskNote(editNote.taskId); setEditNote({ open:false, taskId:null, text:"", label:"" }); } }}
            onClose={() => setEditNote({ open:false, taskId:null, text:"", label:"" })}
          />

          <Grid gutter="md">
            {/* Dashboard */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Grid gutter="md">
                <Grid.Col span={6}>
                  <Paper withBorder p="md">
                    <Text size="sm" c="dimmed">Finished Today</Text>
                    <Title order={2}>{stats.today}</Title>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Paper withBorder p="md">
                    <Text size="sm" c="dimmed">Finished This Week</Text>
                    <Title order={2}>{stats.week}</Title>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Paper withBorder p="md">
                    <Text size="sm" c="dimmed">Finished This Month</Text>
                    <Title order={2}>{stats.month}</Title>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Paper withBorder p="md">
                    <Text size="sm" c="dimmed">High Priority Open</Text>
                    <Title order={2}>{stats.highPriority}</Title>
                  </Paper>
                </Grid.Col>

                {/* Daily Target Progress */}
                <Grid.Col span={12}>
                  <Paper withBorder p="md" radius="md">
                    <Group justify="space-between" align="center">
                      <div>
                        <Text size="sm" c="dimmed">Daily progress</Text>
                        <Title order={4}>
  {dailyTarget > 0 ? `${dailyCount}/${dailyTarget}` : `${dailyCount}`}
</Title>

                      </div>
                     {isAdmin && (
  <NumberInput
    label="Daily target (auto)"
    min={0}
    value={dailyTarget}
    readOnly       // 👈 prevent manual edits
    disabled       // 👈 (optional) gray it out
    styles={{ root: { width: 160 } }}
  />
)}

                    </Group>
                    <Progress
                      value={dailyTarget > 0 ? Math.min(100, (dailyCount / dailyTarget) * 100) : (dailyCount > 0 ? 100 : 0)}
                      mt="sm"
                    />
                  </Paper>
                </Grid.Col>
              </Grid>

              <Grid mt="lg" gutter="md">
                <Grid.Col span={12}>
                  <Paper withBorder p="md">
                    <Title order={5}>Applications per Day</Title>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={perDay}><XAxis dataKey="date" /><YAxis /><ReTooltip /><Line type="monotone" dataKey="count" stroke="#3b82f6" /></LineChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Paper withBorder p="md">
                    <Title order={5}>Status Distribution</Title>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={statusDist} dataKey="value" nameKey="name" outerRadius={70}>
                          {statusDist.map((entry, index) => (<Cell key={index} fill={COLORS[index % COLORS.length]} />))}
                        </Pie>
                        <ReTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid.Col>
              </Grid>

              <Card withBorder p="md" mt="lg">
                <Group justify="space-between" align="center" wrap="wrap">
                  <Title order={5}>Recent Activity</Title>
                  <Group gap="xs" align="center">
                    <Switch size="sm" checked={soundOn} onChange={async (e)=> { const next = e.currentTarget.checked; setSoundOn(next); if (next) await ensureAudioReady(); }} label="Sound"/>
                    {isAdmin && (
                      <Tooltip label="Sound settings">
                        <ActionIcon variant="subtle" onClick={() => setSoundSettingsOpen(o => !o)}><Settings size={18}/></ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Group>

                {isAdmin && (
                  <Collapse in={soundSettingsOpen}>
                    <Paper p="sm" withBorder mt="xs" radius="md">
                      <Grid align="center" gutter="xs">
                        <Grid.Col span={4}>
                          <Select label="Preset" value={soundType} onChange={(v)=>setSoundType(v || "ding")}
                            data={[{value:"ding",label:"Ding"},{value:"beep",label:"Beep"},{value:"pop",label:"Pop"},{value:"chime",label:"Chime"},{value:"custom",label:"Custom audio URL"}]} />
                        </Grid.Col>
                        <Grid.Col span={4}>
                          <Select label="Wave" value={soundWave} onChange={(v)=>setSoundWave(v || "sine")}
                            data={[{value:"sine",label:"Sine"},{value:"square",label:"Square"},{value:"sawtooth",label:"Sawtooth"},{value:"triangle",label:"Triangle"}]} />
                        </Grid.Col>
                        <Grid.Col span={4}>
                          <NumberInput label="Freq (Hz)" min={100} max={2000} value={soundFreq} onChange={(v)=>setSoundFreq(Number(v || 880))}/>
                        </Grid.Col>
                        <Grid.Col span={8}>
                          <Text size="sm" mb={4}>Volume</Text>
                          <Slider value={Math.round(soundVolume*100)} onChange={(v)=>setSoundVolume((v||40)/100)} />
                        </Grid.Col>
                        <Grid.Col span={4}>
                          <Button size="xs" leftSection={<Volume2 size={14}/>} onClick={playDing}>Test</Button>
                        </Grid.Col>
                        {soundType === "custom" && (
                          <Grid.Col span={12}>
                            <TextInput label="Custom audio URL (mp3/wav)" placeholder="https://…" value={soundUrl} onChange={(e)=>setSoundUrl(e.currentTarget.value)}/>
                          </Grid.Col>
                        )}
                      </Grid>
                    </Paper>
                  </Collapse>
                )}

                {logs.length === 0 && (<Text size="sm" c="dimmed" mt="sm">No recent activity</Text>)}
                {logs.map(l => {
                  const act = l.action;
                  const badgeColor = act === "finished" ? "green" : act === "deleted" ? "red" : "blue";
                  const label = act === "reopened" ? "ROLLBACK" : (act?.toUpperCase?.() || "");
                  return (
                    <Paper key={l.id} p="xs" mt="xs" withBorder style={l.__optimistic ? { opacity: 0.7 } : undefined}>
                      <Text size="sm">
                        [{format(new Date(l.created_at), "PPpp")}]{" "}
                        <img src={avatarUrl(l.user?.email)} alt="" style={{ width:18, height:18, borderRadius:"50%", verticalAlign:"text-bottom", marginRight:6 }} />
                        <b>{l.user?.email || "Unknown user"}</b>{" "}
                        <Badge color={badgeColor} variant="light">{label}</Badge>{" "}
                        on <b>{l.task?.title || "Untitled Task"}</b>
                      </Text>
                    </Paper>
                  );
                })}
              </Card>
            </Grid.Col>

            {/* Tasks column */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              {/* High-first banner for members */}
              {priorityLockActive && (
                <Paper withBorder radius="md" p="sm" mb="xs" style={{ background:"#FEF2F2", borderColor:"#FCA5A5" }}>
                  <Group justify="space-between" align="center">
                    <Text fw={600}>High-priority tasks pending</Text>
                    <Badge color="red" variant="filled">High-first mode</Badge>
                  </Group>
                  <Text size="sm" c="dimmed" mt={4}>
                    Please complete all <b>High</b> priority tasks before working on others.
                  </Text>
                </Paper>
              )}

              {isAdmin && (
                <Card withBorder radius="md" p="md" mb="lg">
                  <Title order={5}>Quick add task</Title>
                  <form onSubmit={addTask}>
                    <Grid align="end" gutter="sm" mt="sm">
                      <Grid.Col span={{ base:12, md:4 }}>
                        <TextInput label="Job title" value={title} onChange={(e)=>setTitle(e.currentTarget.value)} required/>
                      </Grid.Col>
                      <Grid.Col span={{ base:12, md:5 }}>
                        <TextInput label="Application link" value={link} onChange={(e)=>setLink(e.currentTarget.value)} required/>
                      </Grid.Col>
                      <Grid.Col span={{ base:12, md:2 }}>
                        <Select label="Priority" value={priority} onChange={setPriority} data={[{ value:"high", label:"High" },{ value:"medium", label:"Medium" },{ value:"low", label:"Low" }]} />
                      </Grid.Col>
                      <Grid.Col span={{ base:12, md:1 }}>
                        <Button type="submit" leftSection={<Plus size={16}/>} fullWidth>Add</Button>
                      </Grid.Col>
                    </Grid>
                  </form>
                </Card>
              )}

              <Paper withBorder radius="md" p="md">
                {loading ? (
                  <Group justify="center" my="xl"><Loader/></Group>
                ) : (
                  <>
                    <Group mb="xs" justify="space-between" align="end">
                      <TextInput
                        ref={searchRef}
                        placeholder="Search by title or link…  (press / to focus)"
                        value={query}
                        onChange={(e)=>{ setQuery(e.currentTarget.value); setPage(1); }}
                        style={{ flexGrow: 1 }}
                      />
                      <Group gap="xs">
                        <Select w={120} label="Rows" value={String(pageSize)} data={['5','10','20','50']} onChange={(v)=> setPageSize(Number(v || 5))}/>
                      </Group>
                    </Group>

                    <Group mb="md" gap="xs" wrap="wrap">
                      <Badge onClick={()=>setStatusFilter('all')}      variant={statusFilter==='all'?'filled':'outline'} style={{cursor:'pointer'}}>All</Badge>
                      <Badge onClick={()=>setStatusFilter('open')}     variant={statusFilter==='open'?'filled':'outline'} style={{cursor:'pointer'}}>Open • {counts.open}</Badge>
                      <Badge onClick={()=>setStatusFilter('finished')} variant={statusFilter==='finished'?'filled':'outline'} style={{cursor:'pointer'}}>Finished • {counts.finished}</Badge>
                      <Badge onClick={()=>setPriorityFilter('high')}   variant={priorityFilter==='high'?'filled':'outline'} style={{cursor:'pointer'}}>High • {counts.high}</Badge>
                      <Badge onClick={()=>setPriorityFilter('medium')} variant={priorityFilter==='medium'?'filled':'outline'} style={{cursor:'pointer'}}>Medium • {counts.medium}</Badge>
                      <Badge onClick={()=>setPriorityFilter('low')}    variant={priorityFilter==='low'?'filled':'outline'} style={{cursor:'pointer'}}>Low • {counts.low}</Badge>
                      <Button size="xs" variant="subtle" onClick={()=>{setStatusFilter('all');setPriorityFilter('all');}}>Clear</Button>
                    </Group>

                    <Table striped>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th onClick={()=>toggleSort('title')} style={{ cursor:'pointer' }}>Title{sortIndicator('title')}</Table.Th>
                          <Table.Th onClick={()=>toggleSort('priority')} style={{ cursor:'pointer' }}>Priority{sortIndicator('priority')}</Table.Th>
                          <Table.Th onClick={()=>toggleSort('status')} style={{ cursor:'pointer' }}>Status{sortIndicator('status')}</Table.Th>
                          <Table.Th onClick={()=>toggleSort('created_at')} style={{ cursor:'pointer' }}>Created{sortIndicator('created_at')}</Table.Th>
                          <Table.Th style={{ width:320, textAlign:"right" }}>Actions</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {paged.map(t=>{
                          const lockThis = priorityLockActive && t.priority !== "high" && t.status === "open";
                          return (
                            <Table.Tr key={t.id}>
                              <Table.Td>
                                <Group gap="xs" wrap="nowrap">
                                  {favicon(t.link) && <img src={favicon(t.link)} width={16} height={16} style={{borderRadius:4}} alt="" />}
                                  <Text fw={600}>{t.title}</Text>
                                </Group>
                              </Table.Td>
                              <Table.Td><PriorityBadge priority={t.priority}/></Table.Td>
                              <Table.Td><StatusBadge status={t.status}/></Table.Td>
                              <Table.Td>{format(new Date(t.created_at), "PP pp")}</Table.Td>
                              <Table.Td>
                                <Group justify="right" gap="xs" wrap="nowrap">
                               {notes[t.id]?.text && (
  <Tooltip label="Open task note">
    <Indicator color="red" size={16} label="1" disabled={!isNoteNew(t.id)}>
      <ActionIcon
        variant="light"
        onClick={() => {
          setNoteOpen({ open:true, text:notes[t.id].text, label:`${t.title} — Note` });
          markNoteSeen(t.id);
        }}
      >
        <StickyNoteIcon size={18}/>
      </ActionIcon>
    </Indicator>
  </Tooltip>
)}

                                  {isAdmin && (
                                    <Tooltip label={notes[t.id] ? "Update note" : "Add note"}>
                                      <ActionIcon color="violet" variant="light" onClick={() => {
                                        const existing = notes[t.id]?.text || "";
                                        setEditNote({ open:true, taskId:t.id, text:existing, label:`${t.title} — Edit Note` });
                                      }}>
                                        <Edit3 size={18}/>
                                      </ActionIcon>
                                    </Tooltip>
                                  )}
                                  {!isAdmin && t.status === "open" && (
                                    <Tooltip label={lockThis ? "Complete High priority tasks first" : "I applied"}>
                                      <ActionIcon
                                        color={lockThis ? "gray" : "blue"}
                                        variant="light"
                                        onClick={() => { if (!lockThis) iApplied(t.id); }}
                                        disabled={lockThis}
                                      >
                                        <CheckCircle size={18} />
                                      </ActionIcon>
                                    </Tooltip>
                                  )}
                                  {isAdmin && (
                                    <>
                                      {t.status === "finished" ? (
                                        <Tooltip label="Send back to member">
                                          <ActionIcon color="yellow" variant="light" onClick={()=>markFinished(t.id, t.status)}>
                                            <RotateCcw size={18}/>
                                          </ActionIcon>
                                        </Tooltip>
                                      ) : (
                                        <Tooltip label="Mark as finished">
                                          <ActionIcon color="green" variant="light" onClick={()=>markFinished(t.id, t.status)}>
                                            <CheckCircle size={18}/>
                                          </ActionIcon>
                                        </Tooltip>
                                      )}
                                      <Tooltip label="Delete task">
                                        <ActionIcon color="red" variant="light" onClick={()=>deleteTaskAction(t.id)}>
                                          <Trash2 size={18}/>
                                        </ActionIcon>
                                      </Tooltip>
                                    </>
                                  )}
                                  <Tooltip label="Open job link">
                                    <ActionIcon variant="subtle" component="a" href={t.link} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink size={18}/>
                                    </ActionIcon>
                                  </Tooltip>
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          );
                        })}
                      </Table.Tbody>
                    </Table>

                    <Group justify="center" mt="md">
                      <Pagination value={page} onChange={setPage} total={Math.ceil(filtered.length / pageSize)} />
                    </Group>
                  </>
                )}
              </Paper>
            </Grid.Col>
          </Grid>
        </AppShell.Main>
      </AppShell>
    </>
  );
}
