-- ==============================================================================
-- Migração: Criação do Bucket de Storage para Fotos dos Eventos (events)
-- ==============================================================================

-- 1. Criar o bucket 'events' caso ainda não exista
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'events',
  'events',
  true,
  10485760, -- 10MB limite
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Políticas de Segurança (RLS) para o bucket 'events'

-- Permitir que qualquer pessoa visualize as imagens públicas de eventos
DROP POLICY IF EXISTS "Public Access Events Cover" ON storage.objects;
CREATE POLICY "Public Access Events Cover"
ON storage.objects FOR SELECT
USING (bucket_id = 'events');

-- Permitir upload apenas para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can upload event covers" ON storage.objects;
CREATE POLICY "Authenticated users can upload event covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'events');

-- Permitir atualização apenas para o usuário dono da pasta ou organizador autenticado
DROP POLICY IF EXISTS "Users can update their own event covers" ON storage.objects;
CREATE POLICY "Users can update their own event covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'events' AND (auth.uid())::text = (storage.foldername(name))[2]);

-- Permitir exclusão apenas para o usuário dono da pasta
DROP POLICY IF EXISTS "Users can delete their own event covers" ON storage.objects;
CREATE POLICY "Users can delete their own event covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'events' AND (auth.uid())::text = (storage.foldername(name))[2]);

-- 3. Garantir coluna image_url na tabela events
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url text;

-- Recarregar cache de schema
NOTIFY pgrst, 'reload schema';
