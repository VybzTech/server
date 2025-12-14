const paystackKey = process.env.PAYSTACK_SECRET_KEY;
const stripeKey = process.env.STRIPE_SECRET_KEY;

const stripe = require('stripe')(stripeKey);
const paystack = require('paystack')(paystackKey);