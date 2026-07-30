import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const since = new Date();
    since.setDate(since.getDate() - 29);
    const sinceDay = since.toISOString().slice(0, 10);

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
          .gte("day", sinceDay)
          .order("day"),
        supabase
          .from("app_usage_daily")
          .select("day, application_id, sessions, avg_duration_seconds")
          .gte("day", sinceDay),
        supabase
          .from("auth_events")
          .select("id, event_type, method, success, user_agent, created_at, email")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase.from("app_access").select("application_id").eq("user_id", userId),
      ]);

    const apps = appsRes.data ?? [];
    const usage = usageRes.data ?? [];
    const daily = dailyRes.data ?? [];

    const usageByApp = apps.map((app) => {
      const rows = usage.filter((u) => u.application_id === app.id);
      const sessions = rows.reduce((sum, r) => sum + r.sessions, 0);
      const avg = rows.length
        ? Math.round(rows.reduce((s, r) => s + r.avg_duration_seconds, 0) / rows.length)
        : 0;
      return {
        id: app.id,
        name: app.name,
        slug: app.slug,
        description: app.description,
        url: app.url,
        color: app.color,
        isActive: app.is_active,
        sessions,
        avgDurationMinutes: Math.round(avg / 60),
      };
    });

    const totalSignIns = daily.reduce((s, d) => s + d.sign_ins, 0);
    const totalSignups = daily.reduce((s, d) => s + d.signups, 0);
    const totalFailed = daily.reduce((s, d) => s + d.failed_logins, 0);
    const peakActive = daily.reduce((m, d) => Math.max(m, d.active_users), 0);

    const half = Math.floor(daily.length / 2) || 1;
    const firstHalf = daily.slice(0, half).reduce((s, d) => s + d.sign_ins, 0) || 1;
    const secondHalf = daily.slice(half).reduce((s, d) => s + d.sign_ins, 0);
    const trend = Math.round(((secondHalf - firstHalf) / firstHalf) * 100);

    const totalSessions = usageByApp.reduce((s, a) => s + a.sessions, 0);

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
      })),
      apps: usageByApp,
      recentEvents: eventsRes.data ?? [],
      kpis: {
        totalSignIns,
        totalSignups,
        totalFailed,
        peakActive,
        totalSessions,
        trend,
        successRate:
          totalSignIns + totalFailed > 0
            ? Math.round((totalSignIns / (totalSignIns + totalFailed)) * 1000) / 10
            : 100,
        connectedApps: apps.filter((a) => a.is_active).length,
      },
    };
  });
