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

var TState = {
  INITIAL: 1,
  READY: 2,
  WAITING: 3,
  EXECUTING: 4,
  DYING: 5,
  DEAD: 6
};

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

  this.instructionReady = 0;  // 1 if there is an instruction waiting for us
  this.isLoaded = 0;          // 1 if bot is loaded and ready

  this.state = TState.INITIAL;
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

    instance.isLoaded = 1;

		isCreatedCallback();
	} );
};

Bot.prototype.getStepSize = function( )
{
	return this.stepSize;
}

/**
* currentInstruction()
*
* @return true if bot is busy, else false
*/
Bot.prototype.isBusy = function()
{
  console.log("state is " + this.state)
  return this.state == TState.EXECUTING ||
         this.state == TState.WAITING ||
         this.state == TState.DYING ||
         this.instructionReady == 1;
}

/**
* actOnState()
*
* @param {integer} timeElapsed - Time elapsed since last update
*/
Bot.prototype.actOnState = function(timeElapsed)
{

  switch( this.state )
  {
    case TState.INITIAL:
      // Nothing to do
      break;
    case TState.READY:
      // Nothing to do
      break;

    case TState.WAITING:
      if( this.delayTimer > 0 )
      {
        // Delay between instructions
        this.delayTimer -= timeElapsed;
      }
      break;

    case TState.EXECUTING:
      var executionTime = this.calculateMovementTime(timeElapsed);
      this.moveAccordingToInstruction( executionTime );
      break;

    case TState.DYING:
    //  var executionTime = this.calculateMovementTime(timeElapsed);
    //  this.moveTowardsDoom( movementTime );
    break;
  }
}

/**
* updateState()
*
*
*/
Bot.prototype.updateState = function()
{
    var newState = this.state;

    switch( this.state )
    {
      case TState.INITIAL:
        if( this.isLoaded == 1 )
        {
          newState = TState.READY;
        }
        break;

        case TState.READY:
          if( this.instructionReady == 1 )
          {
            // instruction execution triggered via prepareForNewInstruction()
            newState = TState.EXECUTING;
          }
        break;

        case TState.EXECUTING:
          if( this.instructionTimer <= 0 )
          {
              // instruction finished so pause
              newState = TState.WAITING;
          }

          // if off map then
          // newState = TState.DYING
        break;

        case TState.WAITING:
          if( this.delayTimer <= 0)
          {
            newState = TState.READY;
          }
        break;

        case TState.DYING:
          // if dying process complete
          // newState = TState.DEAD;
        break;

        case TState.DEAD:
          // NOOP: Wait for call to reset to move use to TState.READY
        break;

        case TState.INITIAL:
          // NOOP: Wait for loader to move us into TState.READY
        break;

        default:
          // NOOP
    }

    // Change state if required
    if( this.state != newState )
    {
      console.log("changing to state " + newState);
      this.onExitState();
      this.state = newState;
      this.onEnterState();
    }
}

/**
* onEnterState()
*
*
*/
Bot.prototype.onEnterState = function()
{
  switch(this.state)
  {
    case TState.READY:
    break;

    case TState.EXECUTING:
      this.delayTimer = 0;
      this.instructionTimer = OP_TIME_STEP;
    break;

    case TState.WAITING:
      this.delayTimer = OP_DELAY;
    break;

  }
}

/**
* onExitState()
*
*
*/
Bot.prototype.onExitState = function()
{
  switch(this.state)
  {
    case TState.INITIAL:
      // NOOP
    break;
    case TState.READY:
      this.instructionReady = 0;
    break;

    case TState.WAITING:
      this.delayTimer = 0;
    break;
    case TState.EXECUTING:
      this.instructionTimer = 0;
    break;
  }
}

/**
* prepareForNewInstruction()
*
*
*/
// This methods should only be called is the bot isn't busy (isBusy())
Bot.prototype.prepareForNewInstruction = function()
{
  this.instructionReady = 1;
	//this.delayTimer = 0;
	//this.instructionTimer = OP_TIME_STEP;
}

/**
* update()
*
* @param {integer} timeElapsed - Time elapsed since last update
*
*/
Bot.prototype.update = function( timeElapsed )
{
  this.actOnState( timeElapsed );

  this.updateState();

	//if( this.instructionMgr.isRunning() )

	this.updateMesh();
}

/**
* calculateMovementTime()
*
* @param {integer} timeElapsed - Time elapsed since last update
*
*/
Bot.prototype.calculateMovementTime = function( timeElapsed )
{
  var movementTime = timeElapsed;
  this.instructionTimer = this.instructionTimer - timeElapsed;
  if( this.instructionTimer <= 0 )
  {
    // reduce movement time by amount of overrun
    movementTime = timeElapsed + this.instructionTimer;
  }

  return movementTime;
}

/**
* moveAccordingToInstruction()
*
* @param {integer} movementTime - Time to spend moving
*/
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

/**
* updateMesh()
*
*
*/
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
