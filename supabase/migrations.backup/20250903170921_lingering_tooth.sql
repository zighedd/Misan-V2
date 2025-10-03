/*
  # Initialisation complète de la base de données Misan
  
  1. Fonctions de création des tables
  2. Tables principales (user_profiles, subscriptions, transactions, alerts, etc.)
  3. Politiques RLS pour la sécurité
  4. Triggers et fonctions utilitaires
  5. Paramètres système par défaut
*/

-- Fonction pour créer la table des profils utilisateurs
CREATE OR REPLACE FUNCTION create_user_profiles_table()
RETURNS TEXT AS $$
BEGIN
  -- Table des profils utilisateurs (étend auth.users)
  CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'premium' CHECK (role IN ('admin', 'pro', 'premium')),
    subscription_type TEXT NOT NULL DEFAULT 'premium' CHECK (subscription_type IN ('admin', 'pro', 'premium')),
    subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'expired')),
    subscription_start TIMESTAMPTZ DEFAULT NOW(),
    subscription_end TIMESTAMPTZ,
    tokens_balance INTEGER NOT NULL DEFAULT 0,
    trial_used BOOLEAN NOT NULL DEFAULT FALSE,
    avatar_url TEXT,
    secondary_email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT,
    billing_address TEXT,
    billing_city TEXT,
    billing_postal_code TEXT,
    billing_country TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Index pour optimiser les requêtes
  CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
  CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
  CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);

  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS secondary_email TEXT;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS address TEXT;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS city TEXT;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country TEXT;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS billing_address TEXT;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS billing_city TEXT;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS billing_postal_code TEXT;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS billing_country TEXT;

  -- Politique RLS pour la sécurité
  ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

  -- Politique : les utilisateurs peuvent voir leur propre profil
  DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
  CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

  -- Politique : les utilisateurs peuvent modifier leur propre profil
  DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
  CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

  -- Politique : les admins peuvent tout voir
  DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
  CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
    );

  -- Politique : permettre l'insertion pour les nouveaux utilisateurs
  DROP POLICY IF EXISTS "Allow insert for new users" ON user_profiles;
  CREATE POLICY "Allow insert for new users" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

  RETURN 'Table user_profiles créée avec succès';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer la table des abonnements
