router.post('/initialize-payment', async (req, res) => {
  const { amount, email, currency, paymentMethod, userLocation } = req.body;
  
  try {
    // Route to appropriate provider
    if (userLocation === 'NG' || currency === 'NGN') {
      // Use Paystack for Nigerian transactions
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email,
          amount: amount * 100, // Kobo
          currency: 'NGN',
          channels: ['card', 'bank', 'ussd', 'mobile_money'],
          metadata: {
            custom_fields: [
              { payment_method: paymentMethod }
            ]
          }
        },
        {
          headers: {
            Authorization: `Bearer ${paystackKey}`
          }
        }
      );
      
      return res.json({
        provider: 'paystack',
        data: response.data
      });
    } else {
      // Use Stripe for international
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Cents
        currency: currency.toLowerCase(),
        automatic_payment_methods: { enabled: true }
      });
      
      return res.json({
        provider: 'stripe',
        clientSecret: paymentIntent.client_secret
      });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});