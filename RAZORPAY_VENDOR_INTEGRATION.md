# Razorpay Vendor App Integration Guide

## Overview
Complete Razorpay payment integration for the Scrapiz Vendor App, including wallet topup with confetti success animations.

## ✅ Completed Implementation

### 1. Wallet Topup Screen (`src/screens/credit/WalletTopupScreen.tsx`)

**Features:**
- ✅ Header with back navigation
- ✅ Orange amount display card
- ✅ Preset amount chips: ₹100, ₹250, ₹500, ₹1000, ₹2000
- ✅ Custom amount input (min: ₹10, max: ₹50,000)
- ✅ Razorpay integration (all payment methods: card, UPI, netbanking, wallet)
- ✅ Confetti animation on success (12 colored rectangles)
- ✅ Pulsing success circle with checkmark
- ✅ Transaction details display
- ✅ Error handling (cancellation, failures)

**Payment Flow:**
1. User selects/enters amount
2. Clicks "Proceed to Pay"
3. Creates Razorpay order via `ApiService.createWalletRazorpayOrder()`
4. Opens Razorpay SDK
5. User completes payment
6. Verifies payment via `ApiService.verifyWalletRazorpayPayment()`
7. Shows success screen with confetti animation

### 2. API Service Updates (`src/services/api.ts`)

Added two new methods:

```typescript
// Create Razorpay order for wallet topup
static async createWalletRazorpayOrder(amountInr: number): Promise<{
  razorpay_order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  prefill: { name: string };
}>

// Verify wallet payment
static async verifyWalletRazorpayPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ new_balance: number; credited: number }>
```

### 3. Credit Screen Update (`src/screens/credit/CreditScreen.tsx`)

Updated "Add Money" button to navigate to `'wallet-topup'` screen.

### 4. Subscription Service Scaffold (`src/services/subscriptionService.ts`)

Created typed scaffold for future subscription functionality:
- `SubscriptionPlan` interface
- `SubscriptionRazorpayOrder` interface
- `SubscriptionService` class with placeholder methods

## 🎨 Design Features

### Confetti Animation
- 12 animated rectangles with random colors
- Colors: `['#ff5b14', '#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6']`
- Random horizontal positions (0-100%)
- Animated from top (-20px) to 60% of screen height
- Simultaneous rotation (0-360deg)
- Duration: 2-3 seconds with random variation

