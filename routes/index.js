const express = require('express');
const router = express.Router();

router.use('/ingredient', require('./ingredient'));
router.use('/recipe', require('./recipe'));
router.use('/user', require('./user'));

module.exports = router;