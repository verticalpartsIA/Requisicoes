-- Migration 008: Create travel-docs storage bucket for traveler document photos

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'travel-docs',
  'travel-docs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload travel docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'travel-docs');

CREATE POLICY "Authenticated users can read travel docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'travel-docs');
