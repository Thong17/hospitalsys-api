const Category = require('../models/Category')
const CategoryProperty = require('../models/CategoryProperty')
const CategoryOption = require('../models/CategoryOption')
const response = require('../helpers/response')
const { failureMsg } = require('../constants/responseMsg')
const { extractJoiErrors, readExcel } = require('../helpers/utils')
const { categoryValidation, propertyValidation, optionValidation } = require('../middleware/validations/categoryValidation')
const { Workbook } = require('exceljs')
const { worksheetOption } = require('../configs/excel')
const moment = require('moment')

exports.index = async (req, res) => {
    const limit = parseInt(req.query.limit) || 10
    const page = parseInt(req.query.page) || 0
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

    Category.find({ isDeleted: false, ...query }, async (err, categories) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)

        const totalCount = await Category.count({ isDeleted: false })
        return response.success(200, { data: categories, length: totalCount }, res)
    })
        .skip(page * limit).limit(limit)
        .sort(filterObj)
        .populate('icon properties')
}

exports.list = async (req, res) => {
    Category.find({ isDeleted: false, status: true }, (err, categories) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        return response.success(200, { data: categories }, res)
    }).select('name tags icon').populate('icon properties')
}

exports.detail = async (req, res) => {
    Category.findById(req.params.id, (err, category) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        return response.success(200, { data: category }, res)
    })
        .populate('icon')
        .populate({ path: 'properties', options: { sort: { 'order': 1 } }, populate: 'options'})
}

exports.create = async (req, res) => {
    const body = req.body
    const { error } = categoryValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)
    Category.create({...body, createdBy: req.user.id}, (err, category) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        response.success(200, { msg: 'SUCCESS:CATEGORY_CREATED', data: category }, res)
    })
}

exports.update = async (req, res) => {
    const body = req.body
    const { error } = categoryValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    const tags = `${JSON.stringify(body.name)}${body.description}`.replace(/ /g,'')
    Category.findByIdAndUpdate(req.params.id, { ...body, tags }, (err, category) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        response.success(200, { msg: 'SUCCESS:CATEGORY_UPDATED', data: category }, res)
    })
}

exports.toggleStatus = async (req, res) => {
    try {
        const id = req.params.id
        const category = await Category.findById(id)
        const data = await Category.findByIdAndUpdate(id, { status: !category.status }, { new: true }).populate('icon')
        response.success(200, { msg: 'SUCCESS:CATEGORY_TOGGLED', data }, res)
    } catch (err) {
        return response.failure(422, { msg: err?.message }, res, err)
    }
}

exports.remove = async (req, res) => {
    Category.findByIdAndUpdate(req.params.id, { isDeleted: true }, (err, category) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        response.success(200, { msg: 'SUCCESS:CATEGORY_REMOVED', data: category }, res)
    })
}

// CRUD PROPERTY
exports.createProperty = async (req, res) => {
    const body = req.body
    const { error } = propertyValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    CategoryProperty.create(body, (err, property) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        response.success(200, { msg: 'SUCCESS:PROPERTY_CREATED', data: property }, res)
    })
}

exports.detailProperty = async (req, res) => {
    try {
        const property = await CategoryProperty.findById(req.params.id)
        return response.success(200, { data: property }, res)
    } catch (err) {
        return response.failure(422, { msg: err?.message }, res, err)
    }   
}

exports.updateProperty = async (req, res) => {
    const body = req.body
    const { error } = propertyValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    CategoryProperty.findByIdAndUpdate(req.params.id, body, { new: true }, (err, property) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        response.success(200, { msg: 'SUCCESS:PROPERTY_UPDATED', data: property }, res)
    })
}

exports.reorderProperty = async (req, res) => {
    try {
        await CategoryProperty.reorder(req.body)
        response.success(200, { msg: 'SUCCESS:PROPERTY_REORDERED' }, res)
    } catch (err) {
        return response.failure(422, { msg: err?.message }, res, err)
    }
}

exports.removeProperty = async (req, res) => {
    CategoryProperty.findByIdAndRemove(req.params.id, (err, property) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        response.success(200, { msg: 'SUCCESS:PROPERTY_REMOVED', data: property }, res)
    })
}

