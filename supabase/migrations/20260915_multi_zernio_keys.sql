-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: Multi-API Key Zernio & Social Accounts Auto-Balancing
-- ═══════════════════════════════════════════════════════════════════

-- 1. Create table zernio_api_keys
CREATE TABLE IF NOT EXISTS public.zernio_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Zernio API Key',
  api_key TEXT NOT NULL,
  profile_id TEXT,
  max_accounts INT NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for rapid workspace lookup
CREATE INDEX IF NOT EXISTS idx_zernio_api_keys_workspace_id
  ON public.zernio_api_keys (workspace_id);

-- Enable RLS
ALTER TABLE public.zernio_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view zernio_api_keys of their workspaces"
  ON public.zernio_api_keys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = zernio_api_keys.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert zernio_api_keys in their workspaces"
  ON public.zernio_api_keys FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = zernio_api_keys.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update zernio_api_keys in their workspaces"
  ON public.zernio_api_keys FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = zernio_api_keys.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete zernio_api_keys in their workspaces"
  ON public.zernio_api_keys FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = zernio_api_keys.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

-- 2. Link social_accounts to zernio_api_keys
ALTER TABLE public.social_accounts
ADD COLUMN IF NOT EXISTS zernio_key_id UUID REFERENCES public.zernio_api_keys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_social_accounts_zernio_key_id
  ON public.social_accounts (zernio_key_id);

-- 3. Add zernio_dispatch_meta to content_posts to record multi-key dispatch results
ALTER TABLE public.content_posts
ADD COLUMN IF NOT EXISTS zernio_dispatch_meta JSONB DEFAULT '[]'::jsonb;

-- 4. Data Migration: Automatically migrate existing workspaces.zernio_api_key into zernio_api_keys
DO $$
DECLARE
  ws RECORD;
  new_key_id UUID;
BEGIN
  FOR ws IN 
    SELECT id, zernio_api_key, zernio_profile_id 
    FROM public.workspaces 
    WHERE zernio_api_key IS NOT NULL AND trim(zernio_api_key) <> ''
  LOOP
    -- Only insert if workspace doesn't already have keys in zernio_api_keys
    IF NOT EXISTS (SELECT 1 FROM public.zernio_api_keys WHERE workspace_id = ws.id) THEN
      INSERT INTO public.zernio_api_keys (workspace_id, label, api_key, profile_id, max_accounts, is_active)
      VALUES (ws.id, 'API Key Utama #1', ws.zernio_api_key, ws.zernio_profile_id, 2, true)
      RETURNING id INTO new_key_id;

      -- Associate existing social accounts to this key
      UPDATE public.social_accounts
      SET zernio_key_id = new_key_id
      WHERE workspace_id = ws.id AND zernio_key_id IS NULL;
    END IF;
  END LOOP;
END $$;
