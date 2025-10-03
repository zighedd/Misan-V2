-- Permettre aux utilisateurs d'insérer leurs propres factures via PostgREST
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invoices'
      AND policyname = 'Users can insert their own invoices'
  ) THEN
    CREATE POLICY "Users can insert their own invoices" ON invoices
      FOR INSERT
      WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid()
            AND role = 'admin'
        )
      );
  END IF;
END;
$$;
