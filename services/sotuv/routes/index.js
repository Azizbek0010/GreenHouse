const router = require('express').Router()
const ctrl   = require('../controllers/sotuv.controller')
const auth   = require('../middleware/auth')
const role   = require('../middleware/role')
const upload = require('../middleware/upload')
const fs     = require('fs')

fs.mkdirSync('/app/uploads/sotuv', { recursive: true })

const setFolder = (req, _r, next) => { req.uploadFolder = 'sotuv'; next() }

router.post('/', auth, role('kassa'), setFolder, upload.single('photo'), ctrl.create)
router.get('/',  auth,                ctrl.getAll)

module.exports = router
