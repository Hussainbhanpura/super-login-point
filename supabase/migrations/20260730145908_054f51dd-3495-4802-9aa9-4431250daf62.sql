
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');
CREATE TYPE public.auth_event_type AS ENUM ('sign_in', 'sign_up', 'sign_out', 'failed_login', 'password_reset');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  job_title text,
  status text NOT NULL DEFAULT 'active',
  last_sign_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  url text,
  color text NOT NULL DEFAULT '#2563EB',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applications_select" ON public.applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "applications_admin_all" ON public.applications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.app_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, application_id)
);
GRANT SELECT ON public.app_access TO authenticated;
GRANT ALL ON public.app_access TO service_role;
ALTER TABLE public.app_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access_select_own" ON public.app_access FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "app_access_admin_all" ON public.app_access FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.auth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  event_type public.auth_event_type NOT NULL,
  method text NOT NULL DEFAULT 'password',
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_events_created_at_idx ON public.auth_events (created_at DESC);
GRANT SELECT, INSERT ON public.auth_events TO authenticated;
GRANT ALL ON public.auth_events TO service_role;
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_events_select_own" ON public.auth_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "auth_events_insert_own" ON public.auth_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.app_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer NOT NULL DEFAULT 0
);
CREATE INDEX app_sessions_started_at_idx ON public.app_sessions (started_at DESC);
GRANT SELECT, INSERT ON public.app_sessions TO authenticated;
GRANT ALL ON public.app_sessions TO service_role;
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_sessions_select_own" ON public.app_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "app_sessions_insert_own" ON public.app_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.applications (slug, name, description, url, color) VALUES
  ('crm', 'Atlas CRM', 'Customer relationships and pipeline', 'https://crm.example.com', '#2563EB'),
  ('billing', 'Ledger Billing', 'Invoices, subscriptions and payouts', 'https://billing.example.com', '#0EA5E9'),
  ('support', 'Helpdesk', 'Tickets and customer support', 'https://support.example.com', '#22C55E'),
  ('analytics', 'Insight Analytics', 'Reporting and BI dashboards', 'https://analytics.example.com', '#A855F7'),
  ('hr', 'People Hub', 'HR, payroll and time off', 'https://people.example.com', '#F59E0B'),
  ('inventory', 'Stockroom', 'Inventory and warehouse ops', 'https://stock.example.com', '#EF4444'),
  ('docs', 'Knowledge Base', 'Internal documentation', 'https://docs.example.com', '#14B8A6');
