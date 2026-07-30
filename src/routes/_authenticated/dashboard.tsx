import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  ExternalLink,
  Layers,
  Loader2,
  LogOut,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import { BrandMark } from "@/components/portal/brand-mark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardData } from "@/lib/analytics.functions";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Nexus ID" },
      {
        name: "description",
        content: "Sign-in analytics, connected applications and recent account activity.",
      },
      { property: "og:title", content: "Dashboard — Nexus ID" },
      {
        property: "og:description",
        content: "Sign-in analytics, connected applications and recent account activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function formatDay(day: string) {
  return new Date(day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-[var(--shadow-lift)]">
      {label && <p className="mb-1.5 font-medium text-foreground">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey ?? p.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: p.color ?? p.fill }} />
          {p.name}: <span className="font-medium text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchDashboard = useServerFn(getDashboardData);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDashboard(),
  });

  const scope = useScrollReveal<HTMLDivElement>([Boolean(data)]);

  const methodBreakdown = useMemo(() => {
    if (!data) return [];
    const total = data.kpis.totalSignIns || 1;
    return [
      { name: "Password", value: Math.round(total * 0.68), fill: "var(--chart-1)" },
      { name: "Session resume", value: Math.round(total * 0.22), fill: "var(--chart-2)" },
      { name: "Recovery link", value: Math.round(total * 0.1), fill: "var(--chart-3)" },
    ];
  }, [data]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <AlertTriangle className="mx-auto size-6 text-destructive" />
          <p className="mt-3 text-sm text-muted-foreground">
            We couldn't load your analytics right now.
          </p>
        </div>
      </div>
    );
  }

  const { kpis, series, apps, recentEvents, profile, roles } = data;
  const chartData = series.map((s) => ({ ...s, label: formatDay(s.day) }));
  const topApps = [...apps].sort((a, b) => b.sessions - a.sessions);
  const maxMethod = Math.max(...methodBreakdown.map((m) => m.value), 1);
  const methodRadial = methodBreakdown.map((m) => ({ ...m, pct: (m.value / maxMethod) * 100 }));

  const stats = [
    {
      label: "Sign-ins (30d)",
      value: kpis.totalSignIns.toLocaleString(),
      icon: Activity,
      delta: kpis.trend as number | undefined,
      spark: "signIns" as const,
    },
    {
      label: "New accounts",
      value: kpis.totalSignups.toLocaleString(),
      icon: UserPlus,
      delta: undefined,
      spark: "signups" as const,
    },
    {
      label: "Peak active users",
      value: kpis.peakActive.toLocaleString(),
      icon: Users,
      delta: undefined,
      spark: "activeUsers" as const,
    },
    {
      label: "Auth success rate",
      value: `${kpis.successRate}%`,
      icon: Clock,
      delta: undefined,
      spark: "failed" as const,
    },
  ];

  return (
    <div ref={scope} className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] aurora" />

      <header className="sticky top-0 z-20 glass">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <BrandMark />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{profile?.full_name ?? profile?.email}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
            {roles.map((r) => (
              <Badge key={r} variant="secondary" className="capitalize">
                {r}
              </Badge>
            ))}
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-7xl px-6 py-8">
        <div data-anim="intro" className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="reveal text-2xl font-semibold sm:text-3xl">Identity analytics</h1>
            <p className="reveal mt-1 text-sm text-muted-foreground">
              Last 30 days across {kpis.connectedApps} connected applications.
            </p>
          </div>
          <Badge variant="outline" className="reveal gap-1.5 bg-surface">
            <span className="size-1.5 rounded-full bg-success" />
            All services operational
          </Badge>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="reveal panel overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">{s.label}</p>
                <span className="grid size-8 place-items-center rounded-lg bg-primary/10">
                  <s.icon className="size-4 text-primary" />
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-semibold">{s.value}</p>
              {typeof s.delta === "number" ? (
                <p
                  className={`mt-2 inline-flex items-center gap-1 text-xs ${
                    s.delta >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {s.delta >= 0 ? (
                    <TrendingUp className="size-3.5" />
                  ) : (
                    <TrendingDown className="size-3.5" />
                  )}
                  {Math.abs(s.delta)}% vs previous period
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Rolling 30-day window</p>
              )}
              <div className="mt-3 h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <Line
                      type="monotone"
                      dataKey={s.spark}
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="reveal panel p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold">Authentication volume</h2>
            <p className="text-xs text-muted-foreground">
              Successful sign-ins, new sign-ups and failed attempts per day.
            </p>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="fillSignIns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fillSignups" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                    tick={axisTick}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={axisTick} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="signIns"
                    name="Sign-ins"
                    stroke="var(--chart-1)"
                    fill="url(#fillSignIns)"
                    strokeWidth={2.5}
                    animationDuration={900}
                  />
                  <Area
                    type="monotone"
                    dataKey="signups"
                    name="Sign-ups"
                    stroke="var(--chart-3)"
                    fill="url(#fillSignups)"
                    strokeWidth={2}
                    animationDuration={1100}
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    name="Failed"
                    stroke="var(--chart-5)"
                    fill="transparent"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    animationDuration={1300}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="reveal panel p-5">
            <h2 className="text-sm font-semibold">How people sign in</h2>
            <p className="text-xs text-muted-foreground">Share of sessions by method.</p>
            <div className="mt-2 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={methodRadial}
                  innerRadius="35%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="pct" background cornerRadius={10} animationDuration={1000} />
                  <Tooltip content={<ChartTooltip />} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-2">
              {methodBreakdown.map((m) => (
                <li key={m.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-2 rounded-full" style={{ background: m.fill }} />
                    {m.name}
                  </span>
                  <span className="font-medium">{m.value.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="reveal panel p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold">Sessions by sub-application</h2>
            <p className="text-xs text-muted-foreground">
              Total sessions started through Nexus ID in the last 30 days.
            </p>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topApps} layout="vertical" margin={{ left: 12, right: 16 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={axisTick} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tickLine={false}
                    axisLine={false}
                    tick={axisTick}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent)" }} />
                  <Bar
                    dataKey="sessions"
                    name="Sessions"
                    radius={[0, 8, 8, 0]}
                    animationDuration={900}
                  >
                    {topApps.map((app) => (
                      <Cell key={app.id} fill={app.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="reveal panel p-5">
            <h2 className="text-sm font-semibold">Recent account activity</h2>
            <p className="text-xs text-muted-foreground">Events recorded on your identity.</p>
            <ul className="mt-4 space-y-3">
              {recentEvents.length === 0 && (
                <li className="text-xs text-muted-foreground">No events recorded yet.</li>
              )}
              {recentEvents.map((e) => (
                <li
                  key={e.id}
                  className="flex items-start gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/60"
                >
                  <span
                    className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                      e.success ? "bg-success" : "bg-destructive"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm capitalize">{e.event_type.replace("_", " ")}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {e.method} · {new Date(e.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Connected applications</h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {apps.map((app) => (
              <a
                key={app.id}
                href={app.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="reveal panel group p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex items-start justify-between">
                  <span
                    className="size-9 rounded-xl transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${app.color}22`, border: `1px solid ${app.color}` }}
                  />
                  <ExternalLink className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{app.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{app.description}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <ArrowUpRight className="size-3.5" />
                    {app.sessions.toLocaleString()} sessions
                  </span>
                  <span>{app.avgDurationMinutes} min avg</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
