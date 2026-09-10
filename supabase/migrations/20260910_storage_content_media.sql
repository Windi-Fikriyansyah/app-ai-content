-- Storage Bucket for Content Posts Images
-- Bucket name: content-media (Public)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-media',
  'content-media',
  true,
  10485760, -- 10MB max
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

-- Policy: Allow public read access to content-media images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Public Access Content Media'
  ) THEN
    CREATE POLICY "Public Access Content Media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'content-media');
  END IF;
END $$;

-- Policy: Allow service_role and authenticated users to upload images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow Upload Content Media'
  ) THEN
    CREATE POLICY "Allow Upload Content Media"
    ON storage.objects FOR INSERT
    TO authenticated, service_role
    WITH CHECK (bucket_id = 'content-media');
  END IF;
END $$;

-- Policy: Allow service_role and authenticated users to update images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow Update Content Media'
  ) THEN
    CREATE POLICY "Allow Update Content Media"
    ON storage.objects FOR UPDATE
    TO authenticated, service_role
    USING (bucket_id = 'content-media');
  END IF;
END $$;
