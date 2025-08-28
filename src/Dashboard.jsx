import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { Card, Grid, Paper, Text, Title, Badge } from "@mantine/core";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, highPriority: 0 });
  const [logs, setLogs] = useState([]);
  const [perDay, setPerDay] = useState([]);
  const [statusDist, setStatusDist] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchLogs();

    // 👇 Subscribe to realtime logs
    const channel = supabase
      .channel("realtime-task-logs")
      .on("postgres_changes", { event: "*", schema: "public", table: "task_logs" }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // -------- Stats --------
  const fetchStats = async () => {
    const { data: tasks } = await supabase.from("tasks").select("*");

    if (!tasks) return;

    const today = new Date().toDateString();
    const thisMonth = new Date().getMonth();

    const todayCount = tasks.filter(t => t.finished_at && new Date(t.finished_at).toDateString() === today).length;
    const weekCount = tasks.filter(t => t.finished_at && getWeek(t.finished_at) === getWeek(new Date())).length;
    const monthCount = tasks.filter(t => t.finished_at && new Date(t.finished_at).getMonth() === thisMonth).length;
    const highPriority = tasks.filter(t => t.priority === "high" && t.status === "open").length;

    setStats({ today: todayCount, week: weekCount, month: monthCount, highPriority });

    // Per day
    const dayMap = {};
    tasks.forEach(t => {
      if (t.finished_at) {
        const d = new Date(t.finished_at).toLocaleDateString();
        dayMap[d] = (dayMap[d] || 0) + 1;
      }
    });
    setPerDay(Object.keys(dayMap).map(d => ({ date: d, count: dayMap[d] })));

    // Status dist
    const statusMap = {};
    tasks.forEach(t => {
      statusMap[t.status] = (statusMap[t.status] || 0) + 1;
    });
    setStatusDist(Object.keys(statusMap).map(s => ({ name: s, value: statusMap[s] })));
  };

  // -------- Logs --------
  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("task_logs")
      .select(`
        id,
        action,
        created_at,
        task:task_id (title),
        user:user_id (email)
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) setLogs(data);
  };

  const COLORS = ["#4ade80", "#3b82f6", "#facc15"];

  // Helper for week number
  const getWeek = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* -------- Stats -------- */}
      <Grid gutter="md">
        <Grid.Col span={3}>
          <Paper withBorder p="md">
            <Text size="sm" c="dimmed">Finished Today</Text>
            <Title order={2}>{stats.today}</Title>
          </Paper>
        </Grid.Col>
        <Grid.Col span={3}>
          <Paper withBorder p="md">
            <Text size="sm" c="dimmed">Finished This Week</Text>
            <Title order={2}>{stats.week}</Title>
          </Paper>
        </Grid.Col>
        <Grid.Col span={3}>
          <Paper withBorder p="md">
            <Text size="sm" c="dimmed">Finished This Month</Text>
            <Title order={2}>{stats.month}</Title>
          </Paper>
        </Grid.Col>
        <Grid.Col span={3}>
          <Paper withBorder p="md">
            <Text size="sm" c="dimmed">High Priority Open</Text>
            <Title order={2}>{stats.highPriority}</Title>
          </Paper>
        </Grid.Col>
      </Grid>

      <Grid mt="lg" gutter="md">
        <Grid.Col span={6}>
          <Paper withBorder p="md">
            <Title order={5}>Applications per Day</Title>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={perDay}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid.Col>
        <Grid.Col span={6}>
          <Paper withBorder p="md">
            <Title order={5}>Status Distribution</Title>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                  {statusDist.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* -------- Logs -------- */}
      <Card withBorder p="md" mt="lg">
        <Title order={5}>Recent Activity</Title>
        {logs.length === 0 && (
          <Text size="sm" c="dimmed" mt="sm">No recent activity</Text>
        )}
        {logs.map(l => (
          <Paper key={l.id} p="xs" mt="xs" withBorder>
            <Text size="sm">
              [{format(new Date(l.created_at), "PPpp")}]{" "}
              <b>{l.user?.email || "Unknown user"}</b>{" "}
              <Badge
                color={l.action === "finished" ? "green" : (l.action === "applied" ? "yellow" : "blue")}
                variant="light"
              >
                {l.action}
              </Badge>{" "}
              on <b>{l.task?.title || "Untitled Task"}</b>
            </Text>
          </Paper>
        ))}
      </Card>
    </div>
  );
}
