const router = require('express').Router()

router.use('/stock', require('./stock'))
router.use('/appointment', require('./appointment'))
router.use('/drawer', require('./drawer'))

module.exports = router