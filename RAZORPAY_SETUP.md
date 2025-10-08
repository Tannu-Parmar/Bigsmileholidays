# Razorpay Integration Setup

## Environment Variables Required

Add these to your `.env.local` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

## How to Get Razorpay Credentials

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Sign up or log in to your account
3. Go to Settings > API Keys
4. Generate API Keys (Test/Live mode)
5. Copy the Key ID and Key Secret
6. Add them to your environment variables

## Payment Flow

1. **User fills form** - Uploads documents and fills required fields
2. **Submit button clicked** - Payment modal appears
3. **Payment options**:
   - **Regular Payment**: User pays via Razorpay gateway
   - **Admin Bypass**: Enter bypass password to skip payment
4. **Form submission** - Only after successful payment or bypass
5. **Data storage** - Payment information saved with form data

## Bypass Password

The bypass password is currently set to: `[REDACTED - check your environment variables]`

To change it, update the `BYPASS_PASSWORD` constant in `components/payment-component.tsx`

## Payment Amount

The payment amount is currently set to ₹100. To change it, update the amount in `app/page.tsx`:

```tsx
<PaymentComponent
  amount={100} // Change this value
  onPaymentSuccess={handlePaymentSuccess}
  onPaymentError={handlePaymentError}
/>
```

## Database Schema

Payment information is stored in the `payment` field of each document:

```typescript
{
  paymentDone: boolean,      // Whether payment was completed
  amount: number,           // Amount paid (0 if bypassed)
  paymentId?: string,       // Razorpay payment ID
  transactionReference?: string, // Transaction reference
  bypassPasswordUsed: boolean   // Whether bypass password was used
}
```
