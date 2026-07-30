import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Fingerprint,
  KeyRound,
  LineChart,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/portal/brand-mark";
import { Button } from "@/components/ui/button";
import { useCountUp, useScrollReveal } from "@/hooks/use-scroll-reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexus ID — One login for every internal app" },
      {
        name: "description",
        content:
          "Nexus ID is the single sign-on portal for your organisation: one account, every sub-application, full sign-in analytics.",
      },
      { property: "og:title", content: "Nexus ID — One login for every internal app" },
      {
        property: "og:description",
        content: "One account, every sub-application, full sign-in analytics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: KeyRound,
    title: "One set of credentials",
    body: "Sign in once and move between every connected sub-application without another password prompt.",
  },
  {
    icon: Lock,
    title: "Role-aware access",
    body: "Admins, managers and members each see only the applications they have been granted.",
  },
  {
    icon: LineChart,
    title: "Analytics built in",
    body: "Sign-ins, sign-ups, failed attempts and per-app session usage, tracked from day one.",
  },
];

const steps = [
  {
    icon: Fingerprint,
    title: "Authenticate once",
    body: "Email and password with audited events, session tracking and password recovery built in.",
  },
  {
    icon: ShieldCheck,
    title: "Carry your identity",
    body: "Roles and app grants travel with the account, so each sub-app knows exactly who is knocking.",
  },
  {
    icon: BarChart3,
    title: "Watch it work",
    body: "A live dashboard shows volume, success rate and which applications people actually use.",
  },
];

function Stat({ value, suffix, label }: { value: number; suffix?: string; label: string }) {
  const ref = useCountUp(value);
  return (
    <div className="reveal">
      <p className="font-display text-3xl font-semibold sm:text-4xl">
        <span ref={ref}>0</span>
        {suffix}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function Landing() {
  const scope = useScrollReveal<HTMLElement>();

  return (
    <main ref={scope} className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[900px] aurora" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] grid-lines [mask-image:radial-gradient(70%_50%_at_50%_0%,black,transparent)]" />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <BrandMark />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth" search={{ mode: "signup" }}>
              Get started
            </Link>
          </Button>
        </div>
      </header>

      <section data-anim="intro" className="relative mx-auto w-full max-w-6xl px-6 pt-10 sm:pt-16">
        <p className="reveal inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs text-muted-foreground shadow-sm">
          <Sparkles className="size-3.5 text-primary" />
          Central identity provider
        </p>
        <h1 className="reveal mt-6 max-w-3xl text-4xl leading-[1.05] font-semibold sm:text-6xl">
          One identity for <span className="brand-gradient-text">every application</span> you run.
        </h1>
        <p className="reveal mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          Nexus ID authenticates your people once, then hands them a single dashboard of every
          connected sub-application — with the sign-in analytics to prove it is working.
        </p>

        <div className="reveal mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth" search={{ mode: "signup" }}>
              Create an account
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">I already have one</Link>
          </Button>
        </div>

        <div className="reveal mt-14 grid grid-cols-2 gap-8 border-y border-border py-8 sm:grid-cols-4">
          <Stat value={7} label="Connected apps" />
          <Stat value={12480} label="Sign-ins tracked" />
          <Stat value={99} suffix="%" label="Auth success rate" />
          <Stat value={45} label="Days of analytics" />
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-6 py-20">
        <h2 className="reveal max-w-lg text-2xl font-semibold sm:text-3xl">
          Everything an internal login portal should already do.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="reveal panel group p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="panel-lift relative overflow-hidden p-8 sm:p-12">
          <div
            data-parallax="40"
            className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary/10 blur-3xl"
          />
          <h2 className="reveal text-2xl font-semibold sm:text-3xl">How it fits together</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="reveal relative">
                <span className="font-mono text-xs text-primary">0{i + 1}</span>
                <s.icon className="mt-3 size-5 text-primary" />
                <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="reveal ink-gradient-bg relative overflow-hidden rounded-3xl px-8 py-14 text-center sm:px-16">
          <Users className="mx-auto size-6 text-primary-foreground/80" />
          <h2 className="mt-4 text-2xl font-semibold text-primary-foreground sm:text-3xl">
            Give your team one door in.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-primary-foreground/70">
            Create your Nexus ID and get the dashboard, the roles and the audit trail immediately.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-7">
            <Link to="/auth" search={{ mode: "signup" }}>
              Create your account
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="relative border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground">
          <BrandMark />
          <p>Sessions are audited · Nexus ID</p>
        </div>
      </footer>
    </main>
  );
}
