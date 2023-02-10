const mongoose = require('mongoose')
const Role = require('../models/Role')
const User = require('../models/User')
const { encryptPassword } = require('../helpers/utils')

mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
})
.then(async () => {
    try {
        const totalUser = await User.count()
        if (totalUser > 0) return

        const { preRole } = require('../constants/roleMap')
        let privilege
        let username = 'Admin'
        Object.keys(preRole).forEach(menu => {
            privilege = {
                ...privilege,
                [menu]: {}
            }
            Object.keys(preRole[menu]).forEach(route => {
                privilege[menu][route] = true
            })
        })

        const role = await Role.create({ name: { English: 'Super Admin' }, privilege, description: 'Default role generated by system', isDefault: true })
        const password = await encryptPassword(`${username}${process.env.DEFAULT_PASSWORD}`)
        await User.create({
            username,
            password,
            role: role._id,
            isDefault: true
        })
        console.log('Mongo Client is connected...')
    } catch (err) {
        console.error(err)
    }
})
.catch((error) => console.error(error))
