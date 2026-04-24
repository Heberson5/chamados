
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'agent', 'customer');
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'waiting', 'resolved', 'closed');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Organizations (tenants)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles linked to auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (separate table, scoped per organization)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, role)
);

-- Tickets
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  number SERIAL,
  subject TEXT NOT NULL,
  description TEXT,
  status ticket_status NOT NULL DEFAULT 'open',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  category TEXT,
  requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ
);

CREATE INDEX idx_tickets_org ON public.tickets(organization_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_assignee ON public.tickets(assignee_id);

-- Ticket comments
CREATE TABLE public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_ticket ON public.ticket_comments(ticket_id);

-- Helper functions (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _org_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_org(_user_id UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND organization_id = _org_id
  )
$$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- Organizations: members can view their org; anyone authenticated can create one
CREATE POLICY "members view their org" ON public.organizations
FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), id));

CREATE POLICY "authenticated can create org" ON public.organizations
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "admins update their org" ON public.organizations
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), id, 'admin'));

-- Profiles: users see their own + others in same org
CREATE POLICY "view own profile" ON public.profiles
FOR SELECT TO authenticated USING (id = auth.uid() OR organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "insert own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (id = auth.uid());

-- User roles: members can view roles in their org; admins manage
CREATE POLICY "view org roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "insert role self bootstrap" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), organization_id, 'admin'))
WITH CHECK (public.has_role(auth.uid(), organization_id, 'admin'));

-- Tickets: scoped to org membership
CREATE POLICY "org members view tickets" ON public.tickets
FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org members create tickets" ON public.tickets
FOR INSERT TO authenticated
WITH CHECK (public.is_org_member(auth.uid(), organization_id) AND requester_id = auth.uid());

CREATE POLICY "agents and admins update tickets" ON public.tickets
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), organization_id, 'admin')
  OR public.has_role(auth.uid(), organization_id, 'agent')
  OR requester_id = auth.uid()
);

CREATE POLICY "admins delete tickets" ON public.tickets
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), organization_id, 'admin'));

-- Comments: org members; internal comments hidden from customers
CREATE POLICY "view comments in org" ON public.ticket_comments
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
      AND public.is_org_member(auth.uid(), t.organization_id)
      AND (
        is_internal = false
        OR public.has_role(auth.uid(), t.organization_id, 'admin')
        OR public.has_role(auth.uid(), t.organization_id, 'agent')
      )
  )
);

CREATE POLICY "create comments in org" ON public.ticket_comments
FOR INSERT TO authenticated WITH CHECK (
  author_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id AND public.is_org_member(auth.uid(), t.organization_id)
  )
);