// CRUD OPTION
exports.createOption = async (req, res) => {
    const body = req.body
    const { error } = optionValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    CategoryOption.create(body, (err, option) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        response.success(200, { msg: 'SUCCESS:OPTION_CREATED', data: option }, res)
    })
}

exports.detailOption = async (req, res) => {
    try {
        const option = await CategoryOption.findById(req.params.id)
            .populate('profile')

        return response.success(200, { data: option }, res)
    } catch (err) {
        if (err) return response.failure(422, { msg: err?.message }, res, err)
    }   
}

exports.updateOption = async (req, res) => {
    const body = req.body
    const { error } = optionValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    CategoryOption.findByIdAndUpdate(req.params.id, body, { new: true }, (err, option) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        response.success(200, { msg: 'SUCCESS:OPTION_UPDATED', data: option }, res)
    })
}

exports.toggleDefault = async (req, res) => {
    try {
        const id = req.params.id
        const option = await CategoryOption.findById(id).populate('property')

        if (option.isDefault) {
            await CategoryOption.findByIdAndUpdate(id, { isDefault: false })
            return response.success(200, { msg: 'SUCCESS:OPTION_TOGGLED' }, res)
        }

        if (option?.property?.choice === 'MULTIPLE') {
            await CategoryOption.findByIdAndUpdate(id, { isDefault: true })
            return response.success(200, { msg: 'SUCCESS:OPTION_TOGGLED' }, res)
        }

        await CategoryOption.updateMany({ property: option.property }, { isDefault: false })
        await CategoryOption.findByIdAndUpdate(id, { isDefault: true })
        return response.success(200, { msg: 'SUCCESS:OPTION_TOGGLED' }, res)
    } catch (err) {
        return response.failure(422, { msg: err?.message }, res, err)
    }
}

exports.removeOption = async (req, res) => {
    CategoryOption.findByIdAndRemove(req.params.id, (err, option) => {
        if (err) return response.failure(422, { msg: err.message }, res, err)
        response.success(200, { msg: 'SUCCESS:OPTION_REMOVED', data: option }, res)
    })
}

// IMPORT AND EXPORT
exports._import = async (req, res) => {
    try {
        const languages = JSON.parse(req.body.languages)
        const categories = await readExcel(req.file.buffer, req.body.fields, languages)

        const data = []
        categories.forEach(category => {
            const mapName = {}
            languages.forEach(lang => {
                mapName[lang] = category[`NAME_${lang}`.toUpperCase()] || ''
            })
            data.push({
                no: category.no,
                _id: category.ID,
                status: category.STATUS,
                description: category.DESCRIPTION,
                tags: category.TAGS || '',
                name: mapName
            }) 
        })
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
        const categories = await Category.find({ isDeleted: false, ...query }).sort(filterObj)

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
        ]
        let headerData = { no: 'NO', id: 'ID', status: 'STATUS', description: 'DESCRIPTION', tags: 'TAGS' }
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
        for (const index in categories) {
            if (Object.hasOwnProperty.call(categories, index)) {
                const category = categories[index];
                let rowData = { 
                    no: parseInt(index) + 1, 
                    id: category.id,
                    status: category.status,
                    description: category.description,
                    tags: category.tags,
                }
                languages.forEach(lang => {
                    rowData[`name${lang}`] = category.name[lang] || ''
                })
                worksheet.addRow(rowData)
            }
        }

        const now = moment().format('YYYY-MM-DD HH:mm:ss')
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.setHeader('Content-Disposition', `attachment; filename=CATEGORY_${now}.xlsx`)

        const file = await workbook.xlsx.writeBuffer()

        return response.success(200, { file, name: `CATEGORY_${now}.xlsx` }, res)
    } catch (err) {
        return response.failure(err.code, { msg: err.msg }, res)
    }
}

exports.batch = async (req, res) => {
    const categories = req.body
    Category.insertMany(categories)
        .then(data => {
            response.success(200, { msg: `SUCCESS:CATEGORY_INSERTED`, count: data.length }, res)
        })
        .catch(err => response.failure(422, { msg: err.message }, res))
}

