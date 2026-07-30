import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

import { BrandMark } from "@/components/portal/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

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

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState(mode === "signup" ? "signup" : "signin");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
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
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent");
  }

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 aurora" />
      <div className="pointer-events-none absolute inset-0 grid-lines [mask-image:radial-gradient(60%_60%_at_50%_30%,black,transparent)]" />

      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>

        <div className="panel p-7">
          <BrandMark />

          {emailSent ? (
            <div className="mt-8 text-center">
              <Mail className="mx-auto size-8 text-primary" />
              <h1 className="mt-4 text-xl font-semibold">Confirm your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a confirmation link to{" "}
                <span className="text-foreground">{emailSent}</span>. Click it to activate your
                Nexus ID.
              </p>
              <Button variant="outline" className="mt-6 w-full" onClick={() => setEmailSent(null)}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <h1 className="mt-6 text-2xl font-semibold">
                {tab === "signin" ? "Sign in to your workspace" : "Create your Nexus ID"}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {tab === "signin"
                  ? "One login for every connected application."
                  : "Your account works across every sub-application."}
              </p>

              <Tabs value={tab} onValueChange={setTab} className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Sign up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-6">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Work email</Label>
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
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

                <TabsContent value="signup" className="mt-6">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full name</Label>
                      <Input id="signup-name" name="fullName" placeholder="Ada Lovelace" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Work email</Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="size-4 animate-spin" />}
                      Create account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Protected by Nexus ID · sessions are audited
        </p>
      </div>
    </main>
  );
}
