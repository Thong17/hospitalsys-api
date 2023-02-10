const router = require('express').Router()
const { list: roleList } = require('../../controllers/roleController')
const response = require('../../helpers/response')
const { uploadImageController, uploadIconController, uploadPictureController } = require('../../controllers/sharedController')
const multer = require('multer')

const storage = multer.diskStorage({
  destination: function (_, _, cb) {
    cb(null, './uploads')
  },
  filename: function (_, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`)
  },
})

const uploadImage = multer({
  storage,
  limits: { fileSize: 10 * 1000 * 1000 },
}).array('images', 10) 

const uploadIcon = multer({
  storage,
  limits: { fileSize: 0.5 * 1000 * 1000 },
}).single('icon')

const uploadPicture = multer({
  storage,
  limits: { fileSize: 0.5 * 1000 * 1000 },
}).single('picture')

router.get('/role/list', (req, res) => {
  roleList(req, res)
})

router.post('/upload/image', (req, res) => {
  uploadImage(req, res, (err) => {
    if (err) return response.failure(422, { msg: err.message }, res, err)
    uploadImageController(req, res)
  })
})

router.post('/upload/icon', (req, res) => {
  uploadIcon(req, res, (err) => {
    if (err) return response.failure(422, { msg: err.message }, res, err)
    uploadIconController(req, res)
  })
})

router.post('/upload/picture', (req, res) => {
  uploadPicture(req, res, (err) => {
    if (err) return response.failure(422, { msg: err.message }, res, err)
    uploadPictureController(req, res)
  })
})

module.exports = router
