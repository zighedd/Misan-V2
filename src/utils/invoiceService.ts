import { supabase } from './supabase';
import type { Address, CartItem, Invoice, InvoiceStatus, PaymentMethod } from '../types';
import { calculateOrderSummary } from './orderUtils';

const PAYMENT_METHOD_DB_MAP: Record<PaymentMethod, string> = {
  card_cib: 'card_cib',
  paypal: 'paypal',
  bank_transfer: 'bank_transfer',
  mobile_payment: 'edahabia',
  card_international: 'card_visa'
};

const PAYMENT_METHOD_APP_MAP: Record<string, PaymentMethod> = {
  card_cib: 'card_cib',
  card_visa: 'card_international',
  bank_transfer: 'bank_transfer',
  edahabia: 'mobile_payment',
  paypal: 'paypal',
};

const mapPaymentMethodFromDb = (value: string | null): PaymentMethod => {
  if (!value) {
    return 'bank_transfer';
  }
  return PAYMENT_METHOD_APP_MAP[value] ?? 'bank_transfer';
};

const mapInvoiceStatusFromDb = (value: string | null, paymentMethod: PaymentMethod): InvoiceStatus => {
  if (paymentMethod === 'bank_transfer') {
    return value === 'paid' ? 'paid' : 'bank_pending';
  }
  switch (value) {
    case 'paid':
      return 'paid';
    case 'cancelled':
      return 'cancelled';
    case 'overdue':
      return 'pending';
    default:
      return 'pending';
  }
};

const generateInvoiceNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .ilike('invoice_number', `MS-${year}-%`)
    .order('invoice_number', { ascending: false })
    .limit(1);

  let sequence = 1;

  if (data && data.length > 0) {
    const match = data[0].invoice_number.match(/MS-\d{4}-(\d+)/);
    if (match) {
      sequence = Number(match[1]) + 1;
    }
  }

  return `MS-${year}-${sequence.toString().padStart(4, '0')}`;
};

const mapInvoiceRowToInvoice = (row: any): Invoice => {
  const transaction = row.transactions?.[0] ?? null;
  const paymentMethod = mapPaymentMethodFromDb(transaction?.payment_method ?? null);
  const status = mapInvoiceStatusFromDb(row.status, paymentMethod);

  const lineItems = Array.isArray(row.line_items)
    ? row.line_items.map((item: any, index: number) => ({
        id: item.id ?? `${row.invoice_number}-${index + 1}`,
        label: item.label ?? 'Produit',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unit_price_ht) || 0,
        vatRate: Number(item.vat_rate ?? row.tax_rate ?? 0),
        total: Number(item.total_ht) || 0
      }))
    : [];

  return {
    id: row.invoice_number,
    orderNumber: row.invoice_number,
    createdAt: row.issue_date,
    dueDate: row.due_date,
    amount: Number(row.total_da) || 0,
    currency: (row.currency || 'DZD') as Invoice['currency'],
    status,
    type: lineItems[0]?.label?.toLowerCase().includes('jeton') ? 'tokens' : 'subscription',
    description: lineItems[0]?.label ?? 'Commande Misan',
    paymentMethod,
    paymentDate: row.paid_at || transaction?.payment_date || null,
    paymentReference: transaction?.reference_id || null,
    lines: lineItems,
    notes: row.notes ?? undefined,
    billingAddress: row.billing_address ?? null
  };
};

export const fetchUserInvoices = async (userId: string): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, transactions:transactions(payment_method, reference_id, payment_date, status)')
    .eq('user_id', userId)
    .order('issue_date', { ascending: false });

  if (error) {
    console.error('Erreur chargement factures:', error);
    return [];
  }

  return (data || []).map(mapInvoiceRowToInvoice);
};

interface PersistInvoiceParams {
  userId: string;
  userEmail: string;
  userName: string;
  userRole?: string;
  subscriptionType?: string;
  subscriptionStatus?: string;
  subscriptionEnd?: string;
  subscriptionStart?: string;
  tokens?: number;
  cart: CartItem[];
  billingAddress: Address;
  paymentMethod: PaymentMethod;
  vatRate: number;
  notes?: string | null;
  initialStatus?: 'paid' | 'pending';
  transactionId?: string | null;
}

const mapRoleToProfileRole = (role?: string) => {
  switch (role) {
    case 'admin':
      return 'admin';
    case 'collaborateur':
      return 'pro';
    default:
      return 'premium';
  }
};

const mapSubscriptionTypeToProfile = (type?: string) => {
  switch (type) {
    case 'admin':
      return 'admin';
    case 'pro':
      return 'pro';
    default:
      return 'premium';
  }
};

