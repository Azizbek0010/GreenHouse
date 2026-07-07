const router    = require('express').Router()
const ctrl      = require('../controllers/auth.controller')
const auth      = require('../middleware/auth')
const role      = require('../middleware/role')
const upload    = require('../middleware/upload')
const rateLimit = require('express-rate-limit')

const setAvatarFolder = (req, res, next) => { req.uploadFolder = 'avatar'; next() }

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Ko'p urinish. 15 daqiqadan so'ng urinib ko'ring." },
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/login',      loginLimiter, ctrl.login)
router.post('/push-token', auth, ctrl.savePushToken)
router.post('/users',      auth, role('admin'), ctrl.createUser)
router.get('/users',       auth, role('admin'), ctrl.getUsers)
router.get('/kassalar',    auth, role('teplitsa', 'admin'), ctrl.getKassalar)
router.patch('/profile',   auth, setAvatarFolder, upload.single('avatar'), ctrl.updateProfile)

module.exports = router
