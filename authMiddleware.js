const { verifyAccessToken } = require("./utils");

const excludeAuthURLs = ['/login', '/token', '/refresh'];

const authMiddleware = async (req, res, next) => {
  if (excludeAuthURLs.includes(req.path)) {
    console.log("Bypassing JWT verification for " + req.path);
    next();
    return;
  }

  const token = req.signedCookies.ACCESS_TOKEN;
    if(!token) {
      req.user = null;
      return next();
    }

  try {
    const payload = await verifyAccessToken(token);

    req.user = payload;
    next();
  } catch (error) {
    if(error.code == 'ERR_JWT_EXPIRED') {
      req.user = null;
      return res.status(401).send("Token expired");
    }

    console.error('Auth failed:',error);
    res.clearCookie("ACCESS_TOKEN");
    res.clearCookie("REFRESH_TOKEN");
    return res.status(401).send("Unauthenticated");
  }
}

module.exports = authMiddleware;
