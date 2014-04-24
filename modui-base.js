var Super = require( 'backbone' ).View;

var viewOptions = require( 'backbone-view-options' );
var courier = require( 'backbone-courier' );
var handle = require( 'backbone-handle' );
var subviews = require( 'backbone-subviews' );

module.exports = Super.extend( {
	constructor : function( options ) {
		viewOptions.add( this );
		this.setOptions( options );
		
		// needs to be done before super is called, since super calls view#initialize,
		// and view#initialize might spawn events
		courier.add( this );
		handle.add( this ); // needs to happen after Courier.add, so handles get replaced in spawnMessages

		var returnValue = Super.prototype.constructor.apply( this, arguments );

		// must be done after super is called
		subviews.add( this );

		return returnValue;
	},

	render : function() {
		var templateVars = this._getTemplateData();
		this.$el.html( this.template( templateVars ) );
	},

	_getTemplateData : function() {
		return this.getOptions();
	}
} );