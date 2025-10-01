import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { 
  Save, 
  X, 
  Calendar,
  CreditCard,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  ShoppingCart,
  Coins,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdminOrder, PaymentMethod } from '../../types';

interface OrderEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: AdminOrder | null;
  onSave: (updatedOrder: AdminOrder) => void;
}

export function OrderEditModal({ open, onOpenChange, order, onSave }: OrderEditModalProps) {
  const [formData, setFormData] = useState<AdminOrder | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (order) {
      setFormData({
        ...order,
        // S'assurer que les dates sont formatées correctement
        createdAt: order.createdAt,
        payment: {
          ...order.payment,
          paymentDate: order.payment.paymentDate || ''
        }
      });
    }
  }, [order]);

  const handleSave = async () => {
    if (!formData) return;

    // Validation
    if (!formData.billingInfo.name.trim()) {
      toast.error('Le nom de facturation est obligatoire');
      return;
    }

    if (!formData.billingInfo.email.trim()) {
      toast.error('L\'email de facturation est obligatoire');
      return;
    }

    if (formData.status === 'payee' && !formData.payment.paymentDate) {
      toast.error('La date de paiement est obligatoire pour les commandes payées');
      return;
    }

    setIsSaving(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulation
      
      onSave(formData);
      onOpenChange(false);
      toast.success('Commande mise à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'payee': return 'text-green-600 bg-green-50 border-green-200';
      case 'terminee': return 'text-green-600 bg-green-50 border-green-200'; // Même couleur que payée car même effet
      case 'en_attente': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'non_finalisee': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'annulee': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Fonction pour déterminer le type d'une commande
  const getOrderType = (order: AdminOrder) => {
    const hasSubscription = order.items.some(item => item.type === 'subscription');
    const hasTokens = order.items.some(item => item.type === 'tokens');
    
    if (hasSubscription && hasTokens) {
      return 'mixte';
    } else if (hasSubscription) {
      return 'abonnements';
    } else if (hasTokens) {
      return 'jetons';
    }
    return 'unknown';
  };

  const getOrderTypeLabel = (order: AdminOrder) => {
    const type = getOrderType(order);
    switch (type) {
      case 'abonnements': return 'Abonnement';
      case 'jetons': return 'Jetons';
      case 'mixte': return 'Mixte';
      default: return 'Inconnu';
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'card_cib': return 'Carte CIB';
      case 'card_visa': return 'Carte Visa/Mastercard';
      case 'bank_transfer': return 'Virement bancaire';
      case 'edahabia': return 'Edahabia';
      case 'collective_contract': return 'Contrat collectif';
      case 'other': return 'Autre';
      default: return method;
    }
  };

  if (!formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            Modifier la commande {formData.id}
          </DialogTitle>
          <DialogDescription>
            Modifiez les informations de la commande. Le numéro de commande et l'utilisateur ne peuvent pas être modifiés.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Numéro de commande</Label>
                  <Input 
                    value={formData.id} 
                    disabled 
                    className="bg-gray-50" 
                  />
                  <p className="text-xs text-gray-500">Non modifiable</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Statut *</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: any) => setFormData(prev => prev ? { ...prev, status: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non_finalisee">Non finalisée</SelectItem>
                      <SelectItem value="en_attente">En attente</SelectItem>
                      <SelectItem value="payee">Payée</SelectItem>
                      <SelectItem value="terminee">Terminée</SelectItem>
                      <SelectItem value="annulee">Annulée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date de création</Label>
                  <Input 
                    value={formData.createdAt.toLocaleDateString('fr-FR')} 
                    disabled 
                    className="bg-gray-50" 
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge className={`text-xs border ${getStatusColor(formData.status)}`}>
                  {formData.status === 'payee' ? 'Payée' :
                   formData.status === 'en_attente' ? 'En attente' :
                   formData.status === 'non_finalisee' ? 'Non finalisée' :
                   formData.status === 'terminee' ? 'Terminée' :
                   'Annulée'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getOrderTypeLabel(formData)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Informations utilisateur */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Utilisateur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input 
                    value={formData.user.name} 
                    disabled 
                    className="bg-gray-50" 
                  />
                  <p className="text-xs text-gray-500">Non modifiable</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    value={formData.user.email} 
                    disabled 
                    className="bg-gray-50" 
                  />
                  <p className="text-xs text-gray-500">Non modifiable</p>
                </div>

                <div className="space-y-2">
                  <Label>ID Utilisateur</Label>
                  <Input 
                    value={formData.user.id} 
                    disabled 
                    className="bg-gray-50" 
                  />
                  <p className="text-xs text-gray-500">Non modifiable</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations de paiement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Paiement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Méthode de paiement *</Label>
                  <Select 
                    value={formData.payment.method} 
                    onValueChange={(value: PaymentMethod) => 
                      setFormData(prev => prev ? { 
                        ...prev, 
                        payment: { ...prev.payment, method: value } 
                      } : null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card_cib">Carte CIB</SelectItem>
                      <SelectItem value="card_visa">Carte Visa/Mastercard</SelectItem>
                      <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                      <SelectItem value="edahabia">Edahabia</SelectItem>
                      <SelectItem value="collective_contract">Contrat collectif</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.status === 'payee' && (
                  <div className="space-y-2">
                    <Label>Date de paiement *</Label>
                    <Input
                      type="date"
                      value={formData.payment.paymentDate || ''}
                      onChange={(e) => 
                        setFormData(prev => prev ? { 
                          ...prev, 
                          payment: { ...prev.payment, paymentDate: e.target.value } 
                        } : null)
                      }
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>ID de transaction</Label>
                  <Input
                    value={formData.payment.transactionId || ''}
                    onChange={(e) => 
                      setFormData(prev => prev ? { 
                        ...prev, 
                        payment: { ...prev.payment, transactionId: e.target.value } 
                      } : null)
                    }
                    placeholder="Optionnel"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations de facturation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Facturation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input
                    value={formData.billingInfo.name}
                    onChange={(e) => 
                      setFormData(prev => prev ? { 
                        ...prev, 
                        billingInfo: { ...prev.billingInfo, name: e.target.value } 
                      } : null)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.billingInfo.email}
                    onChange={(e) => 
                      setFormData(prev => prev ? { 
                        ...prev, 
                        billingInfo: { ...prev.billingInfo, email: e.target.value } 
                      } : null)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={formData.billingInfo.phone}
                    onChange={(e) => 
                      setFormData(prev => prev ? { 
                        ...prev, 
                        billingInfo: { ...prev.billingInfo, phone: e.target.value } 
                      } : null)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input
                    value={formData.billingInfo.city}
                    onChange={(e) => 
                      setFormData(prev => prev ? { 
                        ...prev, 
                        billingInfo: { ...prev.billingInfo, city: e.target.value } 
                      } : null)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Code postal</Label>
                  <Input
                    value={formData.billingInfo.postalCode}
                    onChange={(e) => 
                      setFormData(prev => prev ? { 
                        ...prev, 
                        billingInfo: { ...prev.billingInfo, postalCode: e.target.value } 
                      } : null)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Pays</Label>
                  <Input
                    value={formData.billingInfo.country}
                    onChange={(e) => 
                      setFormData(prev => prev ? { 
                        ...prev, 
                        billingInfo: { ...prev.billingInfo, country: e.target.value } 
                      } : null)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Adresse</Label>
                <Textarea
                  value={formData.billingInfo.address}
                  onChange={(e) => 
                    setFormData(prev => prev ? { 
                      ...prev, 
                      billingInfo: { ...prev.billingInfo, address: e.target.value } 
                    } : null)
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Résumé des montants */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Montants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sous-total HT:</span>
                <span>{formData.summary.subtotalHT.toLocaleString()} DA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Remise totale:</span>
                <span className="text-green-600">-{formData.summary.totalDiscount.toLocaleString()} DA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Sous-total après remise:</span>
                <span>{formData.summary.discountedSubtotal.toLocaleString()} DA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>TVA (20%):</span>
                <span>{formData.summary.vat.toLocaleString()} DA</span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total TTC:</span>
                <span>{formData.summary.totalTTC.toLocaleString()} DA</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            * Champs obligatoires
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}