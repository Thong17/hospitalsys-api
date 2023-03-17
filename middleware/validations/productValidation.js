const Joi = require('joi')

const createProductValidation = Joi.object({
    name: Joi.object().required(),
    price: Joi.number().required(),
    currency: Joi.string().required(),
    code: Joi.string().optional().allow(''),
    status: Joi.boolean().optional(),
    description: Joi.string().optional().allow(''),
    isStock: Joi.boolean().optional(),
    profile: Joi.any().optional(),
    brand: Joi.string().required(),
    category: Joi.string().required(),
    images: Joi.array().optional(),
    properties: Joi.array().optional(),
})

const createOptionValidation = Joi.object({
    name: Joi.object().required(),
    price: Joi.number().optional(),
    currency: Joi.string().optional(),
    profile: Joi.any().optional(),
    description: Joi.string().optional().allow(''),
    property: Joi.string().required(),
    product: Joi.string().required(),
})

const createColorValidation = Joi.object({
    name: Joi.object().required(),
    price: Joi.number().optional(),
    code: Joi.string().optional().allow(''),
    currency: Joi.string().optional(),
    profile: Joi.any().optional(),
    images: Joi.array().optional(),
    description: Joi.string().optional().allow(''),
    product: Joi.string().required(),
})

const createCustomerOptionValidation = Joi.object({
    name: Joi.object().required(),
    price: Joi.number().optional(),
    code: Joi.string().optional().allow(''),
    currency: Joi.string().optional(),
    description: Joi.string().optional().allow(''),
    product: Joi.string().required(),
})

const propertyValidation = Joi.object({
    name: Joi.object().required(),
    description: Joi.string().optional().allow(''),
    product: Joi.string().required(),
    choice: Joi.string().required(),
    isRequire: Joi.boolean().required(),
})

module.exports = {
    createProductValidation,
    createOptionValidation,
    propertyValidation,
    createColorValidation,
    createCustomerOptionValidation
}