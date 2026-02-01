require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const client = require("openid-client")
const cors = require('cors');
const authMiddleware = require('./authMiddleware');
const { getCurrentUrl, } = require('./utils');
const { readUserByCognitoSub, createUser } = require('./api');

let config;

async function initializeServer() {
  // Initialize OpenID Client
  const server = new URL(
    `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`
  );

  config = await client.discovery(
    server,
    process.env.COGNITO_CLIENT_ID,
    process.env.COGNITO_CLIENT_SECRET,
  );

}

initializeServer().catch(console.error);

const authCookieConfig = {
  httpOnly: true,
  signed: true,
  sameSite: process.env.NODE_ENV === 'prod' ? 'none' : 'lax',
  secure: process.env.NODE_ENV === 'prod',
}

const app = express();
const port = process.env.PORT || 8080;

// List of allowed origins
const allowedOrigins = [
  "http://localhost:5173",
  "https://thedigitalcookbook.com",
  "https://www.thedigitalcookbook.com"
];

// CORS middleware
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json());

authCors = cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Custom-Header"],
  credentials: true,
});

apiCors = cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Custom-Header"],
  credentials: true,
});

app.options("/api", apiCors);

app.get('/health', (req,res) => {
  res.status(200).send('OK');
});

app.get('/login',
  authCors,
  async (req, res) => {
    console.log('Login requested...');
    const code_verifyer = client.randomPKCECodeVerifier();
    const code_challenge = await client.calculatePKCECodeChallenge(code_verifyer);
    const state = client.randomState();
    let parameters = {
      redirect_uri: process.env.TOKEN_CALLBACK,
      code_challenge,
      code_challenge_method: 'S256',
      state
    };
    const cognitoLoginURL = client.buildAuthorizationUrl(config, parameters).href;

    res.cookie('state', state, { httpOnly: true, signed: true });
    res.cookie('code_verifier', code_verifyer, { httpOnly: true, signed: true });
    // res.send(JSON.stringify({ cognitoLoginURL }));
    res.redirect(cognitoLoginURL);
  }
)

app.get('/token',
  authCors,
  async (req, res) => {
    try {
      const { state, code_verifier } = req.signedCookies;

      const tokens = await client.authorizationCodeGrant(
        config,
        getCurrentUrl(req),
        {
          pkceCodeVerifier: code_verifier,
          expectedState: state,
        }
      );

      res.cookie('ACCESS_TOKEN', tokens.access_token, authCookieConfig);

      res.cookie('REFRESH_TOKEN', tokens.refresh_token, authCookieConfig);

      res.clearCookie('state');
      res.clearCookie('code_verifier');

      res.redirect(process.env.CALLBACK_DOMAIN);
    } catch (error) {
      console.error(error);
      res.status(500).send("Authentication failed");
    }
  }
);

// app.use(authMiddleware);

app.options("/api/", cors());

app.use("/api",
  apiCors,
  authMiddleware,
  require('./routes/index')
);

app.get('/me',
  apiCors,
  authMiddleware,
  async(req,res) => {
    // if(!req.user) return res.status(401).json({ error: 'Not authenticated' });

    let data = await readUserByCognitoSub(req.user.sub);

    if(data.length == 0) {
      data = await createUser({
        cognitoSub: req.user.sub,
      });
    }

    if (!data.length) {
      return res.status(404).send("User not found");
    }

    res.json(data[0]);
  }
);

app.post("/refresh",
  authCors,
  async(req,res) => {
    try {
      const refreshToken = req.signedCookies.REFRESH_TOKEN;
      if (!refreshToken) throw new Error("Missing refresh token");

      const tokens = await client.refreshTokenGrant(config, refreshToken);

      res.cookie('ACCESS_TOKEN', tokens.access_token, authCookieConfig);

      res.sendStatus(204);
    } catch (error) {
      res.clearCookie("ACCESS_TOKEN");
      res.clearCookie("REFRESH_TOKEN");
      res.status(401).send("Session expired");
    }
  }
);

// app.get('/users',
//   async (req, res) => {
    
//     try {
//       console.log('IN QUERY')
//       const { rows } = await psgres('SELECT * FROM webUser');
//       res.json(rows);  
//     } catch (err) {
//       console.error(err);
//       res.status(500).send('Server Error');
//     }
//   }
// );

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});