const mongoose = require('mongoose')
const Category = require('./Category')

const schema = mongoose.Schema(
    {
        name: {
            type: Object,
            require: true
        },
        order: {
            type: Number,
            default: 0
        },
        choice: {
            type: String,
            default: 'SINGLE'
        },
        isRequire: {
            type: Boolean,
            default: false
        },
        description: {
            type: String,
            default: ''
        },
        options: [{
            type: mongoose.Schema.ObjectId,
            ref: 'ProductOption'
        }],
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
    const category = await Category.findOne({ _id: this.category._id })
    category.properties.push(this._id)
    category.save()
})

schema.statics.reorder = function (reorderedItems) {
    const promises = []
    for (let index = 0; index < reorderedItems.length; index++) {
        const item = reorderedItems[index]
        const promise = this.findByIdAndUpdate(item._id, { order: item.order }, { new: true })
        promises.push(promise)
    }
    Promise.all(promises)
}

module.exports = mongoose.model('CategoryProperty', schema)