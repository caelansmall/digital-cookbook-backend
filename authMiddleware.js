const { verifyJWT } = require("./utils");

const excludeAuthURLs = new Set(['/login', '/token'])

const authMiddleware = async (req, res, next) => {
  if (excludeAuthURLs.has(req.path)) {
    console.log("Bypassing JWT verification for " + req.path);
    next();
    return;
  }

  const { ACCESS_TOKEN: accessToken } = req.signedCookies;
  if(verifyJWT(accessToken, jwtSigningKey)) next();
  else res.status(401).send("Unauthenticated");
}

module.exports = authMiddleware;