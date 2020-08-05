const { Model, fetchWithTransaction } = require('..')
const { MockedMixin } = require('./mock')

class MockedModel extends Model {}
Object.assign(MockedModel.prototype, MockedMixin)

exports['test fetchWithTransaction handles success'] = (assert, done) => {
  const one = new MockedModel(undefined, { mock: { fetched: true } })
  const two = new MockedModel(undefined, { mock: { fetched: true } })
  fetchWithTransaction([one, two])
    .catch(() => assert.ok(false, 'catch'))
    .then(() => {
      assert.equal(true, one.attributes.fetched, 'one')
      assert.equal(true, two.attributes.fetched, 'two')
    })
    .then(done)
}

exports['test fetchWithTransaction handles failure with commit'] = (assert, done) => {
  const one = new MockedModel(undefined, { mock: { fetched: true } })
  const two = new MockedModel(undefined, { mock: { fetched: false } })
  fetchWithTransaction([one, two])
    .then(() => assert.ok(false, 'then'))
    .catch(() => {
      assert.equal(true, one.attributes.fetched, 'one')
      assert.equal(undefined, two.attributes.fetched, 'two')
    })
    .then(done)
}

exports['test fetchWithTransaction handles failure with rollback'] = (assert, done) => {
  const one = new MockedModel(undefined, { mock: { fetched: true } })
  const two = new MockedModel(undefined, { mock: { fetched: false } })
  fetchWithTransaction([one, two], { rollbackOnError: true })
    .then(() => assert.ok(false, 'then'))
    .catch(() => {
      assert.equal(undefined, one.attributes.fetched, 'one')
      assert.equal(undefined, two.attributes.fetched, 'two')
    })
    .then(done)
}

if (require.main === module) require('test').run(exports)
