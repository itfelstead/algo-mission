/**
	The Bot class. 

	Author: Ian Felstead
*/

"use strict";
 
/**
 * @namespace The algo-mission namespace
 */
var ALGO = ALGO || {};

var OP_TIME_STEP = 2; 			// time in secs to execute an instruction
var OP_DELAY = 0.5; 			// delay between operations
var ROTATE_STEP = 90 * Math.PI/180; 	// Turn by 90 degrees (in radians)		



/**
* constructor
* @class The bot class. Represents the main character in the game.
*/
var Bot = function ( instructionMgr ) 
{
	// ctor
	this.instructionMgr = instructionMgr; 	// Bot understands instructions
	
	this.modelFile = null;
	this.textureFile = null;
	this.mesh = null;
	
	this.modelLength = 0;
	this.stepSize = 0;  		// units to move by (over OP_TIME_STEP seconds). Will update based on bot length
	
	this.rotation = 0;			// Amount to rotate in particular update
	this.move = 0;				// Amount to move in particular update
	
	this.instructionTimer = 0;	// how long each instruction should take
};

/**
* calculateStepSize()
* Updates the modelLength member with  the length of the bot. 
* Useful in calculating movement step size on the grid.
*/
Bot.prototype.calculateStepSize = function()
{
	var tileBorder = 4;
	var boundingBox = new THREE.Box3().setFromObject( this.mesh );
	var boxSize = boundingBox.size();

	this.modelLength = boxSize.z;
	
	this.stepSize = this.modelLength + (tileBorder*2);
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
	
		instance.calculateStepSize();
		
		isCreatedCallback();
	} );
};

Bot.prototype.getStepSize = function( )
{
	return this.stepSize;
}

Bot.prototype.instructionInProgress = function()
{
	// assert  this.instructionMgr.isRunning()
	return (this.delayTimer > 0) || (this.instructionTimer > 0);
}

Bot.prototype.prepareForNewInstruction = function()
{
	this.delayTimer = 0;
	this.instructionTimer = OP_TIME_STEP;
}


Bot.prototype.update = function( timeElapsed )
{
	if( this.instructionMgr.isRunning() )
	{
		if( this.delayTimer > 0 )
		{
			// Delay between instructions
			this.delayTimer -= timeElapsed;
		}
		else
		{
			// Execute (continue exectuing) instruction
			var movementTime = timeElapsed;
			 
			this.instructionTimer = this.instructionTimer - timeElapsed;
			
			if( this.instructionTimer <= 0 )
			{
				// reduce movement time by amount of overrun
				movementTime = timeElapsed + this.instructionTimer;
				
				this.delayTimer = OP_DELAY;
			}	
		
			this.moveAccordingToInstruction( movementTime );
		}
	}
	
	this.updateMesh();
}

Bot.prototype.moveAccordingToInstruction = function( movementTime )
{
	var currentOp = this.instructionMgr.currentInstruction(); 
	
	if( currentOp == this.instructionMgr.instructionConfig.FORWARD ||
		currentOp == this.instructionMgr.instructionConfig.BACK )
	{
		var movementThisFrame = movementTime * (this.stepSize / OP_TIME_STEP);
		
		if( currentOp == this.instructionMgr.instructionConfig.FORWARD )
		{
			this.move = movementThisFrame;
		}
		else
		{
			this.move = -movementThisFrame;
		}
	}
	else if( currentOp == this.instructionMgr.instructionConfig.LEFT ||
			 currentOp == this.instructionMgr.instructionConfig.RIGHT )
	{
		var rotationThisFrame = movementTime * (ROTATE_STEP / OP_TIME_STEP);
		
		if( currentOp == this.instructionMgr.instructionConfig.LEFT )
		{
			this.rotation += rotationThisFrame;
		}
		else
		{
			this.rotation -= rotationThisFrame;
		}
	}
}

// updateMesh according to rotation and move values
Bot.prototype.updateMesh = function ()
{
	if( this.mesh != null && typeof(this.mesh) != "undefined" )
	{
		this.mesh.rotation.set( 0, this.rotation, 0.0, 'XYZ' );
		
		if( this.move != 0 )
		{
			this.mesh.translateZ( this.move );
	
			this.move = 0; 		// we moved, so reset
		}
	}
}