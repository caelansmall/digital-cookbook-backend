require('dotenv').config();
const router = require('express').Router(),
      cookieParser = require('cookie-parser'),
      authMiddleware = require('../authMiddleware'),
      cache = require('../components/nodeCache'),
      readCache = require('./middleware/cacheRead'),
      cors = require('cors');

const { 
  readIngredientsByPartialName,
} = require('../api');

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

router.route('/autocomplete/:partialName')
.get(
  readCache,
  async (req,res) => {
    try {

      const partialName = req.params.partialName;

      let data = await readIngredientsByPartialName(partialName);

      cache.set(
        req.originalUrl,
        data,
        10 * 60
      );

      return res.status(200).json(data);
    } catch (error) {
      console.error(`[API] Error:`,error);
      return res.status(400).json(error);
    }
  }
);

module.exports = router;