import { UserInfo } from '../types';

export interface AccessControlResult {
  canAccessAI: boolean;
  canUseAgent: boolean;
  canUseLLM: boolean;
  canCreateDocuments: boolean;
  reason?: string;
  tokensRequired?: number;
  upgradeRequired?: boolean;
}

// Fonction principale de contrôle d'accès
export const checkUserAccess = (user: UserInfo, tokensRequired: number = 0): AccessControlResult => {
  // Admin : accès illimité à tout
  if (user.role === 'admin') {
    return {
      canAccessAI: true,
      canUseAgent: true,
      canUseLLM: true,
      canCreateDocuments: true,
      reason: 'Accès administrateur illimité'
    };
  }

  if (user.subscriptionStatus && user.subscriptionStatus !== 'active') {
    const statusMessages: Record<string, string> = {
      inactive: 'Votre compte est en cours d\'approbation par un administrateur.',
      expired: 'Votre abonnement est expiré.'
    };

    return {
      canAccessAI: false,
      canUseAgent: false,
      canUseLLM: false,
      canCreateDocuments: false,
      reason: statusMessages[user.subscriptionStatus] || 'Compte non actif',
      upgradeRequired: user.subscriptionStatus === 'expired'
    };
  }

  // Vérifier le statut d'abonnement
  const now = new Date();
  let isSubscriptionActive = true;

  if (user.subscriptionEnd) {
    const parsedEnd = new Date(user.subscriptionEnd);
    if (!Number.isNaN(parsedEnd.getTime())) {
      isSubscriptionActive = parsedEnd > now;
    }
  }

  // Abonnement expiré
  if (!isSubscriptionActive) {
    return {
      canAccessAI: false,
      canUseAgent: false,
      canUseLLM: false,
      canCreateDocuments: false,
      reason: 'Abonnement expiré',
      upgradeRequired: true
    };
  }

  // Jetons insuffisants
  if (user.tokens < tokensRequired) {
    return {
      canAccessAI: false,
      canUseAgent: false,
      canUseLLM: false,
      canCreateDocuments: false,
      reason: 'Jetons insuffisants',
      tokensRequired,
      upgradeRequired: true
    };
  }

  // Accès autorisé
  return {
    canAccessAI: true,
    canUseAgent: true,
    canUseLLM: true,
    canCreateDocuments: true,
    reason: 'Accès autorisé'
  };
};

// Fonction pour vérifier l'accès à un agent spécifique
export const checkAgentAccess = (user: UserInfo, agentType: string): AccessControlResult => {
  const baseAccess = checkUserAccess(user);
  
  if (!baseAccess.canAccessAI) {
    return baseAccess;
  }
  return baseAccess;
};

// Fonction pour vérifier l'accès à un modèle LLM
export const checkLLMAccess = (user: UserInfo, llmType: string): AccessControlResult => {
  const baseAccess = checkUserAccess(user);
  
  if (!baseAccess.canAccessAI) {
    return baseAccess;
  }
  return baseAccess;
};

// Fonction pour calculer le coût en jetons d'une action
export const calculateTokenCost = (actionType: string, contentLength: number = 0): number => {
  const baseCosts = {
    'chat': 10,
    'document_generation': 50,
    'analysis': 30,
    'correction': 20,
    'translation': 25,
    'creative': 40
  };

  const baseCost = baseCosts[actionType as keyof typeof baseCosts] || 10;
  
  // Ajuster selon la longueur du contenu
  const lengthMultiplier = Math.max(1, Math.ceil(contentLength / 1000));
  
  return baseCost * lengthMultiplier;
};

// Fonction pour vérifier et consommer des jetons
export const consumeTokens = async (
  user: UserInfo, 
  actionType: string, 
  contentLength: number = 0
): Promise<{ success: boolean; tokensConsumed: number; remainingTokens: number; error?: string }> => {
  
  // Admin : pas de consommation
  if (user.role === 'admin') {
    return {
      success: true,
      tokensConsumed: 0,
      remainingTokens: user.tokens,
      error: undefined
    };
  }

  const tokensRequired = calculateTokenCost(actionType, contentLength);
  const access = checkUserAccess(user, tokensRequired);

  if (!access.canAccessAI) {
    return {
      success: false,
      tokensConsumed: 0,
      remainingTokens: user.tokens,
      error: access.reason
    };
  }

  // Simuler la consommation (en réalité, ceci devrait appeler l'API)
  const newBalance = user.tokens - tokensRequired;

  return {
    success: true,
    tokensConsumed: tokensRequired,
    remainingTokens: newBalance
  };
};

// Fonction pour générer un message d'erreur d'accès
export const getAccessErrorMessage = (result: AccessControlResult, t: any): string => {
  if (result.reason === 'Abonnement expiré') {
    return t.subscriptionExpiredMessage || 'Votre abonnement a expiré. Souscrivez à un abonnement Pro pour continuer.';
  }
  
  if (result.reason === 'Jetons insuffisants') {
    return t.insufficientTokensMessage || `Jetons insuffisants. ${result.tokensRequired} jetons requis.`;
  }
  
  if (result.reason?.includes('premium')) {
    return t.premiumFeatureMessage || 'Fonctionnalité premium. Abonnement Pro requis.';
  }
  
  return result.reason || 'Accès non autorisé';
};
