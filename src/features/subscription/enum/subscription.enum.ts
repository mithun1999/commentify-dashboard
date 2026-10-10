export enum SubscriptionStatusEnum {
  // Checkout went through but the bank hasn't confirmed the payment yet.
  PENDING = 'pending',
  ON_TRIAL = 'on_trial',
  ACTIVE = 'active',
  PAUSED = 'paused',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}
