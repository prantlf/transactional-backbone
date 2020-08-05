const MockedMixin = {
  url: '/',

  initialize (input, options) { this.mock = options.mock },

  sync (method, model, options) {
    if (method !== 'read') throw new Error('not implemented')
    this.trigger('request', model, {}, options)
    const success = options.success
    const error = options.error
    return new Promise((resolve, reject) => setTimeout(() => {
      const mock = this.mock
      const succeed = Array.isArray(mock) ? mock[0].fetched : mock.fetched
      if (succeed) {
        success.call(options.context, mock)
        resolve(mock)
      } else {
        error.call(options.context, mock)
        reject(mock)
      }
    }))
  }
}

module.exports = { MockedMixin }
