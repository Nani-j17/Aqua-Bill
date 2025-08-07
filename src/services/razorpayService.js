class RazorpayService {
  constructor() {
    this.config = {
      KEY_ID: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_WTA06GQgz5QkNN',
      KEY_SECRET: process.env.REACT_APP_RAZORPAY_KEY_SECRET || 'M1FEs6hYvrYMjHvl629Iu1BC',
      CURRENCY: 'INR',
      NAME: 'Aqua Bill',
      DESCRIPTION: 'Water Bill Payment',
      THEME_COLOR: '#3B82F6'
    };
  }

  loadScript() {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(window.Razorpay);
      script.onerror = () => reject(new Error('Failed to load Razorpay script'));
      document.body.appendChild(script);
    });
  }

  generateOrderId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `ORDER_${timestamp}_${random}`.toUpperCase();
  }

  async createOrder(amount, currency = 'INR') {
    try {
      const orderId = this.generateOrderId();
      
      const options = {
        key: this.config.KEY_ID,
        amount: amount * 100,
        currency: currency,
        name: this.config.NAME,
        description: this.config.DESCRIPTION,
        order_id: orderId,
        prefill: {
          name: 'User Name',
          email: 'user@example.com',
          contact: '9999999999'
        },
        theme: {
          color: this.config.THEME_COLOR
        },
        modal: {
          ondismiss: () => {
          }
        }
      };

      return { success: true, options, orderId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async initiatePayment(amount, userDetails = {}) {
    try {
      const Razorpay = await this.loadScript();
      
      const orderResult = await this.createOrder(amount);
      if (!orderResult.success) {
        throw new Error(orderResult.error);
      }

      const { options } = orderResult;

      if (userDetails.name) options.prefill.name = userDetails.name;
      if (userDetails.email) options.prefill.email = userDetails.email;
      if (userDetails.contact) options.prefill.contact = userDetails.contact;

      return new Promise((resolve, reject) => {
        const razorpayInstance = new Razorpay({
          ...options,
          handler: async (response) => {
            try {
              await this.savePaymentRecord(response, {
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature
              });
              resolve({ success: true, data: response });
            } catch (error) {
              resolve({ success: true, data: response });
            }
          }
        });
        
        razorpayInstance.on('payment.failed', (response) => {
          reject(new Error(response.error?.description || 'Payment failed'));
        });

        razorpayInstance.on('payment.cancelled', (response) => {
          reject(new Error('Payment was cancelled by user'));
        });

        razorpayInstance.open();
      });
    } catch (error) {
      throw error;
    }
  }

  async handlePaymentSuccess(response) {
    try {
      const verificationResult = await this.verifyPayment(response);
      
      if (verificationResult.success) {
        await this.savePaymentRecord(response, verificationResult.data);
        return { success: true, data: response };
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      throw error;
    }
  }

  async verifyPayment(response) {
    try {
      return {
        success: true,
        data: {
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async savePaymentRecord(response, verificationData) {
    try {
      const { supabase } = await import('../supabaseClient');
      
      const { data, error } = await supabase
        .from('payments')
        .insert({
          payment_id: response.razorpay_payment_id,
          order_id: response.razorpay_order_id,
          amount: response.amount / 100,
          currency: 'INR',
          status: 'SUCCESS',
          payment_method: 'Razorpay',
          verification_data: verificationData,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          created_at: new Date().toISOString()
        });

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  handlePaymentFailure(error) {
    return { success: false, error: error.message || 'Payment failed' };
  }

  getAvailablePaymentMethods() {
    return [
      {
        id: 'razorpay',
        name: 'Razorpay',
        icon: '💳',
        description: 'Pay using UPI, Cards, Net Banking',
        type: 'GATEWAY'
      }
    ];
  }
}

export default new RazorpayService(); 