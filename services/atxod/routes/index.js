const router = require('express').Router()
const ctrl   = require('../controllers/atxod.controller')
const auth   = require('../middleware/auth')
const role   = require('../middleware/role')
const upload = require('../middleware/upload')
const fs     = require('fs')

fs.mkdirSync('/app/uploads/atxod', { recursive: true })

const setFolder = (req, _r, next) => { req.uploadFolder = 'atxod'; next() }

router.post('/',              auth, role('kassa'), setFolder, upload.single('photo'), ctrl.create)
router.get('/',               auth, ctrl.getAll)
router.patch('/:id/review',   auth, role('admin'), ctrl.review)

module.exports = router
