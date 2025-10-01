-- Add missing template for account deletion notifications

INSERT INTO email_templates (name, subject, recipients, body, cc, bcc, is_active)
VALUES (
  'Confirmation suppression compte',
  'Confirmation de suppression de votre compte Moualimy',
  'user',
  $$Bonjour {{user_name}},

Nous vous confirmons que votre compte Moualimy a été supprimé et que vous n'avez plus accès à la plateforme.

Si vous pensez qu'il s'agit d'une erreur ou souhaitez rouvrir un compte, contactez-nous à {{support_email}}.

Merci d'avoir utilisé nos services.$$,
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  TRUE
)
ON CONFLICT (name) DO NOTHING;
