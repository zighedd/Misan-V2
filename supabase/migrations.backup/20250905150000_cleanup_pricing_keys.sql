-- Nettoyage des anciennes clés tarifaires dupliquées
-- Ce script supprime les entrées obsolètes dans system_settings et kv_store_810b4099
-- afin que seules les clés utilisées par l'interface d'administration restent actives.

-- Suppression seulement si la table existe
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_settings') THEN
    DELETE FROM system_settings
    WHERE key IN (
      'tokens_pack_50k_price',
      'tokens_pack_100k_price', 
      'tokens_pack_250k_price',
      'tokens_pack_500k_price'
    );
  END IF;
END $$;
