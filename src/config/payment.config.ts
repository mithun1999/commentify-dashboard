export const paymentConfig = {
  defaultPaymentProvider:
    (import.meta.env.VITE_DEFAULT_PAYMENT_PROVIDER as
      | 'lemon_squeezy'
      | 'dodo_payments') || 'dodo_payments',
}