### Success Circle Animation
- Pulsing scale animation (1 → 1.15 → 1)
- Infinite loop
- Duration: 800ms per cycle
- Green background (#22c55e) - matches app's primary green theme
- White checkmark icon

### Amount Card
- Orange gradient background (#ff5b14)
- Wallet icon badge with semi-transparent background
- Large amount display (42px font)
- Centered layout

## 📱 Navigation Integration

The screen expects these props:
```typescript
interface WalletTopupScreenProps {
  onBack: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}
```

**To integrate in your navigation:**

```typescript
// In your main navigation handler
case 'wallet-topup':
  return (
    <WalletTopupScreen
      onBack={() => setCurrentScreen('credit')}
      onShowToast={showToast}
    />
  );
```

## 🧪 Testing Checklist

### Amount Selection
- [ ] Select preset amount (₹100, ₹250, ₹500, ₹1000, ₹2000)
- [ ] Enter custom amount
- [ ] Verify amount displays correctly on orange card
- [ ] Test min amount validation (< ₹10)
- [ ] Test max amount validation (> ₹50,000)

### Payment Flow
- [ ] Click "Proceed to Pay"
- [ ] Razorpay UI opens
- [ ] Test card payment (4111 1111 1111 1111)
- [ ] Test UPI payment (success@razorpay)
- [ ] Test payment cancellation
- [ ] Test payment failure (4000 0000 0000 0002)

### Success Screen
- [ ] Confetti animation plays
- [ ] Success circle pulses
- [ ] Transaction ID displays (last 12 chars)
- [ ] Date displays correctly
- [ ] Amount displays correctly
- [ ] Status shows "Success" in green
- [ ] "Done" button returns to wallet screen

### Error Handling
- [ ] Payment cancelled shows alert
- [ ] Payment failed shows error message
- [ ] Network errors handled gracefully

## 🎯 Key Implementation Details

### Razorpay Options
```typescript
{
  description: `Wallet Topup - ₹${amount}`,
  image: 'https://scrapiz.in/logo.png',
  currency: 'INR',
  key: orderData.key_id,
  amount: String(orderData.amount), // in paise
  order_id: orderData.razorpay_order_id,
  name: 'Scrapiz Vendor',
  prefill: { name: orderData.prefill.name },
  method: {
    card: true,
    upi: true,
    netbanking: true,
    wallet: true,
  },
  theme: { color: '#ff5b14' },
}
```

### Confetti Implementation
- Uses `react-native-reanimated` Animated API
- 12 confetti pieces with random positions
- Parallel animations for translateY and rotate
- Seeded at success trigger
- Non-blocking (pointerEvents="none")

### Success Circle Pulse
- Uses Animated.loop with sequence
- Scale from 1 → 1.15 → 1
- 800ms per direction
- Green background (#22c55e) - matches app theme
- Starts when showSuccess becomes true

## 🔄 Future Enhancements

### Subscription Integration
When backend subscription model is ready:

1. Implement methods in `subscriptionService.ts`
2. Create subscription purchase screen
3. Follow same pattern as wallet topup
4. Use confetti animation for success

### Transaction History
- Add real transaction history from backend
- Replace fallback transactions in CreditScreen
- Add pagination for long history
- Add filters (date range, type)

### Payment Method Preferences
- Save last used payment method
- Pre-select preferred method in Razorpay
- Add payment method management

## 📚 Related Files

```
vendorApp/
├── src/
│   ├── screens/
│   │   └── credit/
│   │       ├── CreditScreen.tsx          ← Updated (navigation)
│   │       ├── WalletTopupScreen.tsx     ← NEW (main implementation)
│   │       └── AddMoneyScreen.tsx        ← Existing (old flow)
│   └── services/
│       ├── api.ts                        ← Updated (Razorpay methods)
│       └── subscriptionService.ts        ← NEW (future scaffold)
└── RAZORPAY_VENDOR_INTEGRATION.md        ← This file
```

## 🚀 Deployment Checklist

Before production:
- [ ] Test all payment methods thoroughly
- [ ] Verify backend has live Razorpay keys
- [ ] Test on real iOS and Android devices
- [ ] Verify confetti animation performance
- [ ] Test with slow network conditions
- [ ] Verify error messages are user-friendly
- [ ] Test wallet balance updates correctly
- [ ] Monitor payment success rates

## 🐛 Troubleshooting

### Confetti not animating
- Check if `react-native-reanimated` is properly installed
- Verify `useNativeDriver: true` is set
- Check if animations start on `showSuccess` change

### Razorpay UI not opening
- Verify `react-native-razorpay` is installed
- Check if testing on native platform (not web)
- Verify Razorpay keys are correct

### Payment succeeds but verification fails
- Check backend logs for signature verification errors
- Verify network connectivity
- Check if transaction is idempotent

### Success screen shows wrong amount
- Verify `creditedAmount` is set from verify response
- Check if backend returns correct `credited` value
- Verify number formatting is correct

## 📞 Support

For issues:
- Check backend implementation: `../server/RAZORPAY_IMPLEMENTATION_SUMMARY.md`
- Razorpay docs: https://razorpay.com/docs/payment-gateway/react-native-integration/
- React Native Reanimated: https://docs.swmansion.com/react-native-reanimated/

---

**Implementation Date**: April 2026  
**Status**: ✅ Ready for Testing  
**Next Step**: Integrate navigation and test payment flows
