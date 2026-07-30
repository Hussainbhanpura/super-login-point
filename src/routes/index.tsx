import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Fingerprint, KeyRound, LineChart, Lock } from "lucide-react";
import { BrandMark } from "@/components/portal/brand-mark";
import { Button } from "@/components/ui/button";

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

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 aurora" />
      <div className="pointer-events-none absolute inset-0 grid-lines [mask-image:radial-gradient(70%_50%_at_50%_0%,black,transparent)]" />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <BrandMark />
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="relative mx-auto w-full max-w-6xl px-6 pt-10 pb-20 sm:pt-20">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs text-muted-foreground">
          <Fingerprint className="size-3.5 text-primary" />
          Central identity provider
        </p>
        <h1 className="mt-6 max-w-3xl text-4xl leading-[1.05] font-semibold sm:text-6xl">
          One identity for <span className="brand-gradient-text">every application</span> you run.
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          Nexus ID authenticates your people once, then hands them a single dashboard of every
          connected sub-application — with the sign-in analytics to prove it is working.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
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

        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="panel p-6">
              <f.icon className="size-5 text-primary" />
              <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export { redirect };
