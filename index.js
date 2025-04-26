const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const CryptoJS = require('crypto-js');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(bodyParser.json());

const APP_MERCHANT_ID = 'M22FZFKYOYNEQ';
const APP_SALT_KEY = '8b18cdf1-f908-4c16-bf5a-5959f74e0852';
const APP_SALT_INDEX = 1;

app.post('/api/phonepe/initiate', async (req, res) => {
  try {
    const {
      name,
      amount,
      number,
      MUID,
      transactionId,
      redirectUrl,
    } = req.body;

    const payload = {
      merchantId: APP_MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: MUID,
      name: name,
      amount: amount * 100, // in paise
      redirectUrl: redirectUrl,
      redirectMode: 'POST',
      mobileNumber: number,
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const checksum = CryptoJS.SHA256(`${payloadBase64}/pg/v1/pay${APP_SALT_KEY}`).toString() + `###${APP_SALT_INDEX}`;

    const phonepeRes = await axios.post(
      'https://api.phonepe.com/apis/hermes/pg/v1/pay',
      { request: payloadBase64 },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
          accept: 'application/json',
        },
      }
    );

    const redirectUrlFromPhonePe = phonepeRes.data?.data?.instrumentResponse?.redirectInfo?.url;

    if (redirectUrlFromPhonePe) {
      res.json({ success: true, redirectUrl: redirectUrlFromPhonePe });
    } else {
      res.status(500).json({ success: false, message: 'No redirect URL found' });
    }
  } catch (error) {
        console.error('Error initiating payment:', error.message);
        if (error.response) {
          console.error('PhonePe Response Error:', error.response.data);
        }
        res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.get('/', async (req, res) => {
    res.send("data is getting url is working");
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
