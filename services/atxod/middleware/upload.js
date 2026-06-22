const multer = require('multer')
const path   = require('path')
const storage = multer.diskStorage({
  destination: (req, _f, cb) => cb(null, path.join('/app/uploads', req.uploadFolder || '')),
  filename:    (_r, f, cb)  => cb(null, Date.now() + path.extname(f.originalname)),
})
module.exports = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })
