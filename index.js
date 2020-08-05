const { Model, Collection } = require('backbone')
const { clone, defer, extend } = require('underscore')

function endTransaction (model, status) {
  for (const callbacks of model.transaction) callbacks(status)
  model.transaction = null
}

const TransactionMixin = {
  startTransaction () { this.transaction = [] },

  commit () { endTransaction(this, true) },

  rollback () { endTransaction(this, false) }
}

function wrapError (model, options) {
  const callerError = options.error
  const error = response => {
    if (callerError) callerError.call(options.context, model, response, options)
    model.trigger('error', model, response, options)
  }
  // If transactions are enabled, let the error callback be pushed to
  // the queue or callbacks, otherwise let it executed.
  if (model.transaction) {
    options.error = response => model.transaction ? model.transaction.push(
      () => error(response)) : error(response)
  } else {
    options.error = error
  }
}

function read (model, success, options) {
  // If transactions are enabled, let the success callback be pushed to the
  // queue or callbacks, otherwise let it executed with the success state.
  if (model.transaction) {
    options.success = response => model.transaction ? model.transaction.push(
      status => success(status, response)) : success(true, response)
  } else {
    options.success = response => success(true, response)
  }
  wrapError(model, options)
  return model.sync('read', model, options)
}

class TransactionalModel extends Model {
  fetch (options) {
    options = extend({ parse: true }, options)
    const callerSuccess = options.success
    const success = (success, response) => {
      // If the success callback was called during commit, store the data,
      // otherwise trigger an error like in case of a failure.
      if (success) {
        var serverAttrs = options.parse ? this.parse(response, options) : response
        if (!this.set(serverAttrs, options)) return false
        if (callerSuccess) callerSuccess.call(options.context, this, response, options)
      }
      this.trigger('sync', this, response, options)
    }
    return read(this, success, options)
  }

  /* istanbul ignore next */ save (key, val, options) {
    // Handle both `"key", value` and `{key: value}` -style arguments.
    let attrs
    if (key == null || typeof key === 'object') {
      attrs = key
      options = val
    } else {
      (attrs = {})[key] = val
    }

    options = extend({ validate: true, parse: true }, options)
    const wait = options.wait

    // If we're not waiting and attributes exist, save acts as
    // `set(attr).save(null, opts)` with validation. Otherwise, check if
    // the model will be valid when the attributes, if any, are set.
    if (attrs && !wait) {
      if (!this.set(attrs, options)) return false
    } else if (!this._validate(attrs, options)) {
      return false
    }

    // After a successful server-side save, the client is (optionally)
    // updated with the server-side state.
    const callerSuccess = options.success
    const attributes = this.attributes
    const success = (success, response) => {
      if (success) {
        // Ensure attributes are restored during synchronous saves.
        this.attributes = attributes
        var serverAttrs = options.parse ? this.parse(response, options) : response
        if (wait) serverAttrs = extend({}, attrs, serverAttrs)
        if (serverAttrs && !this.set(serverAttrs, options)) return false
        if (callerSuccess) callerSuccess.call(options.context, this, response, options)
      }
      this.trigger('sync', this, response, options)
    }

    // If transactions are enabled, let the success callback be pushed to the
    // queue or callbacks, otherwise let it executed with the success state.
    if (this.transaction) {
      options.success = response => this.transaction ? this.transaction.push(
        status => success(status, response)) : success(true, response)
    } else {
      options.success = response => success(true, response)
    }
    wrapError(this, options)

    // Set temporary attributes if `{wait: true}` to properly find new ids.
    if (attrs && wait) this.attributes = extend({}, attributes, attrs)

    var method = this.isNew() ? 'create' : options.patch ? 'patch' : 'update'
    if (method === 'patch' && !options.attrs) options.attrs = attrs
    var xhr = this.sync(method, this, options)

    // Restore attributes.
    this.attributes = attributes

    return xhr
  }

  /* istanbul ignore next */ destroy (options) {
    options = options ? clone(options) : {}
    const callerSuccess = options.success
    const wait = options.wait

    var destroy = function () {
      this.stopListening()
      this.trigger('destroy', this, this.collection, options)
    }

    const success = (success, response) => {
      // If the success callback was called during commit, store the data,
      // otherwise trigger an error like in case of a failure.
      if (success) {
        if (wait) destroy()
        if (callerSuccess) callerSuccess.call(options.context, this, response, options)
      }
      if (!this.isNew()) this.trigger('sync', this, response, options)
    }

    // If transactions are enabled, let the success callback be pushed to the
    // queue or callbacks, otherwise let it executed with the success state.
    if (this.transaction) {
      options.success = response => this.transaction ? this.transaction.push(
        status => success(status, response)) : success(true, response)
    } else {
      options.success = response => success(true, response)
    }

    let xhr = false
    if (this.isNew()) {
      if (this.transaction) this.transaction.push(status => success(status))
      else defer(options.success)
    } else {
      wrapError(this, options)
      xhr = this.sync('delete', this, options)
    }
    if (!wait) {
      if (this.transaction) this.transaction.push(destroy)
      else destroy()
    }
    return xhr
  }
}

Object.assign(TransactionalModel.prototype, TransactionMixin)

class TransactionalCollection extends Collection {
  get model () { return TransactionalModel }

  fetch (options) {
    options = extend({ parse: true }, options)
    const callerSuccess = options.success
    const success = (success, response) => {
      // If the success callback was called during commit, store the data,
      // otherwise trigger an error like in case of a failure.
      if (success) {
        const method = options.reset ? 'reset' : 'set'
        this[method](response, options)
        if (callerSuccess) callerSuccess.call(options.context, this, response, options)
      }
      this.trigger('sync', this, response, options)
    }
    return read(this, success, options)
  }
}

Object.assign(TransactionalCollection.prototype, TransactionMixin)

function fetchWithTransaction (models, options) {
  function endTransaction (method) { for (const model of models) model[method]() }

  for (const model of models) model.startTransaction()
  return Promise.allSettled(models.map(model => model.fetch(options)))
    .then(results => {
      if (results.every(result => result.status === 'fulfilled')) {
        endTransaction('commit')
        return results
      }
      endTransaction(options && options.rollbackOnError ? 'rollback' : 'commit')
      throw results
    })
}

module.exports = {
  Model: TransactionalModel, Collection: TransactionalCollection, fetchWithTransaction
}
