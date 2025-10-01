-- Mettre à jour la contrainte de statut pour les factures
ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'sent', 'pending', 'bank_pending', 'paid', 'overdue', 'cancelled'));
