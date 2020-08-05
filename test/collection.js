const { Collection } = require('..')
const { Collection: BackboneCollection } = require('backbone')
const { MockedMixin } = require('./mock')

class MockedCollection extends Collection {}
Object.assign(MockedCollection.prototype, MockedMixin)

exports['test collection inherits from backbone'] = assert => {
  assert.ok(Collection.prototype instanceof BackboneCollection, 'inherited')
}

exports['test collection fetches normally by default'] = (assert, done) => {
  let order = 0
  new MockedCollection(undefined, { mock: [{ fetched: true }] })
    .on('request', () => assert.equal(1, ++order, 'request'))
    .on('update', () => assert.equal(2, ++order, 'update'))
    .on('reset', () => assert.ok(false, 'reset'))
    .on('sync', () => assert.equal(3, ++order, 'sync'))
    .on('error', () => assert.ok(false, 'error'))
    .fetch()
    .then(() => assert.equal(4, ++order, 'promise'))
    .then(done)
}

exports['test collection supports success callback by default'] = (assert, done) => {
  let order = 0
  const collection = new MockedCollection(undefined, { mock: [{ fetched: true }] })
  collection
    .on('request', () => assert.equal(1, ++order, 'request'))
    .on('update', () => assert.ok(false, 'update'))
    .on('reset', () => assert.equal(2, ++order, 'reset'))
    .on('sync', () => assert.equal(4, ++order, 'sync'))
    .on('error', () => assert.ok(false, 'error'))
    .fetch({
      parse: false,
      reset: true,
      context: 1,
      success (input, response, options) {
        assert.equal(3, ++order, 'callback')
        assert.equal(1, this, 'context')
        assert.equal(collection, input, 'collection')
        assert.deepEqual(response, [{ fetched: true }], 'response')
        assert.equal(1, options.context, 'options')
      }
    })
    .then(() => assert.equal(5, ++order, 'promise'))
    .then(done)
}

exports['test collection fails normally by default'] = (assert, done) => {
  let order = 0
  new MockedCollection(undefined, { mock: [{ fetched: false }] })
    .on('request', () => assert.equal(1, ++order, 'request'))
    .on('update', () => assert.ok(false, 'update'))
    .on('reset', () => assert.ok(false, 'reset'))
    .on('sync', () => assert.ok(false, 'sync'))
    .on('error', () => assert.equal(2, ++order, 'error'))
    .fetch()
    .then(() => assert.ok(false, 'then'))
    .catch(() => assert.equal(3, ++order, 'promise'))
    .then(done)
}

exports['test collection supports error callback by default'] = (assert, done) => {
  let order = 0
  const collection = new MockedCollection(undefined, { mock: [{ fetched: false }] })
  collection
    .on('request', () => assert.equal(1, ++order, 'request'))
    .on('update', () => assert.ok(false, 'update'))
    .on('reset', () => assert.ok(false, 'reset'))
    .on('sync', () => assert.ok(false, 'sync'))
    .on('error', () => assert.equal(3, ++order, 'error'))
    .fetch({
      context: 1,
      error (input, response, options) {
        assert.equal(2, ++order, 'callback')
        assert.equal(1, this, 'context')
        assert.equal(collection, input, 'collection')
        assert.deepEqual(response, [{ fetched: false }], 'response')
        assert.equal(1, options.context, 'options')
      }
    })
    .then(() => assert.ok(false, 'then'))
    .catch(() => assert.equal(4, ++order, 'promise'))
    .then(done)
}

exports['test collection delays update and events with succeeded transaction'] = (assert, done) => {
  let order = 0
  const collection = new MockedCollection(undefined, { mock: [{ fetched: true }] })
  collection.startTransaction()
  collection
    .on('request', () => assert.equal(1, ++order, 'request'))
    .on('update', () => assert.equal(3, ++order, 'update'))
    .on('reset', () => assert.ok(false, 'reset'))
    .on('sync', () => assert.equal(4, ++order, 'sync'))
    .on('error', () => assert.ok(false, 'error'))
    .fetch()
    .then(() => assert.equal(2, ++order, 'promise'))
    .then(() => collection.commit())
    .then(() => assert.equal(5, ++order, 'commit'))
    .then(done)
}

exports['test collection supports callback with succeeded transaction'] = (assert, done) => {
  let order = 0
  const collection = new MockedCollection(undefined, { mock: [{ fetched: true }] })
  collection.startTransaction()
  collection
    .on('request', () => assert.equal(1, ++order, 'request'))
    .on('update', () => assert.ok(false, 'update'))
    .on('reset', () => assert.equal(3, ++order, 'reset'))
    .on('sync', () => assert.equal(5, ++order, 'sync'))
    .on('error', () => assert.ok(false, 'error'))
    .fetch({
      parse: false,
      reset: true,
      context: 1,
      success (input, response, options) {
        assert.equal(4, ++order, 'callback')
        assert.equal(1, this, 'context')
        assert.equal(collection, input, 'collection')
        assert.deepEqual(response, [{ fetched: true }], 'response')
        assert.equal(1, options.context, 'options')
      }
    })
    .then(() => assert.equal(2, ++order, 'promise'))
    .then(() => collection.commit())
    .then(() => assert.equal(6, ++order, 'commit'))
    .then(done)
}

exports['test collection delays events with rolled back transaction'] = (assert, done) => {
  let order = 0
  const collection = new MockedCollection(undefined, { mock: [{ fetched: true }] })
  collection.startTransaction()
  collection
    .on('request', () => assert.equal(1, ++order, 'request'))
    .on('update', () => assert.ok(false, 'update'))
    .on('reset', () => assert.ok(false, 'reset'))
    .on('sync', () => assert.equal(3, ++order, 'sync'))
    .on('error', () => assert.ok(false, 'error'))
    .fetch()
    .then(() => assert.equal(2, ++order, 'promise'))
    .then(() => collection.rollback())
    .then(() => assert.equal(4, ++order, 'rollback'))
    .then(done)
}

exports['test collection supports callback with failed transaction'] = (assert, done) => {
  let order = 0
  const collection = new MockedCollection(undefined, { mock: [{ fetched: false }] })
  collection.startTransaction()
  collection
    .on('request', () => assert.equal(1, ++order, 'request'))
    .on('update', () => assert.ok(false, 'update'))
    .on('reset', () => assert.ok(false, 'reset'))
    .on('sync', () => assert.ok(false, 'sync'))
    .on('error', () => assert.equal(4, ++order, 'error'))
    .fetch({
      context: 1,
      error (input, response, options) {
        assert.equal(3, ++order, 'callback')
        assert.equal(1, this, 'context')
        assert.equal(collection, input, 'collection')
        assert.deepEqual(response, [{ fetched: false }], 'response')
        assert.equal(1, options.context, 'options')
      }
    })
    .then(() => assert.ok(false, 'then'))
    .catch(() => assert.equal(2, ++order, 'promise'))
    .then(() => collection.rollback())
    .then(() => assert.equal(5, ++order, 'rollback'))
    .then(done)
}

if (require.main === module) require('test').run(exports)
