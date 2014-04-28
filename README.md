# modui-base

This is the base class for all modui views. The class mixes behavior from the following backbone plugins:

* Backbone.Subviews
* Backbone.Courier
* Backbone.ViewOptions
* Backbone.Handle

And provides a default `render` method that renders a template function attached to the `template` property of the view, using the view's options as template data.