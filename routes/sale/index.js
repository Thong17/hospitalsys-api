const router = require('express').Router()

router.use('/stock', require('./stock'))
router.use('/appointment', require('./appointment'))
router.use('/drawer', require('./drawer'))
router.use('/transaction', require('./transaction'))
router.use('/payment', require('./payment'))
router.use('/reservation', require('./reservation'))

module.exports = router