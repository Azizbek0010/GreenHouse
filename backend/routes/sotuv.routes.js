const router = require('express').Router()
const ctrl   = require('../controllers/sotuv.controller')
const auth   = require('../middleware/auth')
const role   = require('../middleware/role')

router.post('/',     auth, role('kassa'), ctrl.create)
router.get('/',      auth,                ctrl.getAll)
router.get('/stats', auth, role('admin'), ctrl.getStats)
router.get('/:id',   auth,                ctrl.getOne)
router.patch('/:id', auth, role('admin'), ctrl.adminUpdate)
router.delete('/:id',auth, role('admin'), ctrl.adminDelete)

module.exports = router
