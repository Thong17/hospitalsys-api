const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { default: mongoose } = require('mongoose')
const responseMsg = require('../constants/responseMsg')

module.exports = utils = {
    encryptPassword: (plainPassword) => {
        return bcrypt.hash(plainPassword, 10)
    },
    comparePassword: (plainPassword, encryptedPassword) => {
        return bcrypt.compare(plainPassword, encryptedPassword)
    },
    validatePassword: (password) => {
        let passwordComplexity = new RegExp('(?=.*[a-z])(?=.*[0-9])(?=.{7,})')
        return passwordComplexity.test(password)
    },
    extractJoiErrors: (error) => {
        const messages = []
        error.details?.forEach(error => {
            let msg = ''
            switch (error.type) {
                case 'object.unknown':
                    message = 'ERROR:JOI_OBJECT_UNKNOWN'
                    break
            
                default:
                    message = 'ERROR:JOI_DEFAULT'
                    break
            }
            const obj = {
                msg,
                path: error.message,
                key: error.context.label
            }
            messages.push(obj)
        });
        return messages
    },
    issueToken: (data, secret, expire) => {
        return new Promise((resolve, reject) => {
            try {
                const token = jwt.sign(data, secret, { expiresIn: expire })
                resolve(token)
            } catch (err) {
                reject(err)
            }
        })
    },
    verifyToken: (token, secret) => {
        return new Promise((resolve, reject) => {
            try {
                const decoded = jwt.verify(token, secret)
                resolve(decoded)
            } catch (err) {
                if (err.name !== 'TokenExpiredError') reject(err)
                const decoded = jwt.decode(token, secret)
                reject(decoded)
            }
        })
    },
    createHash: (str) => {
        const sha256 = require('js-sha256')
        return sha256.hex(str).toString()
    },
    compareDate: (date1, date2) => {
        if (!date1 && !date2) return false
        return date1 > date2
    },
    currencyFormat: (amount) => {
        if (!amount) return 
        return (amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')
    },
    readExcel: (buffer, field, languages = []) => {
        const xlsx = require('xlsx')
        const ObjectId = mongoose.Types.ObjectId
        return new Promise((resolve, reject) => {
            try {
                const fields = field.split(',')
                const workbook = xlsx.read(buffer, { type: 'buffer' })
                const json = xlsx.utils.sheet_to_json(workbook.Sheets?.['WORKSHEET'] || {})
                const data = []
                let no = 0
                json.forEach(row => {
                    let obj = {}
                    no++
                    fields.forEach(column => {
                        let value = row?.[column]
                        if (value === undefined) return
                        if (column === 'ID') value = new ObjectId(value)

                        obj = {
                            ...obj,
                            no: no,
                            [column]: value
                        }
                    })
                    Object.keys(obj).length > 0 && data.push(obj)
                })
                if (data.length === 0) reject({ msg: 'Invalid excel format!', code: 422 })
                resolve(data)
            } catch (err) {
                reject({ msg: responseMsg.failureMsg.trouble, code: 422 })
            }
        })
    },
    calculatePromotion: (totalObj, discountObj, exchangeRate) => {
        if (discountObj.isFixed) {
            if (discountObj.type !== 'PCT') {
                totalObj.total = discountObj.value
                totalObj.currency = discountObj.type
                return totalObj
            }
            totalObj.total = (totalObj.total * discountObj.value) / 100
            totalObj.currency = totalObj.currency
            return totalObj
        }

        if (discountObj.type === 'PCT') {
            totalObj.total = totalObj.total - (totalObj.total * discountObj.value / 100)
            return totalObj
        }

        const { sellRate = 4000, buyRate = 4100 } = exchangeRate
        if (totalObj.currency === discountObj.type) {
            totalObj.total = totalObj.total - discountObj.value
            return totalObj
        }

        let totalExchange = 0
        if (discountObj.type === 'USD') {
            totalExchange = discountObj.value * sellRate
            totalObj.total = totalObj.total - totalExchange
        } else {
            totalExchange = discountObj.value / buyRate
            totalObj.total = totalObj.total - totalExchange
        }
        return totalObj
    },
    calculateService: (totalObj, serviceObj, exchangeRate) => {
        if (serviceObj.type === 'PCT') {
            totalObj.total = totalObj.total + (totalObj.total * serviceObj.value / 100)
            return totalObj
        }

        const { sellRate = 4000, buyRate = 4100 } = exchangeRate
        if (totalObj.currency === serviceObj.type) {
            totalObj.total = totalObj.total + serviceObj.value
            return totalObj
        }

        let totalExchange = 0
        if (serviceObj.type === 'USD') {
            totalExchange = serviceObj.value * sellRate
            totalObj.total = totalObj.total + totalExchange
        } else {
            totalExchange = serviceObj.value / buyRate
            totalObj.total = totalObj.total + totalExchange
        }
        return totalObj
    },
    calculatePaymentTotal: (transactions, services, vouchers, discounts, exchangeRate) => {
        const { sellRate } = exchangeRate
        let totalUSD = 0
        let totalKHR = 0

        transactions.forEach(transaction => {
            if (transaction.total?.currency === 'USD') totalUSD += transaction.total?.value
            else totalKHR += transaction.total?.value
        })

        const totalBoth = totalUSD + (totalKHR / sellRate)

        let total = totalBoth
        let currency = 'USD'

        discounts.forEach(promotion => {
            if (currency === 'KHR') {
                total /= sellRate
                currency = 'USD'
            }

            let { total: totalDiscounted, currency: currencyDiscounted } = utils.calculatePromotion({ total, currency }, promotion, exchangeRate)

            total = totalDiscounted
            currency = currencyDiscounted
        })

        services.forEach(service => {
            if (currency === 'KHR') {
                total /= sellRate
                currency = 'USD'
            }
            
            let { total: totalCharged, currency: currencyCharged } = utils.calculateService({ total, currency }, service, exchangeRate)

            total = totalCharged
            currency = currencyCharged
        })

        vouchers.forEach(promotion => {
            if (currency === 'KHR') {
                total /= sellRate
                currency = 'USD'
            }

            let { total: totalVouchered, currency: currencyVouchered } = utils.calculatePromotion({ total, currency }, promotion, exchangeRate)

            total = totalVouchered
            currency = currencyVouchered
        })

        return { total: { value: total, currency }, subtotal: { USD: totalUSD, KHR: totalKHR, BOTH: totalBoth }, rate: exchangeRate }
    },
    sortObject: (array, property) => {
        return array.sort((a, b) => (a[property] > b[property]) ? 1 : ((b[property] > a[property]) ? -1 : 0))
    },
    calculateReturnCashes: (cashes, remainTotal, exchangeRate) => {
        return new Promise((resolve, reject) => {
            if (remainTotal.USD > 0) reject({ msg: 'Not enough cash', code: 422 })

            const { sellRate } = exchangeRate
            let returnCash = Math.abs(remainTotal.USD)
            let returnCashes = []

            const mappedCashes = cashes.map(cash => {
                return cash.currency === 'USD' 
                    ? ({ ...cash, value: parseFloat(cash.cash) }) 
                    : ({ ...cash, value: parseFloat(cash.cash) / sellRate })
            })
            const sortedCashes = utils.sortObject(mappedCashes, 'value')

            sortedCashes.reverse().forEach(cash => {
                if (returnCash / cash.value < 1 || cash.quantity < 1 || returnCash <= 0) return
                let needQuantity = Math.floor(returnCash / cash.value)
                const quantity = parseFloat(cash.quantity)

                if (quantity > needQuantity) {
                    returnCashes.push({ cash: cash.cash, quantity: needQuantity, currency: cash.currency, rate: sellRate })
                    returnCash -= cash.value * needQuantity
                    cash.quantity = quantity - needQuantity
                } else {
                    returnCashes.push({ cash: cash.cash, quantity, currency: cash.currency, rate: sellRate })
                    returnCash -= cash.value * quantity
                    cash.quantity = 0
                }
            })

            if (returnCash > 0) returnCashes.push({ cash: returnCash, exchange: returnCash * sellRate, currency: 'USD', rate: sellRate, quantity: 1 })

            resolve({ remainCash: -returnCash, returnCashes, cashes: sortedCashes })
        })
    },
    sendMessageTelegram: async ({ text, token, chatId }) => {
        return new Promise((resolve, reject) => {
            const axios = require('axios')
            const { TELEGRAM_API_URL } = process.env
            axios.post(`${TELEGRAM_API_URL}${token}/sendMessage`, 
                { 
                    chat_id: chatId,
                    text
                }
            )
            .then(res => resolve(res))
            .catch(err => reject(err))
        })
    },
}