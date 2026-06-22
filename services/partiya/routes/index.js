const router = require('express').Router()
const ctrl   = require('../controllers/partiya.controller')
const auth   = require('../middleware/auth')
const role   = require('../middleware/role')
const upload = require('../middleware/upload')
const fs     = require('fs')

fs.mkdirSync('/app/uploads/partiya', { recursive: true })

const setFolder = (req, _r, next) => { req.uploadFolder = 'partiya'; next() }

router.post('/',            auth, role('teplitsa'), setFolder, upload.single('photo'), ctrl.create)
router.post('/:id/receive', auth, role('kassa'),    setFolder, upload.single('photo'), ctrl.receive)
router.get('/',             auth,                   ctrl.getAll)
router.get('/:id',          auth,                   ctrl.getOne)

module.exports = router
