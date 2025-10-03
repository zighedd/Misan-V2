-- Autoriser la lecture publique des paramètres tarifaires
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_settings') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'system_settings'
        AND policyname = 'Public pricing read'
    ) THEN
      CREATE POLICY "Public pricing read" ON system_settings
        FOR SELECT
        USING (
          key LIKE 'pricing_%'
          OR key IN ('trial_duration_days', 'trial_tokens', 'trial_enabled')
        );
    END IF;
  END IF;
END;
$$;
