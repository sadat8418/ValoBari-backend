import express from "express";
import { pool } from "../db.js";
import { createPayment } from "./bkashService.js";
import connectMongo from "./mongo.js";
import authMiddleware from "../middleware/auth.js";
const router = express.Router();
connectMongo(); // ✅ ONLY for token storage

const bkashConfig = {
  base_url: process.env.BKASH_BASE_URL,
  username: process.env.BKASH_CHECKOUT_URL_USER_NAME,
  password: process.env.BKASH_CHECKOUT_URL_PASSWORD,
  app_key: process.env.BKASH_CHECKOUT_URL_APP_KEY,
  app_secret: process.env.BKASH_CHECKOUT_URL_APP_SECRET,
};

// router.post("/make-payment", async (req, res) => {
//   try {
//     const { bookingId } = req.body;

//     if (!bookingId) {
//       return res.status(400).json({ message: "Booking ID required" });
//     }

//     // ✅ FETCH BOOKING FROM POSTGRES
//     const bookingRes = await pool.query(
//       `SELECT * FROM bookings WHERE id = $1`,
//       [bookingId]
//     );

//     if (bookingRes.rowCount === 0) {
//       return res.status(404).json({ message: "Booking not found" });
//     }

//     const booking = bookingRes.rows[0];

//     // ❌ Prevent double payment
//     if (booking.status === "confirmed") {
//       return res.status(400).json({ message: "Already paid" });
//     }

//     const amount = booking.total_amount; // ✅ TRUSTED

//     const origin = req.headers.origin || "http://localhost:3000";
//     const orderID = `BOOK_${booking.id}_${Date.now()}`;

//     const paymentDetails = {
//       amount: amount.toString(),
//       callbackURL: `${process.env.BACKEND_URL}/api/bkash/callback`,
//       orderID,
//       reference: orderID,
//       phone: "01700000000",
//       name: "Customer",
//       email: "customer@example.com",
//     };

//     const response = await createPayment(bkashConfig, paymentDetails);

//     if (response?.statusCode !== "0000") {
//       return res.status(400).json({
//         success: false,
//         message: "Payment Failed",
//         response,
//       });
//     }

//     // ✅ SAVE PAYMENT IN POSTGRES
//     await pool.query(
//       `INSERT INTO payments
//        (booking_id, provider, status, provider_payment_id, raw_response)
//        VALUES ($1, 'bkash', 'initiated', $2, $3)`,
//       [
//         booking.id,
//         response.paymentID,
//         JSON.stringify(response),
//       ]
//     );

//     res.json({
//       success: true,
//       url: response.bkashURL,
//     });

//   } catch (err) {
//     console.error("Payment error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

router.post("/make-payment", authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user.id;

    const bookingRes = await pool.query(
      `SELECT * FROM bookings WHERE id=$1 AND user_id=$2`,
      [bookingId, userId]
    );

    if (bookingRes.rowCount === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = bookingRes.rows[0];

    if (booking.status === "confirmed") {
      return res.status(400).json({ message: "Already paid" });
    }

    const payerRef = `B${booking.id}`; // ✅ <= 20 chars
    const orderID = `BK${booking.id}${Date.now()}`;
const amount = booking.total_amount;


const origin = process.env.BACKEND_URL;

const paymentDetails = {
  amount: amount.toString(),
  callbackURL: `${origin}/api/callback`,
  orderID,
  phone: payerRef,
};
    const response = await createPayment(bkashConfig, paymentDetails);

    console.log("bKash response:", response); // 🔍 DEBUG

    if (response?.statusCode !== "0000") {
      return res.status(400).json({
        success: false,
        message: "Payment Failed",
        response,
      });
    }console.error("bKash create failed:", response);

    // await pool.query(
    //   `INSERT INTO payments
    //    (booking_id, provider, status, provider_payment_id, raw_response)
    //    VALUES ($1, 'bkash', 'initiated', $2, $3)`,
    //   [booking.id, response.paymentID, JSON.stringify(response)]
    // );
await pool.query(
  `INSERT INTO payments
   (booking_id, provider, transaction_id, provider_payment_id, status, raw_response)
   VALUES ($1, 'bkash', $2, $3, 'initiated', $4)`,
  [
    booking.id,
    orderID,                 // your reference
    response.paymentID,      // bKash paymentID
    JSON.stringify(response)
  ]
);

    res.json({
      success: true,
      url: response.bkashURL,
    });

  } catch (err) {
    console.error("Payment error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
