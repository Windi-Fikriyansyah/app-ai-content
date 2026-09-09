-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: Onboarding Schema (Workspaces, Business Profile, Brand Kit)
-- ═══════════════════════════════════════════════════════════════════

-- 1. WORKSPACES
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  timezone TEXT DEFAULT 'Asia/Jakarta',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workspaces"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own workspaces"
  ON public.workspaces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own workspaces"
  ON public.workspaces FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);


-- 2. BUSINESS PROFILES
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  location TEXT,
  website TEXT,
  whatsapp TEXT,
  target_audience TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view business profile of their workspaces"
  ON public.business_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = business_profiles.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert business profile in their workspaces"
  ON public.business_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = business_profiles.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update business profile in their workspaces"
  ON public.business_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = business_profiles.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );


-- 3. PRODUCTS & SERVICES
CREATE TABLE IF NOT EXISTS public.products_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price TEXT,
  description TEXT,
  benefits TEXT,
  type TEXT DEFAULT 'product',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.products_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage products_services of their business profiles"
  ON public.products_services FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles
      JOIN public.workspaces ON workspaces.id = business_profiles.workspace_id
      WHERE business_profiles.id = products_services.business_profile_id
      AND workspaces.owner_id = auth.uid()
    )
  );


-- 4. PROMOTIONS
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  discount TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage promotions of their business profiles"
  ON public.promotions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles
      JOIN public.workspaces ON workspaces.id = business_profiles.workspace_id
      WHERE business_profiles.id = promotions.business_profile_id
      AND workspaces.owner_id = auth.uid()
    )
  );


-- 5. BRAND KITS
CREATE TABLE IF NOT EXISTS public.brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#4F46E5',
  secondary_color TEXT DEFAULT '#06B6D4',
  visual_style TEXT DEFAULT 'Modern',
  writing_tone TEXT DEFAULT 'Friendly',
  language TEXT DEFAULT 'Bahasa Indonesia',
  emoji_usage TEXT DEFAULT 'Medium',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage brand_kits of their workspaces"
  ON public.brand_kits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = brand_kits.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );
