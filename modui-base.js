var Super = require( 'backbone' ).View;

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
		this.$el.html( this.template( this.getOptions() ) );
		this.resolveHandles();
		
		return this;
	}
} );