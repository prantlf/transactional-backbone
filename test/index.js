const model = require('./model')
const collection = require('./collection')
const fetch = require('./fetch')
require('test').run(Object.assign({}, model, collection, fetch))
