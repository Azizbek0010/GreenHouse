const router = require('express').Router()
const ctrl   = require('../controllers/stats.controller')
const auth   = require('../middleware/auth')
const role   = require('../middleware/role')

router.get('/admin', auth, role('admin'),          ctrl.adminStats)
// chart va oy-taqqos kassaga ham ochiq — controller o'zi kassa scope ini qo'yadi
router.get('/chart', auth, role('admin', 'kassa'), ctrl.chart)
router.get('/oy-taqqos', auth, role('admin', 'kassa'), ctrl.oyTaqqos)
router.get('/kassa', auth, role('kassa', 'admin'), ctrl.kassaStats)

module.exports = router
