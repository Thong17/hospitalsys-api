const Joi = require('joi')

const createCategoryValidation = Joi.object({
    name: Joi.object().required(),
    status: Joi.boolean().optional(),
    icon: Joi.any().optional(),
    description: Joi.string().optional().allow('')
})

const createPropertyValidation = Joi.object({
    name: Joi.object().required(),
    description: Joi.string().optional().allow(''),
    category: Joi.string().required(),
    choice: Joi.string().required(),
    isRequire: Joi.boolean().required(),
})

module.exports = {
    createCategoryValidation,
    createPropertyValidation
}