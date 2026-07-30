import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { BrandMark } from "@/components/portal/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Nexus ID" },
      { name: "description", content: "Choose a new password for your Nexus ID account." },
      { property: "og:title", content: "Set a new password — Nexus ID" },
      { property: "og:description", content: "Choose a new password for your Nexus ID account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match" });

function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      password: form.get("password"),
      confirm: form.get("confirm"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 aurora" />
      <div className="panel relative w-full max-w-md p-7">
        <BrandMark />
        <h1 className="mt-6 text-2xl font-semibold">Set a new password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Choose a strong password you have not used before.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </div>
    </main>
  );
}
