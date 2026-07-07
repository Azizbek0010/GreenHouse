const router = require('express').Router()
const ctrl   = require('../controllers/qarz.controller')
const auth   = require('../middleware/auth')
const role   = require('../middleware/role')
const upload = require('../middleware/upload')

const setFolder = (folder) => (req, res, next) => { req.uploadFolder = folder; next() }

const qarzUpload = upload.fields([
  { name: 'flowerPhoto', maxCount: 1 },
  { name: 'buyerPhoto',  maxCount: 1 },
])

router.post('/',           auth, role('kassa'), setFolder('qarz'), qarzUpload, ctrl.create)
router.get('/',            auth,                ctrl.getAll)
router.patch('/:id/tolov', auth, role('kassa'), ctrl.tolov)
router.get('/:id',         auth,                ctrl.getOne)

module.exports = router
