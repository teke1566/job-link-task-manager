import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  AppShell, Group, Button, TextInput, Table, Badge, ActionIcon,
  Paper, Title, Text, Tabs, Card, Grid, Loader, Select, Pagination
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  ExternalLink, Plus, Trash2, Filter, LogOut,
  CalendarDays, Calendar, RefreshCw, RotateCcw, CheckCircle
} from "lucide-react";
import {
  format, startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, isWithinInterval
} from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer
} from "recharts";

/* ---------- Supabase ---------- */
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

/* ---------- Helpers ---------- */
function StatusBadge({ status }) {
  const color =
    status === "finished" ? "green" :
    status === "applied" ? "yellow" : "blue";
  return <Badge color={color} variant="light" tt="capitalize">{status}</Badge>;
}
function PriorityBadge({ priority }) {
  const color =
    priority === "high" ? "red" :
    priority === "medium" ? "yellow" : "blue";
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

/* ---------- Main App ---------- */
function AppInner(){
  const [session, setSession] = useState(null);
  const [role, setRole] = useState("member");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, highPriority: 0 });
  const [perDay, setPerDay] = useState([]);
  const [statusDist, setStatusDist] = useState([]);
  const [logs, setLogs] = useState([]);

  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [priority, setPriority] = useState("medium");

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 15;

  /* --- Auth --- */
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
    };
    init();
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data?.subscription?.unsubscribe();
  }, []);

  /* --- Role fetch --- */
  useEffect(() => {
    (async () => {
      if (!session?.user) return;
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
      }
    })();
  }, [session]);

  /* --- Fetch tasks & stats --- */
  const fetchTasks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("id,title,link,created_at,status,priority,finished_at")
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };
  const fetchStats = async () => {
    const { data: tasks } = await supabase.from("tasks").select("*");
    if (!tasks) return;
    const today = new Date().toDateString();
    const thisMonth = new Date().getMonth();
    const thisWeek = getWeek(new Date());
    const todayCount = tasks.filter(t => t.finished_at && new Date(t.finished_at).toDateString() === today).length;
    const weekCount = tasks.filter(t => t.finished_at && getWeek(t.finished_at) === thisWeek).length;
    const monthCount = tasks.filter(t => t.finished_at && new Date(t.finished_at).getMonth() === thisMonth).length;
    const highPriority = tasks.filter(t => t.priority === "high" && t.status === "open").length;
    setStats({ today: todayCount, week: weekCount, month: monthCount, highPriority });

    // per-day
    const dayMap = {};
    tasks.forEach(t => {
      if (t.finished_at) {
        const d = new Date(t.finished_at).toLocaleDateString();
        dayMap[d] = (dayMap[d] || 0) + 1;
      }
    });
    setPerDay(Object.keys(dayMap).map(d => ({ date: d, count: dayMap[d] })));

    // status dist
    const statusMap = {};
    tasks.forEach(t => {
      statusMap[t.status] = (statusMap[t.status] || 0) + 1;
    });
    setStatusDist(Object.keys(statusMap).map(s => ({ name: s, value: statusMap[s] })));
  };

  /* --- Fetch logs (manual enrichment) --- */
  const fetchLogs = async () => {
    let { data, error } = await supabase
      .from("task_logs")
      .select("id, action, created_at, task_id, user_id")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Fetch logs error:", error.message);
      return;
    }

    // Collect task and user ids
    const taskIds = [...new Set(data.map(l => l.task_id).filter(Boolean))];
    const userIds = [...new Set(data.map(l => l.user_id).filter(Boolean))];

    let tasksMap = {};
    if (taskIds.length > 0) {
      const { data: tasks } = await supabase.from("tasks").select("id, title").in("id", taskIds);
      tasksMap = Object.fromEntries(tasks.map(t => [t.id, t.title]));
    }

    let usersMap = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase.from("profiles").select("id, email").in("id", userIds);
      usersMap = Object.fromEntries(users.map(u => [u.id, u.email]));
    }

    const enriched = data.map(l => ({
      ...l,
      title: tasksMap[l.task_id] ?? "Untitled Task",
      email: usersMap[l.user_id] ?? "Unknown user"
    }));

    console.log("Enriched logs:", enriched);
    setLogs(enriched);
  };

  /* --- Realtime --- */
  useEffect(() => {
    if (!session) return;
    fetchTasks(); 
    fetchStats(); 
    fetchLogs();

    const tasksChannel = supabase
      .channel("realtime-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        fetchTasks(); fetchStats();
      })
      .subscribe();

    const logsChannel = supabase
      .channel("realtime-task-logs")
      .on("postgres_changes", { event: "*", schema: "public", table: "task_logs" }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(logsChannel);
    };
  }, [session]);

  /* --- Helper to log --- */
  const logAction = async (taskId, action) => {
    if (!session?.user) return;
    const { error } = await supabase.from("task_logs").insert({
      task_id: taskId,
      user_id: session.user.id,
      action
    });
    if (error) console.error("Log insert failed:", error.message);
  };

  /* --- Actions --- */
  const addTask = async (e) => {
    e.preventDefault();
    if (!title || !link) {
      notifications.show({ color:"yellow", title:"Missing fields", message:"Title and link are required" });
      return;
    }
    const { data, error } = await supabase.from("tasks").insert({
      title,
      link,
      priority,
      status: "open",
      finished_at: null
    }).select().single();
    if (error) {
      notifications.show({ color:"red", title:"Failed to add task", message:error.message });
    } else {
      await logAction(data.id, "created");
      notifications.show({ color:"green", title:"Task added" });
      setTitle(""); setLink(""); setPriority("medium");
      fetchTasks(); fetchStats(); fetchLogs();
    }
  };

  const markStatus = async (taskId, status) => {
    const payload = status === "finished"
      ? { status, finished_at: new Date().toISOString() }
      : { status, finished_at: null };
    const { error } = await supabase.from("tasks").update(payload).eq("id", taskId);
    if (!error) {
      await logAction(taskId, status);
    }
    fetchTasks(); fetchStats(); fetchLogs();
  };
  const reopenTask = async (taskId) => {
    const { error } = await supabase.from("tasks").update({ status: "open", finished_at: null }).eq("id", taskId);
    if (!error) {
      await logAction(taskId, "reopened");
    }
    fetchTasks(); fetchStats(); fetchLogs();
  };
  const removeTask = async (taskId) => {
    if (!confirm("Delete this task?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (!error) {
      await logAction(taskId, "deleted");
    }
    fetchTasks(); fetchStats(); fetchLogs();
  };
  const iApplied = async (taskId) => {
    const { error } = await supabase
      .from("tasks")
      .update({ status: "finished", finished_at: new Date().toISOString() })
      .eq("id", taskId);
    if (error) {
      notifications.show({ color:"red", title:"Apply failed", message:error.message });
    } else {
      await logAction(taskId, "applied");
      notifications.show({ color:"green", title:"Great!", message:"Marked as applied & finished" });
      fetchTasks(); fetchStats(); fetchLogs();
    }
  };

  /* --- Derived list with pagination --- */
  const filtered = useMemo(() => {
    let list = tasks.slice();
    const now = new Date();
    if (tab === "today") list = list.filter(t => isWithinInterval(new Date(t.created_at), { start: startOfDay(now), end: endOfDay(now) }));
    else if (tab === "week") list = list.filter(t => isWithinInterval(new Date(t.created_at), { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }));
    else if (tab === "month") list = list.filter(t => isWithinInterval(new Date(t.created_at), { start: startOfMonth(now), end: endOfMonth(now) }));
    else if (tab === "open") list = list.filter(t => t.status === "open");
    else if (tab === "applied") list = list.filter(t => t.status === "applied");
    else if (tab === "finished") list = list.filter(t => t.status === "finished");
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(t => (`${t.title} ${t.link}`).toLowerCase().includes(q));
    }
    return list;
  }, [tasks, tab, query]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  /* --- UI --- */
  return (
    <AppShell padding="md" header={{height:64}} navbar={{ width:220, breakpoint:"sm" }}>
      <AppShell.Header>
        <Group h={64} px="md" justify="space-between">
          <Group><Title order={4}>Job Link Task Manager</Title><Badge variant="light">{role}</Badge></Group>
          <Group>
            <Button variant="subtle" onClick={()=>{fetchTasks();fetchStats();fetchLogs();}} leftSection={<RefreshCw size={16}/>}>Refresh</Button>
            <Button variant="default" leftSection={<LogOut size={16}/>} onClick={()=>supabase.auth.signOut()}>Sign out</Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Tabs value={tab} onChange={(v)=>setTab(v ?? "all")} orientation="vertical" variant="pills">
          <Tabs.List>
            <Tabs.Tab value="all" leftSection={<Filter size={16}/>}>All</Tabs.Tab>
            <Tabs.Tab value="open">Open</Tabs.Tab>
            <Tabs.Tab value="applied">Applied</Tabs.Tab>
            <Tabs.Tab value="finished">Finished</Tabs.Tab>
            <Tabs.Tab value="today" leftSection={<CalendarDays size={16}/>}>Today</Tabs.Tab>
            <Tabs.Tab value="week" leftSection={<CalendarDays size={16}/>}>This week</Tabs.Tab>
            <Tabs.Tab value="month" leftSection={<Calendar size={16}/>}>This month</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </AppShell.Navbar>

      <AppShell.Main>
        <Grid gutter="md">
          {/* Left: Dashboard */}
          <Grid.Col span={6}>
            <Grid gutter="md">
              <Grid.Col span={6}><Paper withBorder p="md"><Text size="sm">Finished Today</Text><Title order={2}>{stats.today}</Title></Paper></Grid.Col>
              <Grid.Col span={6}><Paper withBorder p="md"><Text size="sm">Finished This Week</Text><Title order={2}>{stats.week}</Title></Paper></Grid.Col>
              <Grid.Col span={6}><Paper withBorder p="md"><Text size="sm">Finished This Month</Text><Title order={2}>{stats.month}</Title></Paper></Grid.Col>
              <Grid.Col span={6}><Paper withBorder p="md"><Text size="sm">High Priority Open</Text><Title order={2}>{stats.highPriority}</Title></Paper></Grid.Col>
            </Grid>

            {/* Charts */}
            <Paper withBorder p="md" mt="lg">
              <Title order={5}>Applications per Day</Title>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={perDay}>
                  <XAxis dataKey="date" /><YAxis /><Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6"/>
                </LineChart>
              </ResponsiveContainer>
            </Paper>

            <Paper withBorder p="md" mt="lg">
              <Title order={5}>Status Distribution</Title>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                    {statusDist.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip/>
                </PieChart>
              </ResponsiveContainer>
            </Paper>

            {/* Recent Activity */}
            <Card withBorder p="md" mt="lg">
              <Title order={5}>Recent Activity</Title>
              {logs.length === 0 && <Text size="sm" c="dimmed" mt="sm">No recent activity</Text>}
              {logs.map(l => (
                <Paper key={l.id} p="xs" mt="xs" withBorder>
                  <Text size="sm">
                    [{format(new Date(l.created_at), "PPpp")}]{" "}
                    <b>{l.email}</b>{" "}
                    <Badge
                      color={l.action === "finished" ? "green" : (l.action === "applied" ? "yellow" : "blue")}
                      variant="light"
                    >
                      {l.action}
                    </Badge>{" "}
                    on <b>{l.title}</b>
                  </Text>
                </Paper>
              ))}
            </Card>
          </Grid.Col>

          {/* Right: Tasks */}
          <Grid.Col span={6}>
            {role === "admin" && (
              <Card withBorder radius="md" p="md" mb="md">
                <Title order={5}>Quick add task</Title>
                <form onSubmit={addTask}>
                  <Grid align="end" gutter="sm" mt="sm">
                    <Grid.Col span={5}>
                      <TextInput label="Job title" value={title} onChange={(e)=>setTitle(e.currentTarget.value)} required/>
                    </Grid.Col>
                    <Grid.Col span={5}>
                      <TextInput label="Application link" value={link} onChange={(e)=>setLink(e.currentTarget.value)} required/>
                    </Grid.Col>
                    <Grid.Col span={2}>
                      <Select label="Priority" value={priority} onChange={setPriority}
                        data={[{value:"high",label:"High"},{value:"medium",label:"Medium"},{value:"low",label:"Low"}]}/>
                    </Grid.Col>
                  </Grid>
                  <Button type="submit" leftSection={<Plus size={16}/>} fullWidth mt="sm">Add</Button>
                </form>
              </Card>
            )}

            <Paper withBorder radius="md" p="md">
              {loading ? (
                <Group justify="center" my="xl"><Loader/></Group>
              ) : (
                <>
                  <Table striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Title</Table.Th>
                        <Table.Th>Priority</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Created</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {paginated.map(t => (
                        <Table.Tr key={t.id}>
                          <Table.Td><Text fw={600}>{t.title}</Text></Table.Td>
                          <Table.Td><PriorityBadge priority={t.priority}/></Table.Td>
                          <Table.Td><StatusBadge status={t.status}/></Table.Td>
                          <Table.Td>{format(new Date(t.created_at), "PP pp")}</Table.Td>
                          <Table.Td>
                            <Group justify="right" gap="xs">
                              {role === "admin" && t.status !== "finished" && (
                                <ActionIcon variant="light" color="green" onClick={()=>markStatus(t.id,"finished")} title="Mark finished"><CheckCircle size={18}/></ActionIcon>
                              )}
                              {role === "admin" && t.status === "finished" && (
                                <ActionIcon variant="light" onClick={()=>reopenTask(t.id)} title="Reopen"><RotateCcw size={18}/></ActionIcon>
                              )}
                              {role === "admin" && (
                                <ActionIcon variant="light" color="red" onClick={()=>removeTask(t.id)} title="Delete"><Trash2 size={18}/></ActionIcon>
                              )}
                              {role !== "admin" && t.status === "open" && (
                                <Button size="xs" variant="light" onClick={()=>iApplied(t.id)}>I applied</Button>
                              )}
                              <ActionIcon variant="subtle" component="a" href={t.link} target="_blank"><ExternalLink size={18}/></ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                  <Group justify="center" mt="md">
                    <Pagination total={Math.ceil(filtered.length / pageSize)} page={page} onChange={setPage}/>
                  </Group>
                </>
              )}
            </Paper>
          </Grid.Col>
        </Grid>
      </AppShell.Main>
    </AppShell>
  );
}

export default AppInner;
