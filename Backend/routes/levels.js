const express = require('express');
const router = express.Router();
const { getLevels } = require('../controllers/levelController');

router.get('/', getLevels);

module.exports = router;

