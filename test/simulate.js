const { Model, Collection, fetchWithTransaction } = require('..')
const {
  screen: createScreen, text: createText, box: createBox, table: createTable
} = require('neo-blessed')
const {
  StackedView, StaticTextView, TextModelView,
  TextCollectionView, ListCollectionView, TableCollectionView
} = require('./blessed/views')
const { place, pad, outline } = require('./blessed/helpers')

const transactions = process.env.TRANSACTIONS

const MockedMixin = {
  url: '/',

  initialize (input, options) {
    this.mock = options.mock
    this.delay = options.delay
  },

  sync (method, model, options) {
    if (method !== 'read') throw new Error('not implemented')
    this.trigger('request', model, {}, options)
    const success = options.success
    return new Promise(resolve => setTimeout(() => {
      success.call(options.context, this.mock)
      resolve(this.mock)
    }, this.delay))
  }
}

class MockedModel extends Model {}

Object.assign(MockedModel.prototype, MockedMixin)

class MockedCollection extends Collection {}

Object.assign(MockedCollection.prototype, MockedMixin)

class Node extends MockedModel {
  get defaults () { return { name: null, directory: false } }
}

class Parent extends Model {
  get defaults () { return { name: null } }
}

class Addable extends Model {
  get defaults () { return { type: null } }
}

class Contents extends MockedCollection {
  get model () { return Node }
}

class Path extends MockedCollection {
  get model () { return Parent }
}

class Addables extends MockedCollection {
  get model () { return Addable }
}

// Common views for showing section titles and values in yellow.

class TitleView extends StaticTextView {
  constructor (rectangle, title) {
    super({ text: `${title}:` })
    this.element = createText({ ...rectangle })
  }
}

class ValueView extends StaticTextView {
  constructor ({ rectangle, value }) {
    super({ text: value })
    this.element = createText({ ...rectangle, fg: 'yellow' })
  }
}

class PathView extends TextCollectionView {
  constructor (rectangle, collection) {
    super({ collection })
    this.element = createBox({ ...rectangle, ...pad(), ...outline(), tags: true })
  }

  getText () {
    const path = this.collection.map(model => `{yellow-fg}${model.get('name')}{/yellow-fg}`)
    return `Path:     /${path.join('/')}`
  }
}

class LocationView extends TextModelView {
  constructor (rectangle, model) {
    super({ model })
    this.element = createBox({ ...rectangle, ...pad(), ...outline(), tags: true })
  }

  getText () { return `Location: {yellow-fg}${this.model.get('name') || ''}{/yellow-fg}` }
}

// class AddablesView extends TextCollectionView {
//   constructor (rectangle, collection) {
//     super({ collection })
//     this.element = createBox({ ...rectangle, ...pad(), ...outline() })
//   }

//   getText () {
//     const addables = this.collection.map(model => `{yellow-fg}${model.get('type')}{/yellow-fg}`)
//     return `Add:\n  ${addables.join('\n  ')}`
//   }
// }

class InnerAddablesView extends ListCollectionView {
  constructor (rectangle, collection) {
    super({ collection })
    this.element = createBox({ ...rectangle })
  }

  childView () { return ValueView }

  childViewOptions (model, index) {
    return { rectangle: place(0, index, this.element.width, 1), value: model.get('type') }
  }
}

class AddablesView extends StackedView {
  constructor (rectangle, addables) {
    super()
    this.addables = addables
    this.element = createBox({ ...rectangle, ...outline() })
  }

  render () {
    this.destroyChildren()
    this.addChild(new TitleView(place(1, 0, 13, 1), 'Add'))
    this.addChild(new InnerAddablesView(place(2, 1, 11, 8), this.addables))
    return super.render()
  }
}

// class ContentsView extends TextCollectionView {
//   constructor (rectangle, collection) {
//     super({ collection })
//     this.element = createBox({ ...rectangle, ...pad(), ...outline() })
//   }

