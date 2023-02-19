const Product = require('../models/Product')
const Brand = require('../models/Brand')
const Image = require('../models/Image')
const ProductStock = require('../models/ProductStock')
const response = require('../helpers/response')
const { failureMsg } = require('../constants/responseMsg')
const { extractJoiErrors, readExcel } = require('../helpers/utils')
const { createProductValidation, createPropertyValidation, createOptionValidation, createColorValidation, createCustomerOptionValidation } = require('../middleware/validations/productValidation')
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
            .populate({ path: 'colors', model: ProductColor })
            .populate({ path: 'customers', model: CustomerOption })
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
            .populate({ path: 'colors', model: ProductColor })
            .populate({ path: 'customers', model: CustomerOption })
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

    try {
        Product.create({...body, createdBy: req.user.id}, async (err, product) => {
            if (err) {
                switch (err.code) {
                    case 11000:
                        return response.failure(422, { msg: 'Product already exists!' }, res, err)
                    default:
                        return response.failure(422, { msg: err.message }, res, err)
                }
            }

            if (!product) return response.failure(422, { msg: 'No product created!' }, res, err)

            const category = await Category.findById(product.category).select('products')
            const brand = await Brand.findById(product.brand).select('products')

            const listCategory = [...category.products, product._id]
            const listBrand = [...brand.products, product._id]

            await Category.findByIdAndUpdate(product.category, { products: listCategory })
            await Brand.findByIdAndUpdate(product.brand, { products: listBrand })

            await Image.updateMany({ _id: { $in: product.images } }, { $set: { isActive: true } }, { multi:true })
            response.success(200, { msg: 'Product has created successfully', data: product }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
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
            if (err) {
                switch (err.code) {
                    default:
                        return response.failure(422, { msg: err.message }, res, err)
                }
            }

            if (!product) return response.failure(422, { msg: 'No product updated!' }, res, err)

            const category = await Category.findById(product.category).select('products')
            const brand = await Brand.findById(product.brand).select('products')

            const listCategory = [...category.products, product._id]
            const listBrand = [...brand.products, product._id]

            await Category.findByIdAndUpdate(product.category, { products: listCategory })
            await Brand.findByIdAndUpdate(product.brand, { products: listBrand })

            response.success(200, { msg: 'Product has updated successfully', data: product }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports.enableStock = async (req, res) => {
    try {
        Product.findByIdAndUpdate(req.params.id, { isStock: true }, (err, product) => {
            if (err) {
                return response.failure(422, { msg: err.message }, res, err)
            }

            if (!product) return response.failure(422, { msg: 'No product updated!' }, res, err)
            response.success(200, { msg: 'Product has updated successfully', data: product }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports.disable = async (req, res) => {
    try {
        Product.findByIdAndUpdate(req.params.id, { isDeleted: true }, (err, product) => {
            if (err) {
                switch (err.code) {
                    default:
                        return response.failure(422, { msg: err.message }, res, err)
                }
            }

            if (!product) return response.failure(422, { msg: 'No product deleted!' }, res, err)
            response.success(200, { msg: 'Product has deleted successfully', data: product }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
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
        response.success(200, { msg: 'List has been previewed', data }, res)
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
            response.success(200, { msg: `${data.length} ${data.length > 1 ? 'products' : 'product'} has been inserted` }, res)
        })
        .catch(err => {
            return response.failure(422, { msg: err.message }, res)
        })
}

// CRUD Product Property
exports.createProperty = async (req, res) => {
    const body = req.body
    const { error } = createPropertyValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    try {
        ProductProperty.create(body, (err, property) => {
            if (err) {
                switch (err.code) {
                    case 11000:
                        return response.failure(422, { msg: 'Property already exists!' }, res, err)
                    default:
                        return response.failure(422, { msg: err.message }, res, err)
                }
            }

            if (!property) return response.failure(422, { msg: 'No property created!' }, res, err)
            response.success(200, { msg: 'Property has created successfully', data: property }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
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
    const { error } = createPropertyValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    try {
        ProductProperty.findByIdAndUpdate(req.params.id, body, { new: true }, (err, property) => {
            if (err) {
                switch (err.code) {
                    default:
                        return response.failure(422, { msg: err.message }, res, err)
                }
            }

            if (!property) return response.failure(422, { msg: 'No property updated!' }, res, err)
            response.success(200, { msg: 'Property has updated successfully', data: property }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports.reorderProperty = async (req, res) => {
    try {
        await ProductProperty.reorder(req.body)
        response.success(200, { msg: 'Property has reordered successfully' }, res)
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports.disableProperty = async (req, res) => {
    try {
        ProductProperty.findByIdAndRemove(req.params.id, (err, property) => {
            if (err) {
                switch (err.code) {
                    default:
                        return response.failure(422, { msg: err.message }, res, err)
                }
            }

            if (!property) return response.failure(422, { msg: 'No property deleted!' }, res, err)
            response.success(200, { msg: 'Property has deleted successfully', data: property }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

// CRUD Product Option
exports.createOption = async (req, res) => {
    const body = req.body
    const { error } = createOptionValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    try {
        ProductOption.create(body, (err, option) => {
            if (err) {
                switch (err.code) {
                    case 11000:
                        return response.failure(422, { msg: 'Option already exists!' }, res, err)
                    default:
                        return response.failure(422, { msg: err.message }, res, err)
                }
            }

            if (!option) return response.failure(422, { msg: 'No option created!' }, res, err)
            response.success(200, { msg: 'Option has created successfully', data: option }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
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

    try {
        ProductOption.findByIdAndUpdate(req.params.id, body, { new: true }, (err, option) => {
            if (err) {
                switch (err.code) {
                    default:
                        return response.failure(422, { msg: err.message }, res, err)
                }
            }

            if (!option) return response.failure(422, { msg: 'No option updated!' }, res, err)
            response.success(200, { msg: 'Option has updated successfully', data: option }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports.toggleDefault = async (req, res) => {
    try {
        const id = req.params.id
        const option = await ProductOption.findById(id).populate('property')

        if (option.isDefault) {
            await ProductOption.findByIdAndUpdate(id, { isDefault: false })
            return response.success(200, { msg: 'Option has updated successfully' }, res)
        }

        if (option?.property?.choice === 'MULTIPLE') {
            await ProductOption.findByIdAndUpdate(id, { isDefault: true })
            return response.success(200, { msg: 'Option has updated successfully' }, res)
        }

        await ProductOption.updateMany({ property: option.property }, { isDefault: false })
        await ProductOption.findByIdAndUpdate(id, { isDefault: true })
        return response.success(200, { msg: 'Option has updated successfully' }, res)
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports.disableOption = async (req, res) => {
    try {
        ProductOption.findByIdAndRemove(req.params.id, (err, option) => {
            if (err) {
                switch (err.code) {
                    default:
                        return response.failure(422, { msg: err.message }, res, err)
                }
            }

            if (!option) return response.failure(422, { msg: 'No option deleted!' }, res, err)
            response.success(200, { msg: 'Option has deleted successfully', data: option }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

// CRUD Product Color
exports.createColor = async (req, res) => {
    const body = req.body
    const { error } = createColorValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    try {
        ProductColor.create(body, (err, color) => {
            if (err) {
                switch (err.code) {
                    case 11000:
                        return response.failure(422, { msg: 'Color already exists!' }, res, err)
                    default:
                        return response.failure(422, { msg: err.message }, res, err)
                }
            }

            if (!color) return response.failure(422, { msg: 'No color created!' }, res, err)
            response.success(200, { msg: 'Color has created successfully', data: color }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports.detailColor = async (req, res) => {
    try {
        const color = await ProductColor.findById(req.params.id)
            .populate('profile').populate('images')

        return response.success(200, { data: color }, res)
    } catch (err) {
        if (err) return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }   
}

exports.updateColor = async (req, res) => {
    const body = req.body
    const { error } = createColorValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    try {
        ProductColor.findByIdAndUpdate(req.params.id, body, { new: true }, (err, color) => {
            if (err) {
                switch (err.code) {
                    default:
                        return response.failure(422, { msg: err.message }, res, err)
                }
            }

            if (!color) return response.failure(422, { msg: 'No color updated!' }, res, err)
            response.success(200, { msg: 'Option has updated successfully', data: color }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports.disableColor = async (req, res) => {
    try {
        ProductColor.findByIdAndRemove(req.params.id, (err, color) => {
            if (err) {
                switch (err.code) {
                    default:
                        return response.failure(422, { msg: err.message }, res, err)
                }
            }

            if (!color) return response.failure(422, { msg: 'No color deleted!' }, res, err)
            response.success(200, { msg: 'Option has deleted successfully', data: color }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

// CRUD Product Customer
exports.createCustomerOption = async (req, res) => {
    const body = req.body
    const { error } = createCustomerOptionValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    try {
        CustomerOption.create(body, (err, option) => {
            if (err) {
                switch (err.code) {
                    case 11000:
                        return response.failure(422, { msg: 'Option already exists!' }, res, err)
                    default:
                        return response.failure(422, { msg: err.message }, res, err)
                }
            }

            if (!option) return response.failure(422, { msg: 'No option created!' }, res, err)
            response.success(200, { msg: 'Option has created successfully', data: option }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports.detailCustomerOption = async (req, res) => {
    try {
        const option = await CustomerOption.findById(req.params.id)

        return response.success(200, { data: option }, res)
    } catch (err) {
        if (err) return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }   
}

exports.updateCustomerOption = async (req, res) => {
    const body = req.body
    const { error } = createCustomerOptionValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    try {
        CustomerOption.findByIdAndUpdate(req.params.id, body, { new: true }, (err, option) => {
            if (err) {
                switch (err.code) {
                    default:
                        return response.failure(422, { msg: err.message }, res, err)
                }
            }

            if (!option) return response.failure(422, { msg: 'No option updated!' }, res, err)
            response.success(200, { msg: 'Option has updated successfully', data: option }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports.disableCustomerOption = async (req, res) => {
    try {
        CustomerOption.findByIdAndRemove(req.params.id, (err, option) => {
            if (err) {
                switch (err.code) {
                    default:
                        return response.failure(422, { msg: err.message }, res, err)
                }
            }

            if (!option) return response.failure(422, { msg: 'No option deleted!' }, res, err)
            response.success(200, { msg: 'Option has deleted successfully', data: option }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}