const ensureUserProfile = async ({
  userId,
  email,
  name,
  role,
  subscriptionType,
  subscriptionStatus,
  subscriptionEnd,
  subscriptionStart,
  tokens
}: {
  userId: string;
  email: string;
  name: string;
  role?: string;
  subscriptionType?: string;
  subscriptionStatus?: string;
  subscriptionEnd?: string;
  subscriptionStart?: string;
  tokens?: number;
}) => {
  if (!email) {
    throw new Error('Adresse email utilisateur manquante.');
  }

  const normalizedStart = subscriptionStart && subscriptionStart.trim() ? subscriptionStart : new Date().toISOString();
  const normalizedEnd = subscriptionEnd && subscriptionEnd.trim() ? subscriptionEnd : null;
  const normalizedTokens = Number.isFinite(tokens) ? Math.max(Number(tokens), 0) : 0;

  const { error } = await supabase.rpc('ensure_user_profile', {
    _user_id: userId,
    _email: email,
    _name: name || email,
    _role: mapRoleToProfileRole(role),
    _subscription_type: mapSubscriptionTypeToProfile(subscriptionType),
    _subscription_status: subscriptionStatus ?? 'active',
    _subscription_start: normalizedStart,
    _subscription_end: normalizedEnd,
    _tokens_balance: normalizedTokens
  });

  if (error) {
    console.error('Erreur ensure_user_profile RPC:', error);
    throw error;
  }
};

export const createTransactionAndInvoice = async ({
  userId,
  userEmail,
  userName,
  userRole,
  subscriptionType,
  subscriptionStatus,
  subscriptionEnd,
  subscriptionStart,
  tokens,
  cart,
  billingAddress,
  paymentMethod,
  vatRate,
  notes,
  initialStatus,
  transactionId
}: PersistInvoiceParams): Promise<Invoice | null> => {
  if (!cart.length) {
    return null;
  }

  await ensureUserProfile({
    userId,
    email: userEmail,
    name: userName,
    role: userRole,
    subscriptionType,
    subscriptionStatus,
    subscriptionEnd,
    subscriptionStart,
    tokens
  });

  const invoiceNumber = await generateInvoiceNumber();
  const summary = calculateOrderSummary(cart, vatRate / 100);
  const subtotal = Math.round(summary.subtotalHT || 0);
  const taxAmount = Math.round(summary.vat || 0);
  const total = Math.round((summary.totalTTC || 0));
  const resolvedStatus = initialStatus
    ? initialStatus
    : paymentMethod === 'bank_transfer'
      ? 'pending'
      : 'paid';

  const invoiceStatus: InvoiceStatus = resolvedStatus === 'paid'
    ? 'paid'
    : paymentMethod === 'bank_transfer'
      ? 'bank_pending'
      : 'pending';

  const referenceId = transactionId || invoiceNumber;
  const tokensAmount = cart.reduce((totalTokens, item) => totalTokens + (item.tokensIncluded || 0), 0);
  const description = cart.map(item => `${item.quantity}× ${item.name}`).join(' + ');

  const dbPaymentMethod = PAYMENT_METHOD_DB_MAP[paymentMethod] ?? 'bank_transfer';

  const { data: transactionData, error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: cart.some(item => item.type === 'subscription') ? 'subscription' : 'tokens',
      description,
      amount_da: subtotal,
      tax_amount_da: taxAmount,
      total_amount_da: total,
      tokens_amount: tokensAmount,
      payment_method: dbPaymentMethod,
      status: resolvedStatus,
      reference_id: referenceId,
      invoice_number: invoiceNumber,
      payment_date: resolvedStatus === 'paid' ? new Date().toISOString() : null
    })
    .select('id, payment_method, reference_id, payment_date, status')
    .maybeSingle();

  if (transactionError || !transactionData) {
    console.error('Erreur création transaction:', transactionError);
    throw transactionError || new Error('Transaction non créée');
  }

  const lineItems = cart.map((item, index) => {
    const unitPrice = item.quantity > 0 ? item.totalHT / item.quantity : item.totalHT;
    return {
      id: item.id ?? `${invoiceNumber}-${index + 1}`,
      label: item.name,
      quantity: item.quantity,
      unit_price_ht: unitPrice,
      total_ht: item.totalHT,
      vat_rate: vatRate
    };
  });

  const { data: invoiceRow, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      transaction_id: transactionData.id,
      invoice_number: invoiceNumber,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: new Date().toISOString().slice(0, 10),
      status: invoiceStatus === 'paid' ? 'paid' : 'pending',
      subtotal_da: subtotal,
      tax_rate: vatRate,
      tax_amount_da: taxAmount,
      total_da: total,
      currency: 'DZD',
      billing_address: billingAddress,
      line_items: lineItems,
      notes: notes ?? (paymentMethod === 'bank_transfer'
        ? "L'activation de votre compte sera effective à l'encaissement du montant TTC. Vous serez automatiquement informé à l'encaissement."
        : null),
      paid_at: invoiceStatus === 'paid' ? new Date().toISOString() : null
    })
    .select('*, transactions:transactions(payment_method, reference_id, payment_date, status)')
    .maybeSingle();

  if (invoiceError || !invoiceRow) {
    console.error('Erreur création facture:', invoiceError);
    throw invoiceError || new Error('Facture non créée');
  }

  return mapInvoiceRowToInvoice(invoiceRow);
};
