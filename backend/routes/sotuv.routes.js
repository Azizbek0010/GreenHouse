const router = require('express').Router()
const ctrl   = require('../controllers/sotuv.controller')
const auth   = require('../middleware/auth')
const role   = require('../middleware/role')
const upload = require('../middleware/upload')

const setFolder = (folder) => (req, res, next) => { req.uploadFolder = folder; next() }

router.post('/',     auth, role('kassa'), setFolder('sotuv'), upload.single('photo'), ctrl.create)
router.get('/',      auth,                ctrl.getAll)
router.get('/stats', auth, role('admin'), ctrl.getStats)
router.get('/:id',   auth,                ctrl.getOne)

module.exports = router
