const Appointment = require('../models/Appointment')
const response = require('../helpers/response')
const { failureMsg } = require('../constants/responseMsg')
const { extractJoiErrors, readExcel } = require('../helpers/utils')
const { createAppointmentValidation } = require('../middleware/validations/appointmentValidation')
const StoreStructure = require('../models/StoreStructure')

exports.index = async (req, res) => {
    const limit = parseInt(req.query.limit) || 0
    const page = parseInt(req.query.page) || 0
    const search = req.query.search?.replace(/ /g,'')
    const field = req.query.field || 'tags'
    const filter = req.query.filter || 'createdAt'
    const sort = req.query.sort || 'asc'
    
    let filterObj = { [filter]: sort }
    let query = {}
    if (search) {
        query[field] = {
            $regex: new RegExp(search, 'i')
        }
    }
    
    Appointment.find({ isCompleted: false, ...query }, async (err, appointments) => {
        if (err) return response.failure(422, { msg: failureMsg.trouble }, res, err)

        const totalCount = await Appointment.count({ isDisabled: false })
        return response.success(200, { data: appointments, length: totalCount }, res)
    })
        .skip(page * limit).limit(limit)
        .sort(filterObj)
        .populate({ path: 'customer', select: 'picture displayName contact', populate: { path: 'picture' } })
        .populate('structures', 'title status type size')
}

exports.list = async (req, res) => {
    Appointment.find({ isCompleted: false }, (err, appointments) => {
        if (err) return response.failure(422, { msg: failureMsg.trouble }, res, err)
        return response.success(200, { data: appointments }, res)
    }).select('name tags')
}

exports.detail = async (req, res) => {
    Appointment.findById(req.params.id, (err, appointment) => {
        if (err) return response.failure(422, { msg: failureMsg.trouble }, res, err)
        return response.success(200, { data: appointment }, res)
    }).populate({ path: 'payment', populate: [{ path: 'transactions', populate: { path: 'product', select: 'profile', populate: { path: 'profile', select: 'filename' }}}, { path: 'customer', select: 'displayName point' }, { path: 'createdBy' }] }).populate('customer', 'displayName point').populate('structures')
}

exports.create = async (req, res) => {
    const body = req.body
    const { error } = createAppointmentValidation.validate(body, { abortEarly: false })
    if (error) return response.failure(422, extractJoiErrors(error), res)

    try {
        if (!body.startAt) delete body.startAt
        Appointment.create({...body, createdBy: req.user.id}, async (err, appointment) => {
            if (err) return response.failure(422, { msg: err.message }, res, err)
            if (!appointment) return response.failure(422, { msg: 'No appointment created!' }, res, err)

            const structures = await StoreStructure.find({ _id: { '$in': appointment.structures } })
            for (let i = 0; i < structures.length; i++) {
                const structure = structures[i]
                structure.appointments.push(appointment._id)
                structure.status = 'reserved'
                structure.save()
            }

            response.success(200, { msg: 'Appointment has created successfully', data: appointment }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports.update = async (req, res) => {
    const body = req.body

    try {
        Appointment.findByIdAndUpdate(req.params.id, body, async (err, appointment) => {
            if (err) return response.failure(422, { msg: err.message }, res, err)
            if (!appointment) return response.failure(422, { msg: 'No appointment updated!' }, res, err)

            const structures = await StoreStructure.find({ _id: { '$in': appointment.structures } })
            for (let i = 0; i < structures.length; i++) {
                const structure = structures[i]
                structure.appointments.push(appointment._id)
                structure.status = 'reserved'
                structure.save()
            }
            response.success(200, { msg: 'Appointment has updated successfully', data: appointment }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports._delete = async (req, res) => {
    try {
        Appointment.findByIdAndDelete(req.params.id, (err, appointment) => {
            if (err) return response.failure(422, { msg: err.message }, res, err)

            if (!appointment) return response.failure(422, { msg: 'No appointment deleted!' }, res, err)
            response.success(200, { msg: 'Appointment has deleted successfully', data: appointment }, res)
        })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res, err)
    }
}

exports._import = async (req, res) => {
    try {
        const appointments = await readExcel(req.file.buffer, req.body.fields)
        response.success(200, { msg: 'List has been previewed', data: appointments }, res)
    } catch (err) {
        return response.failure(err.code, { msg: err.msg }, res)
    }
}

exports.batch = async (req, res) => {
    try {
        const appointments = req.body

        appointments.forEach(appointment => {
            appointment.name = JSON.parse(appointment.name)
            appointment.icon = JSON.parse(appointment.icon)
        })

        Appointment.insertMany(appointments)
            .then(data => {
                response.success(200, { msg: `${data.length} ${data.length > 1 ? 'branches' : 'branch'} has been inserted` }, res)
            })
            .catch(err => {
                return response.failure(422, { msg: err.message }, res)
            })
    } catch (err) {
        return response.failure(422, { msg: failureMsg.trouble }, res)
    }
}

