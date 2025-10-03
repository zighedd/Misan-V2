-- Create table for configurable alert rules
-- Allows admins to manage alert thresholds for subscriptions and token balances

BEGIN;

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('login', 'assistant_access', 'scheduled')) DEFAULT 'scheduled',
  target TEXT NOT NULL CHECK (target IN ('subscription', 'tokens')),
  comparator TEXT NOT NULL CHECK (comparator IN ('<', '<=', '=', '>=', '>')),
  threshold INTEGER NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  message_template TEXT NOT NULL,
  applies_to_role TEXT NOT NULL CHECK (applies_to_role IN ('pro', 'premium', 'any')) DEFAULT 'any',
  is_blocking BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep alert names unique to avoid duplicates in UI
CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_rules_name ON alert_rules (name);

-- Automatically refresh updated_at
CREATE OR REPLACE FUNCTION set_alert_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_alert_rules_updated_at ON alert_rules;
CREATE TRIGGER update_alert_rules_updated_at
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW EXECUTE FUNCTION set_alert_rules_updated_at();

-- RLS configuration
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage alert rules" ON alert_rules;
CREATE POLICY "Admins manage alert rules" ON alert_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Seed with existing thresholds to keep behaviour consistent after migration
INSERT INTO alert_rules (name, description, trigger_type, target, comparator, threshold, severity, message_template, applies_to_role, is_blocking)
VALUES
  ('Abonnement Pro - 20 jours', 'Alerte lorsque la fin d''abonnement pro approche (20 jours).', 'scheduled', 'subscription', '=', 20, 'info', 'Votre abonnement Pro expire dans {{days}} jours.', 'pro', false),
  ('Abonnement Pro - 7 jours', 'Alerte lorsque la fin d''abonnement pro approche (7 jours).', 'scheduled', 'subscription', '=', 7, 'warning', 'Votre abonnement Pro expire dans {{days}} jours.', 'pro', false),
  ('Abonnement Pro - 2 jours', 'Alerte lorsque la fin d''abonnement pro approche (2 jours).', 'scheduled', 'subscription', '=', 2, 'error', 'Votre abonnement Pro expire dans {{days}} jours !', 'pro', true),
  ('Abonnement Premium - 5 jours', 'Alerte lorsque la fin de l''essai premium approche (5 jours).', 'scheduled', 'subscription', '=', 5, 'info', 'Votre essai gratuit se termine dans {{days}} jours.', 'premium', false),
  ('Abonnement Premium - 3 jours', 'Alerte lorsque la fin de l''essai premium approche (3 jours).', 'scheduled', 'subscription', '=', 3, 'warning', 'Votre essai gratuit se termine dans {{days}} jours.', 'premium', false),
  ('Abonnement Premium - 2 jours', 'Alerte lorsque la fin de l''essai premium approche (2 jours).', 'scheduled', 'subscription', '=', 2, 'warning', 'Votre essai gratuit se termine dans {{days}} jours.', 'premium', false),
  ('Abonnement Premium - 0 jour', 'Alerte lorsque l''essai premium se termine.', 'scheduled', 'subscription', '=', 0, 'error', 'Votre essai gratuit a expiré. Passez à un abonnement Pro.', 'premium', true),
  ('Jetons Pro - 100k', 'Alerte lorsque le solde de jetons Pro passe sous 100 000.', 'scheduled', 'tokens', '<=', 100000, 'info', 'Il vous reste {{tokens}} jetons.', 'pro', false),
  ('Jetons Pro - 50k', 'Alerte lorsque le solde de jetons Pro passe sous 50 000.', 'scheduled', 'tokens', '<=', 50000, 'warning', 'Il vous reste {{tokens}} jetons. Pensez à recharger.', 'pro', false),
  ('Jetons Pro - 0', 'Alerte lorsque le solde de jetons Pro est épuisé.', 'scheduled', 'tokens', '<=', 0, 'error', 'Votre solde de jetons est épuisé.', 'pro', true),
  ('Jetons Premium - 50k', 'Alerte lorsque le solde de jetons Premium passe sous 50 000.', 'scheduled', 'tokens', '<=', 50000, 'info', 'Il vous reste {{tokens}} jetons d''essai.', 'premium', false),
  ('Jetons Premium - 25k', 'Alerte lorsque le solde de jetons Premium passe sous 25 000.', 'scheduled', 'tokens', '<=', 25000, 'warning', 'Il vous reste {{tokens}} jetons d''essai. Pensez à recharger.', 'premium', false),
  ('Jetons Premium - 0', 'Alerte lorsque le solde de jetons Premium est épuisé.', 'scheduled', 'tokens', '<=', 0, 'error', 'Votre solde de jetons d''essai est épuisé.', 'premium', true)
ON CONFLICT (name) DO NOTHING;

COMMIT;
