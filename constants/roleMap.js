exports.privilege = {
    user: {
        list: {
            route: 'user',
            action: 'list'
        },
        detail: {
            route: 'user',
            action: 'detail'
        },
        create: {
            route: 'user',
            action: 'create'
        },
        update: {
            route: 'user',
            action: 'update'
        },
        delete: {
            route: 'user',
            action: 'delete'
        }
    },
    role: {
        list: {
            route: 'role',
            action: 'list'
        },
        detail: {
            route: 'role',
            action: 'detail'
        },
        create: {
            route: 'role',
            action: 'create'
        },
        update: {
            route: 'role',
            action: 'update'
        },
        delete: {
            route: 'role',
            action: 'delete'
        }
    },
}

exports.navigation = {
    menu: {
        admin: {
            route: 'admin',
            children: ['user', 'role']
        },
        config: {
            route: 'config',
            children: ['config']
        },
    },
}

let menu
const menus = Object.keys(this.navigation)
menus.forEach(m => {
    menu = {
        ...menu,
        [m]: {}
    }
    Object.keys(this.navigation[m]).forEach(k => {
        menu[m][k] = false
    })
})

exports.preMenu = menu

let role
const roles = Object.keys(this.privilege)
roles.forEach(p => {
    role = {
        ...role,
        [p]: {}
    }
    Object.keys(this.privilege[p]).forEach(k => {
        role[p][k] = false
    })
})

exports.preRole = role