//   getText () {
//     const directories = this.collection.filter(model => model.get('directory'))
//     const files = this.collection.filter(model => !model.get('directory'))
//     const nodes = directories
//       .concat(files)
//       .map(model => {
//         const suffix = model.get('directory') ? '/' : ''
//         return `{yellow-fg}${model.get('name')}{/yellow-fg}${suffix}`
//       })
//     return `Contents:\n  ${nodes.join('\n  ')}`
//   }
// }

class InnerContentsView extends TableCollectionView {
  constructor (rectangle, collection) {
    super({ collection })
    this.element = createTable({ ...rectangle, border: 'line', tags: true, align: 'left' })
  }

  getRecords () {
    const directories = this.collection.filter(model => model.get('directory'))
    const files = this.collection.filter(model => !model.get('directory'))
    const nodes = directories
      .concat(files)
      .map(model => {
        const directory = model.get('directory')
        const suffix = directory ? '/' : ''
        const size = directory ? '' : '1 KB'
        return [` {yellow-fg}${model.get('name')}{/yellow-fg}${suffix}`, ` ${size}`]
      })
    return [[' Name', ' Size']].concat(nodes)
  }
}

class ContentsView extends StackedView {
  constructor (rectangle, contents) {
    super()
    this.contents = contents
    this.element = createBox({ ...rectangle, ...outline() })
  }

  render () {
    this.destroyChildren()
    this.addChild(new TitleView(place(1, 0, 28, 1), 'Content'))
    this.addChild(new InnerContentsView(place(-1, 1, 31, 8), this.contents))
    return super.render()
  }
}

class BrowserContext {
  constructor () {
    this.models = {
      path: new Path(undefined, {
        mock: [{ name: 'home' }, { name: 'root' }], delay: 1000
      }),
      location: new Node(undefined, {
        mock: { name: 'test' }, delay: 500
      }),
      addables: new Addables(undefined, {
        mock: [{ type: 'directory' }, { type: 'file' }], delay: 2000
      }),
      contents: new Contents(undefined, {
        mock: [
          { name: 'lib', directory: true },
          { name: 'specs', directory: true },
          { name: 'index.js' }],
        delay: 1500
      })
    }
  }

  fetch (options) {
    const models = Object.values(this.models)
    if (transactions) return fetchWithTransaction(models, options)
    return Promise.allSettled(models.map(model => model.fetch(options)))
  }
}

class BrowserView extends StackedView {
  constructor ({ context }) {
    super()
    this.context = context
    this.element = createBox({ ...place(0, 3, 46, 17) })
  }

  render () {
    this.destroyChildren()
    this.addChild(new PathView(place(0, 0, 46, 3), this.context.models.path))
    this.addChild(new LocationView(place(0, 2, 46, 3), this.context.models.location))
    this.addChild(new AddablesView(place(0, 4, 16, 11), this.context.models.addables))
    this.addChild(new ContentsView(place(15, 4, 31, 11), this.context.models.contents))
    return super.render()
  }
}

class HeaderView extends StaticTextView {
  constructor () {
    super({ text: `${transactions ? 'Transactional' : 'Normal'} Backbone` })
    this.element = createBox({ ...place(1, 1, 22, 1), fg: 'green' })
  }
}

class LoaderView extends StaticTextView {
  constructor () {
    super({ text: 'Loading...' })
    this.element = createBox({ ...place(13, 14, 14, 3), ...pad(), ...outline(), fg: 'green' })
  }
}

const screen = createScreen({ fastCSR: true, dockBorders: true })
screen.title = 'File System Browser'

const context = new BrowserContext()

const header = new HeaderView()
screen.append(header.render().element)
const browser = new BrowserView({ context })
screen.append(browser.render().element)
const loader = new LoaderView()
screen.append(loader.render().element)

context
  .fetch()
  .then(() => loader.destroy())

screen.key(['escape', 'q', 'C-c'], () => process.exit(0))
screen.render()
