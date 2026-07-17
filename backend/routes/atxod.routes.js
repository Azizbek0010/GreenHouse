const router = require('express').Router()
const ctrl   = require('../controllers/atxod.controller')
const auth   = require('../middleware/auth')
const role   = require('../middleware/role')

router.post('/',            auth, role('kassa'),  ctrl.create)
router.get('/',             auth,                  ctrl.getAll)
router.get('/:id',          auth,                  ctrl.getOne)
router.patch('/:id/review', auth, role('admin'),  ctrl.review)
router.patch('/:id',        auth, role('admin'),  ctrl.adminUpdate)
router.delete('/:id',       auth, role('admin'),  ctrl.adminDelete)

module.exports = router
