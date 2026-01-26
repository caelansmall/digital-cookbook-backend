const { verifyAccessToken } = require("./utils");

const excludeAuthURLs = ['/login', '/token', '/refresh'];

const authMiddleware = async (req, res, next) => {
  if (excludeAuthURLs.includes(req.path)) {
    console.log("Bypassing JWT verification for " + req.path);
    next();
    return;
  }

  try {
    const token = req.signedCookies.ACCESS_TOKEN;
    if(!token) throw new Error("Missing token");

    const payload = await verifyAccessToken(token);

    req.user = payload;
    next();
  } catch (error) {
    console.error('Auth failed:',error);
    res.clearCookie("ACCESS_TOKEN");
    return res.status(401).send("Unauthenticated");
  }
}

module.exports = authMiddleware;
