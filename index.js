const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const CryptoJS = require("crypto-js");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(bodyParser.json());

const APP_MERCHANT_ID = "M22FZFKYOYNEQ";
const APP_SALT_KEY = "8b18cdf1-f908-4c16-bf5a-5959f74e0852";
const APP_SALT_INDEX = 1;

app.post("/api/phonepe/initiate", async (req, res) => {
  try {
    console.log("Received request body:", req.body); // ✅ Log incoming request

    const { name, amount, number, MUID, transactionId, redirectUrl } = req.body;

    const payload = {
      merchantId: APP_MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: MUID,
      name,
      amount: Math.round(amount * 100),
      redirectUrl,
      redirectMode: "POST",
      mobileNumber: number,
      paymentInstrument: { type: "PAY_PAGE" },
    };

    console.log("Constructed Payload:", payload); // ✅ Log payload before encoding

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString(
      "base64"
    );
    console.log("Payload Base64 Encoded:", payloadBase64); // ✅ Log base64 payload

    const checksum =
      CryptoJS.SHA256(`${payloadBase64}/pg/v1/pay${APP_SALT_KEY}`).toString() +
      `###${APP_SALT_INDEX}`;
    console.log("Generated checksum:", checksum); // ✅ Log checksum

    console.log("Sending request to PhonePe API...");
    const phonepeResponse = await axios.post(
      "https://api.phonepe.com/apis/hermes/pg/v1/pay",
      { request: payloadBase64 },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
          accept: "application/json",
        },
      }
    );

    console.log("PhonePe Response Data:", phonepeResponse.data); // ✅ Log full response from PhonePe

    const redirectUrlFromPhonePe =
      phonepeResponse.data?.data?.instrumentResponse?.redirectInfo?.url;

    if (redirectUrlFromPhonePe) {
      res.json({ success: true, redirectUrl: redirectUrlFromPhonePe });
    } else {
      console.log("No redirect URL found in PhonePe response"); // ✅
      res.status(500).json({
        success: false,
        message: "No redirect URL found from PhonePe",
      });
    }
  } catch (error) {
    console.error(
      "PhonePe payment error:",
      error?.response?.data || error.message
    ); // ✅
    res.status(500).json({
      success: false,
      message: error?.response?.data || "Internal Server Error",
    });
  }
});

app.get("/", (req, res) => {
  res.send("Server is running fine 🚀");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
