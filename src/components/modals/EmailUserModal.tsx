import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Mail, 
  Send, 
  X, 
  UserPlus, 
  Eye, 
  EyeOff,
  Copy,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdminUser } from '../../types';

interface EmailUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUsers: AdminUser[];
  onSendEmail: (emailData: EmailData) => void;
}

export interface EmailData {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  content: string;
  signature: string;
}

export function EmailUserModal({ 
  open, 
  onOpenChange, 
  selectedUsers, 
  onSendEmail 
}: EmailUserModalProps) {
  const [emailData, setEmailData] = useState<EmailData>({
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    content: '',
    signature: 'L\'équipe Misan vous remercie de votre confiance.'
  });

  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Pré-remplir les adresses des utilisateurs sélectionnés
  useEffect(() => {
    if (selectedUsers.length > 0) {
      const userEmails = selectedUsers.map(user => user.email);
      setEmailData(prev => ({
        ...prev,
        to: userEmails
      }));
    }
  }, [selectedUsers]);

  const handleSend = async () => {
    // Validation
    if (emailData.to.length === 0) {
      toast.error('Aucun destinataire sélectionné');
      return;
    }

    if (!emailData.subject.trim()) {
      toast.error('Le sujet est obligatoire');
      return;
    }

    if (!emailData.content.trim()) {
      toast.error('Le contenu du message est obligatoire');
      return;
    }

    setIsSending(true);

    try {
      // Préparer les données finales
      const finalEmailData: EmailData = {
        ...emailData,
        cc: ccInput ? ccInput.split(',').map(email => email.trim()).filter(email => email) : [],
        bcc: bccInput ? bccInput.split(',').map(email => email.trim()).filter(email => email) : []
      };

      await onSendEmail(finalEmailData);
      
      // Réinitialiser le formulaire
      setEmailData({
        to: [],
        cc: [],
        bcc: [],
        subject: '',
        content: '',
        signature: 'L\'équipe Misan vous remercie de votre confiance.'
      });
      setCcInput('');
      setBccInput('');
      setShowCc(false);
      setShowBcc(false);
      
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
    } finally {
      setIsSending(false);
    }
  };

  const removeRecipient = (email: string) => {
    setEmailData(prev => ({
      ...prev,
      to: prev.to.filter(e => e !== email)
    }));
  };

  const addEmailToField = (email: string, field: 'cc' | 'bcc') => {
    if (field === 'cc') {
      setCcInput(prev => prev ? `${prev}, ${email}` : email);
    } else {
      setBccInput(prev => prev ? `${prev}, ${email}` : email);
    }
  };

  const copyAllEmails = () => {
    const allEmails = emailData.to.join(', ');
    navigator.clipboard.writeText(allEmails);
    toast.success('Adresses email copiées dans le presse-papiers');
  };

  const getEmailPreview = () => {
    const totalRecipients = emailData.to.length + 
      (ccInput ? ccInput.split(',').length : 0) + 
      (bccInput ? bccInput.split(',').length : 0);
    
    return `${totalRecipients} destinataire(s)`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Envoyer un email collectif
          </DialogTitle>
          <DialogDescription>
            Envoyez un email aux {selectedUsers.length} utilisateur(s) sélectionné(s)
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Destinataires principaux */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Destinataires ({emailData.to.length})
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAllEmails}
                  className="h-7 px-2"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copier
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-gray-50 min-h-[60px] max-h-32 overflow-y-auto">
                {emailData.to.map((email, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 px-2 py-1"
                  >
                    <span className="text-xs">{email}</span>
                    <button
                      type="button"
                      onClick={() => removeRecipient(email)}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {emailData.to.length === 0 && (
                  <span className="text-gray-500 text-sm">Aucun destinataire sélectionné</span>
                )}
              </div>
            </div>

            {/* Options CC/BCC */}
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="cc-toggle"
                  checked={showCc}
                  onCheckedChange={setShowCc}
                />
                <Label htmlFor="cc-toggle" className="text-sm">CC</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="bcc-toggle"
                  checked={showBcc}
                  onCheckedChange={setShowBcc}
                />
                <Label htmlFor="bcc-toggle" className="text-sm">BCC</Label>
              </div>
            </div>

            {/* Champ CC */}
            {showCc && (
              <div className="space-y-2">
                <Label>CC (Copie conforme)</Label>
                <Input
                  value={ccInput}
                  onChange={(e) => setCcInput(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Séparez plusieurs adresses par des virgules
                </p>
              </div>
            )}

            {/* Champ BCC */}
            {showBcc && (
              <div className="space-y-2">
                <Label>BCC (Copie cachée)</Label>
                <Input
                  value={bccInput}
                  onChange={(e) => setBccInput(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Séparez plusieurs adresses par des virgules
                </p>
              </div>
            )}

            <Separator />

            {/* Sujet */}
            <div className="space-y-2">
              <Label htmlFor="subject">Sujet *</Label>
              <Input
                id="subject"
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Objet de votre email"
                className="w-full"
              />
            </div>

            {/* Contenu */}
            <div className="space-y-2">
              <Label htmlFor="content">Message *</Label>
              <Textarea
                id="content"
                value={emailData.content}
                onChange={(e) => setEmailData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Rédigez votre message ici..."
                className="w-full min-h-[120px]"
                rows={6}
              />
            </div>

            {/* Signature */}
            <div className="space-y-2">
              <Label htmlFor="signature">Signature</Label>
              <Textarea
                id="signature"
                value={emailData.signature}
                onChange={(e) => setEmailData(prev => ({ ...prev, signature: e.target.value }))}
                placeholder="Votre signature"
                className="w-full"
                rows={2}
              />
            </div>

            {/* Aperçu */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="font-medium text-sm mb-2">Aperçu de l'email</h4>
              <div className="text-sm space-y-1">
                <div><strong>À :</strong> {getEmailPreview()}</div>
                {showCc && ccInput && (
                  <div><strong>CC :</strong> {ccInput.split(',').length} destinataire(s)</div>
                )}
                {showBcc && bccInput && (
                  <div><strong>BCC :</strong> {bccInput.split(',').length} destinataire(s)</div>
                )}
                <div><strong>Sujet :</strong> {emailData.subject || 'Aucun sujet'}</div>
                <div><strong>Contenu :</strong> {emailData.content ? `${emailData.content.substring(0, 100)}...` : 'Aucun contenu'}</div>
                {emailData.signature && (
                  <div><strong>Signature :</strong> {emailData.signature}</div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Mail className="w-4 h-4" />
            <span>{getEmailPreview()}</span>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || emailData.to.length === 0 || !emailData.subject.trim() || !emailData.content.trim()}
              className="flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer l'email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}