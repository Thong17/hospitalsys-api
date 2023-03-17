const mongoose = require('mongoose')
const Product = require('../models/Product')
const Brand = require('../models/Brand')
const Image = require('../models/Image')
const ProductStock = require('../models/ProductStock')
const ProductOption = require('../models/ProductOption')
const ProductProperty = require('../models/ProductProperty')
const response = require('../helpers/response')
const { failureMsg } = require('../constants/responseMsg')
const { extractJoiErrors, readExcel } = require('../helpers/utils')
const { createProductValidation, propertyValidation, createOptionValidation } = require('../middleware/validations/productValidation')
const Category = require('../models/Category')
const { Workbook } = require('exceljs')
const { worksheetOption } = require('../configs/excel')
const moment = require('moment')

exports.index = async (req, res) => {
    const limit = parseInt(req.query.limit)
    const offset = parseInt(req.query.offset) || 0
    const search = req.query.search?.replace(/ /g,'') || ''
    const field = req.query.field || 'tags'
    const filter = req.query.filter || 'createdAt'
    const sort = req.query.sort || 'asc'

    let filterObj = { [filter]: sort }
    let query = {}
    if (search) {
        query[field] = {
            $regex: new RegExp(search, 'i')
        }
    }

    Product.find({ isDeleted: false, ...query }, async (err, products) => {
        if (err) return response.failure(422, { msg: failureMsg.trouble }, res, err)
        const totalCount = await Product.count({ isDeleted: false, ...query  })
        let hasMore = totalCount > offset + limit
        if (search !== '') hasMore = true
        return response.success(200, { data: products, length: totalCount, hasMore }, res)
    })
        .skip(offset).limit(limit)
        .sort(filterObj)
        .populate('profile')
        .populate('category')
        .populate('brand')
        .populate('images')
        .populate('stocks')
}

exports.list = async (req, res) => {
    const limit = parseInt(req.query.limit)
    const offset = parseInt(req.query.offset) || 0
    const search = req.query.search?.replace(/ /g,'') || ''
    const field = req.query.field || 'tags'
    const filter = req.query.filter || 'createdAt'
    const sort = req.query.sort || 'asc'
    const brand = req.query.brand || 'all'
    const category = req.query.category || 'all'
    const promotion = req.query.promotion
    const favorite = req.query.favorite === 'on'
    const promotions = req.query.promotions === 'on'

    let filterObj = { [filter]: sort }
    let query = {}
    if (search) {
        query[field] = {
            $regex: new RegExp(search, 'i')
        }
    }
    let promotionObj = {}
    if (promotions) promotionObj['$ne'] = null
    if (promotion) promotionObj['$e'] = promotion

    if (Object.keys(promotionObj).length > 0) query['promotion'] = promotionObj
    if (brand && brand !== 'all') query['brand'] = brand
    if (category && category !== 'all') query['category'] = category
    if (favorite) query['_id'] = { '$in': req.user?.favorites }

    Product.find({ isDeleted: false, status: true, ...query }, async (err, products) => {
        if (err) return response.failure(422, { msg: failureMsg.trouble }, res, err)
        const totalCount = await Product.count({ isDeleted: false, status: true, ...query  }) 
        let hasMore = totalCount > offset + limit
        if (search !== '' || brand !== 'all' || category !== 'all' || promotion || favorite || promotions) hasMore = true

        return response.success(200, { data: products, length: totalCount, hasMore }, res)
    })  
        .skip(offset).limit(limit)
        .sort(filterObj)
        .populate('profile')
        .populate('category', 'name tags')
        .populate('brand', 'name tags')
        .populate('stocks')
}

exports.listCode = async (req, res) => {
    Product.find({ isDeleted: false }, (err, products) => {
        if (err) return response.failure(422, { msg: failureMsg.trouble }, res, err)

        return response.success(200, { data: products.map(product => {
            return {
                ...product._doc,
                stockCodes: product.stocks?.map(stock => stock.code)
            }
        }) }, res)
    })  
        .select('code isStock stocks').populate('stocks', 'code')
}

