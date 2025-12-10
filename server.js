import express from "express"; 
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { pool } from "./db.js";
import propertyRoutes from "./routes/property.js";
import bookingRoutes from "./routes/booking.js";
import paymentRoutes from "./routes/payment.js";
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use("/properties", propertyRoutes);
app.use("/bookings", bookingRoutes);
app.use("/payments", paymentRoutes);


// ------------------------ REGISTER ------------------------
app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const hashed = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (name, email, password, role)
             VALUES ($1,$2,$3,$4)
             RETURNING id, email, name, role`,
            [name, email, hashed, "user"]
        );

        res.json({ success: true, user: result.rows[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});



// // ------------------------ LOGIN ------------------------
// app.post("/login", async (req, res) => {
//     const { email, password } = req.body;

//     // 🔥 ADMIN LOGIN (virtual, not stored in DB)
//     if (email === "admin" && password === process.env.DB_PASSWORD) {
//         // const token = jwt.sign(
//         //     { id: 0, email: "admin", role: "admin" },
//         //     process.env.JWT_SECRET,
//         //     { expiresIn: "7d" }
//         // );
//         const token = jwt.sign(
//     { id: user.id, email: user.email, role: user.role },
//     process.env.JWT_SECRET,
//     { expiresIn: "7d" }
// );

//         return res.json({
//             success: true,
//             admin: true,
//             token,
//             user: {
//                 id: 0,
//                 name: "Administrator",
//                 email: "admin",
//                 role: "admin"
//             }
//         });
//     }

//     // 🔥 NORMAL USER LOGIN
//     try {
//         const result = await pool.query(
//             "SELECT * FROM users WHERE email=$1",
//             [email]
//         );

//         const user = result.rows[0];
//         if (!user) return res.status(404).json({ error: "User not found" });

//         const match = await bcrypt.compare(password, user.password);
//         if (!match) return res.status(401).json({ error: "Invalid password" });

//         const token = jwt.sign(
//             { id: user.id, email: user.email, role: "user" },
//             process.env.JWT_SECRET,
//             { expiresIn: "7d" }
//         );

//         res.json({
//             success: true,
//             token,
//             user: {
//                 id: user.id,
//                 name: user.name,
//                 email: user.email,
//                 role: "user"
//             }
//         });

//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// });

// ------------------------ LOGIN ------------------------
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    // 🔥 ADMIN LOGIN (virtual)
    if (email === "admin" && password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign(
            { id: 0, email: "admin", role: "admin" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.json({
            success: true,
            token,
            user: {
                id: 0,
                name: "Administrator",
                email: "admin",
                role: "admin"
            }
        });
    }

    // 🔥 NORMAL USER LOGIN (DB)
    try {
        const result = await pool.query(
            "SELECT id, name, email, password, role FROM users WHERE email=$1",
            [email]
        );

        const user = result.rows[0];
        if (!user) return res.status(404).json({ error: "User not found" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: "Invalid password" });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ------------------------ CURRENT USER ------------------------
// app.get("/me", async (req, res) => {
//     const token = req.headers.authorization?.split(" ")[1];
//     if (!token) return res.status(401).json({ error: "No token" });

//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);

//         // 🔥 ADMIN CHECK
//         if (decoded.role === "admin") {
//             return res.json({
//                 id: 0,
//                 name: "Administrator",
//                 email: "admin",
//                 role: "admin"
//             });
//         }

//         // 🔥 NORMAL USER
//         const result = await pool.query(
//             "SELECT id, name, email FROM users WHERE id=$1",
//             [decoded.id]
//         );

//         const user = result.rows[0];
//         res.json({ ...user, role: "user" });

//     } catch (err) {
//         res.status(401).json({ error: "Invalid token" });
//     }
// });

app.get("/me", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role === "admin") {
            return res.json({
                id: 0,
                name: "Administrator",
                email: "admin",
                role: "admin"
            });
        }

        const result = await pool.query(
            "SELECT id, name, email, role FROM users WHERE id=$1",
            [decoded.id]
        );

        res.json(result.rows[0]);

    } catch (err) {
        res.status(401).json({ error: "Invalid token" });
    }
});

app.listen(process.env.PORT, () => console.log("🚀 Backend running on desired port "));
