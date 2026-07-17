const router = require('express').Router()
const ctrl   = require('../controllers/partiya.controller')
const auth   = require('../middleware/auth')
const role   = require('../middleware/role')

router.post('/',                   auth, role('teplitsa'), ctrl.create)
router.post('/:id/receive',        auth, role('kassa'),    ctrl.receive)
router.patch('/:id/confirm-farq',  auth, role('admin'),    ctrl.confirmFarq)
router.get('/',                    auth,                   ctrl.getAll)
router.get('/:id',                 auth,                   ctrl.getOne)
router.patch('/:id',               auth, role('admin'),    ctrl.adminUpdate)
router.delete('/:id',              auth, role('admin'),    ctrl.adminDelete)

module.exports = router
