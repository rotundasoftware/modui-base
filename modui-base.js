import _ from 'underscore';
import Backbone from 'backbone';

const Super = Backbone.View;

const ModuiBase = Super.extend( {
	className : 'modui-base',
	
	options : [
		'extraClassName', // appended to regular class names (used to facilitate styling)
		'passMessagesTo' // where to pass spawned messages... defaults to closest ancestor view in DOM
	],

	onMessages : {},

	passMessages : false,

	subviewCreators : {},
	
	constructor( options = {} ) {
		// Validate prototype property declarations
		if( ! _.isArray( this.options ) ) {
			this.constructor.throw( 'Option declarations must be an array.' );
		}

		if( ! ( _.isBoolean( this.passMessages ) || _.isArray( this.passMessages ) ) ) {
			this.constructor.throw( 'passMessages declaration should be boolean or an array.' );
		}

		// Initialize instance properties
		const computedOptions = this.constructor.computeInitialOptions( options );
		this.set( computedOptions );
		
		this.subviews = {};

		const returnValue = Super.prototype.constructor.apply( this, arguments );

		return returnValue;
	},

	// eslint-disable-next-line no-unused-vars
	setElement( element ) {
		Super.prototype.setElement.apply( this, arguments );
		
		this.$el.data( 'view', this );

		if( this.extraClassName ) this.$el.addClass( this.extraClassName );
		
		return this;
	},

	set( optionsHashOrName = {}, optionValue ) {
		const optionsThatWereChanged = {};
		const optionsThatWereChangedPreviousValues = {};
		let optionsHash = {};

		// allow params to be ( propertyName, propertyValue ) instead of a hash of properties
		if( _.isString( optionsHashOrName ) && optionsHashOrName ) {
			optionsHash[ optionsHashOrName ] = optionValue;
		} else if( _.isObject( optionsHashOrName ) ) {
			// Shallow clone to prevent mutating arguments
			optionsHash = { ...optionsHashOrName };
		} else {
			this.constructor.throw( 'optionsHashOrName must be non-empty string or object.' );
		}

		const normalizedOptionDeclarations = _normalizeOptionDeclarations( this.options );

		Object.entries( optionsHash ).forEach( thisEntry => {
			const [ optionName, optionValue ] = thisEntry;
			const oldValue = this[ optionName ];
			const valueExisted = ! _.isUndefined( oldValue );
			const newValueExists = ! _.isUndefined( optionValue );
			const valueChanged = oldValue !== optionValue;

			if( ! normalizedOptionDeclarations[ optionName ] ) {
				this.constructor.throw( `"${optionName}" is not an option on this view` );
			}

			const { required } = normalizedOptionDeclarations[ optionName ];

			if( required && ! newValueExists ) {
				this.constructor.throw( `Required option "${optionName}" can not be set to undefined.` );
			}

			// Attach the supplied value of this option to the view object
			if( newValueExists ) {
				// Keep track of value changes on presxisting options
				if( valueExisted && valueChanged ) {
					optionsThatWereChangedPreviousValues[ optionName ] = oldValue;
					optionsThatWereChanged[ optionName ] = optionValue;
				}

				this[ optionName ] = optionValue;
			}
		} );

		// trigger callbacks if options changed
		const optionsWereChanged = Object.keys( optionsThatWereChanged ).length > 0;

		if( optionsWereChanged && _.isFunction( this._onOptionsChanged ) ) {
			this._onOptionsChanged( optionsThatWereChanged, optionsThatWereChangedPreviousValues );
		}
	},

	get( optionNames ) {
		// this.get( <string> ) -> returns just the value of the passed option
		// this.get( <array> ) -> returns a hash of options names to values
		// this.get() -> returns a hash of all options to their values
		
		const normalizedOptionDeclarations = _normalizeOptionDeclarations( this.options );
		const allOptionNames = Object.keys( normalizedOptionDeclarations );

		const getOptionValue = optionName => {
			if( ! allOptionNames.includes( optionName ) ) {
				this.constructor.throw( `"${optionName}" is not an option on this view` );
			}

			return _cloneOptionValue( this[ optionName ] );
		};

		// a single option name was provided, so return its value
		if( _.isString( optionNames ) ) return getOptionValue( optionNames );

		// no args were provided, so we override optionNames to include all options for next step
		if( _.isUndefined( optionNames ) ) optionNames = allOptionNames;

		// deal with an array of options: return a hash mapping those options to their values
		return optionNames.reduce( ( optionValueHashMemo, thisOptionName ) => {
			optionValueHashMemo[ thisOptionName ] = getOptionValue( thisOptionName );
			return optionValueHashMemo;
		}, {} );
	},

	render() {
		// Detach each of our subviews that we have already created during previous
		// renders from the DOM, so that they do not loose their DOM events when
		// we re-render the contents of this view's DOM element.
		Object.values( this.subviews ).forEach( thisSubview => thisSubview.$el.detach() );

		// Render view template
		if( this.template ) {
			const templateData = {
				...this.get(),
				...this._getTemplateData()
			};
	
			this.$el.html( this.template( templateData ) );
		}

		// Note that we may need to populate subviews even if a template is not defined,
		// since the view may be mounted on an existing DOM element with subview placeholders.
		const orderedSubviews = this._populateSubviews();
		
		// Now that all subviews have been populated, render them one at a
		// time in the order they occur in the DOM.
		orderedSubviews.forEach( thisSubview => thisSubview.render() );

		// Run any post-rendering logic
		this._afterRender();

		return this;
	},

	spawn( messageName, data ) {
		this.trigger( messageName, data );

		const isRoundTripMessage = messageName.charAt( messageName.length - 1 ) === '!';
		// eslint-disable-next-line consistent-this
		const originalSourceView = this;

		// Traverse view hierarchy to find matching handler functions
		let currentSourceView = originalSourceView;
		let currentParentView = this._getParentView();
		let currentSourceViewHandlerKeys = [];
		let messageShouldBePassed;
		
		while( currentParentView ) {
			// Find handler keys for this message name.
			// Sort them starting with the ones specific to a particular subview, so they get executed first.
			// At most, we'll end up with two elements: a view-specific handler and a generic handler.
			currentSourceViewHandlerKeys = _.chain( currentParentView.onMessages )
				.keys()
				.filter( thisOnMessagesKey => thisOnMessagesKey.startsWith( messageName ) )
				.filter( thisOnMessagesKey => {
					const targetSubviewName = thisOnMessagesKey.split( ' ' )[ 1 ];
					return targetSubviewName ? currentParentView.subviews[ targetSubviewName ] === currentSourceView : true;
				} )
				.sortBy( thisOnMessagesKey => thisOnMessagesKey.split( ' ' ).length )
				.reverse()
				.value();
			
			// If at least one handler was found, we're done
			if( currentSourceViewHandlerKeys.length > 0 ) break;
			
			// If not, find out if we should keep looking up the view hierarchy
			if( isRoundTripMessage ) {
				messageShouldBePassed = true;
			} else if( _.isBoolean( currentParentView.passMessages ) ) {
				messageShouldBePassed = currentParentView.passMessages;
			} else {
				messageShouldBePassed = currentParentView.passMessages.includes( messageName );
			}

			// If this message should not be passed, then we are done
			if( ! messageShouldBePassed ) break;

			// Move one level up the view hierarchy and loop again
			currentSourceView = currentParentView;
			currentParentView = currentParentView._getParentView();
		}

		// If no handlers were detected up the view hierarchy, we're done.
		// Note thay for round trip messages, this means the returned value will be undefined.
		if( currentSourceViewHandlerKeys.length === 0 ) return;

		// Handlers were detected: map their keys into the corresponding implementations
		const values = currentSourceViewHandlerKeys.map( thisHandlerKey => currentParentView.onMessages[ thisHandlerKey ] );
		const methods = values.map( thisValue => _.isFunction( thisValue ) ? thisValue : currentParentView[ thisValue ] );

		// Validate that all handlers declared as method names exist
		methods.forEach( ( thisMethod, index ) => {
			if( ! thisMethod ) {
				const methodName = values[ index ];
				this.constructor.throw( `Method "${methodName}" does not exist.` );
			}
		} );

		// The arguments passed to the message handler are: data, source, originalSource.
		// Source and originalSource will be different if the message has been passed.
		const callMethod = method => method.call( currentParentView, data, currentSourceView, originalSourceView );

		if( isRoundTripMessage ) {
			// For round trip messages, just execute the first handler found and return resulting value
			return callMethod( methods[ 0 ] );
		} else {
			// For non roundtrip messages, execute all handlers
			methods.forEach( callMethod );
		}
	},

	remove() {
		this.removeSubviews();
		Super.prototype.remove.call( this );
		return this;
	},

	removeSubviews( whichSubviews ) {
		const subviewsToRemove = whichSubviews || Object.keys( this.subviews );

		subviewsToRemove.forEach( thisSubviewName => {
			this.subviews[ thisSubviewName ].remove();
			delete this.subviews[ thisSubviewName ];
		} );
	},

	_afterRender() {
		// Extend to add post-rendering logic
	},

	_getTemplateData() {
		// this function may be overridden to add additional properties
		// to the object passed to the template's rendering function
		return {};
	},

	_populateSubviews() {
		const orderedSubviews = [];

		this.$( '[data-subview]' ).each( ( _index, el ) => {
			const thisPlaceHolderDiv = $( el );
			const subviewName = thisPlaceHolderDiv.attr( 'data-subview' );
			let thisSubview;

			if( _.isUndefined( this.subviews[ subviewName ] ) ) {
				const subviewCreator = this.subviewCreators[ subviewName ];
				
				if( _.isUndefined( subviewCreator ) ) {
					this.constructor.throw( `Can not find subview creator for subview named "${subviewName}"` );
				}

				thisSubview = subviewCreator.apply( this );
				
				if( thisSubview === null ) {
					// subview creators can return null to indicate that the subview should not be created
					thisPlaceHolderDiv.remove();
					return;
				}

				this.subviews[ subviewName ] = thisSubview;
			} else {
				// If the subview is already defined, then use the existing subview instead
				// of creating a new one. This allows us to re-render a parent view without
				// loosing any dynamic state data on the existing subview objects. To force
				// re-initialization of subviews, call view.removeSubviews before re-rendering.

				thisSubview = this.subviews[ subviewName ];
			}

			thisPlaceHolderDiv.replaceWith( thisSubview.$el );

			orderedSubviews.push( thisSubview );
		} );

		return orderedSubviews;
	},

	_onOptionsChanged( changedOptions, previousValues ) {
		// override in derived classes to do something when options are changed.
		// only called when the option(s) that are changed had previous (non-undefined) value

		if( 'extraClassName' in changedOptions ) {
			this.$el.removeClass( previousValues.extraClassName );
			this.$el.addClass( changedOptions.extraClassName );
		}
	},

	_getParentView() {
		// used for passing spawned messages

		// if we have an explicit view to pass our messages to, do it
		if( this.passMessagesTo ) return this.passMessagesTo;

		// otherwise pass to closest parent view
		const lastPossibleViewElement = $( 'body' )[ 0 ];
		let parent = null;
		let curElement = this.$el.parent();
		
		while( curElement.length > 0 && curElement[ 0 ] !== lastPossibleViewElement ) {
			const curElementView = curElement.data( 'view' );
			
			if( curElementView && _.isFunction( curElementView.render ) ) {
				parent = curElementView;
				break;
			}

			curElement = curElement.parent();
		}

		return parent;
	},

	_encapsulateEvent( e ) {
		const encapsulatedEvent = _.pick( e, [ 'keyCode', 'metaKey', 'ctrlKey', 'altKey', 'shiftKey' ] );
		const methods = [ 'preventDefault', 'stopPropagation', 'stopImmediatePropagation' ];

		methods.forEach( thisMethod => {
			encapsulatedEvent[ thisMethod ] = () => e[ thisMethod ]();
		} );

		return encapsulatedEvent;
	}
}, {
	computeInitialOptions( optionsPassedToConstructor = {}	 ) {
		const normalizedOptionDeclarations = _normalizeOptionDeclarations( this.prototype.options );
		const initialOptions = {};

		Object.entries( normalizedOptionDeclarations ).forEach( thisEntry => {
			const [ optionName, optionProps ] = thisEntry;
			const { required, defaultValue } = optionProps;
			const value = optionsPassedToConstructor[ optionName ];

			// Validate that all required options were provided.
			if( required && _.isUndefined( value ) ) {
				this.throw( `Required option "${optionName}" was not supplied.` );
			}

			initialOptions[ optionName ] = _.isUndefined( value ) ? defaultValue : value;
		} );

		return initialOptions;
	},

	throw( errorMessage ) {
		const classNameWords = this.prototype.className.split( ' ' );
		const lastClassName = classNameWords[ classNameWords.length - 1 ];

		throw new Error( `${lastClassName}: ${errorMessage}` );
	}
} );

