# Promo Code System

This document describes the promo code system implemented in the Big Smile Holidays application.

## Available Promo Codes

| Code | Discount | Description |
|------|----------|-------------|
| `BIG123` | 100% | Complete payment bypass |

## How It Works

1. **User Experience**: When a user clicks "Submit", they see a payment modal with a "Have a promo code?" link
2. **Code Entry**: Users can enter a promo code in the input field
3. **Validation**: The code is validated both client-side and server-side for security
4. **Discount Application**: If valid, the discount is applied and the payment amount is updated
5. **Free Payment**: If the discount is 100%, the payment is automatically bypassed and the form is submitted
6. **Partial Payment**: If the discount is less than 100%, the user pays the reduced amount

## Technical Implementation

### Frontend (components/payment-component.tsx)
- Promo code input field with validation
- Real-time discount calculation
- Payment bypass for 100% discount codes
- Visual feedback showing applied discounts

### Backend (app/api/promo/validate/route.ts)
- Server-side promo code validation
- Secure code verification
- Discount percentage calculation

### API Integration (app/api/submit/route.ts)
- Promo code usage logging
- Payment information tracking
- Automatic form submission after promo payment

## Adding New Promo Codes

To add new promo codes, update the `PROMO_CODES` object in both:
1. `components/payment-component.tsx` (client-side validation)
2. `app/api/promo/validate/route.ts` (server-side validation)

Example:
```typescript
const PROMO_CODES = {
  "BIG123": { valid: true, discount: 100 },
  "NEWCODE50": { valid: true, discount: 50 }, // New 50% discount code
}
```

## Security Features

- Server-side validation prevents code manipulation
- Promo code usage is logged for tracking
- Codes are case-insensitive but normalized to uppercase
- Invalid codes are rejected with appropriate error messages

## Usage Tracking

Promo code usage is logged in the server console with the format:
```
[submit] Promo code used: {CODE} by user
```

This allows administrators to track which codes are being used and how frequently.
