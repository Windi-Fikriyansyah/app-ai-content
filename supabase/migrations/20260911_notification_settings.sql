-- MIGRATION: Notification Settings table for user recipient emails
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(150),
  notify_on_publish BOOLEAN DEFAULT true,
  notify_on_fail BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_notification_settings_workspace UNIQUE(workspace_id)
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Policies for Authenticated Users
DROP POLICY IF EXISTS "Users can read own notification settings" ON public.notification_settings;
CREATE POLICY "Users can read own notification settings"
  ON public.notification_settings FOR SELECT
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own notification settings" ON public.notification_settings;
CREATE POLICY "Users can insert own notification settings"
  ON public.notification_settings FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own notification settings" ON public.notification_settings;
CREATE POLICY "Users can update own notification settings"
  ON public.notification_settings FOR UPDATE
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.notification_settings IS 'Pengaturan notifikasi email pengguna untuk event Zernio publishing via Brevo (kredensial dikelola dari environment server)';
