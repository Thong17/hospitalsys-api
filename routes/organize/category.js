const router = require('express').Router()
const multer = require('multer')
const upload = multer()
const { index, create, update, toggleStatus, detail, remove, createProperty, updateProperty, reorderProperty, removeProperty, createOption, updateOption, toggleDefault, removeOption, detailOption, _import, _export, batch } = require('../../controllers/categoryController')
const security = require('../../middleware/security')
const { privilege } = require('../../constants/roleMap')

router.get('/', security.role(privilege.category.list), (req, res) => {
    index(req, res)
})

router.get('/detail/:id', security.role(privilege.category.detail), (req, res) => {
    detail(req, res)
})

router.post('/create', security.role(privilege.category.create), security.audit(), (req, res) => {
    create(req, res)
})

router.put('/update/:id', security.role(privilege.category.update), security.audit(), (req, res) => {
    update(req, res)
})

router.put('/toggleStatus/:id', security.role(privilege.category.update), security.audit(), (req, res) => {
    toggleStatus(req, res)
})

router.delete('/remove/:id', security.role(privilege.category.delete), security.audit(), (req, res) => {
    remove(req, res)
})

// PROPERTY
router.post('/property/create', security.role(privilege.category.create), security.audit(), (req, res) => {
    createProperty(req, res)
})

router.get('/property/detail/:id', security.role(privilege.category.detail), (req, res) => {
    detailProperty(req, res)
})

router.put('/property/update/:id', security.role(privilege.category.update), security.audit(), (req, res) => {
    updateProperty(req, res)
})

router.put('/property/reorder', security.role(privilege.category.update), security.audit(), (req, res) => {
    reorderProperty(req, res)
})

router.delete('/property/remove/:id', security.role(privilege.category.delete), security.audit(), (req, res) => {
    removeProperty(req, res)
})

// OPTION
router.post('/option/create', security.role(privilege.product.create), security.audit(), (req, res) => {
    createOption(req, res)
})

router.get('/option/detail/:id', security.role(privilege.product.detail), (req, res) => {
    detailOption(req, res)
})

router.put('/option/update/:id', security.role(privilege.product.update), security.audit(), (req, res) => {
    updateOption(req, res)
})

router.put('/option/toggle/:id', security.role(privilege.product.update), security.audit(), (req, res) => {
    toggleDefault(req, res)
})

router.delete('/option/remove/:id', security.role(privilege.product.delete), security.audit(), (req, res) => {
    removeOption(req, res)
})

// IMPORT AND EXPORT
router.post('/excel/export', security.role(privilege.category.list), (req, res) => {
    _export(req, res)
})

router.post('/excel/import', upload.single('excel'), (req, res) => {
    _import(req, res)
})

router.post('/batch', security.audit(), (req, res) => {
    batch(req, res)
})

module.exports = router