require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const client = require("openid-client")
const cors = require('cors');

const authMiddleware = require('./authMiddleware');
const { getCurrentUrl, getCognitoJWTPublicKey } = require('./utils');

global.jwtSigningKey;
let config;

async function initializeServer() {
  // Initialize OpenID Client
  let server = new URL(`https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`)
  let clientId = process.env.COGNITO_CLIENT_ID;
  let clientSecret = process.env.COGNITO_CLIENT_SECRET;
  config = await client.discovery(
    server,
    clientId,
    clientSecret,
  );

  jwtSigningKey = await getCognitoJWTPublicKey(server.href + "/.well-known/jwks.json");
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
app.use(authMiddleware);

app.get('/login',
  async (req, res) => {
    const code_verifyer = client.randomPKCECodeVerifier();
    const code_challenge = await client.calculatePKCECodeChallenge(code_verifyer);
    const state = client.randomState();
    let parameters = {
      redirect_uri: process.env.CALLBACK_DOMAIN,
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
      // console.log(state, code_verifier, config, getCurrentUrl(req));
      let tokens = await client.authorizationCodeGrant(
        config,
        getCurrentUrl(req),
        {
          pkceCodeVerifier: code_verifier,
          expectedState: state,
        },
      );

      res.cookie('ACCESS_TOKEN', tokens.access_token, { httpOnly: true, signed: true });
      res.cookie('REFRESH_TOKEN', tokens.refresh_token, { httpOnly: true, signed: true });
      res.cookie('ID_TOKEN', tokens.id_token);
      res.clearCookie("state");
      res.clearCookie("code_verifier");
      res.send(tokens);
    } catch (error) {
      console.error(error);
      res.status(500).send(err);
    }
  }
)

app.get('/todos',
  async (req, res) => {
    const todos = ["task1", "task2", "task3"];
    const adminTodos = ["adminTask1", "admiTask2", "adminTask3"];
    const isAdmin = JSON.parse(Buffer.from(req?.signedCookies?.ACCESS_TOKEN?.split('.')[1], 'base64')?.toString('utf8'))['cognito:groups']?.includes('Admin');
    res.send(isAdmin ? adminTodos : todos)
  }
)

// app.get("/api", (req,res) => {
//   res.json({"fruits": ["apple", "banana", "pear"]});
// });

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});