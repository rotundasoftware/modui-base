
# About modui-base

ModuiBase is a foundational view class inspired by and based on Backbone.View. It was designed to facilitate building complex web interfaces by breaking them down into small, encapsulated components, while honoring Backbone's minimalist approach.

[Rotunda Software](https://www.rotundasoftware.com) maintains ModuiBase and uses it as the foundation of an expansive suite of application agnostic proprietary interface components such as buttons, fields, dropdowns, dialogs, popups, etc. All of our application specific views also descend from ModuiBase.

To use ModuiBase, extend it as you would with Backbone.View. Please see the [Backbone.View documentation](https://backbonejs.org/#View) for prerequisite understanding of Backbone.View.

```
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
    - [_afterRender()](#_afterrender)
    - [_getTemplateData()](#_gettemplatedata)
    - [_onOptionsChanged( changedOptions, previousValues )](#_onoptionschanged-changedoptions-previousvalues-)
- [License](#license)

## Overview
From a high level perspective, ModuiBase extends Backbone.View with:

* A means to declare and access [options](#options) (a.k.a public view properties)
* [Subview](#subviews) management
* A DOM-based [message paradigm](#messages)

It adds the ability to give a view a `template` function that will be used to render its contents.

### Options
ModuiBase provides a simple declarative syntax to define the public properties, or "options", of a view, and a mechanism to update the view when its options are changed. The declarative syntax for options makes it easy to understand the "API" for each view class. Options are:

* Declared as an array on the view class, with support for required and default values
* Included automatically as template data when the view's template is rendered
* Can be retrieved and modified by other views via public `get()` and `set()` methods

### Subviews
ModuiBase provides an easy way to manage subviews in order to facilitate the use of small, encapsulated views that can be reused.

To create a subview, just include `<div data-subview="mySubview"></div>` in a view's template and then define a creator function for the subview in the class' `subviewCreators` property. The subview management logic:

* Automatically puts references to subviews in a hash keyed by name, e.g. `this.subviews.mySubview`
* Maintains subviews when a parent view is re-rendered, preserving subview state.
* Automatically cleans up (i.e. removes) subviews when a parent view is removed.

### Messages
ModuiBase discourages the use of traditional Backbone events in favor of a more structured way to communicate between views that helps enforce encapsulation. Instead of events being triggered, "messages" are "spawned" by a view and passed up the DOM hierarchy. Messages are similar to DOM events but exist only in and for the view layer of abstraction, and do not bubble by default, so the set of messages that are emitted from a view is limited and well defined.

Use `view.spawn( messageName, data )` to spawn a message.

The message will automatically "bubble up" to the view's parent, which can then "handle" the message and / or pass it to the parent's own parent, and so on. The DOM tree is used (by default) to determine the view hierarchy. (The message is also triggered as a traditional Backbone event, but only in rare cases is it necessary to `listenTo` the triggered Backbone event laterally, as opposed to handling the spawned message in an ancestor view.)

![Spawned messages diagram](https://github.com/rotundasoftware/modui/blob/master/packages/modui-base/messages-diagram.jpg)

Here is an example of a view that both spawns a message to its ancestors, and handles a message from its children:

```javascript
const MyView = ModuiBase.extend( {
    events : {
        'click div.close-box' : '_closeBox_onClick'
    },
    
    onMessages : {
        'selected' : '_onChildSelected' // Handle the "selected" message from a child view.
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

## API reference

### Class properties

The following properties can be used when defining a new view class that extends ModuiBase (in addition to, for example, the Backbone.View `events` property).

#### options
An array of options for the view class. Each entry in the array may have one of the following three formats:

```javascript
options : [
    'name', // Declares `name` a public option on this view class
    'type!', // Explanation mark indicates required option - an error will be thrown if a value is not supplied
    { label : 'OK' } // Option with a default value
]
```

View options are attached directly to the view object, but they should be accessed through `view.get`.

```
const myView = MyView( { name : 'CodeIzCool', type : 'ThisIsRequired' } );
console.log( myView.get( 'name' ) ); // 'CodeIzCool'
```

#### subviewCreators
An object mapping subview names to functions that return view instances.

```javascript
subviewCreators : {
    myChildView() {
        return new MyChildView();
    }
}
```

An object containing all subviews, keyed by subview name, is maintained at `view.subviews`. This object is read-only - it is constructed automatically during render using the functions defined in `subviewCreators`.

#### onMessages
The `onMessages` hash is the means by which a parent view can take action on, or "handle", messages received from its children. Entries in the `onMessages` hash have the format:
```
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
An optional function that returns the HTML for the view's `el`. If the `template` function is supplied, it will automatically be invoked and `view.el` will be populated as part of the default `render` behavior. The `template` function is passed as its only parameter a hash of the view's options merged with the result of `view._getTemplateData`. (If no `template` function is defined, you'll need to populate `view.el` manually by overriding `render`, as you would with a traditional Backbone view.)

We recommend configuring a preprocessor to compile files written in your preferred template language into executable functions. For example:

```
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
set( optionsHash ) // where `optionsHash` is an object that maps option names to their new values
```

Some considerations:
* Attempting to set an option that is not declared will throw an error
* Attempting to set an option to `undefined` will throw an error
* Changing the value of an option will trigger a call to `view._onOptionsChanged()`

#### get( optionNames )
Get the value of one or more options.

```javascript
view.get( optionName ) // returns the value of the option named optionName
view.get( optionNames ) // returns a hash mapping options in the optionNames array to their values
view.get() // returns a hash mapping all options to their values
```

#### spawn( messageName, data )
The spawn method generates a new message and passes it to the view's "parent", i.e. the closest ancestor view in the DOM tree. It also calls `view.trigger( messageName, data )` so that you can listen to the message as you would a normal Backbone event.

`data` is application defined data that will be available to this view's ancestors when handling this message using their `onMessages` hash.

> **Round trip messages**
> If `messageName` ends in `!`, the message is considered a "round trip message". Round trip messages are special in that they return values. That is, the `spawn()` method will return the value returned by the message handler. Using round trip messages, views can obtain dynamic information about their environment that, because it is dynamic, can not be passed in through view options. Round trip messages will continue to be passed up the hierarchy until they are handled - regardless of the value of each intermediate view's `passMessages` property. If a round trip message is not handled, `spawn()` returns `undefined`.

#### removeSubviews( whichSubviews )
Remove some or all subviews. `whichSubviews` may be an array containing subview names. If `whichSubviews` is not supplied, all subviews will be removed.

### Overridable private class methods
`ModuiBase` implements some private methods meant to be overridden by descendant classes.

#### _afterRender()
This function may be extended to add post-rendering logic. Descendant views should extend this method to perform additional UI decoration.

> **Important:** Descendant views should almost never extend `render()`. Extending `_afterRender()` is the preffered way of adding post-rendering logic, unless you really know what you're doing.

#### _getTemplateData()
This function may be overriden to provide data to the view's template function. The object it returns will be merged with the view's options and then passed to the `template` function as the `templateData` parameter.

#### _onOptionsChanged( changedOptions, previousValues )
This function can be overridden to take some action when options are changed, for example, to update DOM state. `changedOptions` is a hash of options that have changed to their new values and `previousValues` maps the same to their previous values.

```
const MyView = ModuiBase.extend( {
    _onOptionsChanged( changedOptions ) {
        if( 'name' in changedOptions ) {
            this.$el.find( 'div.name' ).text( changedOptions.name );
        }
    },
} );
```

## License
MIT
