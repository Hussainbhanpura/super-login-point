DROP POLICY IF EXISTS "analytics_daily_select" ON public.analytics_daily;
CREATE POLICY "analytics_daily_admin_select" ON public.analytics_daily
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "app_usage_daily_select" ON public.app_usage_daily;
CREATE POLICY "app_usage_daily_admin_select" ON public.app_usage_daily
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;