import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  AppShell, Group, Button, TextInput, Table, Badge, ActionIcon,
  Paper, Title, Text, Tabs, Card, Grid, Divider, Loader
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  CheckCircle, ExternalLink, Plus, Trash2, Filter, LogOut, Mail,
  CalendarDays, Calendar, RefreshCw, Search, RotateCcw
} from "lucide-react";
import {
  format, startOfDay, endOfDay, startOfMonth, endOfMonth, isWithinInterval
} from "date-fns";

/* ---------- Error boundary so you never get a blank page ---------- */
class ErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state = { e: null }; }
  static getDerivedStateFromError(e){ return { e }; }
  componentDidCatch(e, info){ console.error("UI error:", e, info); }
  render(){
    if (this.state.e){
      return (
        <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#fff"}}>
          <Card withBorder padding="lg" radius="md" style={{maxWidth:800}}>
            <Title order={2} c="red">Something broke in the UI</Title>
            <Paper withBorder p="sm" mt="sm">
              <pre style={{margin:0,whiteSpace:"pre-wrap"}}>{String(this.state.e.stack || this.state.e)}</pre>
            </Paper>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ---------- Supabase singleton (prevents duplicate auth clients) ---------- */
function getSupabase(){
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const GLOBAL_KEY = "__sb_joblinks_client__";
  if (!globalThis[GLOBAL_KEY]){
    globalThis[GLOBAL_KEY] = createClient(url, key, {
      auth: { storageKey: "sb-joblinks-auth", persistSession: true, autoRefreshToken: true },
    });
  }
  return globalThis[GLOBAL_KEY];
}
const supabase = getSupabase();

/* ---------- UI helper ---------- */
function StatusBadge({ status }){
  const color = status === "finished" ? "green" : status === "open" ? "blue" : "gray";
  return <Badge color={color} variant="light" tt="capitalize">{status}</Badge>;
}

function AppInner(){
  // Env guard
  const envOk = useMemo(() => !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY), []);
  if (!envOk){
    return (
      <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f8fafc"}}>
        <Card withBorder padding="lg" radius="md" style={{maxWidth:640}}>
          <Title order={2}>Env variables missing</Title>
          <Text mt="sm" c="dimmed">Create <code>.env.local</code> with:</Text>
          <Paper withBorder p="sm" radius="md" mt="sm">
            <pre style={{margin:0}}>{`VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY`}</pre>
          </Paper>
          <Text mt="md">Then restart: <code>npm run dev</code></Text>
        </Card>
      </div>
    );
  }

  // State
  const [session, setSession] = useState(null);
  const [role, setRole] = useState("member");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick add form
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all"); // all | open | finished | today | month

  // Auth
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
    };
    init();
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      if (!session?.user) return;
      const { data } = await supabase.from("users_roles").select("role").eq("user_id", session.user.id).maybeSingle();
      if (data?.role) setRole(data.role);
    })();
  }, [session]);

  // Data
  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("id,title,link,created_at,status,assignee,finished_at")
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!session) return;
    fetchTasks();
    const channel = supabase
      .channel("realtime-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, fetchTasks)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session]);

  // Derived
  const filtered = useMemo(() => {
    let list = tasks.slice();
    const now = new Date();
    if (tab === "today"){
      const start = startOfDay(now), end = endOfDay(now);
      list = list.filter(t => isWithinInterval(new Date(t.created_at), { start, end }));
    } else if (tab === "month"){
      const start = startOfMonth(now), end = endOfMonth(now);
      list = list.filter(t => isWithinInterval(new Date(t.created_at), { start, end }));
    } else if (tab === "open"){
      list = list.filter(t => t.status === "open");
    } else if (tab === "finished"){
      list = list.filter(t => t.status === "finished");
    }
    if (query.trim()){
      const q = query.toLowerCase();
      list = list.filter(t => (`${t.title} ${t.link}`).toLowerCase().includes(q));
    }
    return list;
  }, [tasks, tab, query]);

  const stats = useMemo(() => {
    const now = new Date();
    const startT = startOfDay(now), endT = endOfDay(now);
    const startM = startOfMonth(now), endM = endOfMonth(now);
    const todayFinished = tasks.filter(t =>
      t.status==="finished" && t.finished_at &&
      isWithinInterval(new Date(t.finished_at), { start: startT, end: endT })
    ).length;
    const monthFinished = tasks.filter(t =>
      t.status==="finished" && t.finished_at &&
      isWithinInterval(new Date(t.finished_at), { start: startM, end: endM })
    ).length;
    return { todayFinished, monthFinished };
  }, [tasks]);

  // Actions
  const signIn = async () => {
    const email = prompt("Enter your email for a magic link");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) notifications.show({ color:"red", title:"Sign-in failed", message:error.message });
    else notifications.show({ color:"blue", title:"Check your inbox", message:"Magic link sent." });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole("member");
    setTasks([]);
  };

  const addTask = async (e) => {
    e?.preventDefault?.();
    if (!title || !link){
      notifications.show({ color:"yellow", title:"Missing fields", message:"Title and link are required" });
      return;
    }
    const id = notifications.show({ loading:true, title:"Adding task…", message:title, autoClose:false });
    const { error } = await supabase.from("tasks").insert({ title, link });
    if (error){
      notifications.update({ id, color:"red", title:"Failed", message:error.message, loading:false, autoClose:3000 });
    }else{
      setTitle(""); setLink("");
      notifications.update({ id, color:"green", title:"Task added", message:"", loading:false, autoClose:1500 });
    }
  };

  const markStatus = async (taskId, status) => {
    if (status === "finished") {
      const ok = confirm("Mark this task as finished?");
      if (!ok) return;
    }
    const payload = status === "finished"
      ? { status, finished_at: new Date().toISOString() }
      : { status, finished_at: null };
    const { error } = await supabase.from("tasks").update(payload).eq("id", taskId);
    if (error) notifications.show({ color:"red", title:"Update failed", message:error.message });
  };

  const removeTask = async (taskId) => {
    if (!confirm("Delete this task?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) notifications.show({ color:"red", title:"Delete failed", message:error.message });
  };

  // NEW: Member clicks "I applied" -> insert into applications
  const iApplied = async (taskId) => {
    const { error } = await supabase.from("applications").insert({
      task_id: taskId,
      user_id: session.user.id,
    });
    if (error) {
      // Ignore duplicate unique error
      if (error.code === "23505") {
        notifications.show({ color: "blue", title: "Already recorded", message: "You already marked this." });
      } else {
        notifications.show({ color: "red", title: "Could not mark applied", message: error.message });
      }
    } else {
      // Trigger flips task to finished; realtime subscription reloads tasks
      notifications.show({ color: "green", title: "Great!", message: "Marked as applied" });
    }
  };

  // UI
  if (!session){
    return (
      <div style={{minHeight:"100vh",background:"#f8fafc"}}>
        <AppShell header={{height:64}} padding="md">
          <AppShell.Header>
            <Group h={64} px="md" justify="space-between">
              <Title order={4}>Job Link Task Manager</Title>
              <Button leftSection={<Mail size={16}/>} onClick={signIn}>Sign in with magic link</Button>
            </Group>
          </AppShell.Header>
          <AppShell.Main>
            <Grid gutter="lg">
              <Grid.Col span={{ base:12, md:6 }}>
                <Paper p="xl" radius="md" withBorder>
                  <Title order={3}>Welcome</Title>
                  <Text c="dimmed" mt="xs">Sign in to add job links and track finishes.</Text>
                </Paper>
              </Grid.Col>
            </Grid>
          </AppShell.Main>
        </AppShell>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:"#f6f7fb"}}>
      <AppShell padding="md" header={{height:64}} navbar={{ width:260, breakpoint:"sm" }}>
        <AppShell.Header>
          <Group h={64} px="md" justify="space-between">
            <Group><Title order={4}>Job Link Task Manager</Title><Badge variant="light">{role}</Badge></Group>
            <Group>
              <Button variant="subtle" onClick={fetchTasks} leftSection={<RefreshCw size={16}/>}>Refresh</Button>
              <Button variant="default" leftSection={<LogOut size={16}/>} onClick={signOut}>Sign out</Button>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <Tabs value={tab} onChange={(v)=>setTab(v ?? "all")} orientation="vertical" variant="pills">
            <Tabs.List>
              <Tabs.Tab value="all" leftSection={<Filter size={16}/>}>All</Tabs.Tab>
              <Tabs.Tab value="open">Open</Tabs.Tab>
              <Tabs.Tab value="finished">Finished</Tabs.Tab>
              <Tabs.Tab value="today" leftSection={<CalendarDays size={16}/>}>Today</Tabs.Tab>
              <Tabs.Tab value="month" leftSection={<Calendar size={16}/>}>This month</Tabs.Tab>
            </Tabs.List>
          </Tabs>
          <Divider my="md"/>
          <Grid gutter="md">
            <Grid.Col span={12}><Paper p="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">Finished today</Text>
              <Title order={2}>{stats.todayFinished}</Title>
            </Paper></Grid.Col>
            <Grid.Col span={12}><Paper p="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">Finished this month</Text>
              <Title order={2}>{stats.monthFinished}</Title>
            </Paper></Grid.Col>
          </Grid>
        </AppShell.Navbar>

        <AppShell.Main>
          <Group justify="space-between" mb="md">
            <TextInput leftSection={<Search size={16}/>} placeholder="Search title or link…" value={query} onChange={(e)=>setQuery(e.currentTarget.value)} w={320}/>
          </Group>

          {/* Quick add task (always inserts OPEN) */}
          {role === "admin" && (
            <Card withBorder radius="md" p="md" mb="md">
              <Title order={5}>Quick add task</Title>
              <form onSubmit={addTask}>
                <Grid align="end" gutter="sm" mt="sm">
                  <Grid.Col span={{ base:12, md:4 }}>
                    <TextInput
                      label="Job title"
                      placeholder="e.g., Java Developer at Capital One"
                      value={title}
                      onChange={(e)=>setTitle(e.currentTarget.value)}
                      required
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base:12, md:6 }}>
                    <TextInput
                      label="Application link"
                      placeholder="https://…"
                      value={link}
                      onChange={(e)=>setLink(e.currentTarget.value)}
                      required
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base:12, md:2 }}>
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
              <Table striped withRowBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{width:"40%"}}>Title</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Created</Table.Th>
                    <Table.Th style={{width:280, textAlign:"right"}}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filtered.map(t=>(
                    <Table.Tr key={t.id}>
                      <Table.Td>
                        <a href={t.link} target="_blank" rel="noreferrer" style={{textDecoration:"none"}}>
                          <Text fw={600}>{t.title}</Text>
                        </a>
                        <Text size="xs" c="dimmed">{t.link}</Text>
                      </Table.Td>
                      <Table.Td><StatusBadge status={t.status}/></Table.Td>
                      <Table.Td>{format(new Date(t.created_at), "PP pp")}</Table.Td>
                      <Table.Td>
                        <Group justify="right" gap="xs">
                          {/* Admin controls */}
                          {role === "admin" && (t.status !== "finished"
                            ? <ActionIcon variant="light" color="green" onClick={()=>markStatus(t.id,"finished")} title="Mark finished"><CheckCircle size={18}/></ActionIcon>
                            : <ActionIcon variant="light" onClick={()=>markStatus(t.id,"open")} title="Reopen"><RotateCcw size={18}/></ActionIcon>
                          )}
                          {role === "admin" && (
                            <ActionIcon variant="light" color="red" onClick={()=>removeTask(t.id)} title="Delete"><Trash2 size={18}/></ActionIcon>
                          )}

                          {/* Member action: I applied -> triggers FINISHED via DB */}
                          {role !== "admin" && t.status !== "finished" && (
                            <Button size="xs" variant="light" onClick={()=>iApplied(t.id)}>
                              I applied
                            </Button>
                          )}

                          {/* Optional: raw open link for everyone */}
                          <ActionIcon variant="subtle" component="a" href={t.link} target="_blank" title="Open link"><ExternalLink size={18}/></ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {filtered.length === 0 && (
                    <Table.Tr><Table.Td colSpan={4}><Text ta="center" c="dimmed">No tasks</Text></Table.Td></Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </AppShell.Main>
      </AppShell>
    </div>
  );
}

/* ---------- Export wrapped with the error boundary ---------- */
export default function App(){
  return <ErrorBoundary><AppInner/></ErrorBoundary>;
}
