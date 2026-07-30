import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  BarChart3,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { BrandMark } from "@/components/portal/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Nexus ID" },
      {
        name: "description",
        content: "Sign in or create your Nexus ID account to reach every connected application.",
      },
      { property: "og:title", content: "Sign in — Nexus ID" },
      { property: "og:description", content: "One account for every connected application." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const signupSchema = credentials.extend({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
});

const highlights = [
  { icon: ShieldCheck, text: "Audited sessions with per-event history" },
  { icon: Lock, text: "Role-aware access to every sub-application" },
  { icon: BarChart3, text: "Live sign-in analytics from your first login" },
];

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const scope = useScrollReveal<HTMLElement>();
  const [tab, setTab] = useState(mode === "signup" ? "signup" : "signin");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = credentials.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.user) {
      await supabase.from("auth_events").insert({
        user_id: data.user.id,
        email: data.user.email,
        event_type: "sign_in",
        method: "password",
        user_agent: navigator.userAgent.slice(0, 200),
        success: true,
      });
      await supabase
        .from("profiles")
        .update({ last_sign_in_at: new Date().toISOString() })
        .eq("id", data.user.id);
    }
    toast.success("Welcome back");
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      fullName: form.get("fullName"),
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: parsed.data.fullName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      toast.success("Account created");
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    setEmailSent(parsed.data.email);
  }

  async function handleReset(email: string) {
    if (!email) {
      toast.error("Enter your email above first, then request a reset link.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password reset link sent");
  }

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main ref={scope} className="relative min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand rail */}
      <aside className="ink-gradient-bg relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-15" />
        <div
          data-parallax="30"
          className="pointer-events-none absolute -top-32 -left-24 size-96 rounded-full bg-primary/30 blur-3xl"
        />
        <div className="relative" data-anim="intro">
          <BrandMark className="reveal [&_span]:text-primary-foreground [&_p]:text-primary-foreground" />
          <h2 className="reveal mt-16 max-w-sm text-3xl leading-tight font-semibold text-primary-foreground">
            One login. Every application. Full visibility.
          </h2>
          <p className="reveal mt-4 max-w-sm text-sm text-primary-foreground/70">
            Nexus ID is the front door to your internal tools — authentication, roles and analytics
            in a single place.
          </p>

          <ul className="mt-10 space-y-4">
            {highlights.map((h) => (
              <li
                key={h.text}
                className="reveal flex items-center gap-3 text-sm text-primary-foreground/85"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-foreground/10">
                  <h.icon className="size-4" />
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 p-5 text-xs text-primary-foreground/70">
          <p className="flex items-center gap-2 text-primary-foreground">
            <Check className="size-3.5" /> Demo workspace
          </p>
          <p className="mt-2 font-mono">demo@nexusid.app · NexusDemo2026!</p>
        </div>
      </aside>

      {/* Form side */}
      <section className="relative grid place-items-center overflow-hidden px-4 py-12 sm:px-8">
        <div className="pointer-events-none absolute inset-0 aurora lg:hidden" />
        <div className="relative w-full max-w-md" data-anim="intro">
          <Link
            to="/"
            className="reveal mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to home
          </Link>

          <div className="reveal panel-lift p-7 sm:p-8">
            <div className="lg:hidden">
              <BrandMark />
            </div>

            {emailSent ? (
              <div className="mt-4 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10">
                  <Mail className="size-6 text-primary" />
                </span>
                <h1 className="mt-4 text-xl font-semibold">Confirm your email</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  We sent a confirmation link to{" "}
                  <span className="font-medium text-foreground">{emailSent}</span>. Click it to
                  activate your Nexus ID.
                </p>
                <Button
                  variant="outline"
                  className="mt-6 w-full"
                  onClick={() => setEmailSent(null)}
                >
                  Back to sign in
                </Button>
              </div>
            ) : (
              <>
                <h1 className="mt-4 text-2xl font-semibold lg:mt-0">
                  {tab === "signin" ? "Welcome back" : "Create your Nexus ID"}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {tab === "signin"
                    ? "Sign in to reach every connected application."
                    : "Your account works across every sub-application."}
                </p>

                <Tabs value={tab} onValueChange={setTab} className="mt-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Sign in</TabsTrigger>
                    <TabsTrigger value="signup">Sign up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin" className="mt-6 animate-fade-in">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Work email</Label>
                        <div className="relative">
                          <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="signin-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@company.com"
                            className="h-11 pl-9"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="signin-password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            className="h-11 pr-10 pl-9"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" size="lg" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="size-4 animate-spin" />}
                        Sign in
                      </Button>
                      <button
                        type="button"
                        className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => {
                          const input = document.getElementById(
                            "signin-email",
                          ) as HTMLInputElement | null;
                          void handleReset(input?.value?.trim() ?? "");
                        }}
                      >
                        Forgot your password?
                      </button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="mt-6 animate-fade-in">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full name</Label>
                        <Input
                          id="signup-name"
                          name="fullName"
                          placeholder="Ada Lovelace"
                          className="h-11"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Work email</Label>
                        <div className="relative">
                          <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@company.com"
                            className="h-11 pl-9"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="At least 8 characters"
                            className="h-11 pr-10 pl-9"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" size="lg" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="size-4 animate-spin" />}
                        Create account
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>

          <p className="reveal mt-6 text-center text-xs text-muted-foreground">
            Protected by Nexus ID · sessions are audited
          </p>
        </div>
      </section>
    </main>
  );
}
