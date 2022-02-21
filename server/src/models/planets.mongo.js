const mongoose = require('mongoose')

const PlanetsSchema = mongoose.Schema({
    keplerName: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('Planet', PlanetsSchema)