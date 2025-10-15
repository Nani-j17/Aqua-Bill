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

  // Load Razorpay script
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

  // Generate unique order ID
  generateOrderId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `ORDER_${timestamp}_${random}`.toUpperCase();
  }

  // Create payment order
  async createOrder(amount, currency = 'INR') {
    try {
      // Validate amount
      if (!amount || amount <= 0) {
        throw new Error('Invalid payment amount');
      }
      
      // Minimum amount check (₹1)
      if (amount < 1) {
        throw new Error('Minimum payment amount is ₹1');
      }
      
      const orderId = this.generateOrderId();
      
      const options = {
        key: this.config.KEY_ID,
        amount: Math.round(amount * 100), // Razorpay expects amount in paise
        currency: currency,
        name: this.config.NAME,
        description: `${this.config.DESCRIPTION} - ₹${amount.toFixed(2)}`,
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
            console.log('Payment cancelled by user');
          }
        },
        retry: {
          enabled: true,
          max_count: 3
        },
        callback_url: window.location.origin + '/billing',
        notes: {
          payment_for: 'water_bill',
          amount: amount.toString()
        }
      };

      return { success: true, options, orderId };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      return { success: false, error: error.message };
    }
  }

  // Initialize payment
  async initiatePayment(amount, userDetails = {}) {
    try {
      // Validate inputs
      if (!amount || amount <= 0) {
        throw new Error('Invalid payment amount');
      }

      const Razorpay = await this.loadScript();
      
      const orderResult = await this.createOrder(amount);
      if (!orderResult.success) {
        throw new Error(orderResult.error);
      }

      const { options } = orderResult;

      // Update prefill with user details if provided
      if (userDetails.name) options.prefill.name = userDetails.name;
      if (userDetails.email) options.prefill.email = userDetails.email;
      if (userDetails.contact) options.prefill.contact = userDetails.contact;

      return new Promise((resolve, reject) => {
        try {
          const razorpayInstance = new Razorpay({
            ...options,
            handler: async (response) => {
              try {
                console.log('Payment successful:', response);
                
                // Update bill status in database
                await this.updateBillStatus(amount);
                
                // Save payment record
                await this.savePaymentRecord(response, {
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                  signature: response.razorpay_signature
                });
                
                resolve({ success: true, data: response });
              } catch (error) {
                console.error('Error handling payment success:', error);
                resolve({ success: true, data: response }); // Still resolve as success even if save fails
              }
            }
          });
          
          razorpayInstance.on('payment.failed', (response) => {
            console.error('Payment failed:', response);
            const errorMessage = response.error?.description || 
                               response.error?.reason || 
                               'Payment failed due to technical issues';
            reject(new Error(errorMessage));
          });

          razorpayInstance.on('payment.cancelled', (response) => {
            console.log('Payment cancelled:', response);
            reject(new Error('Payment was cancelled'));
          });

          // Open payment modal
          razorpayInstance.open();
        } catch (error) {
          console.error('Error creating Razorpay instance:', error);
          reject(new Error('Failed to initialize payment gateway'));
        }
      });
    } catch (error) {
      console.error('Razorpay payment initiation error:', error);
      throw error;
    }
  }

  // Handle successful payment
  async handlePaymentSuccess(response) {
    try {
      // Verify payment on your backend
      const verificationResult = await this.verifyPayment(response);
      
      if (verificationResult.success) {
        // Save payment record to database
        await this.savePaymentRecord(response, verificationResult.data);
        return { success: true, data: response };
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.error('Payment success handling error:', error);
      throw error;
    }
  }

  // Verify payment with backend
  async verifyPayment(response) {
    try {
      // This should call your backend API to verify the payment
      // For now, we'll return a mock verification
      return {
        success: true,
        data: {
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature
        }
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Update bill status after successful payment
  async updateBillStatus(amount) {
    try {
      const { supabase } = await import('../supabaseClient');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      // Find unpaid bills for this user and mark them as paid
      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'Unpaid')
        .order('date', { ascending: false });

      if (billsError) {
        console.error('Error fetching bills:', billsError);
        return;
      }

      // Calculate total unpaid amount
      const totalUnpaid = bills.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
      
      // If payment amount matches or exceeds total unpaid, mark all as paid
      if (amount >= totalUnpaid) {
        const { error: updateError } = await supabase
          .from('bills')
          .update({ status: 'Paid' })
          .eq('user_id', user.id)
          .eq('status', 'Unpaid');

        if (updateError) {
          console.error('Error updating bill status:', updateError);
        } else {
          console.log('All unpaid bills marked as paid');
        }
      }
    } catch (error) {
      console.error('Error updating bill status:', error);
    }
  }

  // Save payment record to database
  async savePaymentRecord(response, verificationData) {
    try {
      const { supabase } = await import('../supabaseClient');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user found');
        return null;
      }
      
      const { data, error } = await supabase
        .from('payments')
        .insert({
          payment_id: response.razorpay_payment_id,
          order_id: response.razorpay_order_id,
          amount: response.amount / 100, // Convert from paise to rupees
          currency: 'INR',
          status: 'SUCCESS',
          payment_method: 'Razorpay',
          verification_data: verificationData,
          user_id: user.id,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving payment record:', error);
        // Don't throw error, just log it
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error saving payment record:', error);
      // Don't throw error, just log it
      return null;
    }
  }

  // Handle payment failure
  handlePaymentFailure(error) {
    console.error('Payment failed:', error);
    return { success: false, error: error.message || 'Payment failed' };
  }

  // Get available payment methods
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