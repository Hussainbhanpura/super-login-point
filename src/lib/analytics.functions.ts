import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const WINDOW_DAYS = 30;

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Pull two windows so we can compare current vs previous period.
    const currentStart = new Date();
    currentStart.setDate(currentStart.getDate() - (WINDOW_DAYS - 1));
    const previousStart = new Date();
    previousStart.setDate(previousStart.getDate() - (WINDOW_DAYS * 2 - 1));

    const currentStartKey = dayKey(currentStart);
    const previousStartKey = dayKey(previousStart);

    const [profileRes, rolesRes, appsRes, dailyRes, usageRes, eventsRes, accessRes] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, full_name, job_title, status, last_sign_in_at, created_at")
          .eq("id", userId)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase
          .from("applications")
          .select("id, slug, name, description, url, color, is_active")
          .order("name"),
        supabase
          .from("analytics_daily")
          .select("day, signups, sign_ins, failed_logins, active_users, unique_devices")
          .gte("day", previousStartKey)
          .order("day"),
        supabase
          .from("app_usage_daily")
          .select("day, application_id, sessions, avg_duration_seconds")
          .gte("day", previousStartKey)
          .order("day"),
        supabase
          .from("auth_events")
          .select("id, event_type, method, success, user_agent, created_at, email")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase.from("app_access").select("application_id").eq("user_id", userId),
      ]);

    const apps = appsRes.data ?? [];
    const allDaily = dailyRes.data ?? [];
    const allUsage = usageRes.data ?? [];

    const daily = allDaily.filter((d) => d.day >= currentStartKey);
    const prevDaily = allDaily.filter((d) => d.day < currentStartKey);
    const usage = allUsage.filter((u) => u.day >= currentStartKey);
    const prevUsage = allUsage.filter((u) => u.day < currentStartKey);

    const sum = <T,>(rows: T[], pick: (r: T) => number) => rows.reduce((s, r) => s + pick(r), 0);
    const pctChange = (now: number, before: number) =>
      before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : now > 0 ? 100 : 0;

    // ---- Org-wide KPIs with period-over-period deltas -----------------------
    const totalSignIns = sum(daily, (d) => d.sign_ins);
    const totalSignups = sum(daily, (d) => d.signups);
    const totalFailed = sum(daily, (d) => d.failed_logins);
    const peakActive = daily.reduce((m, d) => Math.max(m, d.active_users), 0);
    const avgActive = daily.length ? Math.round(sum(daily, (d) => d.active_users) / daily.length) : 0;
    const totalSessions = sum(usage, (u) => u.sessions);

    // The prior window can hold fewer days of history than the current one, so
    // normalise its totals to a comparable per-day basis before computing deltas.
    const prevScale = prevDaily.length ? daily.length / prevDaily.length : 0;
    const prevUsageDays = new Set(prevUsage.map((u) => u.day)).size;
    const usageDays = new Set(usage.map((u) => u.day)).size || 1;
    const prevUsageScale = prevUsageDays ? usageDays / prevUsageDays : 0;

    const prevSignIns = sum(prevDaily, (d) => d.sign_ins) * prevScale;
    const prevSignups = sum(prevDaily, (d) => d.signups) * prevScale;
    const prevFailed = sum(prevDaily, (d) => d.failed_logins) * prevScale;
    const prevSessions = sum(prevUsage, (u) => u.sessions) * prevUsageScale;
    const prevAvgActive = prevDaily.length
      ? Math.round(sum(prevDaily, (d) => d.active_users) / prevDaily.length)
      : 0;

    const successRate =
      totalSignIns + totalFailed > 0
        ? Math.round((totalSignIns / (totalSignIns + totalFailed)) * 1000) / 10
        : 100;
    const prevSuccessRate =
      prevSignIns + prevFailed > 0
        ? Math.round((prevSignIns / (prevSignIns + prevFailed)) * 1000) / 10
        : 100;

    // ---- Per-application rollups -------------------------------------------
    const usageByApp = apps.map((app) => {
      const rows = usage.filter((u) => u.application_id === app.id);
      const prevRows = prevUsage.filter((u) => u.application_id === app.id);
      const sessions = sum(rows, (r) => r.sessions);
      const prevAppSessions = sum(prevRows, (r) => r.sessions);
      const avg = rows.length
        ? Math.round(sum(rows, (r) => r.avg_duration_seconds) / rows.length)
        : 0;
      const avgDurationMinutes = Math.round((avg / 60) * 10) / 10;

      // 7-day tail for the sparkline / momentum read.
      const tail = rows.slice(-7);
      const head = rows.slice(-14, -7);
      const momentum = pctChange(
        sum(tail, (r) => r.sessions),
        sum(head, (r) => r.sessions),
      );

      return {
        id: app.id,
        name: app.name,
        slug: app.slug,
        description: app.description,
        url: app.url,
        color: app.color,
        isActive: app.is_active,
        sessions,
        prevSessions: prevAppSessions,
        change: pctChange(sessions, prevAppSessions),
        momentum,
        avgDurationMinutes,
        engagementMinutes: Math.round(sessions * avgDurationMinutes),
        trend: rows.map((r) => ({ day: r.day, sessions: r.sessions })),
      };
    });

    const rankedApps = [...usageByApp].sort((a, b) => b.sessions - a.sessions);
    const totalEngagement = sum(usageByApp, (a) => a.engagementMinutes);
    const appsWithShare = rankedApps.map((a) => ({
      ...a,
      share: totalSessions > 0 ? Math.round((a.sessions / totalSessions) * 1000) / 10 : 0,
    }));

    // Concentration: share of sessions held by the top 3 apps.
    const top3Share = totalSessions
      ? Math.round(
          (appsWithShare.slice(0, 3).reduce((s, a) => s + a.sessions, 0) / totalSessions) * 1000,
        ) / 10
      : 0;

    // ---- Stacked daily series per application ------------------------------
    const appNameById = new Map(apps.map((a) => [a.id, a.name]));
    const dayMap = new Map<string, Record<string, number | string>>();
    for (const row of usage) {
      const key = row.day;
      const entry = dayMap.get(key) ?? { day: key };
      const name = appNameById.get(row.application_id);
      if (!name) continue;
      entry[name] = ((entry[name] as number) ?? 0) + row.sessions;
      dayMap.set(key, entry);
    }
    const appSeries = [...dayMap.values()].sort((a, b) =>
      String(a.day).localeCompare(String(b.day)),
    );

    return {
      profile: profileRes.data,
      roles: (rolesRes.data ?? []).map((r) => r.role),
      grantedAppIds: (accessRes.data ?? []).map((a) => a.application_id),
      series: daily.map((d) => ({
        day: d.day,
        signIns: d.sign_ins,
        signups: d.signups,
        failed: d.failed_logins,
        activeUsers: d.active_users,
        devices: d.unique_devices,
        failureRate:
          d.sign_ins + d.failed_logins > 0
            ? Math.round((d.failed_logins / (d.sign_ins + d.failed_logins)) * 1000) / 10
            : 0,
      })),
      appSeries,
      appNames: apps.map((a) => ({ name: a.name, color: a.color })),
      apps: appsWithShare,
      recentEvents: eventsRes.data ?? [],
      kpis: {
        totalSignIns,
        totalSignups,
        totalFailed,
        peakActive,
        avgActive,
        totalSessions,
        totalEngagement,
        successRate,
        top3Share,
        connectedApps: apps.filter((a) => a.is_active).length,
        sessionsPerUser: avgActive > 0 ? Math.round((totalSessions / avgActive) * 10) / 10 : 0,
        deltas: {
          signIns: pctChange(totalSignIns, prevSignIns),
          signups: pctChange(totalSignups, prevSignups),
          sessions: pctChange(totalSessions, prevSessions),
          activeUsers: pctChange(avgActive, prevAvgActive),
          successRate: Math.round((successRate - prevSuccessRate) * 10) / 10,
          failed: pctChange(totalFailed, prevFailed),
        },
      },
    };
  });
