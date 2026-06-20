import { sendPaymentNotification } from './payment-notification';
import { PAYMENT_PROCESSORS, type PaymentProcessorType } from '@/lib/constants/payment-processors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceClient = { from: (table: string) => any };

/**
 * Notify a vendor that a customer reported paying a deposit through the vendor's external
 * merchant link. The customer already has their redemption code; the vendor's job is to
 * verify the deposit actually landed in their own merchant account (matching on the
 * reference code + amount), either now or at redemption. Best-effort — never throws.
 */
export async function notifyVendorDepositReported(serviceClient: ServiceClient, claimId: string) {
  const { data: claim } = await serviceClient
    .from('claims')
    .select('payment_reference, payment_method_type, deal:deals(title, deposit_amount, vendor_id), customer:customers(email, first_name, last_name)')
    .eq('id', claimId)
    .single();

  if (!claim?.deal?.vendor_id) return;

  const { data: vendor } = await serviceClient
    .from('vendors')
    .select('email, business_name')
    .eq('id', claim.deal.vendor_id)
    .single();

  if (!vendor?.email) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const processorKey = claim.payment_method_type as PaymentProcessorType | null;
  // 'other' is a generic bring-your-own merchant link — keep the wording generic ("merchant"),
  // which also reads correctly in the email's "Check your {processor} account" sentence.
  const processorName = !processorKey || processorKey === 'other'
    ? 'merchant'
    : PAYMENT_PROCESSORS[processorKey]?.name ?? processorKey;
  const customerName = [claim.customer?.first_name, claim.customer?.last_name].filter(Boolean).join(' ')
    || claim.customer?.email?.split('@')[0]
    || 'A customer';

  await sendPaymentNotification({
    vendorEmail: vendor.email,
    vendorName: vendor.business_name || 'there',
    customerName,
    customerEmail: claim.customer?.email || '',
    dealTitle: claim.deal.title,
    amount: Number(claim.deal.deposit_amount) || 0,
    processor: processorName,
    paymentReference: claim.payment_reference || '—',
    dashboardUrl: `${appUrl}/vendor/deposits`,
  });
}
