'use client'

import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { IPrice } from '../interfaces/price.interface'
import { useCreateTransactionQuery } from '../query/pricing.query'

interface IPaymentModal {
  onClose: () => void
  isOpen: boolean
  selectedPrice: IPrice | null
}

function PaymentModal({ onClose, isOpen, selectedPrice }: IPaymentModal) {
  const [{ isPending }] = usePayPalScriptReducer()
  const { createTransaction, isCreatingTransaction } =
    useCreateTransactionQuery()

  // creates a paypal order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createOrder: any = (_: any, actions: any) => {
    return actions.order
      .create({
        purchase_units: [
          {
            description: JSON.stringify({
              creditsPurchased: selectedPrice?.credits,
              intent: selectedPrice?.intent,
            }),
            amount: {
              currency_code: 'USD',
              value: selectedPrice?.price,
            },
          },
        ],
        application_context: {
          shipping_preference: 'NO_SHIPPING',
        },
      })
      .then((orderId: string) => {
        return orderId
      })
  }

  // check Approval
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onApprove = async (_: any, actions: any) => {
    return (
      actions.order
        .capture()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((details: any) => {
          const transactionId = details?.id
          const status = details?.status
          const creditsData = JSON.parse(
            details?.purchase_units?.[0]?.description
          )
          const amount = details?.purchase_units?.[0]?.amount?.value
          const intentData = JSON.stringify({ payer: details?.payer })
          const payload = {
            transactionId,
            status,
            creditsPurchased: Number(creditsData?.creditsPurchased),
            intent: creditsData?.intent,
            amount,
            intentData: intentData,
          }
          createTransaction(payload)
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .catch((err: any) => {
          toast.error(err.message || 'Something went wrong while transacting')
          // eslint-disable-next-line no-console
          console.log(err)
        })
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='text-center'>Secure Payment</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          {isPending && (
            <div className='flex justify-center'>
              <Loader2 className='text-primary h-6 w-6 animate-spin' />
            </div>
          )}
          <PayPalButtons
            createOrder={createOrder}
            onApprove={onApprove}
            onError={(err: unknown) => {
              toast.error('Something went wrong while transacting')
              // eslint-disable-next-line no-console
              console.error('Paypal transaction error', err)
            }}
          />
          {isCreatingTransaction && (
            <div className='flex justify-center'>
              <Loader2 className='text-primary h-6 w-6 animate-spin' />
            </div>
          )}
          <p className='text-muted-foreground text-center text-sm'>
            If you encounter any payment-related issues, kindly reach out to us
            via email at{' '}
            <a
              href='mailto:mithun@retale.agency'
              className='font-bold hover:underline'
            >
              mithun@retale.agency
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PaymentModal
