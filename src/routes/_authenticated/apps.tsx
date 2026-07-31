import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Clock,
  Grid2X2,
  Loader2,
  Lock,
  LogOut,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { BrandMark } from "@/components/portal/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getMyWorkspace, recordAppLaunch } from "@/lib/apps.functions";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

export const Route = createFileRoute("/_authenticated/apps")({
  head: () => ({
    meta: [
      { title: "Your app launcher — Nexus ID" },
      {
        name: "description",
        content:
          "One sign-in, every tool. Launch any connected sub-application you have access to from your Nexus ID workspace.",
      },
      { property: "og:title", content: "Your app launcher — Nexus ID" },
      {
        property: "og:description",
        content:
          "One sign-in, every tool. Launch any connected sub-application you have access to from your Nexus ID workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppsPage,
});

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function relative(iso: string | null) {
  if (!iso) return "Not opened yet";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

function AppsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchWorkspace = useServerFn(getMyWorkspace);
  const launch = useServerFn(recordAppLaunch);
  const [query, setQuery] = useState("");
  const [launching, setLaunching] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["workspace"],
    queryFn: () => fetchWorkspace(),
  });

  const scope = useScrollReveal<HTMLDivElement>([Boolean(data), query]);

  const { granted, locked, recents } = useMemo(() => {
    const apps = data?.apps ?? [];
    const q = query.trim().toLowerCase();
    const match = (a: (typeof apps)[number]) =>
      !q || a.name.toLowerCase().includes(q) || (a.description ?? "").toLowerCase().includes(q);
    return {
      granted: apps.filter((a) => a.hasAccess && match(a)),
      locked: apps.filter((a) => !a.hasAccess && match(a)),
      recents: apps
        .filter((a) => a.hasAccess && a.lastUsed)
        .sort((a, b) => (a.lastUsed! < b.lastUsed! ? 1 : -1))
        .slice(0, 4),
    };
  }, [data, query]);

  async function openApp(app: { id: string; name: string; url: string | null }) {
    setLaunching(app.id);
    const win = app.url ? window.open("", "_blank", "noopener,noreferrer") : null;
    try {
      await launch({ data: { applicationId: app.id } });
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
    } catch {
      /* launch logging is best-effort */
    }
    setLaunching(null);
    if (!app.url) {
      win?.close();
      toast.error(`${app.name} has no launch URL configured yet.`);
      return;
    }
    if (win) win.location.href = app.url;
    else window.open(app.url, "_blank", "noopener,noreferrer");
  }

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
            We couldn't load your applications right now.
          </p>
        </div>
      </div>
    );
  }

  const firstName = (data.profile?.full_name ?? data.profile?.email ?? "there").split(" ")[0];

  return (
    <div ref={scope} className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <BrandMark />
          <div className="flex items-center gap-2">
            {data.canSeeAnalytics && (
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard">
                  <BarChart3 className="size-4" />
                  Analytics
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <section className="reveal">
          <Badge variant="secondary" className="mb-3 gap-1.5">
            <Sparkles className="size-3.5" />
            Single sign-on workspace
          </Badge>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            You're signed in with Nexus ID. Pick any application below — your session carries over,
            no second login required.
          </p>

          <div className="relative mt-6 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search applications"
              className="pl-9"
              aria-label="Search applications"
            />
          </div>
        </section>

        {recents.length > 0 && !query && (
          <section className="reveal mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Jump back in
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {recents.map((app) => (
                <button
                  key={app.id}
                  onClick={() => openApp(app)}
                  className="group flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm transition hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: app.color ?? "var(--primary)" }}
                  />
                  {app.name}
                  <span className="text-xs text-muted-foreground">{relative(app.lastUsed)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="reveal flex items-center gap-2">
            <Grid2X2 className="size-4 text-primary" />
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Your applications
            </h2>
            <Badge variant="secondary">{granted.length}</Badge>
          </div>

          {granted.length === 0 ? (
            <div className="reveal mt-4 rounded-2xl border border-dashed border-border p-10 text-center">
              <Lock className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No applications have been assigned to your account yet. Ask an administrator to
                grant access.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {granted.map((app) => (
                <button
                  key={app.id}
                  onClick={() => openApp(app)}
                  className="reveal group relative flex flex-col items-start overflow-hidden rounded-2xl border border-border bg-card p-5 text-left transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
                >
                  <span
                    className="absolute inset-x-0 top-0 h-1 opacity-70"
                    style={{ background: app.color ?? "var(--primary)" }}
                  />
                  <span
                    className="grid size-11 place-items-center rounded-xl text-sm font-semibold text-white"
                    style={{ background: app.color ?? "var(--primary)" }}
                  >
                    {initials(app.name)}
                  </span>
                  <span className="mt-4 flex w-full items-center justify-between gap-2">
                    <span className="font-display text-base font-semibold tracking-tight">
                      {app.name}
                    </span>
                    {launching === app.id ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : (
                      <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                    )}
                  </span>
                  <span className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                    {app.description ?? "Connected sub-application"}
                  </span>
                  <span className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" />
                      {relative(app.lastUsed)}
                    </span>
                    {app.sessionCount > 0 && <span>{app.sessionCount} sessions</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {locked.length > 0 && (
          <section className="mt-12">
            <div className="reveal flex items-center gap-2">
              <Lock className="size-4 text-muted-foreground" />
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Available in the catalog
              </h2>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {locked.map((app) => (
                <div
                  key={app.id}
                  className="reveal rounded-2xl border border-dashed border-border bg-muted/30 p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-muted text-sm font-semibold text-muted-foreground">
                      {initials(app.name)}
                    </span>
                    <Badge variant="outline" className="gap-1">
                      <Lock className="size-3" />
                      No access
                    </Badge>
                  </div>
                  <p className="mt-3 font-medium">{app.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {app.description ?? "Connected sub-application"}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 px-0 text-primary hover:bg-transparent"
                    onClick={() =>
                      toast.success(`Access request sent for ${app.name}`, {
                        description: "An administrator will review it shortly.",
                      })
                    }
                  >
                    Request access
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
