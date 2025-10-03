-- Update inscription email template to notify user and admins simultaneously

UPDATE email_templates
SET 
  recipients = 'both',
  body = $$Bonjour {{user_name}},

Merci pour votre inscription sur Moualimy. Nous avons bien reçu vos informations ({{user_email}}) et notre équipe validera votre accès dans les plus brefs délais.

Vous recevrez un email de confirmation dès que votre compte sera activé. En attendant, vous pouvez consulter nos offres depuis la page tarifs.

À très vite !$$,
  updated_at = NOW()
WHERE name = 'Inscription';