function _normalizeOptionDeclarations( optionDeclarations ) {
	// convert our short-hand option syntax (with exclamation marks, etc.)
	// to a hash of "option declaration" objects of the form { required, defaultValue }, keyed by optionName

	const normalizedOptionDeclarations = {};

	optionDeclarations.forEach( thisOptionDeclaration => {
		let thisOptionName;
		let thisOptionRequired = false;
		let thisOptionDefaultValue;

		if( _.isString( thisOptionDeclaration ) ) {
			thisOptionName = thisOptionDeclaration;
		} else if( _.isObject( thisOptionDeclaration ) ) {
			thisOptionName = Object.keys( thisOptionDeclaration )[ 0 ];
			thisOptionDefaultValue = _cloneOptionValue( thisOptionDeclaration[ thisOptionName ] );
		}
		
		if( thisOptionName.charAt( thisOptionName.length - 1 ) === '!' ) {
			thisOptionRequired = true;
			thisOptionName = thisOptionName.slice( 0, thisOptionName.length - 1 );
		}

		normalizedOptionDeclarations[ thisOptionName ] = normalizedOptionDeclarations[ thisOptionName ] || {};
		normalizedOptionDeclarations[ thisOptionName ].required = thisOptionRequired;
		if( ! _.isUndefined( thisOptionDefaultValue ) ) normalizedOptionDeclarations[ thisOptionName ].defaultValue = thisOptionDefaultValue;
	} );

	return normalizedOptionDeclarations;
}

function _cloneOptionValue( optionValue ) {
	if( ! _.isObject( optionValue ) || _.isFunction( optionValue ) || _.isRegExp( optionValue ) ) {
		// can't clone functions or regexs, and no need to clone primitives
		return optionValue;
	} else if( _.isObject( optionValue ) ) {
		return JSON.parse( JSON.stringify( optionValue ) );
	}
}

export default ModuiBase;