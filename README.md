# About the modui suite

The modui suite is a collection of interface components based off of Backbone.View. modui-base is the base class for all the rest of the component views.

Each component in the suite can be used independently by requiring the component, e.g.


```
var ModuiPopup = require( 'modui-popup' );
```

The modui suite must be used in a client-side commonjs environment along side browserify, parcelify, or cartero.

## modui-base

All views in the modui suite are derived from the modui-base class. The base class simply mixes together behavior from the following backbone plugins:

* [Backbone.Subviews](https://github.com/rotundasoftware/backbone.subviews)
* [Backbone.Courier](https://github.com/rotundasoftware/backbone.courier)
* [Backbone.ViewOptions](https://github.com/rotundasoftware/backbone.viewOptions)
* [Backbone.Handle](https://github.com/rotundasoftware/backbone.handle)

It also provides a default `render` method that renders a template function attached to the `template` property of the view, using the view's options (and its `model.attributes`, if it has a model) as template data.

## Derived classes in the modui suite

The following is a list of components that inherit from modui-base and have been open sourced. Hopefully this list will continue to grow. We have dialogs, date fields, time pickers, etc., etc. If you want to see more of these components open sourced, please show your support by starting this repo, as there is overhead involved in open sourcing these things!

* [modui-popup](https://github.com/rotundasoftware/modui-popup)
* [modui-field](https://github.com/rotundasoftware/modui-field)

## License
MIT