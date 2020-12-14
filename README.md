
# About ModuiBase

ModuiBase is a foundational view class inspired by and based on Backbone.View. It was designed to help scale Backbone's signature, minimalist approach to support arbitrarily complex web interfaces by facilitating the modularization of views into encapsulated, reusable components.

[Rotunda Software](https://www.rotundasoftware.com) maintains ModuiBase and uses it as the foundation of an expansive suite of application agnostic proprietary interface components such as buttons, fields, dropdowns, dialogs, popups, etc. All of our application specific components also descend from ModuiBase.

To use ModuiBase, extend it as you would with Backbone.View. Please see the [Backbone.View documentation](https://backbonejs.org/#View) for prerequisite understanding of Backbone.View.

```javascript
import ModuiBase from '@rotundasoftware/modui-base';

const MyView = ModuiBase.extend( {
    ...
} );
```

ModuiBase is written in ES6 and must be transpiled with a tool like WebKit or Browserify to be used with older browsers. (At Rotunda we use [cartero](https://github.com/rotundasoftware/cartero) to further support the reuse of UI components in large multi-page web applications.)

**Table of contents**
- [Overview](#overview)
  - [Options](#options)
  - [Subviews](#subviews)
  - [Messages](#messages)
- [API reference](#api-reference)
  - [Class properties](#class-properties)
    - [options](#options)
    - [subviewCreators](#subviewcreators)
    - [onMessages](#onmessages)
    - [passMessages](#passmessages)
    - [template( templateData )](##template-templatedata-)
  - [Public instance methods](#public-instance-methods)
    - [set( optionsHashOrName, optionValue )](#set-optionshashorname-optionvalue-)
    - [get( optionNames )](#get-optionnames-)
    - [spawn( messageName, data )](#spawn-messagename-data-)
    - [removeSubviews( whichSubviews )](#removesubviews-whichsubviews-)
  - [Overridable private class methods](#overridable-private-class-methods)
    - [_getTemplateData()](#_gettemplatedata)
    - [_afterRender()](#_afterrender)
    - [_onOptionsChanged( changedOptions, previousValues )](#_onoptionschanged-changedoptions-previousvalues-)
  - [Built-in options](#built-in-options)
    - [extraClassName](#extraclassname)
    - [passMessagesTo](#passMessagesTo)

- [License](#license)

## Overview
From a high level perspective, ModuiBase extends Backbone.View with:

* A means to declare and access public view [options](#options)
* [Subview](#subviews) management
* A DOM-based [message paradigm](#messages)

It also offers a `template` property on the view class which will be used to automatically populate view elements' HTML, if supplied.

### Options
ModuiBase provides a simple declarative syntax to define the public properties, or "options", of a view, and a mechanism to update a view when its options are changed. The declarative syntax for options makes it easy to reference the "API" for each view class. Options are:

* Declared as an array on the view class, with support for required and default values
* Can be retrieved and modified by other views via public `get()` and `set()` methods
* Included automatically as template data when the view class' `template` method is invoked

### Subviews
ModuiBase provides an easy way to manage subviews in order to facilitate componentization. The subview management logic:

* Creates subviews using supplied functions and inserts them in the appropriate place in the parent view
* Puts references to subviews in a hash keyed by name at `view.subviews`
* Maintains subviews when a parent view is re-rendered, preserving subview objects and their state
* Cleans up subviews when a parent view is removed

### Messages
ModuiBase discourages the use of traditional Backbone events in favor of a more structured way to communicate between views that promotes encapsulation and reuse of components. Instead of events being triggered, "messages" are "spawned" by a view and passed up the DOM hierarchy. Messages are similar to DOM events but exist only in and for the "view layer" of abstraction, and do not bubble by default. As a result, the set of messages that are emitted from a view is limited and well defined, and lateral or global dependencies that interfere with component reuse are largely avoided.

Use `view.spawn( messageName, data )` to spawn a message.

The message is passed to the view's parent, which can then "handle" the message and / or pass it to the parent's own parent, and so on. The DOM tree is used to determine the view hierarchy.

![Spawned messages diagram](https://github.com/rotundasoftware/modui/blob/master/packages/modui-base/messages-diagram.jpg)

Here is an example of a view that both spawns a message to its parent and handles a message from its children:

```javascript
const MyView = ModuiBase.extend( {
    events : {
        'click div.close-box' : function() {
            // Spawn a message that can be handled by our own parent
            this.spawn( 'closeBoxClicked' );
        }
    },
    
    onMessages : {
        // Handle the "selected" message from a child view.
        'selected' : function( data ) {
            console.log( 'My child view just selected the record:' );
            console.log( data.recordId ); // data can be supplied when a message is spawned
        } 
    }
} );
```

## API reference

### Class properties

The following properties can be used when defining a new view class that extends ModuiBase (in addition to, for example, the Backbone.View `events` property).

#### options
An array of options for the view class. Each entry in the array may have one of the following three formats:

```javascript
options : [
    'name', // Declares `name` an option on this view class
    'type!', // Explanation mark indicates required option - an error will be thrown if a value is not supplied
    { label : 'OK' } // Option with a default value
]
```

View options are attached directly to the view object, but they should be accessed externally through `view.get`.

```javascript
const myView = MyView( { name : 'CodeIzCool', type : 'ThisIsRequired' } );
console.log( myView.get( 'name' ) ); // 'CodeIzCool'
```

#### subviewCreators
An object mapping subview names to functions that return view instances. To create a subview, include a `div` with the `data-subview` attribute in a view's HTML contents (e.g. `<div data-subview="mySubview"></div>`) and then define a creator function with a matching name in the class' `subviewCreators` property:

```javascript
subviewCreators : {
    mySubview() {
        return new MySubview();
    }
}
```

After `view.render()` is called, an object containing all subviews, keyed by subview name, will be available at `view.subviews`. This `subviews` object is read-only and we recommend that it be kept private to the view.

#### onMessages
The `onMessages` hash is the means by which a parent view can take action on, or "handle", messages received from its children. Entries in the `onMessages` hash have the format:

```javascript
"messageName [source]" : callback
```

* The `messageName` portion is matched against the name of the messages that are received.
* The optional `source` portion can be used to match only messages that come from a particular child view. It should maps the subview names declared in the `subviewCreators` option.
* The "callback" portion determines what is done when a matching message is received. Just like Backbone's events hash, you can either provide the callback as the name of a method on the view, or a direct function body. In either case, the callback is invoked with three arguments:
  1. `data` is an application defined data object, as provided the in second argument to `view.spawn()`
  2. `currentSourceView` is the child view object that spawned or passed this message to this view.
  3. `originalSourceView` is the child or grandchild view that original spawned the message

Example entries in the `onMessages` hash:

```javascript
onMessages : {
    'selectionChanged' : 'onSelectionchanged', // Called when a message with this name is received from any subview
    'selectionChanged myList' : '_myList_onSelectionChanged', // Called only when the message comes from "myList" subview
    'memberAdded' : function() { ... } // We can also provide a function declaration inline
}
```

#### passMessages
The `passMessages` property is used to pass messages received from a child view further up the view hierarchy, to potentially be handled by a more distant ancestor.
* If the property is `false`, (which is the default), no messages are passed through the view.
* If the property is `true`, all (unhandled) messages are passed through the view.
* If the property is an array, only messages with the names it contains will be passed through.

#### template( templateData )
An optional method that returns the HTML for the view's `el`. If the `template` method is supplied, it will automatically be invoked and `view.el` will be populated as part of the default `render` behavior. The `template` method is passed as its only parameter a hash of the view's options merged with the result of `view._getTemplateData`. (If no `template` method is defined, you'll need to populate `view.el` by extending `render`, as you might with a traditional Backbone view.)

We recommend configuring a preprocessor to compile files written in your preferred template language into executable functions. For example:

```javascript
import myViewTemplate from './myView.nunj';

const MyView = ModuiBase.extend( {
    template : myViewTemplate,
} );
```

### Public instance methods

#### set( optionsHashOrName, optionValue )
Set the value of one or more view options.

```javascript
set( optionName, optionValue )
set( optionsHash ) // `optionsHash` is an object that maps option names to their new values
```

Some considerations:
* Changing the value of an option will trigger a call to `view._onOptionsChanged()`
* Attempting to set an option that is not declared will throw an error
* Attempting to set an option to `undefined` will throw an error

#### get( optionNames )
Get the value of one or more options.

```javascript
view.get( optionName ) // returns the value of the option named optionName
view.get( optionNames ) // returns a hash mapping options in the optionNames array to their values
view.get() // returns a hash mapping all the view's options to their values
```

#### spawn( messageName, data )
The spawn method generates a new message and passes it to the view's "parent", i.e. the closest ancestor view in the DOM tree. `data` is application defined data that will be available to this view's ancestors when handling this message using their `onMessages` hash. (`spawn` also calls `view.trigger( messageName, data )` so that you can `listenTo` the message from another view as you would a normal Backbone event, but you should rarely need to do so.)

> **Round trip messages**
> If `messageName` ends in `!`, the message is considered a "round trip message". Round trip messages are special in that they return values. That is, the `spawn()` method will return the value returned by the message handler. Using round trip messages, views can obtain dynamic information about their environment that, because it is dynamic, can not be passed in through view options. Round trip messages will continue to be passed up the hierarchy until they are handled - regardless of the value of each intermediate view's `passMessages` property. If a round trip message is not handled, `spawn()` returns `undefined`.

#### removeSubviews( whichSubviews )
Remove some or all subviews. `whichSubviews` may be an array containing subview names. If `whichSubviews` is not supplied, all subviews will be removed.

### Overridable private class methods
`ModuiBase` implements some private methods intended to be overridden by descendant classes.

#### _getTemplateData()
This method may be overridden to provide data to the view's `template` method. The object it returns will be merged with the view's options and then passed to the `template` method as the `templateData` parameter.

#### _afterRender()
This method may be overridden to add post-rendering logic. Often times you may want to call logic that is also invoked when a view option is changed and it may be convenient to define a private instance method to be invoked in both cases. For example, a method that updates the title of a dialog by inserting it into a `div` named `_titleDiv_updateState` may be defined and called both in the dialog's `_afterRender` method and when the `title` option is changed.

> **Important:** Descendant views should rarely need to override or extend `render()`. Overriding `_afterRender()` is the preferred way of adding post-rendering logic.

#### _onOptionsChanged( changedOptions, previousValues )
This method can be overridden to take some action when options are changed, for example, to update DOM state. `changedOptions` is a hash of options that have changed to their new values and `previousValues` maps the same to their previous values.

```javascript
const MyView = ModuiBase.extend( {
    _onOptionsChanged( changedOptions ) {
        if( 'name' in changedOptions ) {
            this.$el.find( 'div.name' ).text( changedOptions.name );
        }
    },
} );
```

### Built-in options

ModuiBase has two built-in options that you may use.

#### extraClassName
Accepts a class or space-separated list of classes that will be added to the view's element, much like the built-in `className` Backbone.View property.

```javascript
const myView = MyView( { extraClassName : 'dark-theme' } );
```

#### passMessagesTo
Accepts a view instance to which spawned messages will be passed (which will be used in place of the default behavior of spawning messages to the parent view). This option is especially useful for things like popups and dialogs, that may live at the top of the DOM tree but have been created by a particular view that is interested in the messages they spawn.

## License
MIT
