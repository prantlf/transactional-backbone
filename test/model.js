const { Model } = require('..')
const { Model: BackboneModel } = require('backbone')
const { MockedMixin } = require('./mock')

class MockedModel extends Model {}
Object.assign(MockedModel.prototype, MockedMixin)

exports['test model inherits from backbone'] = assert => {
  assert.ok(Model.prototype instanceof BackboneModel, 'inherited')
}

exports['test model fetches normally by default'] = (assert, done) => {
  let order = 0
  new MockedModel(undefined, { mock: { fetched: true } })
    .on('request', () => assert.equal(1, ++order, 'request'))
    .on('change', () => assert.equal(2, ++order, 'change'))
    .on('sync', () => assert.equal(3, ++order, 'sync'))
    .on('error', () => assert.ok(false, 'error'))
    .fetch()
    .then(() => assert.equal(4, ++order, 'promise'))
    .then(done)
}

exports['test model supports success callback by default'] = (assert, done) => {
  let order = 0
  const model = new MockedModel(undefined, { mock: { fetched: true } })
  model
    .on('request', () => assert.equal(1, ++order, 'request'))
    .on('change', () => assert.equal(2, ++order, 'change'))
    .on('sync', () => assert.equal(4, ++order, 'sync'))
    .on('error', () => assert.ok(false, 'error'))
    .fetch({
      parse: false,
      context: 1,
      success (input, response, options) {
        assert.equal(3, ++order, 'callback')
        assert.equal(1, this, 'context')
        assert.equal(model, input, 'model')
        assert.deepEqual(response, { fetched: true }, 'response')
        assert.equal(1, options.context, 'options')
      }
    })
    .then(() => assert.equal(5, ++order, 'promise'))
    .then(done)
}

exports['test model fails normally by default'] = (assert, done) => {
  let order = 0
  new MockedModel(undefined, { mock: { fetched: false } })
    .on('request', () => assert.equal(1, ++order, 'request'))
    .on('change', () => assert.ok(false, 'change'))
    .on('sync', () => assert.ok(false, 'sync'))
    .on('error', () => assert.equal(2, ++order, 'error'))
    .fetch()
    .then(() => assert.ok(false, 'then'))
    .catch(() => assert.equal(3, ++order, 'promise'))
    .then(done)
}

exports['test model supports error callback by default'] = (assert, done) => {
  let order = 0
  const model = new MockedModel(undefined, { mock: { fetched: false } })
  model
    .on('request', () => assert.equal(1, ++order, 'request'))
    .on('change', () => assert.ok(false, 'change'))
    .on('sync', () => assert.ok(false, 'sync'))
    .on('error', () => assert.equal(3, ++order, 'error'))
    .fetch({
      parse: false,
      context: 1,
      error (input, response, options) {
        assert.equal(2, ++order, 'callback')
        assert.equal(1, this, 'context')
        assert.equal(model, input, 'model')
        assert.deepEqual(response, { fetched: false }, 'response')
        assert.equal(1, options.context, 'options')
      }
    })
    .then(() => assert.ok(false, 'then'))
    .catch(() => assert.equal(4, ++order, 'promise'))
    .then(done)
}

exports['test model delays change and events with succeeded transaction'] = (assert, done) => {
  let order = 0
  const model = new MockedModel(undefined, { mock: { fetched: true } })
  model.startTransaction()
  model
    .on('request', () => assert.equal(1, ++order, 'request'))
    .on('change', () => assert.equal(3, ++order, 'change'))
    .on('sync', () => assert.equal(4, ++order, 'sync'))
    .on('error', () => assert.ok(false, 'error'))
    .fetch()
    .then(() => assert.equal(2, ++order, 'promise'))
    .then(() => model.commit())
    .then(() => assert.equal(5, ++order, 'commit'))
    .then(done)
}

exports['test model supports callback with succeeded transaction'] = (assert, done) => {
  let order = 0
  const model = new MockedModel(undefined, { mock: { fetched: true } })
  model.startTransaction()
  model
    .on('request', () => assert.equal(1, ++order, 'request'))
    .on('change', () => assert.equal(3, ++order, 'change'))
    .on('sync', () => assert.equal(5, ++order, 'sync'))
    .on('error', () => assert.ok(false, 'error'))
    .fetch({
      context: 1,
      success (input, response, options) {
        assert.equal(4, ++order, 'callback')
        assert.equal(1, this, 'context')
        assert.equal(model, input, 'model')
        assert.deepEqual(response, { fetched: true }, 'response')
        assert.equal(1, options.context, 'options')
      }
    })
    .then(() => assert.equal(2, ++order, 'promise'))
    .then(() => model.commit())
    .then(() => assert.equal(6, ++order, 'commit'))
    .then(done)
}

exports['test model delays events with rolled back transaction'] = (assert, done) => {
  let order = 0
  const model = new MockedModel(undefined, { mock: { fetched: true } })
  model.startTransaction()
  model
    .on('request', () => assert.equal(1, ++order, 'request'))
    .on('change', () => assert.ok(false, 'change'))
    .on('sync', () => assert.equal(3, ++order, 'sync'))
    .on('error', () => assert.ok(false, 'error'))
    .fetch()
    .then(() => assert.equal(2, ++order, 'promise'))
    .then(() => model.rollback())
    .then(() => assert.equal(4, ++order, 'rollback'))
    .then(done)
}

exports['test model supports callback with failed transaction'] = (assert, done) => {
  let order = 0
  const model = new MockedModel(undefined, { mock: { fetched: false } })
  model.startTransaction()
  model
    .on('request', () => assert.equal(1, ++order, 'request'))
    .on('change', () => assert.ok(false, 'change'))
    .on('sync', () => assert.ok(false, 'sync'))
    .on('error', () => assert.equal(4, ++order, 'error'))
    .fetch({
      context: 1,
      error (input, response, options) {
        assert.equal(3, ++order, 'callback')
        assert.equal(1, this, 'context')
        assert.equal(model, input, 'model')
        assert.deepEqual(response, { fetched: false }, 'response')
        assert.equal(1, options.context, 'options')
      }
    })
    .then(() => assert.ok(false, 'then'))
    .catch(() => assert.equal(2, ++order, 'promise'))
    .then(() => model.rollback())
    .then(() => assert.equal(5, ++order, 'rollback'))
    .then(done)
}

if (require.main === module) require('test').run(exports)
