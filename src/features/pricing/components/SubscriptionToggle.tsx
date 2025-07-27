'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface SubscriptionToggleProps {
  subscriptionType: 'monthly' | 'yearly'
  onChange: () => void
}

function SubscriptionToggle({
  subscriptionType,
  onChange,
}: SubscriptionToggleProps) {
  return (
    <div className='mt-4 flex items-center space-x-2'>
      <Label htmlFor='subscription-toggle' className='capitalize'>
        {subscriptionType}
      </Label>
      <Switch
        id='subscription-toggle'
        checked={subscriptionType === 'yearly'}
        onCheckedChange={onChange}
      />
    </div>
  )
}

export default SubscriptionToggle
