
# About modui-base

ModuiBase is a simple view class based on Backbone.View. It honors Backbone's minimalist spirit while providing a few bits of extra structure so that complex web interfaces can be implemented by breaking functionality down into small, encapsulated components.

Rotunda uses ModuiBase as the foundation for an expansive suite of proprietary interface components that are shared between all our web applications. 

To use ModuiBase, extend it as you would with Backbone.View. Please see the [Backbone documentation](https://backbonejs.org/#View) for prerequisite understanding of Backbone.View.

```
import ModuiBase from '@rotundasoftware/modui-base';

const MyView = ModuiBase.extend( {
    ...
} );
```

The modui suite is written in ES6 and must be transpiled to support target browsers. We recommend its use with [parcelify](https://github.com/rotundasoftware/parcelify), [browserify](http://browserify.org/), or [cartero](https://github.com/rotundasoftware/cartero).

**Table of contents**
- [modui-base](#modui-base)
  - [Subviews](#subviews)
  - [Messages](#messages)
  - [View options](#view-options)
- [API reference](#api-reference)
  - [Properties](#properties)
    - [template](#template)
    - [options](#options)
    - [onMessages](#onmessages)
    - [passMessages](#passmessages)
    - [subviewCreators](#subviewcreators)
    - [view.subviews](#viewsubviews)
  - [Public methods](#public-methods)
    - [view.set( optionsHashOrName, optionValue )](#viewset-optionshashorname-optionvalue-)
    - [view.get( optionNames )](#viewget-optionnames-)
    - [view.spawn( messageName, data )](#viewspawn-messagename-data-)
    - [view.removeSubviews( whichSubviews )](#viewremovesubviews-whichsubviews-)
  - [Private methods](#private-methods)
    - [view._afterRender()](#view_afterrender)
    - [view._getTemplateData()](#view_gettemplatedata)
    - [view._onOptionsChanged( changedOptions, previousValues )](#view_onoptionschanged-changedoptions-previousvalues-)
    - [view._getParentView()](#view_getparentview)
  - [Static methods](#static-methods)
    - [ModuiBase.computeInitialOptions( optionsPassedToConstructor )](#moduibasecomputeinitialoptions-optionspassedtoconstructor-)
    - [ModuiBase.throw( errorMessage )](#moduibasethrow-errormessage-)
- [License](#license)

## modui-base
ModuiBase extends Backbone.View with:

* A [subviews](#subviews) creation and management system.
* A [message](#messages) system that promotes view encapsulation.
* A [view options](#view-options) system that allows to easily declare, get and set options on views.

It also provides a default `render` method that renders a template function attached to the `template` property of the view, using the view's options as template data.

### Subviews
ModuiBase provides an easy way to manage subviews in order to promotes small encapsulated views that can be reused.

To create a subview, include `<div data-subview="mySubview"></div>` in a view's template and then define a creator function for the subview in the view's `subviewCreators` property. The subview management logic:

* Automatically puts references to subviews in a hash by name, e.g. `this.subviews.mySubview`
* Maintains subview objects when a parent view is re-rendered, preserving subview state.
* Automatically cleans up (i.e. removes) subviews when a parent view is removed.

### Messages
ModuiBase provides an easy way to bubble "messages" up our view hierarchy. Messages are to views as DOM events are to DOM elements. Having a layer of abstraction for hierarchical events that is reserved exclusively for views promotes small encapsulated views that can be reused.

Use `view.spawn( messageName, data )` to spawn a message.

The message will automatically bubble up the view hierarchy. The view's parent can then "handle" the message and / or pass it to the parent's own parent, and so on. The DOM tree is used (by default) to determine the view hierarchy. (The message is also triggered as a traditional Backbone event, but only in rare cases is it necessary to `listenTo` the triggered Backbone event laterally, as opposed to handling the spawned message in a parent view.)

![Spawned messages diagram](https://github.com/rotundasoftware/modui/blob/master/packages/modui-base/messages-diagram.jpg)

Here is an example of a view that both spawns a message to its ancestors, and handles a message from its children:
```javascript
const MyView = ModuiBase.extend( {
    events : {
		'click div.close-box' : '_closeBox_onClick'
    },
    
    // Handle the "selected" message from a child view.
	onMessages : {
		'selected' : '_onChildSelected'
    },
    
    _onChildSelected( data, currentSourceView, originalSourceView ) {
        console.log( 'My child view just spawned the "selected" message.' );

		// Any application defined data that has been supplied (second argument passed when calling spawn)
		console.log( data );

		// The child view object that spawned or passed this message
		assert( currentSourceView instanceof ModuiBase );
        
        // The child view object that spawned the original message
		assert( currentSourceView instanceof ModuiBase );   
    },
    
    // Spawn a message that can be handled by our own parent
	_closeBox_onClick() {
		this.spawn( 'closeBoxClicked' );
	}
} );
```

### View options
ModuiBase provides a simple declarative syntax to define the puplic properties, or "options", of a view, and a mechanism to update the view when its options are changed. Clearly defining the public interface of each view class promotes small encapsulated views that can be reused. Options are:

* Declared as an array on the view class, with support for required and default values
* Included automatically as template data when the view's template is rendered
* Can be retrieved and modified by other views via public `get()` and `set()` methods

## API reference

### Properties declared when extended ModuiBase

The following properties can be used when defining a new view class that extends ModuiBase (in addition to, for example, the Backbone.View `events` property).

#### template
A function that returns the HTML for the view's `el`. If `template` is supplied, it will automatically be invoked and `el` will be populated as part of the default `render` behavior. The `template` function is passed the `templateData` object returned by `view._getTemplateData`.

#### options
An array of public options. Each entry in the array may have one of the following three formats:

```javascript
options : [
    'name', // Declares `name` a public option on this view class
    'type!', // Attempting to create an instance without supplying a value for this option will throw an error
    { label : 'OK' } // If a value for this option is not supplied, it will be defaulted to 'OK'
]
```

#### onMessages
The `onMessages` hash is the means by which a parent view can take action on, or "handle", messages received from its children. Entries in the `onMessages` hash have the format:
```
"messageName source" : callback
```

* The `messageName` portion is matched against the name of the messages that are received.
* The `source` portion can be used to match only messages that come from a particular child view. It should maps the subview names declared in the `subviewCreators` option.
* The "callback" portion determines what is done when a matching message is received. Just like Backbone's events hash, you can either provide the callback as the name of a method on the view, or a direct function body. In either case, the callback is invoked with three arguments:
  1. `data` is an application defined data object, as provided the in second argument to `view.spawn()`
  2. `currentSourceView` is the child view object that spawned or passed this message to this view.
  3. `originalSourceView` is the child or grandchild view that original spawned the message

Example entries in the `onMessages` hash:
```javascript
onMessages : {
    // Called only when the message comes from "myList" view
    'selectionChanged myList' : '_myList_onSelectionChanged',
    // Called every time this message is received.
    'selectionChanged' : 'onSelectionchanged',
    // We can also provide a function declaration
    memberAdded() {
        // Do stuff
    }
}
```

> When a regular message is received, both view specific and generic message handlers will be executed (if present). However, that's not the case for *round trip messages*, which execute the first and most specific handler found and return its value immediately. For more details on round trip messages, see [`view.spawn()`](#viewspawn-messagename-data-).


#### passMessages
The `passMessages` property is used to pass messages received from a child view further up the view hierarchy, to potentially be handled by a more distant ancestor.
* If the property is `false`, (which is the default), no messages are passed through the view.
* If the property is `true`, all (unhandled) messages are passed through the view.
* If the property is an array, only messages with the names it contains will be passed through.

In this manner, messages bubble up the view hierarchy, as determined (by default) by the DOM tree.

#### subviewCreators
An object mapping subview names to view factory functions. Subview names will be used to match message names declared in the `onMessages` property.
```javascript
subviewCreators : {
    myChildView() {
        return new MyChildView();
    }
}
```

#### view.subviews

An object containing all subviews, keyed by subview name, is maintained at `view.subviews`. This object is read-only - it is constructed automatically during render using the functions defined in `subviewCreators`.

### Public methods

#### view.set( optionsHashOrName, optionValue )
Set the value of one or more view options. It can be called in two ways:
* `set( optionName, optionValue )`
* `set( optionsHash )` where `optionsHash` is an object that maps option names to their new values

Some considerations:
* Attempting to set an option that is not declared will throw an error
* Attempting to set a required option to undefined will throw an error
* Attempting to set a non-required option to undefined won't have any effect
* Changing the value of an option will trigger a call to `view._onOptionsChanged()` (but only if the option was already initialized (i.e. had a value other than undefined)

#### view.get( optionNames )
Get the value of one or more options. It can be called in three ways:
* `view.get( optionName )` returns the value of the option named optionName
* `view.get( optionNames )` returns a hash mapping options in the optionNames array to their values
* `view.get()` returns a hash mapping all options to their values

Attempting to get a non-declared option will throw an error.

#### view.spawn( messageName, data )
The spawn method generates a new message and passes it to the view's "parent", i.e. the closest ancestor view in the DOM tree. It also calls `view.trigger( messageName, data )` so that you can listen to the message as you would a normal Backbone event.

`data` is application defined data that will be available to this view's ancestors when handling this message using their `onMessages` hash.

> **Round trip messages**
> If `messageName` ends in `!`, the message is considered a "round trip message". Round trip messages are special in that they return values. That is, the `spawn()` method will return the value returned by the message handler. Using round trip messages, views can obtain dynamic information about their environment that, because it is dynamic, can not be passed in through view options. Round trip messages will continue to be passed up the hierarchy until they are handled - regardless of the value of each intermediate view's `passMessages` property. If a round trip message is not handled, `spawn()` returns `undefined`.

#### view.removeSubviews( whichSubviews )
Remove some or all subviews. `whichSubviews` may be an array containing subview names. Not passing an argument will remove all subviews.

Use it before calling `view.render()` if you don't want to preserve current subviews (i.e. perform a "deep render").

### Private methods
`ModuiBase` implements some private methods meant to be used, extended or overriden by descendant classes.

#### view._afterRender()
This function may be extended to add post-rendering logic. Descendant views should extend this method to perform additional UI decoration.

> **Important:** Descendant views should almost never extend `render()`. Extending `_afterRender()` is the preffered way of adding post-rendering logic, unless you really know what you're doing.

#### view._getTemplateData()
This function may be extended to add additional properties that will be added to the template data. It should return an object containing the properties to add.

#### view._onOptionsChanged( changedOptions, previousValues )
This function may be extended to do something when options are changed. It is only called when the option(s) that are changed had previous (non-undefined) values.

#### view._getParentView()
This function may be overriden to add custom logic to the message passing mechanism. It should return the view to which the spawned messages will be passed.

It can be used when the view hierarchy is not reflected in the DOM structure (e.g. a view dialog created from another view, but appended as a `<body>` direct child).

> Override only if the parent view has to be determined at runtime. If you already know which view should receive the message, use the `passMessagesTo` built-in option instead.

## License
MIT

