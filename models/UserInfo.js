const mongoose = require('mongoose')

const schema = mongoose.Schema(
    {
        referenceId: {
            type: String
        },
        bloodType: {
            type: String
        },
        weight: {
            type: String
        },
        height: {
            type: String
        },
        nationality: {
            type: String
        },
        religion: {
            type: String
        }
    },
    {
        timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
    }
)

module.exports = mongoose.model('UserInfo', schema)