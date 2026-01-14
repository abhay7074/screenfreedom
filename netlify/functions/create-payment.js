// netlify/functions/create-payment.js
const fetch = require('node-fetch');

const CASHFREE_CONFIG = {
  appId: process.env.CASHFREE_APP_ID,
  secretKey: process.env.CASHFREE_SECRET_KEY,
  apiVersion: '2023-08-01',
  environment: 'production'
};

const CASHFREE_API = {
  production: 'https://api.cashfree.com/pg',
  sandbox: 'https://sandbox.cashfree.com/pg'
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { customerName, customerEmail } = JSON.parse(event.body);

    if (!customerName || !customerEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    const orderId = 'SF_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const orderAmount = 397;
    const orderCurrency = 'INR';

    const orderData = {
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: orderCurrency,
      customer_details: {
        customer_id: 'CUST_' + Date.now(),
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: '9999999999'
      },
      order_meta: {
        return_url: `https://screenfreedom.netlify.app/thank-you.html?order_id=${orderId}&email=${encodeURIComponent(customerEmail)}`,
        notify_url: 'https://screenfreedom.netlify.app/.netlify/functions/payment-webhook'
      },
      order_note: 'Screen Freedom eBook Purchase'
    };

    const apiUrl = CASHFREE_API[CASHFREE_CONFIG.environment] + '/orders';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': CASHFREE_CONFIG.apiVersion,
        'x-client-id': CASHFREE_CONFIG.appId,
        'x-client-secret': CASHFREE_CONFIG.secretKey
      },
      body: JSON.stringify(orderData)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Cashfree API Error:', result);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'Payment gateway error', details: result })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orderId: orderId,
        paymentSessionId: result.payment_session_id,
        paymentLink: result.payment_link || `https://payments.cashfree.com/order/#${result.payment_session_id}`,
        orderAmount: orderAmount,
        customerEmail: customerEmail
      })
    };

  } catch (error) {
    console.error('Function Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    };
  }
};
