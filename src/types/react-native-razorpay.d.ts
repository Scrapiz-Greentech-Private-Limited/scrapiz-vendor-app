declare module 'react-native-razorpay' {
  export interface RazorpaySuccess {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  export interface RazorpayOptions {
    key: string;
    amount: number;
    currency?: string;
    order_id: string;
    name?: string;
    description?: string;
    image?: string;
    prefill?: {
      contact?: string;
      email?: string;
      name?: string;
    };
    theme?: {
      color?: string;
    };
  }

  const RazorpayCheckout: {
    open(options: RazorpayOptions): Promise<RazorpaySuccess>;
  };

  export default RazorpayCheckout;
}