CREATE OR REPLACE FUNCTION create_subscriptions_table()
RETURNS TEXT AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('admin', 'pro', 'premium')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'cancelled')),
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    tokens_included INTEGER NOT NULL DEFAULT 0,
    is_trial BOOLEAN NOT NULL DEFAULT FALSE,
    payment_method TEXT CHECK (payment_method IN ('card', 'bank_transfer', 'free')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled')),
    amount_da INTEGER DEFAULT 0, -- Montant en dinars algériens
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Index pour optimiser les requêtes
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);

  -- Politique RLS
  ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
  CREATE POLICY "Users can view their own subscriptions" ON subscriptions
    FOR SELECT USING (
      user_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

  DROP POLICY IF EXISTS "Allow insert subscriptions" ON subscriptions;
  CREATE POLICY "Allow insert subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (user_id = auth.uid());

  RETURN 'Table subscriptions créée avec succès';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer la table des transactions
CREATE OR REPLACE FUNCTION create_transactions_table()
RETURNS TEXT AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('subscription', 'tokens', 'refund')),
    description TEXT NOT NULL,
    amount_da INTEGER NOT NULL, -- Montant en dinars algériens
    tokens_amount INTEGER DEFAULT 0, -- Nombre de jetons si applicable
    payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'bank_transfer', 'free', 'admin')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
    reference_id TEXT, -- Référence externe (ID transaction bancaire, etc.)
    subscription_id UUID REFERENCES subscriptions(id),
    processed_by UUID REFERENCES auth.users(id), -- Admin qui a traité la transaction
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Index pour optimiser les requêtes
  CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
  CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
  CREATE INDEX IF NOT EXISTS idx_transactions_reference_id ON transactions(reference_id);

  -- Politique RLS
  ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
  CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (
      user_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

  RETURN 'Table transactions créée avec succès';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer la table des alertes
CREATE OR REPLACE FUNCTION create_alerts_table()
RETURNS TEXT AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS user_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('subscription', 'tokens', 'payment', 'system')),
    level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Index pour optimiser les requêtes
  CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON user_alerts(user_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON user_alerts(is_read);
  CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON user_alerts(created_at);

  -- Politique RLS
  ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view their own alerts" ON user_alerts;
  CREATE POLICY "Users can view their own alerts" ON user_alerts
    FOR SELECT USING (user_id = auth.uid());

  DROP POLICY IF EXISTS "Users can update their own alerts" ON user_alerts;
  CREATE POLICY "Users can update their own alerts" ON user_alerts
    FOR UPDATE USING (user_id = auth.uid());

  DROP POLICY IF EXISTS "Allow insert alerts" ON user_alerts;
  CREATE POLICY "Allow insert alerts" ON user_alerts
    FOR INSERT WITH CHECK (true); -- Permet aux fonctions d'insérer des alertes

  RETURN 'Table user_alerts créée avec succès';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer la table des paramètres système
CREATE OR REPLACE FUNCTION create_settings_table()
RETURNS TEXT AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Politique RLS
  ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

  -- Seuls les admins peuvent gérer les paramètres
  DROP POLICY IF EXISTS "Only admins can manage settings" ON system_settings;
  CREATE POLICY "Only admins can manage settings" ON system_settings
    FOR ALL USING (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

  -- Permettre l'insertion pour l'initialisation
  DROP POLICY IF EXISTS "Allow settings insert" ON system_settings;
  CREATE POLICY "Allow settings insert" ON system_settings
    FOR INSERT WITH CHECK (true);

  RETURN 'Table system_settings créée avec succès';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer la table des logs d'utilisation IA
CREATE OR REPLACE FUNCTION create_ai_usage_logs_table()
RETURNS TEXT AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('chat', 'document_generation', 'analysis', 'search')),
    tokens_consumed INTEGER NOT NULL DEFAULT 0,
    input_length INTEGER DEFAULT 0,
    output_length INTEGER DEFAULT 0,
    model_used TEXT,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB, -- Informations supplémentaires
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Index pour optimiser les requêtes
  CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_ai_usage_action_type ON ai_usage_logs(action_type);

  -- Politique RLS
  ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view their own usage logs" ON ai_usage_logs;
  CREATE POLICY "Users can view their own usage logs" ON ai_usage_logs
    FOR SELECT USING (
      user_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

  DROP POLICY IF EXISTS "Allow insert usage logs" ON ai_usage_logs;
  CREATE POLICY "Allow insert usage logs" ON ai_usage_logs
    FOR INSERT WITH CHECK (true);

  RETURN 'Table ai_usage_logs créée avec succès';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers pour updated_at
CREATE OR REPLACE FUNCTION create_updated_at_triggers()
RETURNS TEXT AS $$
BEGIN
  -- Trigger pour user_profiles
  DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
  CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- Trigger pour subscriptions
  DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
  CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- Trigger pour transactions
  DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
  CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- Trigger pour system_settings
  DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
  CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  RETURN 'Triggers updated_at créés avec succès';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier et mettre à jour les abonnements expirés
CREATE OR REPLACE FUNCTION check_and_update_expired_subscriptions()
RETURNS TEXT AS $$
DECLARE
  expired_count INTEGER := 0;
BEGIN
  -- Mettre à jour les profils dont l'abonnement a expiré
  UPDATE user_profiles 
  SET 
    subscription_status = 'expired',
    updated_at = NOW()
  WHERE 
    subscription_end < NOW() 
    AND subscription_status = 'active'
    AND role != 'admin';

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  -- Mettre à jour les abonnements expirés
  UPDATE subscriptions 
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE 
    end_date < NOW() 
    AND status = 'active';

  RETURN 'Abonnements expirés mis à jour: ' || expired_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_automatic_alerts()
RETURNS TEXT AS $$
DECLARE
  alert_count INTEGER := 0;
  user_record RECORD;
  rule_record RECORD;
  days_until_expiry INTEGER;
  metric_value INTEGER;
  matches_condition BOOLEAN;
  alert_message TEXT;
  alert_title TEXT;
  alert_type TEXT;
BEGIN
  FOR user_record IN
    SELECT id, role, tokens_balance, subscription_end
    FROM user_profiles
    WHERE subscription_status = 'active' AND role != 'admin'
  LOOP
    days_until_expiry := NULL;
    IF user_record.subscription_end IS NOT NULL THEN
      days_until_expiry := FLOOR(EXTRACT(EPOCH FROM (user_record.subscription_end - NOW())) / 86400)::INTEGER;
    END IF;

    FOR rule_record IN
      SELECT *
      FROM alert_rules
      WHERE is_active = TRUE
        AND (applies_to_role = 'any' OR applies_to_role = user_record.role)
    LOOP
      metric_value := NULL;
      matches_condition := FALSE;
      alert_type := rule_record.target;

      IF rule_record.target = 'subscription' THEN
        IF days_until_expiry IS NULL THEN
          CONTINUE;
        END IF;
        metric_value := days_until_expiry;
      ELSIF rule_record.target = 'tokens' THEN
        metric_value := user_record.tokens_balance;
      END IF;

      IF metric_value IS NULL THEN
        CONTINUE;
      END IF;

      CASE rule_record.comparator
        WHEN '<' THEN matches_condition := metric_value < rule_record.threshold;
        WHEN '<=' THEN matches_condition := metric_value <= rule_record.threshold;
        WHEN '=' THEN matches_condition := metric_value = rule_record.threshold;
        WHEN '>=' THEN matches_condition := metric_value >= rule_record.threshold;
        WHEN '>' THEN matches_condition := metric_value > rule_record.threshold;
        ELSE matches_condition := FALSE;
      END CASE;

      IF matches_condition THEN
        alert_title := rule_record.name;
        alert_message := rule_record.message_template;
        alert_message := REPLACE(alert_message, '{{days}}', COALESCE(days_until_expiry::TEXT, '0'));
        alert_message := REPLACE(alert_message, '{{tokens}}', GREATEST(user_record.tokens_balance, 0)::TEXT);

        IF NOT EXISTS (
          SELECT 1 FROM user_alerts
          WHERE user_id = user_record.id
            AND type = alert_type
            AND title = alert_title
            AND message = alert_message
            AND is_read = FALSE
        ) THEN
          INSERT INTO user_alerts (user_id, type, level, title, message)
          VALUES (
            user_record.id,
            alert_type,
            rule_record.severity,
            alert_title,
            alert_message
          );
          alert_count := alert_count + 1;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  RETURN 'Alertes générées: ' || alert_count;
END;
$$ LANGUAGE plpgsql;
