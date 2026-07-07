const router = require('express').Router()
const ctrl   = require('../controllers/atxod.controller')
const auth   = require('../middleware/auth')
const role   = require('../middleware/role')
const upload = require('../middleware/upload')

const setFolder = (folder) => (req, res, next) => { req.uploadFolder = folder; next() }

router.post('/',            auth, role('kassa'),  setFolder('atxod'), upload.single('photo'), ctrl.create)
router.get('/',             auth,                  ctrl.getAll)
router.get('/:id',          auth,                  ctrl.getOne)
router.patch('/:id/review', auth, role('admin'),  ctrl.review)

module.exports = router
