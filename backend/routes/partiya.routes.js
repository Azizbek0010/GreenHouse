const router = require('express').Router()
const ctrl   = require('../controllers/partiya.controller')
const auth   = require('../middleware/auth')
const role   = require('../middleware/role')
const upload = require('../middleware/upload')

const setFolder = (folder) => (req, res, next) => { req.uploadFolder = folder; next() }

router.post('/',                   auth, role('teplitsa'), setFolder('partiya'), upload.single('photo'), ctrl.create)
router.post('/:id/receive',        auth, role('kassa'),    setFolder('partiya'), upload.single('photo'), ctrl.receive)
router.patch('/:id/confirm-farq',  auth, role('admin'),    ctrl.confirmFarq)
router.get('/',                    auth,                   ctrl.getAll)
router.get('/:id',                 auth,                   ctrl.getOne)

module.exports = router
