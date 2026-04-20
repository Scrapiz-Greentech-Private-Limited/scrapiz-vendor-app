/**
 * Subscription Service
 * 
 * Scaffold for future subscription buying functionality.
 * Will be wired once backend VendorSubscription model is added.
 */

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_inr: number;
  duration_days: number;
  features: string[];
}

export interface SubscriptionRazorpayOrder {
  razorpay_order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  plan: SubscriptionPlan;
}

export class SubscriptionService {
  /**
   * POST /api/vendor/subscription/razorpay-order/
   * 
   * Backend: creates Razorpay order + pending VendorSubscription record
   * 
   * @param planId - The subscription plan ID to purchase
   * @returns Razorpay order details with plan information
   */
  static async createSubscriptionOrder(planId: string): Promise<SubscriptionRazorpayOrder> {
    // Same pattern as wallet — will be wired once backend subscription model is added
    throw new Error('Subscription backend endpoint not yet implemented');
  }

  /**
   * POST /api/vendor/subscription/razorpay-verify/
   * 
   * Verifies Razorpay payment and activates subscription
   * 
   * @param payload - Payment verification data
   * @returns Subscription activation details
   */
  static async verifySubscriptionPayment(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    plan_id: string;
  }): Promise<{ active_until: string; plan_name: string }> {
    throw new Error('Subscription backend endpoint not yet implemented');
  }
}
