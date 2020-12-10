# About the modui suite
The modui suite is a collection of interface components based off of Backbone.View. `modui-base` is the base class for all the rest of the component views.

Each component in the suite can be used independently by requiring the component, e.g.

```
import ModuiBase from '@rotundasoftware/modui-base';
```

The modui suite is written in ES6 and must be transpiled to support target browsers. We recommend its use with [parcelify](https://github.com/rotundasoftware/parcelify), [browserify](http://browserify.org/), or [cartero](https://github.com/rotundasoftware/cartero).

**Table of contents**
- [modui-base](#modui-base)
  - [Subviews](#subviews)
  - [Messages](#messages)
  - [View options](#view-options)
- [API reference](#api-reference)
  - [Properties](#properties)
    - [ModuiBase.prototype.options](#moduibaseprototypeoptions)
    - [ModuiBase.prototype.onMessages](#moduibaseprototypeonmessages)
    - [ModuiBase.prototype.passMessages](#moduibaseprototypepassmessages)
    - [ModuiBase.prototype.subviewCreators](#moduibaseprototypesubviewcreators)
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
All views in the modui suite are derived from the `modui-base` class. It enhances `Backbone.View` with:

* A [subviews](#subviews) creation and management system.
* A [custom events](#messages) system that promotes view encapsulation.
* A [view options](#view-options) system that allows to easily declare, get and set options on views.

It also provides a default `render` method that renders a template function attached to the `template` property of the view, using the view's options as template data.

### Subviews
A clear syntax for subviews in templates:

* Declare an object mapping subview names to constructor functions, and then use `<div data-subview="mySubview"></div>` in the templates.
* Automatically puts references to subviews in a hash by name: `this.subviews.mySubview`
* Maintains subview objects when a parent view is re-rendered, preserving subview state.
* Automatically cleans up (i.e. removes) subviews when a parent view is removed.
* Promotes small encapsulated ui components that can be reused.

### Messages
An easy way to bubble events ("messages") up our view hierarchy. Instead of using `view.trigger()`, we use `view.spawn( messageName, data )` to spawn a message.

The message is triggered, just like a normal Backbone event, and in addition, it will automatically bubble up the view hierarchy. The view's parent can then "handle" the message and / or pass it to the parent's own parent, and so on. The DOM tree is used to determine the view hierarchy.

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
A simple declarative syntax to attach white-listed initialization options directly to views.
- Includes shorthand formats for declaring required options or default values.
- Declared options are included automatically as context variables for template rendering.
- Declared options can be retrieved or modified at runtime via `get()` and `set()` methods.

## API reference

### Properties

#### ModuiBase.prototype.options
An array of whitelisted options, in one of the following formats:
```javascript
options : [
    'name', // Whitelist this option
    'type!', // Attempting to create an instance without passing this option will throw an error
    { label : 'OK' } // If this option is not provided, it will be set to 'OK' when creating an instance
]
```

#### ModuiBase.prototype.onMessages
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


#### ModuiBase.prototype.passMessages
The `passMessages` property is used to pass messages received from a child view further up the view hierarchy, to potentially be handled by a more distant ancestor.
* If the property is `false`, (which is the default), no messages are passed through the view.
* If the property is `true`, all (unhandled) messages are passed through the view.
* If the property is an array, only messages with the names it contains will be passed through.

In this manner, messages bubble up the view hierarchy, as determined (by default) by the DOM tree.

#### ModuiBase.prototype.subviewCreators
An object mapping subview names to view factory functions. Subview names will be used to match message names declared in the `onMessages` property.
```javascript
subviewCreators : {
    myChildView() {
        return new MyChildView();
    }
}
```

#### view.subviews
An object containing all subviews created, keyed by subview name, as declared in the `onMessages` property.

### Public methods

#### view.set( optionsHashOrName, optionValue )
Set the value of one or more declared options. It can be called in two ways:
- `set( optionName, optionValue )`
- `set( optionsHash )` where `optionsHash` is an object that maps option names to theeir new values.

Some considerations:
- Attempting to set a non-declared option will throw an error.
- Attempting to set a required option to undefined will throw an error too.
- Attempting to set a non-required option to undefined won't have any effect.
- Successfully changing the value of an option will trigger a call to `view._onOptionsChanged()`, only if the option was already initialized (i.e. had a value other tha undefined).

#### view.get( optionNames )
Get the value of one or more options. It can be called in three ways:
- `view.get( <string> )` returns just the value of the passed option name.
- `view.get( <string[]> )` returns a hash mapping passed options names to their values.
- `view.get()` returns a hash mapping all declared options to their values.

Attempting to get a non-declared option will throw an error.

#### view.spawn( messageName, data )
The spawn method generates a new message and passes it to the view's "parent", i.e. the closest ancestor view in the DOM tree. It also calls `view.trigger( messageName, data )` so that you can listen to the message as you would a normal Backbone event.

`data` is application defined data that will be available to this view's ancestors when handling or passing this message.

> **Round trip messages**
> If `messageName` ends in `!`, the message is considered a "round trip message". Round trip messages are special in that they return values. That is, the `spawn()` method will return the value returned by the first (and only) method that handles the message. Using round trip messages, views can obtain dynamic information about their environment that, because it is dynamic, can not be passed in through configuration options. Round trip messages will continue to be passed up the hierarchy until they are handled - regardless of the value of each intermediate view's `passMessages` property. If they are not handled, `spawn()` returns `undefined`.

#### view.removeSubviews( whichSubviews )
Remove some or all subviews. `whichSubviews` may be an array containing subview names. Not passing an argument will remove all subviews.

Use it before calling `view.render()` if you don't want to preserve current subviews (i.e. perform a "deep render").

### Private methods
`ModuiBase` implements some private methods meant to be used, extended or overriden by descendant classes ("protected" methods in OOP terms).

Except for `_getParentView()`, is usually a good idea to extend, rather than override, this methods (unless you really know what you're doing):
```javascript
_getTemplateData() {
    return {
        ...Super.prototype._getTemplateData.apply( this, arguments ),
        label : 'OK'
    };
}
```

#### view._afterRender()
This function may be extended to add post-rendering logic. Descendant views should extend this method to perform additional UI decoration.

> **Important:** Descendant views should almost never extend `render()`. Extending `_afterRender()` is the preffered way of adding JS post-rendering logic, unless you really know what you're doing.

#### view._getTemplateData()
This function may be extended to add additional properties that will be added to the render context. It should return an object containing the properties to add.

#### view._onOptionsChanged( changedOptions, previousValues )
This function may be extended to do something when options are changed. It is only called when the option(s) that are changed had previous (non-undefined) values.

#### view._getParentView()
This function may be overriden to add custom logic to the message passing mechanism. It should return the view to which the spawned messages will be passed.

It can be used when the view hierarchy is not reflected in the DOM structure (e.g. a view dialog created from another view, but appended as a `<body>` direct child).

> Override only if the parent view has to be determined at runtime. If you already know which view should receive the message, use the `passMessagesTo` built-in option instead.

### Static methods
The following methods should rarely be used outside `ModuiBase`, but there are some edge cases where we might need them (e.g. view factory functions). They are implemented as static methods to allow it's usage before instantiation.

**Caveat:** These methods read from the class prototype implementation to perform some core functionality, like checking options declarations. This means that hardcoding class names will lock calls to that class implementation:
```javascript
import Super from '@rotundasoftware/modui-base';

const MyView = Super.extend( {
    options : [
        ...Super.prototype.options,
        'myOption'
    ],
} );

const myViewInstance = new MyView();

// This won't contain 'myOption' key, since it will search on ModuiBase declared options.
console.log( Super.computeInitialOptions() );

// This will contain 'myOption' key
console.log( MyView.computeInitialOptions() );
```

You can avoid this in several ways, depending on the way this methods are called:
- When calling them from outside a View: call them as static methods of the extending view (they are inherited).
- When calling them from inside a View static methods: call them using `this` (which points to the constructor on static methods).
- When calling them from inside a View instance: call them referencing the instance constructor (e.g. `this.constructor.prototype.throw`).

```javascript
const MyView = ModuiBase.extend( {
    myInstanceMethod() {
        // Private wrapper method
        this._throw( 'A custom error' );

        // Does the same as above
        this.constructor.prototype.throw( 'A custom error' );
    }
}, {
    myStaticMethod() {
        // In here, 'this' points to the constructor class
        this.throw( 'A custom error' );
    }
} );

// Use the extending class name when using it outside class declaration
MyView.throw( 'A custom error message' );
```

#### ModuiBase.computeInitialOptions( optionsPassedToConstructor )
This method can be used to create an initialization options object that complies with all declared options rules. It takes an initial options object and:
- Checks that all required options are present. Throws an error if any required option is missing.
- Applies the default value to any non-provided option.
- Discards any non-declared option.
- Returns an object with all declared options and their corresponding values.

This is useful if you're creating factory functions that may need to apply option declarations rules before actual instantiation takes place.

#### ModuiBase.throw( errorMessage )
A wrapper around native JS throw statement. It looks for the last CSS class name declared on `view.className` and preprends it to error message, for easier debugging.

## License
MIT