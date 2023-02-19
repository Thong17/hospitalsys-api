const ProductStock = require('../models/ProductStock')
const Product = require('../models/Product')
const response = require('../helpers/response')
const { failureMsg } = require('../constants/responseMsg')
const { extractJoiErrors } = require('../helpers/utils')
const { createStockValidation } = require('../middleware/validations/stockValidation')

exports.stock = async (req, res) => {
    const product = req.query.productId
    ProductStock.find({ isDeleted: false, product }, (err, stocks) => {
        if (err) return response.failure(422, { msg: failureMsg.trouble }, res, err)
        return response.success(200, { data: stocks }, res)
    }).populate('color').populate('options')
}

exports.product = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('images').populate({ path: 'stocks', model: ProductStock }).populate('brand').populate('category')

        return response.success(200, { data: product }, res)
    } catch (err) {
        if (err) return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }   
}

exports.detail = async (req, res) => {
    try {
        const stock = await ProductStock.findById(req.params.id).populate({ path: 'options', model: ProductOption, populate: { path: 'property', model: ProductProperty, select: 'name' } })

        return response.success(200, { data: stock }, res)
    } catch (err) {
        if (err) return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }   
}

exports.createStock = async (req, res) => {
    const body = req.body
    const { error } = createStockValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    try {
        ProductStock.create({...body, createdBy: req.user.id, totalQuantity: body.quantity}, (err, stock) => {
            if (err) {
                switch (err.code) {
                    case 11000:
                        return response.failure(422, { msg: 'Stock already exists!' }, res, err)
                    default:
                        return response.failure(422, { msg: err.message }, res, err)
                }
            }

            if (!stock) return response.failure(422, { msg: 'No stock created!' }, res, err)
            response.success(200, { msg: 'Stock has created successfully', data: stock }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports.updateStock = async (req, res) => {
    const body = req.body
    const { error } = createStockValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    try {
        ProductStock.findByIdAndUpdate(req.params.id, {...body, totalQuantity: body.quantity}, { new: true }, async (err, stock) => {
            if (err) return response.failure(422, { msg: err.message }, res, err)
            if (!stock) return response.failure(422, { msg: 'No stock updated!' }, res, err)

            response.success(200, { msg: 'Stock has updated successfully', data: stock }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports.disableStock = async (req, res) => {
    try {
        ProductStock.findByIdAndRemove(req.params.id, async (err, stock) => {
            if (err) return response.failure(422, { msg: err.message }, res, err)
            if (!stock) return response.failure(422, { msg: 'No stock deleted!' }, res, err)

            const product = await Product.findById(stock.product)
            product.stocks = product.stocks.filter(item => !item._id.equals(stock._id))
            product.save()
            response.success(200, { msg: 'Stock has deleted successfully', data: stock }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}