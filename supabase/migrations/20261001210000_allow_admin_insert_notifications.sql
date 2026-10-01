-- ============================================
-- MyPass360 — Allow admin/service to insert notifications for any user
-- Created: 2026-10-01
-- By default RLS only allows users to insert their own notifications.
-- This migration adds a policy that allows any authenticated user (admin)
-- to INSERT notifications targeting other users, which is required for
-- the "Notify Organizer" button in the admin financial panel.
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
    AND policyname = 'Authenticated users can insert notifications for others'
  ) THEN
    CREATE POLICY "Authenticated users can insert notifications for others"
      ON public.notifications
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;
