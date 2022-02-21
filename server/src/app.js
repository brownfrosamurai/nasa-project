const express = require('express')
const cors = require('cors')
const path = require('path')
const logger = require('morgan')

const api = require('./routes/api')

const app = express()

app.use(cors({
    origin: 'http://localhost:3000'
}));

app.use(logger('combined'))

app.use(express.json())

app.use(express.static(path.join(__dirname, '..', 'public')))

app.use('/v1', api)

app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
})

module.exports = app