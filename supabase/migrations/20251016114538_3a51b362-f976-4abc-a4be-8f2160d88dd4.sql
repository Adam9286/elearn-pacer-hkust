-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'text/plain']
);

-- Policy: Anyone can view public files
CREATE POLICY "Public files are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

-- Policy: Anyone can upload files (since this is a learning tool)
CREATE POLICY "Anyone can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments');

-- Policy: Anyone can delete files from chat-attachments
CREATE POLICY "Anyone can delete chat attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-attachments');