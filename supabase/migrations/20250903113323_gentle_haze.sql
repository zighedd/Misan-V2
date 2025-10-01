-- Script d'initialisation rapide pour Misan
-- Copiez et collez ce script dans Supabase Dashboard → SQL Editor → New Query

-- ============================================
-- ÉTAPE 1: CRÉER LA TABLE PRINCIPALE KV_STORE
-- ============================================

-- Supprimer la table si elle existe (pour recommencer proprement)
DROP TABLE IF EXISTS kv_store_810b4099 CASCADE;

-- Créer la table KV store principale
CREATE TABLE kv_store_810b4099 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Créer l'index sur la clé pour optimiser les recherches
CREATE INDEX idx_kv_store_810b4099_key ON kv_store_810b4099(key);

-- ============================================
-- ÉTAPE 2: CONFIGURER LA SÉCURITÉ (RLS)
-- ============================================

-- Activer Row Level Security
ALTER TABLE kv_store_810b4099 ENABLE ROW LEVEL SECURITY;

-- Politique pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can manage kv_store data"
  ON kv_store_810b4099
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Politique pour le service role (serveur)
CREATE POLICY "Service role has full access to kv_store"
  ON kv_store_810b4099
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- ÉTAPE 3: CRÉER LES TRIGGERS
-- ============================================

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_kv_store_810b4099_updated_at
  BEFORE UPDATE ON kv_store_810b4099
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ÉTAPE 4: INITIALISER LES PARAMÈTRES SYSTÈME
-- ============================================

-- Paramètres de base pour l'application
INSERT INTO kv_store_810b4099 (key, value) VALUES
('system_setting:trial_duration_days', '{"value": "7", "description": "Durée essai gratuit en jours"}'),
('system_setting:trial_tokens_amount', '{"value": "100000", "description": "Jetons pour essai gratuit"}'),
('system_setting:monthly_subscription_price', '{"value": "4000", "description": "Prix abonnement mensuel DA HT"}'),
('system_setting:app_version', '{"value": "1.0.0", "description": "Version de l''application"}'),
('system_setting:support_email', '{"value": "support@misan.dz", "description": "Email de support"}'),
('system_setting:company_name', '{"value": "Misan Technologies", "description": "Nom de l''entreprise"}')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- ============================================
-- ÉTAPE 5: CRÉER L'UTILISATEUR ADMIN
-- ============================================

-- Note: L'utilisateur admin sera créé automatiquement par l'application
-- lors de la première utilisation du bouton "Initialiser la base de données"

-- ============================================
-- VÉRIFICATION FINALE
-- ============================================

-- Vérifier que la table a été créée
SELECT 
  'Table kv_store_810b4099 créée avec succès !' as message,
  COUNT(*) as parametres_systeme
FROM kv_store_810b4099 
WHERE key LIKE 'system_setting:%';

-- Afficher les paramètres créés
SELECT 
  key,
  value->>'value' as valeur,
  value->>'description' as description
FROM kv_store_810b4099 
WHERE key LIKE 'system_setting:%'
ORDER BY key;

-- Message de fin
SELECT 'Base de données Misan initialisée ! Vous pouvez maintenant utiliser l''application.' as resultat;