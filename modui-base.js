var _ = require( 'underscore' );
var Backbone = require( 'backbone' );
Backbone.$ = require( 'jquery' );
var Super = Backbone.View;

var viewOptions = require( 'backbone-view-options' );
var courier = require( 'backbone-courier' );
var handle = require( 'backbone-handle' );
var subviews = require( 'backbone-subviews' );

module.exports = Super.extend( {
	constructor : function( options ) {
		handle.add( Super.prototype ); // needs to be added to view prototype, so that logic executes before render() in derived classes

		viewOptions.add( this );
		this.setOptions( options );
		
		// needs to be done before super is called, since super calls view#initialize,
		// and view#initialize might spawn events
		courier.add( this );

		var returnValue = Super.prototype.constructor.apply( this, arguments );

		// must be done after super is called
		subviews.add( this );

		return returnValue;
	},

	render : function() {
		if( ! this.template ) return this;

		var templateData = this.getOptions();
		if( this.model ) _.extend( templateData , this.model.attributes );
		_.extend( templateData , this._getTemplateData() );

		this.$el.html( this._renderTemplate( templateData ) );
		
		this.resolveHandles();
		
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
	}

	// _onOptionsChanged : function() {
	// 	this.render();
	// }
} );
