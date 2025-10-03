-- Create table to manage email templates

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  recipients TEXT NOT NULL CHECK (recipients IN ('user', 'admin', 'both')),
  cc TEXT[] DEFAULT ARRAY[]::TEXT[],
  bcc TEXT[] DEFAULT ARRAY[]::TEXT[],
  body TEXT NOT NULL,
  signature TEXT NOT NULL DEFAULT 'L''équipe Moualimy\nVous accompagne dans votre réussite',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION set_email_templates_updated_at();

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage email templates" ON email_templates;
CREATE POLICY "Admins manage email templates" ON email_templates
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

INSERT INTO email_templates (name, subject, recipients, body, cc, bcc, is_active)
VALUES
  (
    'Inscription',
    'Bienvenue sur Moualimy',
    'both',
    $$Bonjour {{user_name}},

Merci pour votre inscription sur Moualimy. Nous avons bien reçu vos informations ({{user_email}}) et notre équipe validera votre accès dans les plus brefs délais.

Vous recevrez un email de confirmation dès que votre compte sera activé. En attendant, vous pouvez consulter nos offres depuis la page tarifs.

À très vite !$$,
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    TRUE
  ),
  (
    'Confirmation inscription',
    'Votre compte Moualimy est validé',
    'user',
    $$Bonjour {{user_name}},

Votre inscription vient d''être validée par notre équipe.

Vous disposez maintenant d''un accès complet à la plateforme.

Bonne utilisation !$$,
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    TRUE
  ),
  (
    'Confirmation achat',
    'Nous avons bien reçu votre commande',
    'user',
    $$Bonjour {{user_name}},

Votre commande a bien été enregistrée.

Pour finaliser le paiement par virement, merci de suivre les instructions indiquées dans votre espace client.

Nous vous confirmerons la réception du règlement dans les plus brefs délais.$$,
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    TRUE
  ),
  (
    'Confirmation paiement en ligne',
    'Paiement confirmé',
    'user',
    $$Bonjour {{user_name}},

Nous confirmons la réception de votre paiement.

Votre abonnement ou votre pack de jetons est désormais actif.

Merci de votre confiance !$$,
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    TRUE
  ),
  (
    'Réception virement',
    'Nous avons reçu votre virement',
    'user',
    $$Bonjour {{user_name}},

Nous vous informons que votre virement a bien été réceptionné.

Votre accès est maintenant pleinement actif.

Merci pour votre paiement.$$,
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    TRUE
  ),
  (
    'Avertissement suspension',
    'Important : votre compte Moualimy',
    'user',
    $$Bonjour {{user_name}},

Nous constatons que votre compte présente un incident.

Merci de régulariser votre situation afin d''éviter la suspension ou la suppression de votre accès.

Contactez-nous si vous avez besoin d''assistance.$$,
    ARRAY[]::TEXT[],
    ARRAY['admin@moualimy.com']::TEXT[],
    TRUE
  ),
  (
    'Confirmation suppression compte',
    'Confirmation de suppression de votre compte Moualimy',
    'user',
    $$Bonjour {{user_name}},

Nous vous confirmons que votre compte Moualimy a été supprimé et que vous n''avez plus accès à la plateforme.

Si vous pensez qu''il s''agit d''une erreur ou souhaitez rouvrir un compte, contactez-nous à {{support_email}}.

Merci d''avoir utilisé nos services.$$,
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    TRUE
  ),
  (
    'Relance paiement',
    'Relance : paiement en attente',
    'user',
    $$Bonjour {{user_name}},

Nous revenons vers vous concernant le paiement de votre commande toujours en attente.

Sans règlement sous 48h, nous serons contraints de suspendre l''accès au service.

Merci de votre rapidité.$$,
    ARRAY[]::TEXT[],
    ARRAY['admin@moualimy.com']::TEXT[],
    TRUE
  );
