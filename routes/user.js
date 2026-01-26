const { 
  readUserByUsername,
  createUser,
  readUserByCognitoSub,
} = require('../api');
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const router = express.Router();
const authMiddleware = require('../authMiddleware');
const cors = require('cors');

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

router.route('/cognito/:cognitoSub') // /api/user/cognito/:cognitoSub
.get(
  async (req,res) => {
    try {
      const cognitoSub = req.params.cognitoSub;

      let data = await readUserByCognitoSub(cognitoSub);

      if(data.length == 0) {
        data = await createUser({
          cognitoSub: cognitoSub,
        });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error(`[API] Error:`,error);
      return res.status(500).json(error);
    }
  }
)

router.route('/username/:username') // /api/user/username/:username
.get(async (req,res) => {
  try {
    const username = req.params.username;

    let data = await readUserByUsername(username);

    if(data.length == 0) {
      data = await createUser({
        username: username,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error(`[API] Error:`,error);
    return res.status(400).json(error);
  }

});

module.exports = router;