exports.detail = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('brand')
            .populate('category')
            .populate('images')
            .populate({ path: 'properties', options: { sort: { 'order': 1 } }})
            .populate({ path: 'options', model: ProductOption })

        return response.success(200, { data: product }, res)
    } catch (err) {
        if (err) return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }   
}

exports.info = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('brand')
            .populate('category')
            .populate('images')
            .populate({ path: 'properties', options: { sort: { 'order': 1 } }})
            .populate({ path: 'options', model: ProductOption })
            .populate({ path: 'stocks', model: ProductStock })

        return response.success(200, { data: product }, res)
    } catch (err) {
        if (err) return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }   
}

exports.create = async (req, res) => {
    const body = req.body
    const { error } = createProductValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    const { properties, ...rest } = body

    Product.create({...rest, createdBy: req.user.id}, async (err, product) => {
        if (err) {
            switch (err.code) {
                case 11000:
                    return response.failure(422, { msg: 'FAILED:CATEGORY_ALREADY_EXISTED' }, res, err)
                default:
                    return response.failure(422, { msg: err.message }, res, err)
            }
        }

        try {
            const propertyOptions = []
            await ProductProperty.insertMany(properties.map(property => {
                const newPropertyId = new mongoose.Types.ObjectId()
                property.options?.map(option => {
                    const newOptionId = new mongoose.Types.ObjectId()
                    option._id = newOptionId
                    propertyOptions.push({ ...option, property: newPropertyId, product: product._id })
                    return option
                })
                return { ...property, _id: newPropertyId, product: product._id }
            }))
            
            await ProductOption.insertMany(propertyOptions)

            const category = await Category.findById(product.category).select('products')
            const brand = await Brand.findById(product.brand).select('products')

            const listCategory = [...category.products, product._id]
            const listBrand = [...brand.products, product._id]

            await Category.findByIdAndUpdate(product.category, { products: listCategory })
            await Brand.findByIdAndUpdate(product.brand, { products: listBrand })

            await Image.updateMany({ _id: { $in: product.images } }, { $set: { isActive: true } }, { multi:true })
            response.success(200, { msg: 'SUCCESS:PRODUCT_CREATED', data: product }, res)
        } catch (err) {
            return response.failure(422, { msg: err.message }, res, err)
        }
    })
}

