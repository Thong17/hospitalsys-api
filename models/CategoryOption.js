const mongoose = require('mongoose')
const Category = require('./Category')
const CategoryProperty = require('./CategoryProperty')

const schema = mongoose.Schema(
    {
        name: {
            type: Object,
            require: true
        },
        price: {
            type: Number,
            default: 0
        },
        currency: {
            type: String,
            default: 'USD'
        },
        profile: {
            type: mongoose.Schema.ObjectId,
            ref: 'Image'
        },
        description: {
            type: String,
            default: ''
        },
        isDefault: {
            type: Boolean,
            default: false
        },
        property: {
            type: mongoose.Schema.ObjectId,
            ref: 'CategoryProperty',
            require: true
        },
        category: {
            type: mongoose.Schema.ObjectId,
            ref: 'Category',
            require: true
        },
    },
    {
        timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
    }
)

schema.post('save', async function () {
    const category = await Category.findById(this.category._id)
    await Category.findByIdAndUpdate(this.category._id, { options: [...category.options, this._id] })

    const property = await CategoryProperty.findById(this.property._id)
    await CategoryProperty.findByIdAndUpdate(this.property._id, { options: [...property.options, this._id] })
})

module.exports = mongoose.model('CategoryOption', schema)