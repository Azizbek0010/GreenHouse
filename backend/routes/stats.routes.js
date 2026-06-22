const router = require('express').Router()
const ctrl   = require('../controllers/stats.controller')
const auth   = require('../middleware/auth')
const role   = require('../middleware/role')

router.get('/admin', auth, role('admin'),         ctrl.adminStats)
router.get('/chart', auth, role('admin'),         ctrl.adminChart)
router.get('/kassa', auth, role('kassa', 'admin'), ctrl.kassaStats)

module.exports = router
