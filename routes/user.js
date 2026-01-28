require('dotenv').config();
const router = require('express').Router(),
      cookieParser = require('cookie-parser'),
      authMiddleware = require('../authMiddleware'),
      cors = require('cors')
      cache = require('../components/nodeCache'),
      readCache = require('./middleware/cacheRead');

const allowedOrigins = ["http://localhost:5173",];

const { 
  readUserByUsername,
  createUser,
  readUserByCognitoSub,
} = require('../api');

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
  readCache,
  async (req,res) => {
    try {
      const cognitoSub = req.params.cognitoSub;

      let data = await readUserByCognitoSub(cognitoSub);

      if(data.length == 0) {
        data = await createUser({
          cognitoSub: cognitoSub,
        });
      }

      cache.set(
        req.originalUrl,
        data,
        10 * 60
      );

      return res.status(200).json(data);
    } catch (error) {
      console.error(`[API] Error:`,error);
      return res.status(500).json(error);
    }
  }
)

router.route('/username/:username') // /api/user/username/:username
.get(
  readCache,
  async (req,res) => {
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
  }
);

module.exports = router;
