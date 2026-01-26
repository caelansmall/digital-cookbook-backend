require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const client = require("openid-client")
const cors = require('cors');
const { psgres } = require('./postgres-connect');
const authMiddleware = require('./authMiddleware');
const { getCurrentUrl, } = require('./utils');
const { readUserByCognitoSub } = require('./api');

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

const app = express();
const port = process.env.PORT || 8080;

// List of allowed origins
const allowedOrigins = ["http://localhost:5173",];

// CORS middleware
const corsOptions = {
  origin: allowedOrigins, // Pass the list of domains
  methods: ["GET", "POST"], // Allow only GET and POST methods
  allowedHeaders: ["Content-Type", "Authorization", "X-Custom-Header"], // Allow only these headers
  credentials: true, // Allow credentials (cookies) to be sent
  maxAge: 10,
};

// Enable CORS with options
app.use(cors(corsOptions));

app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json());

app.get('/login',
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
    res.send(JSON.stringify({ cognitoLoginURL }));
  }
)

app.get('/token',
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

      res.cookie('ACCESS_TOKEN', tokens.id_token, {
        httpOnly: true,
        signed: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'prod'
      });

      res.cookie('REFRESH_TOKEN', tokens.refresh_token, {
        httpOnly: true,
        signed: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'prod',
      });

      res.clearCookie('state');
      res.clearCookie('code_verifier');

      res.redirect(process.env.CALLBACK_DOMAIN);
    } catch (error) {
      console.error(error);
      res.status(500).send("Authentication failed");
    }
  }
);

app.use(authMiddleware);

app.use("/api", require('./routes/index'))

app.get('/me',
  async(req,res) => {
    if(!req.user) return res.status(401).send(null);

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
  async(req,res) => {
    try {
      const refreshToken = req.signedCookies.REFRESH_TOKEN;
      if (!refreshToken) throw new Error("Missing refresh token");

      const tokens = await client.refreshTokenGrant(config, refreshToken);

      res.cookie('ACCESS_TOKEN', tokens.id_token, {
        httpOnly: true,
        signed: true,
        sameSite: 'lax',
      });

      res.sendStatus(204);
    } catch (error) {
      res.clearCookie("ACCESS_TOKEN");
      res.clearCookie("REFRESH_TOKEN");
      res.status(401).send("Session expired");
    }
  }
);

app.get('/users',
  async (req, res) => {
    
    try {
      console.log('IN QUERY')
      const { rows } = await psgres('SELECT * FROM webUser');
      res.json(rows);  
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  }
);

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});