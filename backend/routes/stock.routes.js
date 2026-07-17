const router = require('express').Router()
const ctrl   = require('../controllers/stock.controller')
const auth   = require('../middleware/auth')
const role   = require('../middleware/role')

router.get('/', auth, role('kassa', 'admin'), ctrl.getStock)

module.exports = router
