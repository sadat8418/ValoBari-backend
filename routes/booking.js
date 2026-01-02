import express from "express";
import { pool } from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// CREATE BOOKING + PAYMENT
// router.post("/", authMiddleware, async (req, res) => {
//     try {
//         const userId = req.user.id;
//         const { property_id, total_amount } = req.body;

//         // 1️⃣ Create booking
//         const booking = await pool.query(
//             `INSERT INTO bookings (user_id, property_id, total_amount, status)
//              VALUES ($1, $2, $3, 'pending')
//              RETURNING *`,
//             [userId, property_id, total_amount]
//         );

//         const bookingId = booking.rows[0].id;

//         // 2️⃣ Create payment row 
//         const payment = await pool.query(
//             `INSERT INTO payments (booking_id, provider, status, raw_response)
//              VALUES ($1, 'manual', 'initiated', $2)
//              RETURNING *`,
//             [bookingId, "{}"] 
//         );

//         res.json({
//             success: true,
//             booking: booking.rows[0],
//             payment: payment.rows[0]
//         });

//     } catch (err) {
//         console.error("BOOKING ERROR:", err);
//         res.status(500).json({ success: false, error: err.message });
//     }
// });
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { property_id } = req.body;

    // 🔒 Get price from property
    const propertyRes = await pool.query(
      `SELECT price FROM properties WHERE id = $1`,
      [property_id]
    );

    if (propertyRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Property not found" });
    }

    const total_amount = propertyRes.rows[0].price;

    const bookingRes = await pool.query(
      `INSERT INTO bookings (user_id, property_id, total_amount, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [userId, property_id, total_amount]
    );

    res.json({
      success: true,
      booking: bookingRes.rows[0],
    });

  } catch (err) {
    console.error("BOOKING ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET booking details


router.get("/my", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
console.log("Fetching bookings for user:", userId);
        const result = await pool.query(
            // `SELECT b.*, p.name AS property_name,
            //         py.status AS payment_status,
            //         py.id AS payment_id
            //  FROM bookings b
            //  JOIN properties p ON b.property_id = p.id
            //  LEFT JOIN payments py ON py.booking_id = b.id
            //  WHERE b.user_id = $1
            //  ORDER BY b.created_at DESC`,
            `SELECT b.*, p.name AS property_name,
       COALESCE(py.status, 'initiated') AS payment_status,
       py.id AS payment_id
FROM bookings b
JOIN properties p ON b.property_id = p.id
LEFT JOIN payments py ON py.booking_id = b.id
WHERE b.user_id = $1
ORDER BY b.created_at DESC`,
            [userId]
        );

        res.json({ success: true, bookings: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT b.*, u.name AS user_name, p.name AS property_name
             FROM bookings b
             JOIN users u ON b.user_id = u.id
             JOIN properties p ON b.property_id = p.id
             WHERE b.id = $1`,
            

            [id]
        );

        res.json(result.rows[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // delete payment first
        await pool.query(`DELETE FROM payments WHERE booking_id = $1`, [id]);

        // delete booking
        const result = await pool.query(
            `DELETE FROM bookings WHERE id=$1 AND user_id=$2 RETURNING *`,
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.json({ success: false, error: "Not found" });
        }

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


export default router;
