const { Events } = require('Backbone')

function checkView (view) {
  if (!view.element) throw new Error('View has not been initialized or was destroyed.')
}

function refresh (view) {
  if (view.element.screen) view.element.screen.render()
  return view
}

const TextMixin = {
  getText () { throw new Error('not implemented') },

  render () {
    checkView(this)
    this.element.content = this.getText()
    return refresh(this)
  }
}

const TableMixin = {
  getRecords () { throw new Error('not implemented') },

  render () {
    checkView(this)
    this.element.setData(this.getRecords())
    return refresh(this)
  }
}

const StaticChildrenMixin = {
  addChild (view) { this.children.push(view) },

  destroyChildren () {
    for (const child of this.children) child.destroy()
    this.children = []
  },

  renderChildren () { for (const child of this.children) this.element.append(child.render().element) }
}

const DynamicChildrenMixin = {
  addChildren () {
    let index = 0
    for (const model of this.collection.models) {
      let ChildView = this.childView
      if (!(ChildView instanceof View)) ChildView = ChildView.call(this, model, index)
      let options = this.childViewOptions
      if (typeof options === 'function') options = options.call(this, model, index, ChildView)
      this.addChild(new ChildView(Object.assign({ model }, options)))
      ++index
    }
  }
}

class View {
  render () { throw new Error('not implemented') }

  destroy () {
    checkView(this)
    const screen = this.element.screen
    this.element.destroy()
    this.element = null
    if (screen) screen.render()
  }
}

Object.assign(View.prototype, Events)

class ModelView extends View {
  constructor ({ model }) {
    super()
    this.model = model
    this.listenTo(model, 'change', this.render)
  }
}

class CollectionView extends View {
  constructor ({ collection }) {
    super()
    this.collection = collection
    this.listenTo(collection, 'reset update', this.render)
  }
}

class TextModelView extends ModelView {}

Object.assign(TextModelView.prototype, TextMixin)

class TextCollectionView extends CollectionView {}

Object.assign(TextCollectionView.prototype, TextMixin)

class TextView extends View {}

Object.assign(TextView.prototype, TextMixin)

class StaticTextView extends TextView {
  constructor ({ text }) {
    super()
    this.text = text
  }

  getText () { return this.text }
}

class StackedView extends View {
  constructor () {
    super()
    this.children = []
  }

  render () {
    checkView(this)
    this.renderChildren()
    return refresh(this)
  }

  destroy () {
    this.destroyChildren()
    super.destroy()
  }
}

Object.assign(StackedView.prototype, StaticChildrenMixin)

class ListCollectionView extends CollectionView {
  constructor ({ collection }) {
    super({ collection })
    this.children = []
  }

  render () {
    checkView(this)
    this.destroyChildren()
    this.addChildren()
    this.renderChildren()
    return refresh(this)
  }

  destroy () {
    this.destroyChildren()
    super.destroy()
  }
}

Object.assign(ListCollectionView.prototype, StaticChildrenMixin)
Object.assign(ListCollectionView.prototype, DynamicChildrenMixin)

class TableCollectionView extends CollectionView {}

Object.assign(TableCollectionView.prototype, TableMixin)

module.exports = {
  TextMixin,
  StaticChildrenMixin,
  DynamicChildrenMixin,
  View,
  ModelView,
  CollectionView,
  TextModelView,
  TextCollectionView,
  TextView,
  StaticTextView,
  StackedView,
  ListCollectionView,
  TableCollectionView
}
