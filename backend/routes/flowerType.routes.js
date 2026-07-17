const router = require('express').Router()
const ctrl   = require('../controllers/flowerType.controller')
const auth   = require('../middleware/auth')
const role   = require('../middleware/role')

router.get('/',        auth,                ctrl.getAll)
router.post('/',       auth, role('admin'), ctrl.create)
router.delete('/:id',  auth, role('admin'), ctrl.remove)

module.exports = router
