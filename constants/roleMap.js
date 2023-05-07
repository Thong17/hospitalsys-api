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
    cashing: {
        list: {
            route: 'cashing',
            action: 'list'
        },
        detail: {
            route: 'cashing',
            action: 'detail'
        },
        create: {
            route: 'cashing',
            action: 'create'
        },
        update: {
            route: 'cashing',
            action: 'update'
        },
        delete: {
            route: 'cashing',
            action: 'delete'
        }
    },
    transaction: {
        list: {
            route: 'transaction',
            action: 'list'
        },
        detail: {
            route: 'transaction',
            action: 'detail'
        },
        create: {
            route: 'transaction',
            action: 'create'
        },
        update: {
            route: 'transaction',
            action: 'update'
        },
        delete: {
            route: 'transaction',
            action: 'delete'
        }
    },
    reservation: {
        list: {
            route: 'reservation',
            action: 'list'
        },
        detail: {
            route: 'reservation',
            action: 'detail'
        },
        create: {
            route: 'reservation',
            action: 'create'
        },
        update: {
            route: 'reservation',
            action: 'update'
        },
        delete: {
            route: 'reservation',
            action: 'delete'
        }
    },
    category: {
        list: {
            route: 'category',
            action: 'list'
        },
        detail: {
            route: 'category',
            action: 'detail'
        },
        create: {
            route: 'category',
            action: 'create'
        },
        update: {
            route: 'category',
            action: 'update'
        },
        delete: {
            route: 'category',
            action: 'delete'
        },
    },
    brand: {
        list: {
            route: 'brand',
            action: 'list'
        },
        detail: {
            route: 'brand',
            action: 'detail'
        },
        create: {
            route: 'brand',
            action: 'create'
        },
        update: {
            route: 'brand',
            action: 'update'
        },
        delete: {
            route: 'brand',
            action: 'delete'
        },
    },
    store: {
        list: {
            route: 'store',
            action: 'list'
        },
        detail: {
            route: 'store',
            action: 'detail'
        },
        create: {
            route: 'store',
            action: 'create'
        },
        update: {
            route: 'store',
            action: 'update'
        },
        delete: {
            route: 'store',
            action: 'delete'
        },
    },
    product: {
        list: {
            route: 'product',
            action: 'list'
        },
        detail: {
            route: 'product',
            action: 'detail'
        },
        create: {
            route: 'product',
            action: 'create'
        },
        update: {
            route: 'product',
            action: 'update'
        },
        delete: {
            route: 'product',
            action: 'delete'
        },
    },
    appointment: {
        list: {
            route: 'appointment',
            action: 'list'
        },
        detail: {
            route: 'appointment',
            action: 'detail'
        },
        create: {
            route: 'appointment',
            action: 'create'
        },
        update: {
            route: 'appointment',
            action: 'update'
        },
        delete: {
            route: 'appointment',
            action: 'delete'
        },
    },
    drawer: {
        list: {
            route: 'drawer',
            action: 'list'
        },
        detail: {
            route: 'drawer',
            action: 'detail'
        },
        create: {
            route: 'drawer',
            action: 'create'
        },
        update: {
            route: 'drawer',
            action: 'update'
        },
        delete: {
            route: 'drawer',
            action: 'delete'
        },
    },
    preset: {
        list: {
            route: 'preset',
            action: 'list'
        },
        detail: {
            route: 'preset',
            action: 'detail'
        },
        create: {
            route: 'preset',
            action: 'create'
        },
        update: {
            route: 'preset',
            action: 'update'
        },
        delete: {
            route: 'preset',
            action: 'delete'
        },
    },
}

exports.navigation = {
    admin: {
        role: {
            menu: 'admin',
            navbar: 'role'
        },
        user: {
            menu: 'admin',
            navbar: 'user'
        },
    },
    operation: {
        cashing: {
            menu: 'operation',
            navbar: 'cashing'
        }
    },
    organize: {
        category: {
            menu: 'organize',
            navbar: 'category'
        },
        brand: {
            menu: 'organize',
            navbar: 'brand'
        },
        product: {
            menu: 'organize',
            navbar: 'product'
        },
        store: {
            menu: 'organize',
            navbar: 'store'
        },
    },
    config: {
        theme: {
            menu: 'config',
            navbar: 'theme'
        },
        language: {
            menu: 'config',
            navbar: 'language'
        },
        telegram: {
            menu: 'config',
            navbar: 'telegram'
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

