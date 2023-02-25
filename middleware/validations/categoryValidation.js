const Joi = require('joi')

const categoryValidation = Joi.object({
    name: Joi.object().required(),
    status: Joi.boolean().optional(),
    icon: Joi.any().optional(),
    description: Joi.string().optional().allow('')
})

const propertyValidation = Joi.object({
    name: Joi.object().required(),
    description: Joi.string().optional().allow(''),
    category: Joi.string().required(),
    choice: Joi.string().required(),
    isRequire: Joi.boolean().required(),
})

const optionValidation = Joi.object({
    name: Joi.object().required(),
    price: Joi.number().optional(),
    currency: Joi.string().optional(),
    profile: Joi.any().optional(),
    description: Joi.string().optional().allow(''),
    property: Joi.string().required(),
    category: Joi.string().required(),
})

module.exports = {
    categoryValidation,
    propertyValidation,
    optionValidation
}