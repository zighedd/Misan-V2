import { Dispatch, SetStateAction, useMemo } from 'react';

import { Loader2, Plus, Trash2 } from 'lucide-react';

import type { PaymentMethod, PaymentSettings } from '../../../types';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';

interface PaymentMethodsTabProps {
  paymentSettings: PaymentSettings;
  setPaymentSettings: Dispatch<SetStateAction<PaymentSettings>>;
  onSave: () => Promise<void> | void;
  isSaving: boolean;
  isLoading: boolean;
}

type MethodId = PaymentMethod;

type MutableMethodConfig = PaymentSettings['methods'][MethodId];

const methodLabels: Record<MethodId, { title: string; description: string }> = {
  card_cib: {
    title: 'Carte CIB',
    description: 'Acceptez les paiements par carte interbancaire algérienne.'
  },
  mobile_payment: {
    title: 'Paiement mobile',
    description: 'Configurez les paiements via carte Edahabia ou services mobiles.'
  },
  bank_transfer: {
    title: 'Virement bancaire',
    description: 'Fournissez les informations de vos comptes bancaires.'
  },
  card_international: {
    title: 'Carte internationale',
    description: 'Visa, Mastercard et autres cartes internationales.'
  },
  paypal: {
    title: 'PayPal',
    description: 'Paiement via compte PayPal.'
  }
};

function generateBankAccountId(): string {
  return `bank_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureMethodConfig(config?: MutableMethodConfig): MutableMethodConfig {
  return config ?? { enabled: false, label: '', description: '' };
}

export function PaymentMethodsTab({ paymentSettings, setPaymentSettings, onSave, isSaving, isLoading }: PaymentMethodsTabProps) {
  const methodEntries = useMemo(() => Object.entries(paymentSettings.methods) as Array<[MethodId, MutableMethodConfig]>, [paymentSettings.methods]);

  const handleMethodUpdate = (method: MethodId, updates: Partial<MutableMethodConfig>) => {
    setPaymentSettings(prev => {
      const current = ensureMethodConfig(prev.methods[method]);
      return {
        ...prev,
        methods: {
          ...prev.methods,
          [method]: {
            ...current,
            ...updates
          }
        }
      };
    });
  };

  const handleBankAccountChange = (index: number, field: 'label' | 'bankName' | 'accountNumber' | 'iban' | 'swift' | 'notes', value: string) => {
    setPaymentSettings(prev => {
      const current = ensureMethodConfig(prev.methods.bank_transfer);
      const bankAccounts = [...(current.bankAccounts ?? [])];
      bankAccounts[index] = {
        id: bankAccounts[index]?.id ?? generateBankAccountId(),
        ...bankAccounts[index],
        [field]: value
      };

      return {
        ...prev,
        methods: {
          ...prev.methods,
          bank_transfer: {
            ...current,
            bankAccounts
          }
        }
      };
    });
  };

  const handleRemoveBankAccount = (index: number) => {
    setPaymentSettings(prev => {
      const current = ensureMethodConfig(prev.methods.bank_transfer);
      const bankAccounts = (current.bankAccounts ?? []).filter((_, i) => i !== index);
      return {
        ...prev,
        methods: {
          ...prev.methods,
          bank_transfer: {
            ...current,
            bankAccounts
          }
        }
      };
    });
  };

  const handleAddBankAccount = () => {
    setPaymentSettings(prev => {
      const current = ensureMethodConfig(prev.methods.bank_transfer);
      const bankAccounts = [...(current.bankAccounts ?? [])];
      bankAccounts.push({
        id: generateBankAccountId(),
        label: 'Nouveau compte',
        bankName: '',
        accountNumber: '',
        iban: '',
        swift: '',
        notes: ''
      });

      return {
        ...prev,
        methods: {
          ...prev.methods,
          bank_transfer: {
            ...current,
            bankAccounts
          }
        }
      };
    });
  };

  if (isLoading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Chargement des paramètres de paiement...</span>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {methodEntries.map(([method, config]) => {
          const { title, description } = methodLabels[method];

          return (
            <Card key={method}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={config.enabled ? 'default' : 'outline'}>
                      {config.enabled ? 'Activé' : 'Désactivé'}
                    </Badge>
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={(enabled) => handleMethodUpdate(method, { enabled })}
                      className="data-[state=unchecked]:bg-muted data-[state=unchecked]:border data-[state=unchecked]:border-border"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${method}-label`}>Libellé affiché</Label>
                  <Input
                    id={`${method}-label`}
                    value={config.label}
                    onChange={(e) => handleMethodUpdate(method, { label: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${method}-description`}>Description courte</Label>
                  <Textarea
                    id={`${method}-description`}
                    value={config.description ?? ''}
                    onChange={(e) => handleMethodUpdate(method, { description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${method}-instructions`}>Instructions spécifiques</Label>
                  <Textarea
                    id={`${method}-instructions`}
                    value={config.instructions ?? ''}
                    onChange={(e) => handleMethodUpdate(method, { instructions: e.target.value })}
                    placeholder="Informations additionnelles affichées aux clients lors du paiement."
                    rows={3}
                  />
                </div>

                {method === 'bank_transfer' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Comptes bancaires</h4>
                      <Button variant="outline" size="sm" onClick={handleAddBankAccount}>
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter un compte
                      </Button>
                    </div>

                    {(config.bankAccounts ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Aucun compte bancaire configuré. Ajoutez au moins un compte pour permettre les virements.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {(config.bankAccounts ?? []).map((account, index) => (
                          <Card key={account.id ?? index} className="border border-dashed">
                            <CardContent className="pt-6 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">Compte #{index + 1}</div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => handleRemoveBankAccount(index)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label>Libellé</Label>
                                  <Input
                                    value={account.label ?? ''}
                                    onChange={(e) => handleBankAccountChange(index, 'label', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Banque</Label>
                                  <Input
                                    value={account.bankName ?? ''}
                                    onChange={(e) => handleBankAccountChange(index, 'bankName', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Numéro de compte</Label>
                                  <Input
                                    value={account.accountNumber ?? ''}
                                    onChange={(e) => handleBankAccountChange(index, 'accountNumber', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>IBAN</Label>
                                  <Input
                                    value={account.iban ?? ''}
                                    onChange={(e) => handleBankAccountChange(index, 'iban', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>SWIFT</Label>
                                  <Input
                                    value={account.swift ?? ''}
                                    onChange={(e) => handleBankAccountChange(index, 'swift', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                  <Label>Notes</Label>
                                  <Textarea
                                    value={account.notes ?? ''}
                                    onChange={(e) => handleBankAccountChange(index, 'notes', e.target.value)}
                                    rows={2}
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            'Sauvegarder les moyens de paiement'
          )}
        </Button>
      </div>
    </div>
  );
}
