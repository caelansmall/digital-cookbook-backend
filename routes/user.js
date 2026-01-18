require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const router = express.Router();
const authMiddleware = require('../authMiddleware');
const { psgres } = require('../postgres-connect');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;

const allowedOrigins = ["http://localhost:5173",];

// CORS middleware
const corsOptions = {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT"],
    allowedHeaders: ["Content-Type",],
    credentials: true,
    maxAge: 10
};

router.use(cors(corsOptions));
router.use(cookieParser(process.env.COOKIE_SECRET));
router.use(authMiddleware);

router.route('/username/:username') // /api/user/username/:username
.get(async (req,res) => {
    console.log('\n\nIN USERNAME QUERY\n\n')
    const username = req.params.username;

    console.log(username);

    const { rows } = await psgres('SELECT * FROM webuser');
    console.log(rows);
})

module.exports = router;