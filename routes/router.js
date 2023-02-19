const router = require('express').Router()

router.use('/auth', require('./auth/auth'))
router.use(require('../middleware/security').auth)
router.use('/shared', require('./shared'))
router.use('/admin', require('./admin'))
router.use('/user', require('./user'))
router.use('/sale', require('./sale'))
router.use('/organize', require('./organize'))

module.exports = router