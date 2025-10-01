-- Autoriser les utilisateurs à créer leurs propres transactions (paiement virement, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transactions'
      AND policyname = 'Users can insert their own transactions'
  ) THEN
    CREATE POLICY "Users can insert their own transactions" ON transactions
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
