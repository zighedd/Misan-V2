-- Nettoyage des anciennes clés tarifaires dupliquées
-- Ce script supprime les entrées obsolètes dans system_settings et kv_store_810b4099
-- afin que seules les clés utilisées par l'interface d'administration restent actives.

DELETE FROM system_settings
WHERE key IN (
  'monthly_subscription_price',
  'monthly_subscription_tokens',
  'monthly_subscription_currency',
  'tokens_price_per_million',
  'tokens_currency',
  'tokens_discounts',
  'vat_enabled',
  'tax_rate'
);

DELETE FROM kv_store_810b4099
WHERE key IN (
  'system_setting:monthly_subscription_price',
  'system_setting:monthly_subscription_tokens',
  'system_setting:monthly_subscription_currency',
  'system_setting:tokens_price_per_million',
  'system_setting:tokens_currency',
  'system_setting:tokens_discounts',
  'system_setting:vat_enabled',
  'system_setting:tax_rate'
);
