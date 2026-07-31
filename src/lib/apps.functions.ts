import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profileRes, rolesRes, appsRes, accessRes, sessionsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, job_title, avatar_url, last_sign_in_at")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase
        .from("applications")
        .select("id, slug, name, description, url, color, is_active")
        .eq("is_active", true)
        .order("name"),
      supabase.from("app_access").select("application_id, granted_at").eq("user_id", userId),
      supabase
        .from("app_sessions")
        .select("application_id, started_at, duration_seconds")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(200),
    ]);

    const roles = (rolesRes.data ?? []).map((r) => r.role);
    const isAdmin = roles.includes("admin");
    const accessMap = new Map((accessRes.data ?? []).map((a) => [a.application_id, a.granted_at]));
    const sessions = sessionsRes.data ?? [];

    const apps = (appsRes.data ?? []).map((app) => {
      const mine = sessions.filter((s) => s.application_id === app.id);
      const lastUsed = mine[0]?.started_at ?? null;
      return {
        id: app.id,
        slug: app.slug,
        name: app.name,
        description: app.description,
        url: app.url,
        color: app.color,
        hasAccess: isAdmin || accessMap.has(app.id),
        grantedAt: accessMap.get(app.id) ?? null,
        lastUsed,
        sessionCount: mine.length,
        minutesSpent: Math.round(mine.reduce((s, x) => s + (x.duration_seconds ?? 0), 0) / 60),
      };
    });

    return {
      profile: profileRes.data,
      roles,
      isAdmin,
      canSeeAnalytics: isAdmin || roles.includes("manager"),
      apps,
    };
  });

export const recordAppLaunch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { applicationId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("app_sessions").insert({
      user_id: userId,
      application_id: data.applicationId,
      duration_seconds: 0,
    });
    return { ok: true };
  });
