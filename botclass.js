/**
	The Bot class. 

	Author: Ian Felstead
*/

"use strict";
 
/**
 * @namespace The algo-mission namespace
 */
var ALGO = ALGO || {};

/**
* constructor
* @class The bot class. Represents the main character in the game.
*/
var Bot = function () 
{
	// ctor
	this.modelFile = null;
	this.textureFile = null;
	this.mesh = null;
	
	this.modelLength = 0;
	
	this.rotation = 0;			// Amount to rotate in particular update
	this.move = 0;				// Amount to move in particular update
};

/**
* calculateBotLength()
* Updates the modelLength member with  the length of the bot. 
* Useful in calculating movement step size on the grid.
*/
Bot.prototype.calculateBotLength = function()
{
	var boundingBox = new THREE.Box3().setFromObject( this.mesh );
	var boxSize = boundingBox.size();

	this.modelLength = boxSize.z;
};

/**
* load()
* Loads the model and texture using the supplied loaders.
* Calls isCreatedCallback() once complete. 
*
* @param {string} model - file name of JSON model
* @param {string} texture - file name of model texture
* @param {THREE.JSONLoader} jsonLoader - JSON loader
* @param {THREE.TextureLoader} textureLoader - texture loader
* @param {function} isCreatedCallback - callback to call when complete
*/
Bot.prototype.load = function( model, texture, jsonLoader, textureLoader, isCreatedCallback )
{
	var loadedTexture = textureLoader.load( texture );
	
	var material = new THREE.MeshLambertMaterial( { map: loadedTexture } );
	
	var instance = this; 	// so we can access bot inside anon-function
	
	jsonLoader.load( model, function (geometry) {

		geometry.scale(  100, 100, 100 );
	
	 	instance.mesh = new THREE.Mesh( geometry, material );
	
		instance.calculateBotLength();
		
		isCreatedCallback();
	} );
};
