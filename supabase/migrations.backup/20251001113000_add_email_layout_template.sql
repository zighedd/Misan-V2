-- Seed a branded email layout template so admins can dupliquer un design cohérent

INSERT INTO email_templates (name, subject, recipients, body, cc, bcc, is_active, metadata)
VALUES (
  'modèle-de-sortie-email',
  'Modèle d''email Moualimy',
  'user',
  $$<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{subject}}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6fb;
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
    }
    a {
      color: #2563eb;
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:28px 32px; background:linear-gradient(135deg, #1e3a8a, #2563eb); color:#f8fafc;">
              <span style="text-transform:uppercase; letter-spacing:0.08em; font-size:12px; color:#c7d2fe;">Moualimy</span>
              <h1 style="margin:12px 0 0; font-size:26px; line-height:1.2; font-weight:600; color:#f8fafc;">{{headline}}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px; font-size:16px; line-height:1.6;">Bonjour {{user_name}},</p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#475569;">{{intro}}</p>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#1f2937;">{{body_text}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background-color:#2563eb; border-radius:999px;">
                    <a href="{{cta_url}}" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 24px;">
                <tr>
                  <td style="padding:18px 20px; border:1px solid #e2e8f0; border-radius:12px; background-color:#f8fafc;">
                    <p style="margin:0; font-size:14px; font-weight:600; color:#0f172a;">Points clés</p>
                    <p style="margin:8px 0 0; font-size:14px; line-height:1.6; color:#475569;">{{summary}}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#64748b;">Besoin d'assistance ? Contactez-nous sur <a href="mailto:support@moualimy.com" style="color:#2563eb; text-decoration:none;">support@moualimy.com</a>.</p>
              <p style="margin:0; font-size:14px; line-height:1.6; color:#0f172a;">Bien cordialement,<br />{{signature}}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0f172a; padding:24px 32px; text-align:center; color:#cbd5f5;">
              <p style="margin:0 0 8px; font-size:12px; letter-spacing:0.06em; text-transform:uppercase;">Moualimy</p>
              <p style="margin:0; font-size:12px; line-height:1.6;">{{footer_links}}</p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0; font-size:11px; color:#94a3b8;">Vous recevez cet email car votre adresse est enregistrée sur Moualimy.</p>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  TRUE,
  jsonb_build_object(
    'category', 'layout',
    'description', 'Template HTML stylisé servant de base à dupliquer pour les communications Moualimy',
    'placeholders', jsonb_build_array('headline', 'intro', 'body_text', 'cta_label', 'cta_url', 'summary', 'footer_links', 'signature')
  )
)
ON CONFLICT (name) DO UPDATE SET
  subject = EXCLUDED.subject,
  recipients = EXCLUDED.recipients,
  body = EXCLUDED.body,
  cc = EXCLUDED.cc,
  bcc = EXCLUDED.bcc,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();
