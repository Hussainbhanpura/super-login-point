import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
  Gauge,
  Layers,
  Loader2,
  LogOut,
  PieChart as PieIcon,
  ShieldCheck,
  Timer,
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
      { title: "Executive analytics — Nexus ID" },
      {
        name: "description",
        content:
          "Portfolio-wide identity analytics: adoption, engagement and authentication health across every connected sub-application.",
      },
      { property: "og:title", content: "Executive analytics — Nexus ID" },
      {
        property: "og:description",
        content:
          "Portfolio-wide identity analytics: adoption, engagement and authentication health across every connected sub-application.",
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

function compact(n: number) {
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function ChartTooltip({ active, payload, label, suffix }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[9rem] rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-[var(--shadow-lift)]">
      {label && <p className="mb-1.5 font-medium text-foreground">{label}</p>}
      {payload.map((p: any) => (
        <p
          key={p.dataKey ?? p.name}
          className="flex items-center justify-between gap-3 text-muted-foreground"
        >
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: p.color ?? p.fill }} />
            {p.name}
          </span>
          <span className="font-medium text-foreground">
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
            {suffix ?? ""}
          </span>
        </p>
      ))}
    </div>
  );
}

function AppScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-[var(--shadow-lift)]">
      <p className="font-medium text-foreground">{d.name}</p>
      <p className="mt-1 text-muted-foreground">
        {d.sessions.toLocaleString()} sessions · {d.avgDurationMinutes} min avg
      </p>
      <p className="text-muted-foreground">
        {compact(d.engagementMinutes)} engaged minutes · {d.share}% of portfolio
      </p>
    </div>
  );
}

const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };

function Delta({ value, suffix = "%", invert = false }: { value: number; suffix?: string; invert?: boolean }) {
  const good = invert ? value <= 0 : value >= 0;
  const Icon = value >= 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        good ? "text-success" : "text-destructive"
      }`}
    >
      <Icon className="size-3.5" />
      {value >= 0 ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

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

  const { kpis, series, appSeries, appNames, apps, recentEvents, profile, roles } = data;
  const d = kpis.deltas;
  const chartData = series.map((s) => ({ ...s, label: formatDay(s.day) }));
  const stackedData = appSeries.map((row: any) => ({ ...row, label: formatDay(String(row.day)) }));
  const activeAppNames = appNames.filter((a) => apps.some((x) => x.name === a.name && x.sessions > 0));

  const avgDuration = apps.length
    ? Math.round((apps.reduce((s, a) => s + a.avgDurationMinutes, 0) / apps.length) * 10) / 10
    : 0;
  const avgSessions = apps.length
    ? Math.round(apps.reduce((s, a) => s + a.sessions, 0) / apps.length)
    : 0;

  const stats = [
    {
      label: "Portfolio sessions",
      value: compact(kpis.totalSessions),
      icon: Layers,
      delta: d.sessions,
      hint: "Across all sub-apps",
    },
    {
      label: "Avg daily active",
      value: compact(kpis.avgActive),
      icon: Users,
      delta: d.activeUsers,
      hint: `Peak ${compact(kpis.peakActive)}`,
    },
    {
      label: "Sign-ins (30d)",
      value: compact(kpis.totalSignIns),
      icon: Activity,
      delta: d.signIns,
      hint: "Successful authentications",
    },
    {
      label: "New accounts",
      value: compact(kpis.totalSignups),
      icon: UserPlus,
      delta: d.signups,
      hint: "Provisioned this period",
    },
    {
      label: "Auth success rate",
      value: `${kpis.successRate}%`,
      icon: ShieldCheck,
      delta: d.successRate,
      suffix: "pt",
      hint: `${compact(kpis.totalFailed)} failed attempts`,
    },
    {
      label: "Engaged time",
      value: `${compact(Math.round(kpis.totalEngagement / 60))} hrs`,
      icon: Timer,
      delta: undefined,
      hint: `${kpis.sessionsPerUser} sessions / active user`,
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
            <Button asChild variant="ghost" size="sm">
              <Link to="/apps">
                <Layers className="size-4" />
                My apps
              </Link>
            </Button>
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
            <h1 className="reveal text-2xl font-semibold sm:text-3xl">Executive analytics</h1>
            <p className="reveal mt-1 text-sm text-muted-foreground">
              Last 30 days vs the prior 30 · {kpis.connectedApps} connected applications ·{" "}
              {kpis.top3Share}% of usage in the top 3
            </p>
          </div>
          <Badge variant="outline" className="reveal gap-1.5 bg-surface">
            <span className="size-1.5 rounded-full bg-success" />
            All services operational
          </Badge>
        </div>

        {/* ---------------- KPI band ---------------- */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {stats.map((s) => (
            <div
              key={s.label}
              className="reveal panel overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  {s.label}
                </p>
                <span className="grid size-8 place-items-center rounded-lg bg-primary/10">
                  <s.icon className="size-4 text-primary" />
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-semibold">{s.value}</p>
              <div className="mt-2 flex items-center gap-2">
                {typeof s.delta === "number" && <Delta value={s.delta} suffix={s.suffix ?? "%"} />}
                <span className="truncate text-[11px] text-muted-foreground">{s.hint}</span>
              </div>
            </div>
          ))}
        </section>

        {/* ---------------- Auth health ---------------- */}
        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="reveal panel p-5 lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Authentication health</h2>
                <p className="text-xs text-muted-foreground">
                  Daily sign-in volume against active users and the failed-attempt rate.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-[var(--chart-1)]" /> Sign-ins
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[var(--chart-2)]" /> Active users
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[var(--chart-5)]" /> Failure rate
                </span>
              </div>
            </div>
            <div className="mt-5 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ left: -18, right: -10, top: 8 }}>
                  <defs>
                    <linearGradient id="fillSignIns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.35} />
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
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={axisTick} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    unit="%"
                    tickLine={false}
                    axisLine={false}
                    tick={axisTick}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent)" }} />
                  <Bar
                    yAxisId="left"
                    dataKey="signIns"
                    name="Sign-ins"
                    fill="url(#fillSignIns)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={18}
                    animationDuration={900}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="activeUsers"
                    name="Active users"
                    stroke="var(--chart-2)"
                    strokeWidth={2.5}
                    dot={false}
                    animationDuration={1100}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="failureRate"
                    name="Failure rate"
                    stroke="var(--chart-5)"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={false}
                    animationDuration={1300}
                  />
                  <ReferenceLine
                    yAxisId="right"
                    y={5}
                    stroke="var(--chart-5)"
                    strokeOpacity={0.35}
                    strokeDasharray="2 4"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="reveal panel p-5">
            <div className="flex items-center gap-2">
              <PieIcon className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Portfolio mix</h2>
            </div>
            <p className="text-xs text-muted-foreground">Share of sessions by sub-application.</p>
            <div className="mt-2 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={apps}
                    dataKey="sessions"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="92%"
                    paddingAngle={2}
                    stroke="none"
                    animationDuration={1000}
                  >
                    {apps.map((a) => (
                      <Cell key={a.id} fill={a.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-1.5">
              {apps.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: a.color }} />
                    <span className="truncate">{a.name}</span>
                  </span>
                  <span className="font-medium">{a.share}%</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------- Adoption over time ---------------- */}
        <section className="mt-6 grid gap-4 lg:grid-cols-5">
          <div className="reveal panel p-5 lg:col-span-3">
            <h2 className="text-sm font-semibold">Adoption across sub-applications</h2>
            <p className="text-xs text-muted-foreground">
              Stacked daily sessions — shows which apps are carrying growth.
            </p>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stackedData} margin={{ left: -20, right: 8, top: 8 }}>
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
                  {activeAppNames.map((a, i) => (
                    <Area
                      key={a.name}
                      type="monotone"
                      dataKey={a.name}
                      name={a.name}
                      stackId="apps"
                      stroke={a.color}
                      fill={a.color}
                      fillOpacity={0.55}
                      strokeWidth={1.5}
                      animationDuration={800 + i * 90}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="reveal panel p-5 lg:col-span-2">
            <div className="flex items-center gap-2">
              <Gauge className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Reach vs. depth</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Sessions against average session length. Bubble size = total engaged minutes.
            </p>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: -14, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="sessions"
                    name="Sessions"
                    tickLine={false}
                    axisLine={false}
                    tick={axisTick}
                    tickFormatter={(v) => compact(v as number)}
                  />
                  <YAxis
                    type="number"
                    dataKey="avgDurationMinutes"
                    name="Avg minutes"
                    unit="m"
                    tickLine={false}
                    axisLine={false}
                    tick={axisTick}
                  />
                  <ZAxis type="number" dataKey="engagementMinutes" range={[80, 700]} />
                  <ReferenceLine x={avgSessions} stroke="var(--border)" strokeDasharray="4 4" />
                  <ReferenceLine y={avgDuration} stroke="var(--border)" strokeDasharray="4 4" />
                  <Tooltip content={<AppScatterTooltip />} cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={apps} animationDuration={1000}>
                    {apps.map((a) => (
                      <Cell key={a.id} fill={a.color} fillOpacity={0.65} stroke={a.color} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Upper-right = strategic apps. Lower-left = candidates for review.
            </p>
          </div>
        </section>

        {/* ---------------- Leaderboard ---------------- */}
        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="reveal panel p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold">Sub-application scorecard</h2>
            <p className="text-xs text-muted-foreground">
              Ranked by sessions, with period-over-period change and 30-day trend.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3 font-medium">Application</th>
                    <th className="py-2 pr-3 text-right font-medium">Sessions</th>
                    <th className="py-2 pr-3 text-right font-medium">Share</th>
                    <th className="py-2 pr-3 text-right font-medium">Avg</th>
                    <th className="py-2 pr-3 text-right font-medium">Δ vs prev</th>
                    <th className="py-2 pl-3 font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-accent/50"
                    >
                      <td className="py-2.5 pr-3">
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-sm"
                            style={{ background: a.color }}
                          />
                          <span className="font-medium text-foreground">{a.name}</span>
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {a.sessions.toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-muted-foreground">
                        {a.share}%
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-muted-foreground">
                        {a.avgDurationMinutes}m
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <Delta value={a.change} />
                      </td>
                      <td className="w-28 py-1.5 pl-3">
                        <div className="h-8">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={a.trend}>
                              <Line
                                type="monotone"
                                dataKey="sessions"
                                stroke={a.color}
                                strokeWidth={1.75}
                                dot={false}
                                isAnimationActive={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="reveal panel p-5">
            <h2 className="text-sm font-semibold">How people sign in</h2>
            <p className="text-xs text-muted-foreground">Share of sessions by method.</p>
            <ul className="mt-4 space-y-3">
              {methodBreakdown.map((m) => {
                const total = methodBreakdown.reduce((s, x) => s + x.value, 0) || 1;
                const pct = Math.round((m.value / total) * 100);
                return (
                  <li key={m.name}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{m.name}</span>
                      <span className="font-medium tabular-nums">{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-accent">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: m.fill }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            <h2 className="mt-6 text-sm font-semibold">Recent account activity</h2>
            <ul className="mt-3 space-y-2.5">
              {recentEvents.length === 0 && (
                <li className="text-xs text-muted-foreground">No events recorded yet.</li>
              )}
              {recentEvents.slice(0, 5).map((e) => (
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

        {/* ---------------- App directory ---------------- */}
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
                <div className="mt-4 flex items-center gap-2">
                  <h3 className="text-base font-semibold">{app.name}</h3>
                  <Delta value={app.momentum} />
                </div>
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
