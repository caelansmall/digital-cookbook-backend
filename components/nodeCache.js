const NodeCache = require('node-cache');

const MINUTE = 60;

const cache = new NodeCache(
  {
    stdTTL: 10 * MINUTE,
    chcekperiod: 1 * MINUTE,
  }
);

cache.on(
  'set',
  (key,value) => {
    console.info(`CACHE "${key}" set...`);
  }
).on(
  'del',
  (key,value) => {
    console.info(`[CACHE] "${key}" deleted...`);
  }
).on(
  'expired',
  (key,value) => {
    console.info(`[CACHE] "${key}" expired...`);
  }
);

module.exports = cache;