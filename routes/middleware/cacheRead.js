const cache = require('../../components/nodeCache');

module.exports = (req,res,next) => {
  try {
    const data = cache.get(req.originalUrl);
    if(data) {
      console.debug(`[CACHE] Using Cached Data...`);
      return res.status(200).json(data);
    }
  } catch (error) {
    console.debug(`[CACHE] Cache error ${error}`);
  }

  next();
};
