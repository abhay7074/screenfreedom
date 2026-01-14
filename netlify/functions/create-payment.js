// netlify/functions/create-payment.js
const fetch = require('node-fetch');

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
    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;

    console.log('=== ENVIRONMENT CHECK ===');
    console.log('App ID exists:', !!appId);
    console.log('App ID value:', appId);
    console.log('Secret Key exists:', !!secretKey);
    console.log('Secret Key prefix:', secretKey?.substring(0, 20));

    if (!appId || !secretKey) {
      console.error('CRITICAL: Missing credentials');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Configuration error',
          details: 'Missing API credentials'
        })
      };
    }

    const { customerName, customerEmail } = JSON.parse(event.body);

    if (!customerName || !customerEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    const orderId = 'ORDER_' + Date.now();
    const customerId = 'CUST_' + Date.now();

    const requestBody = {
      order_amount: 397,
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: customerId,
        customer_email: customerEmail,
        customer_phone: "9999999999",
        customer_name: customerName
      },
      order_meta: {
        return_url: `https://screenfreedom.netlify.app/thank-you.html?order_id=${orderId}`,
        notify_url: "https://screenfreedom.netlify.app/.netlify/functions/payment-webhook"
      }
    };

    console.log('=== REQUEST DETAILS ===');
    console.log('Order ID:', orderId);
    console.log('Customer:', customerName, customerEmail);
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));

    const apiUrl = 'https://api.cashfree.com/pg/orders';

    console.log('=== API CALL ===');
    console.log('URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    console.log('=== API RESPONSE ===');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Response Body:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', e);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Invalid response from payment gateway',
          details: responseText
        })
      };
    }

    if (!response.ok) {
      console.error('=== API ERROR ===');
      console.error('Error Response:', result);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'Payment gateway error', 
          details: result,
          message: result.message || 'Unknown error'
        })
      };
    }

    console.log('=== SUCCESS ===');
    console.log('Payment Session ID:', result.payment_session_id);
    console.log('Order ID:', result.order_id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orderId: result.order_id,
        paymentSessionId: result.payment_session_id,
        paymentLink: `https://payments.cashfree.com/order/#${result.payment_session_id}`,
        orderAmount: 397,
        customerEmail: customerEmail
      })
    };

  } catch (error) {
    console.error('=== FUNCTION ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message
      })
    };
  }
};
