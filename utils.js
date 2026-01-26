const { jwtVerify, createRemoteJWKSet } = require("jose");

const getCurrentUrl = (req) => {
  const currentUrl = process.env.TOKEN_CALLBACK + req['_parsedUrl'].search;
  return new URL(currentUrl);
}

const jwks = createRemoteJWKSet(
  new URL(
    `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`
  )
);

async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
  });

  if (payload.token_use !== "access") {
    throw new Error("Invalid token_use: expected ID token");
  }

  if(payload.client_id !== process.env.COGNITO_CLIENT_ID) {
    throw new Error("Invalid client_id");
  }

  return payload;
}

module.exports = { getCurrentUrl, verifyAccessToken };
