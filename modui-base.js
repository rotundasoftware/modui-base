( function( root, factory ) {
	// UMD wrapper
	if ( typeof define === 'function' && define.amd ) {
		// AMD
		define( [ 'underscore', 'backbone', 'backbone.View', 'backbone-view-options', 'backbone-courier', 'backbone-handle', 'backbone-subviews' ], factory );
	} else if ( typeof exports !== 'undefined' ) {
		// Node/CommonJS
		module.exports = factory( require('underscore' ), require( 'backbone' ), require( 'backbone' ).View, require( 'backbone-view-options' ), require( 'backbone-courier' ), require( 'backbone-handle' ), require( 'backbone-subviews' ) );
	} else {
		// Browser globals
		factory( root._, root.Backbone, root.Backbone.View, root.Backbone.ViewOptions, root.Backbone.Courier, root.Backbone.Handle, root.Backbone.Subviews );
	}
}( this, function( _, Backbone, Super, viewOptions, courier, handle, subviews ) {

Backbone.ModuiBase = Super.extend( {
	className : 'view',
	
	options : [
		'extraClassName', // appended to regular class names to facilitate styling
		'passMessagesTo' // where to pass courier messagegs defaults to closest view in DOM
	],

	constructor : function( options ) {
		handle.add( this );

		viewOptions.add( this );
		this.setOptions( options );
		
		// needs to be done before super is called, since super calls view#initialize,
		// and view#initialize might spawn events
		courier.add( this );

		// must be done before super is called, since if this.render is referenced
		// in view#initialize (for example, if we bind an event to this.render),
		// we want it to reference the wrapped version (post subview) of render.
		subviews.add( this );

		var returnValue = Super.prototype.constructor.apply( this, arguments );

		return returnValue;
	},

	render : function() {
		if( this.template ) {
			var templateData = this.getOptions();
			if( this.model ) _.extend( templateData , this.model.attributes );
			_.extend( templateData , this._getTemplateData() );

			this.$el.html( this._renderTemplate( templateData ) );
		}
		
		this.resolveHandles();
		
		if( ! _.isUndefined( this.extraClassName ) ) this.$el.addClass( this.extraClassName );
		
		return this;
	},

	_getTemplateData : function() {
		// this function may be overridden to add additional properties
		// to the object passed to the template's rendering function
		return {};
	},

	_renderTemplate : function( templateData ) {
		var html;
		
		if( _.isFunction( this.template ) )
			html = this.template( templateData );
		else if( this.template.render )
			html = this.template.render( templateData );

		return html;
	},

	_onSubviewsRendered : function() {
		// override in derived classes
	},

	_encapsulateEvent : function( e ) {
		var encapsulatedEvent = _.pick( e, [ 'keyCode', 'metaKey', 'ctrlKey', 'altKey', 'shiftKey' ] );

		_.each( [ 'preventDefault', 'stopPropagation', 'stopImmediatePropagation' ], function( thisMethod ) {
			encapsulatedEvent[ thisMethod ] = function() {
				e[ thisMethod ]();
			};
		} );

		return encapsulatedEvent;
	},

	_getParentView : function() {
		// used for courier messages

		// if we have an explicit view to pass our messagegs to, do it
		if( this.passMessagesTo ) return this.passMessagesTo;

		// otherwise do default curiour behavior of passing to closest parent view
		return courier.findClosestParentView( this );
	}
} );

return Backbone.ModuiBase;

} ) );
