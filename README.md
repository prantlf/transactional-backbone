# Transactional Backbone

Updates models or collections at the same time although they were fetched asynchronously. Helps to build applications that refresh their user interface at the 

![File System Browser](doc/browser.gif)

## Example

Let us say that you build a file system browser that shows the current location, the absolute path and directory contents. You create three [Marionette] views with three [Backbone] models which will be fetched asynchronously. If you let the views refresh as soon as their model or collection gets updated, the complete page wil be rendered in three steps, as seen in the animated image above.

```js
// create models
const location = new Node()
const path = new Path(undefined, { current: location })
const contents = new Contents(undefined, { directory: location })
// create views
const locationView = new LocationView({ model: location })
const pathView = new PathView(undefined, { collection: path })
const contentsView = new Contents(undefined, { collection: contents })
// render and show views with empty models and collections
document.body.appendChild(locationView.render().el)
document.body.appendChild(pathView.render().el)
document.body.appendChild(contentsView.render().el)
// request data and let the views update as the data are received
location.fetch(); path.fetch(); contents.fetch()
```

## How to render the page in one step?

[Marionette] refreshes a [CollectionView] on Backbone [collection updates]. Refreshing a [View] on Backbone [model changes] is the easiest way for simple views. However, if all models and collections are not updated at the same time, views will not be refreshed at the same time either. How to synchronize the update:

1. Create one central model to fetch, update other models and collections from the central model. If you take this into account during the design and do not mind the additional models, this is a straightforward way. Later it may not be easy because models and collection referred to by views will not trigger any network communication events.
2. Fetch all models silently (passing `{silent: true}` to `fetch`) and either re-trigger the events, or render the views directly, when all requests finish. While retaining the view and model class structure, updates will need an extra code, which will be difficult to share, because models may trigger various events on changes.
3. Do not update view on model and collection changes. Similarly to the previous option, the simple model-view structure will be retained, but updating the view will have to be handled by a custom code. Marionette would have to be modified not to behave as documented.
4. Consider fetching of all modules and collections a transaction. Suppress model and collection changes when a transaction has started and perform those, when the transaction has ended. Backbone would have to be modified to offer an API for this.

The last option would look like this:

```js
// create models and views, render and show views with empty data
...
// request data and update the models and collections when all are ready
location.startTransaction(); path.startTransaction(); contents.startTransaction()
Promise
  .allSettled([location.fetch(), path.fetch(), contents.fetch()])
  .then(() => { location.commit(); path.commit(); contents.commit() })
```

This pattern of starting a transaction, fetching the data and committing the changes on multiple models can be encapsulated to a helper function:

```js
// create models and views, render and show views with empty data
...
// request data and update the models and collections when all are ready
fetchWithTransaction([location, path, contents])
```

## API

TODO

### startTransaction(): void

### commit(): void

### rollback(): void

### fetchWithTransaction(models: iterable, options?: object): Promise

Encapsulates fetching of multiple models and collection in a transaction:

1. Executes `startTransaction` on each model or collection.
2. Executes `fetch` on each model or collection passing the `options` argument to them, and waits until all their promises are settled.
3. If all promises above were fulfilled, executes `commit` on each model or collection.
4. If some promises above were rejected, checks the value of `options.rollbackOnError`/ If it is not `true` (default) executes `commit` on each model or collection, otherwise `rollback`.

The output promise will be settled with promise results of previous `fetch` calls. If all of them were fulfilled, the output promise will be fulfilled, otherwise rejected.

[Backbone]: https://backbonejs.org/
[model changes]: https://backbonejs.org/#Events-catalog
[Marionette]: https://marionettejs.com/
[View]: https://marionettejs.com/docs/master/marionette.view.html
[CollectionView]: https://marionettejs.com/docs/master/marionette.collectionview.html
[collection updates]: https://marionettejs.com/docs/master/marionette.collectionview.html#managing-children
