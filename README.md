# modui-base

The modui suite is a collection of interface components based off of Backbone.View. modui-base is the base class for all the rest of the component views.

Each component in the modui suite can be used independently simply by requiring the component (e.g. `var ModuiPopup = require( 'modui-popup' );`). The suite is intended to be used in a client-side commonjs environment along side browserify, parcelify, or cartero.

This modui-base class simply mixes together behavior from the following backbone plugins:

* [Backbone.Subviews](https://github.com/rotundasoftware/backbone.subviews)
* [Backbone.Courier](https://github.com/rotundasoftware/backbone.courier)
* [Backbone.ViewOptions](https://github.com/rotundasoftware/backbone.viewOptions)
* [Backbone.Handle](https://github.com/rotundasoftware/backbone.handle)

It also provides a default `render` method that renders a template function attached to the `template` property of the view, using the view's options (and its `model.attributes`, if it has a model) as template data.

## License
MIT