-- Allow generic alert rules and seed a default notification for pending approvals

BEGIN;

ALTER TABLE alert_rules
  DROP CONSTRAINT IF EXISTS alert_rules_target_check;

ALTER TABLE alert_rules
  ADD CONSTRAINT alert_rules_target_check
  CHECK (target IN ('subscription', 'tokens', 'general'));

INSERT INTO alert_rules (
  name,
  description,
  trigger_type,
  target,
  comparator,
  threshold,
  severity,
  message_template,
  applies_to_role,
  is_blocking,
  is_active,
  metadata
)
VALUES (
  'Compte en attente d''approbation',
  'Alerte affichée aux utilisateurs tant que leur compte n''est pas activé.',
  'login',
  'general',
  '=',
  0,
  'warning',
  'Bonjour {{user_name}}, votre compte est en cours d''approbation. Vous recevrez un email dès son activation.',
  'any',
  true,
  true,
  jsonb_build_object('statusFilter', to_jsonb(ARRAY['inactive']))
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  trigger_type = EXCLUDED.trigger_type,
  target = EXCLUDED.target,
  comparator = EXCLUDED.comparator,
  threshold = EXCLUDED.threshold,
  severity = EXCLUDED.severity,
  message_template = EXCLUDED.message_template,
  applies_to_role = EXCLUDED.applies_to_role,
  is_blocking = EXCLUDED.is_blocking,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

COMMIT;
