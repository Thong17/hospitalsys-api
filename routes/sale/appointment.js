const router = require('express').Router()
const multer = require('multer')
const upload = multer()
const { index, create, checkIn, checkOut, update, detail, _delete, _import, batch } = require('../../controllers/appointmentController')
const security = require('../../middleware/security')
const { privilege } = require('../../constants/roleMap')

router.get('/', security.role(privilege.appointment.list), (req, res) => {
    index(req, res)
})

router.get('/detail/:id', security.role(privilege.appointment.detail), (req, res) => {
    detail(req, res)
})

router.post('/create', security.role(privilege.appointment.create), security.audit(), (req, res) => {
    create(req, res)
})

router.put('/checkIn/:id', security.role(privilege.appointment.update), security.audit(), (req, res) => {
    checkIn(req, res)
})

router.put('/checkOut/:id', security.role(privilege.appointment.update), security.audit(), (req, res) => {
    checkOut(req, res)
})

router.put('/update/:id', security.role(privilege.appointment.update), security.audit(), (req, res) => {
    update(req, res)
})

router.delete('/delete/:id', security.role(privilege.appointment.delete), security.audit(), (req, res) => {
    _delete(req, res)
})

router.post('/excel/import', upload.single('excel'), (req, res) => {
    _import(req, res)
})

router.post('/batch', security.audit(), (req, res) => {
    batch(req, res)
})

module.exports = router