exports.update = async (req, res) => {
    const body = req.body
    const { error } = createProductValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    try {
        const productId = req.params.id
        const oldProduct = await Product.findById(productId)
        const oldCategory = await Category.findById(oldProduct.category).select('products')
        const oldBrand = await Brand.findById(oldProduct.brand).select('products')

        const oldListCategory = oldCategory.products.filter(id => !id.equals(productId))
        const oldListBrand = oldBrand.products.filter(id => !id.equals(productId))

        await Category.findByIdAndUpdate(oldProduct.category, { products: oldListCategory })
        await Brand.findByIdAndUpdate(oldProduct.brand, { products: oldListBrand })

        Product.findByIdAndUpdate(productId, body, { new: true }, async (err, product) => {
            if (err) return response.failure(422, { msg: err.message }, res, err)

            const category = await Category.findById(product.category).select('products')
            const brand = await Brand.findById(product.brand).select('products')

            const listCategory = [...category.products, product._id]
            const listBrand = [...brand.products, product._id]

            await Category.findByIdAndUpdate(product.category, { products: listCategory })
            await Brand.findByIdAndUpdate(product.brand, { products: listBrand })

            response.success(200, { msg: 'SUCCESS:PRODUCT_UPDATED', data: product }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports.enableStock = async (req, res) => {
    Product.findByIdAndUpdate(req.params.id, { isStock: true }, (err, product) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        response.success(200, { msg: 'SUCCESS:PRODUCT_UPDATED', data: product }, res)
    })
}

exports.disable = async (req, res) => {
    Product.findByIdAndUpdate(req.params.id, { isDeleted: true }, (err, product) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        response.success(200, { msg: 'SUCCESS:PRODUCT_DISABLED', data: product }, res)
    })
}

exports._import = async (req, res) => {
    try {
        const languages = JSON.parse(req.body.languages)
        const products = await readExcel(req.file.buffer, req.body.fields, languages)

        const data = []

        for (const product of products) {
            const mapName = {}
            languages.forEach(lang => {
                mapName[lang] = product[`NAME_${lang}`.toUpperCase()] || ''
            })

            const brand = await Brand.findById(product.BRAND_ID)
            const category = await Category.findById(product.CATEGORY_ID)
            
            data.push({
                no: product.no,
                _id: product.ID,
                status: product.STATUS,
                currency: product.CURRENCY,
                code: product.CODE,
                price: product.PRICE,
                isStock: product.IS_STOCK,
                brand,
                category,
                description: product.DESCRIPTION,
                tags: product.TAGS || '',
                name: mapName
            })
        }
        response.success(200, { msg: 'SUCCESS:CATEGORY_IMPORTED', data }, res)
    } catch (err) {
        return response.failure(err.code, { msg: err.msg }, res)
    }
}

exports._export = async (req, res) => {
    try {
        const search = req.query.search?.replace(/ /g,'')
        const field = req.query.field || 'tags'
        const filter = req.query.filter || 'createdAt'
        const sort = req.query.sort || 'desc'
        let filterObj = { [filter]: sort }
        let query = {}
        if (search) {
            query[field] = {
                $regex: new RegExp(search, 'i')
            }
        }
        const products = await Product.find({ isDeleted: false, ...query }).sort(filterObj)

        // Map Excel
        const workbook = new Workbook()
        const worksheet = workbook.addWorksheet(`worksheet`.toUpperCase(), worksheetOption)
        const languages = req.body.languages
        worksheet.columns = [
            { 
                key: 'no', 
                width: 5,  
                style: {
                    alignment: {
                        vertical:'middle',
                        horizontal:'center'
                    }
                }
            },
            { 
                key: 'id', 
                width: 27,
            },
            ...languages.map(lang => ({ 
                key: `name${lang}`, 
                width: 35,
            })),
            { 
                key: 'price', 
                width: 10,
            },
            { 
                key: 'currency', 
                width: 10,
            },
            { 
                key: 'code', 
                width: 30,
            },
            { 
                key: 'isStock', 
                width: 10,
            },
            { 
                key: 'status', 
                width: 10,
            },
            { 
                key: 'description', 
                width: 45,
            }, 
            { 
                key: 'tags', 
                width: 55,
            },
            { 
                key: 'category', 
                width: 27,
            },
            { 
                key: 'brand', 
                width: 27,
            },
        ]
        let headerData = { no: 'NO', id: 'ID', price: 'PRICE', currency: 'CURRENCY', code: 'CODE', isStock: 'IS_STOCK', status: 'STATUS', description: 'DESCRIPTION', tags: 'TAGS', category: 'CATEGORY_ID', brand: 'BRAND_ID' }
        languages.forEach(lang => {
            headerData[`name${lang}`] = `NAME_${lang}`.toUpperCase()
        })
        const header = worksheet.addRow(headerData)
        header.height = 23
        header.eachCell((cell) => {
            cell.style = {
                font: {
                    bold: true,
                    color: { argb: '000000' },
                    size: 11,
                },
                fill:{
                    fgColor: { argb: 'DDDDDD' } ,
                    pattern: 'solid',
                    type: 'pattern' 
                },
                alignment: {
                    vertical:'middle',
                    horizontal:'left'
                }
            }
            if (['no'].includes(cell._column._key)) {
                cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }
            }
        })

        // Freeze row
        worksheet.views = [{ state: 'frozen', ySplit: 1 }]

        // Body
        for (const index in products) {
            if (Object.hasOwnProperty.call(products, index)) {
                const product = products[index];
                let rowData = { 
                    no: parseInt(index) + 1, 
                    id: product.id,
                    price: product.price,
                    currency: product.currency,
                    code: product.code,
                    isStock: product.isStock,
                    status: product.status,
                    description: product.description,
                    tags: product.tags,
                    brand: product.brand?.toString(),
                    category: product.category?.toString(),
                }
                languages.forEach(lang => {
                    rowData[`name${lang}`] = product.name[lang] || ''
                })
                worksheet.addRow(rowData)
            }
        }

        const now = moment().format('YYYY-MM-DD HH:mm:ss')
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.setHeader('Content-Disposition', `attachment; filename=PRODUCT_${now}.xlsx`)

        const file = await workbook.xlsx.writeBuffer()

        return response.success(200, { file, name: `PRODUCT_${now}.xlsx` }, res)
    } catch (err) {
        return response.failure(err.code, { msg: err.msg }, res)
    }
}

exports.batch = async (req, res) => {
    const products = req.body

    Product.insertMany(products)
        .then(data => {
            response.success(200, { msg: `SUCCESS:PRODUCT_INSERTED`, count: data.length }, res)
        })
        .catch(err => {
            return response.failure(422, { msg: err.message }, res)
        })
}

// CRUD Product Property
exports.listProperty = async (req, res) => {
    try {
        const productId = req.params.productId
        const properties = await ProductProperty.find({ product: productId }).sort({ 'order': 1 }).populate({ path: 'options', populate: { path: 'profile' } })
        return response.success(200, { data: properties }, res)
    } catch (err) {
        response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports.createProperty = async (req, res) => {
    const body = req.body
    const { error } = propertyValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    ProductProperty.create(body, (err, property) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        response.success(200, { msg: 'SUCCESS:PROPERTY_CREATED', data: property }, res)
    })
}

exports.detailProperty = async (req, res) => {
    try {
        const property = await ProductProperty.findById(req.params.id)
        return response.success(200, { data: property }, res)
    } catch (err) {
        if (err) return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }   
}

exports.updateProperty = async (req, res) => {
    const body = req.body
    const { error } = propertyValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    ProductProperty.findByIdAndUpdate(req.params.id, body, { new: true }, (err, property) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        response.success(200, { msg: 'SUCCESS:PROPERTY_UPDATED', data: property }, res)
    })
}

exports.reorderProperty = async (req, res) => {
    try {
        await ProductProperty.reorder(req.body)
        response.success(200, { msg: 'SUCCESS:PROPERTY_REORDERED' }, res)
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports.removeProperty = async (req, res) => {
    ProductProperty.findByIdAndRemove(req.params.id, (err, property) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        response.success(200, { msg: 'SUCCESS:PROPERTY_REMOVED', data: property }, res)
    })
}

// CRUD Product Option
exports.createOption = async (req, res) => {
    const body = req.body
    const { error } = createOptionValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    ProductOption.create(body, (err, option) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        response.success(200, { msg: 'SUCCESS:OPTION_CREATED', data: option }, res)
    })
}

exports.detailOption = async (req, res) => {
    try {
        const option = await ProductOption.findById(req.params.id)
            .populate('profile')

        return response.success(200, { data: option }, res)
    } catch (err) {
        if (err) return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }   
}

exports.updateOption = async (req, res) => {
    const body = req.body
    const { error } = createOptionValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    ProductOption.findByIdAndUpdate(req.params.id, body, { new: true }, (err, option) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        response.success(200, { msg: 'SUCCESS:OPTION_UPDATED', data: option }, res)
    })
}

exports.toggleDefault = async (req, res) => {
    try {
        const id = req.params.id
        const option = await ProductOption.findById(id).populate('property')

        if (option.isDefault) {
            await ProductOption.findByIdAndUpdate(id, { isDefault: false })
            return response.success(200, { msg: 'SUCCESS:OPTION_UPDATED' }, res)
        }

        if (option?.property?.choice === 'MULTIPLE') {
            await ProductOption.findByIdAndUpdate(id, { isDefault: true })
            return response.success(200, { msg: 'SUCCESS:OPTION_UPDATED' }, res)
        }

        await ProductOption.updateMany({ property: option.property }, { isDefault: false })
        await ProductOption.findByIdAndUpdate(id, { isDefault: true })
        return response.success(200, { msg: 'SUCCESS:OPTION_UPDATED' }, res)
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports.disableOption = async (req, res) => {
    ProductOption.findByIdAndRemove(req.params.id, (err, option) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        response.success(200, { msg: 'SUCCESS:OPTION_REMOVED', data: option }, res)
    })
}