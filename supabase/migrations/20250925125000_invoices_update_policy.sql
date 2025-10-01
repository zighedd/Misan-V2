-- Permettre aux utilisateurs de mettre à jour leurs propres factures (paiement, notes...) 
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invoices'
      AND policyname = 'Users can update their own invoices'
  ) THEN
    CREATE POLICY "Users can update their own invoices" ON invoices
      FOR UPDATE
      USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid()
            AND role = 'admin'
        )
      )
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
