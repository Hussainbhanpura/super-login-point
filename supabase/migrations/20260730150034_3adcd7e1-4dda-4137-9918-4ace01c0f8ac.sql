
CREATE TABLE public.analytics_daily (
  day date PRIMARY KEY,
  signups integer NOT NULL DEFAULT 0,
  sign_ins integer NOT NULL DEFAULT 0,
  failed_logins integer NOT NULL DEFAULT 0,
  active_users integer NOT NULL DEFAULT 0,
  unique_devices integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.analytics_daily TO authenticated;
GRANT ALL ON public.analytics_daily TO service_role;
ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analytics_daily_select" ON public.analytics_daily FOR SELECT TO authenticated USING (true);

CREATE TABLE public.app_usage_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  sessions integer NOT NULL DEFAULT 0,
  avg_duration_seconds integer NOT NULL DEFAULT 0,
  UNIQUE (day, application_id)
);
GRANT SELECT ON public.app_usage_daily TO authenticated;
GRANT ALL ON public.app_usage_daily TO service_role;
ALTER TABLE public.app_usage_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_usage_daily_select" ON public.app_usage_daily FOR SELECT TO authenticated USING (true);

INSERT INTO public.analytics_daily (day, signups, sign_ins, failed_logins, active_users, unique_devices)
SELECT
  d::date,
  8 + (abs(hashtext(d::text)) % 14),
  260 + (abs(hashtext(d::text || 'a')) % 190) + (CASE WHEN extract(dow from d) IN (0,6) THEN -120 ELSE 0 END),
  4 + (abs(hashtext(d::text || 'b')) % 17),
  180 + (abs(hashtext(d::text || 'c')) % 140) + (CASE WHEN extract(dow from d) IN (0,6) THEN -80 ELSE 0 END),
  120 + (abs(hashtext(d::text || 'd')) % 110)
FROM generate_series(current_date - interval '44 days', current_date, interval '1 day') AS d;

INSERT INTO public.app_usage_daily (day, application_id, sessions, avg_duration_seconds)
SELECT d::date, a.id,
  20 + (abs(hashtext(d::text || a.slug)) % 90),
  300 + (abs(hashtext(d::text || a.slug || 'z')) % 2400)
FROM generate_series(current_date - interval '44 days', current_date, interval '1 day') AS d
CROSS JOIN public.applications a;
