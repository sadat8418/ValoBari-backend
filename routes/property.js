import express from "express";
import { pool } from "../db.js";
import authMiddleware from "../middleware/auth.js";
import adminMiddleware from "../middleware/admin.js";
import upload from "../middleware/upload.js";
const router = express.Router();

/* ============================================================
   CREATE PROPERTY (ADMIN ONLY)
============================================================ */

router.post(
    "/",
    authMiddleware,
    adminMiddleware,
    upload.single("image"),
    async (req, res) => {
        try {
            const {
                category_id,
                name,
                slug,
                description,
                location,
                price,
                bedrooms,
                bathrooms,
                amenities,
                status
            } = req.body;

            // ✅ Cloudinary URL (already uploaded)
            const imageUrl = req.file ? req.file.path : null;

const baseSlug = slug.toLowerCase().replace(/\s+/g, "-");
let finalSlug = baseSlug;
let counter = 1;

// check duplicates
while (true) {
    const check = await pool.query(
        "SELECT id FROM properties WHERE slug=$1",
        [finalSlug]
    );
    if (check.rows.length === 0) break;
    finalSlug = `${baseSlug}-${counter++}`;
}

            const result = await pool.query(
                `INSERT INTO properties
                (category_id, name, slug, description, location, price,
                 bedrooms, bathrooms, amenities, status, image)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                 RETURNING *`,
                [
                    category_id,
                    name,
                    finalSlug,
                    description,
                    location,
                    price,
                    bedrooms,
                    bathrooms,
                    amenities,              // TEXT
                    status || "active",
                    imageUrl                // ✅ SAVED
                ]
            );

            res.json({ success: true, property: result.rows[0] });

        } catch (err) {
    if (err.code === "23505") {
        return res.status(409).json({
            success: false,
            error: "Slug already exists. Try a different one."
        });
    }
    res.status(500).json({ success: false, error: err.message });
}
    }
);


/* ============================================================
   GET ALL PROPERTIES (PUBLIC)
============================================================ */
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, c.name AS category_name 
            FROM properties p
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.id DESC;
        `);

        res.json({ success: true, properties: result.rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/* ============================================================
   GET ONE PROPERTY (PUBLIC)
============================================================ */
router.get("/:id", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, c.name AS category_name 
             FROM properties p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.id=$1`,
            [req.params.id]
        );

        if (result.rows.length === 0)
            return res.status(404).json({ error: "Property not found" });

        res.json({ success: true, property: result.rows[0] });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/* ============================================================
   UPDATE PROPERTY (ADMIN ONLY)
============================================================ */
router.put(
    "/:id",
    authMiddleware,
    adminMiddleware,
    upload.single("image"),
    async (req, res) => {
        try {
            const {
                category_id,
                name,
                slug,
                description,
                location,
                price,
                bedrooms,
                bathrooms,
                amenities,
                status
            } = req.body;

            const imageUrl = req.file ? req.file.path : null;

            const result = await pool.query(
                `UPDATE properties SET
                    category_id=$1,
                    name=$2,
                    slug=$3,
                    description=$4,
                    location=$5,
                    price=$6,
                    bedrooms=$7,
                    bathrooms=$8,
                    amenities=$9,
                    status=$10,
                    image=COALESCE($11, image),
                    updated_at=NOW()
                 WHERE id=$12
                 RETURNING *`,
                [
                    Number(category_id),
                    name,
                    slug,
                    description,
                    location,
                    Number(price),
                    Number(bedrooms),
                    Number(bathrooms),
                    amenities,
                    status,
                    imageUrl,
                    req.params.id
                ]
            );

            res.json({ success: true, property: result.rows[0] });

        } catch (err) {
            console.error("UPDATE PROPERTY ERROR:", err);
            res.status(500).json({ success: false, error: err.message });
        }
    }
);


/* ============================================================
   DELETE PROPERTY (ADMIN ONLY)
============================================================ */
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await pool.query("DELETE FROM properties WHERE id=$1", [
            req.params.id
        ]);

        res.json({ success: true, message: "Property deleted" });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
