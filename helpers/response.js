const { successCode, failureCode } = require('../constants/statusCodes')
const { failureMsg } = require('../constants/responseMsg')

exports.success = (code, data, res) => {
    const result = {
        code: successCode[code] ? successCode[code] : 'UNKNOWN_CODE',
        ...data
    }
    res.status(code)
    res.json(result)
}

exports.failure = (code, data, res, error) => {
    const { msg, ...rest } = data
    const result = {
        code: failureCode[code] ? failureCode[code] : 'UNKNOWN_CODE',
        msg: msg || failureMsg.trouble,
        ...rest,
    }
    error && console.error(error)
    res.status(code || 500)
    res.json(result)
}

