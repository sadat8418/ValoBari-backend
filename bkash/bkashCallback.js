import express from "express";
import { executePayment } from "./bkashService.js";
import { pool } from "../db.js";   //  REQUIRED
import connectDB from "./mongo.js";

const router = express.Router();
connectDB();

const bkashConfig = {
  base_url: process.env.BKASH_BASE_URL,
  username: process.env.BKASH_CHECKOUT_URL_USER_NAME,
  password: process.env.BKASH_CHECKOUT_URL_PASSWORD,
  app_key: process.env.BKASH_CHECKOUT_URL_APP_KEY,
  app_secret: process.env.BKASH_CHECKOUT_URL_APP_SECRET,
};

router.get("/callback", async (req, res) => {
  try {
    const { paymentID, status } = req.query;
    // req.headers.origin;
    const origin = process.env.FRONTEND_URL 

    // ❌ Cancel / failure
    if (!paymentID || status !== "success") {
      return res.redirect(
        303,
        `${origin}/payment-cancel`
        
      );
    }

    //  Execute payment
    const result = await executePayment(bkashConfig, paymentID);

    if (!result || result.statusCode !== "0000") {
      return res.redirect(
        303,
        `${origin}/payment-cancel`
      );
    }

    //  Update payment
    const paymentRes = await pool.query(
      `UPDATE payments
       SET status = 'completed',
           raw_response = $1,
           updated_at = NOW()
       WHERE provider_payment_id = $2
       RETURNING booking_id`,
      [
        JSON.stringify(result),
        paymentID,
      ]
    );

    //  Confirm booking
    if (paymentRes.rowCount > 0) {
      await pool.query(
        `UPDATE bookings
         SET status = 'confirmed'
         WHERE id = $1`,
        [paymentRes.rows[0].booking_id]
      );
    }

    return res.redirect(
      303,
      `${origin}/payment-success`
    );
  } catch (error) {
    console.error("bKash callback error:", error);
    return res.redirect(
      303,
      `${origin}/payment-cancel`
    );
  }
});

export default router;
