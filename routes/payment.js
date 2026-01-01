import express from "express"; 
import { pool } from "../db.js";

const router = express.Router();

// CREATE payment manually (if needed)
router.post("/", async (req, res) => {
    const { booking_id, provider } = req.body;
    const paymentCheck = await pool.query(
  `SELECT * FROM payments WHERE booking_id=$1 AND status='initiated'`,
  [booking.id]
);

if (paymentCheck.rowCount > 0) {
  return res.json({
    success: true,
    url: paymentCheck.rows[0].bkash_url // optional
  });
}

    const result = await pool.query(
        `INSERT INTO payments (
            booking_id, provider, status, raw_response
        )
        VALUES ($1, $2, 'initiated', $3)
        RETURNING *`,
        [booking_id, provider, "{}"] // store empty object as TEXT
    );

    res.json(result.rows[0]);
});

// UPDATE payment status (callback from Stripe/bKash)
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { status, transaction_id, raw_response } = req.body;

    await pool.query(
        `UPDATE payments
         SET status=$1,
             transaction_id=$2,
             raw_response=$3,
             updated_at=NOW()
         WHERE id=$4`,
        [
            status,
            transaction_id,
            typeof raw_response === "object"
                ? JSON.stringify(raw_response) // convert JS object → TEXT
                : (raw_response ?? "{}"),
            id
        ]
    );

    res.json({ success: true });
});



export default router;
