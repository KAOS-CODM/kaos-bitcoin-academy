export const WALLET_METHOD_DESCRIPTIONS: ReadonlyMap<string, string> = new Map<string, string>([
  ['get_balance', 'Requests wallet balance information.'],
  ['lookup_invoice', 'Looks up information about an invoice.'],
  ['list_transactions', 'Retrieves transaction history.'],
  ['make_invoice', 'Creates a payment invoice.'],
  ['pay_invoice', 'Requests payment of an invoice.'],
  ['pay_keysend', 'Requests a keysend payment.'],
  ['pay', 'Payment-related wallet operation.'],
  ['receive', 'Wallet receive-related operation.'],
  ['get_info', 'Retrieves wallet information.'],
])

export function describeWalletMethod(method: string): string | undefined {
  return WALLET_METHOD_DESCRIPTIONS.get(method)
}
