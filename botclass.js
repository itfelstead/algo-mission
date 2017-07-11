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
var OP_DEATH_TIME_STEP = 4;
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

var TDeathSpin = {
   UNKNOWN: 0,
   LEFT: 1,
   RIGHT: 2,
   BACK: 3,
   FORWARDS: 4
};

/**
* constructor
* @class The bot class. Represents the main character in the game.
*/
var Bot = function ( instructionMgr, mapManager )
{
	// ctor
	this.instructionMgr = instructionMgr; 	// Bot understands instructions

  this.mapManager = mapManager;   // for map tile collision detection

  this.audioBusHorn = null;
  this.audioBusMove = null;
  this.audioBusFall = null;
  this.audioBusTurn = null;
  this.audioBusWait = null;

  this.raycaster = new THREE.Raycaster();

	this.modelFile = null;
	this.textureFile = null;
	this.mesh = null;

	this.modelLength = 0;
	this.stepSize = 0;  		// units to move by (over OP_TIME_STEP seconds). Will update based on bot length

	this.rotationOnRoad = 0;       // Amount to rotate in particular update
	this.moveOnRoad = 0;     // Amount to move in particular update
  this.rotationInFall = 0;
  this.moveInFall = 0;
  this.scale = 0;         // for shrinking and growing the bus

  this.instructionTimer = 0;	// how long each instruction should take

  this.deathTime = 0;

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
Bot.prototype.load = function( model, texture, jsonLoader, textureLoader, audioListener, isCreatedCallback )
{
  this.loadModel( model, texture, jsonLoader, textureLoader, isCreatedCallback );

  this.loadAudio( audioListener );

  this.waitForLoad( isCreatedCallback, this );
};

Bot.prototype.loadModel = function( model, texture, jsonLoader, textureLoader, isCreatedCallback )
{
	var loadedTexture = textureLoader.load( texture );

	var material = new THREE.MeshLambertMaterial( { map: loadedTexture } );

	var instance = this; 	// so we can access bot inside anon-function

	jsonLoader.load( model, function (geometry) {

		geometry.scale(  100, 100, 100 );

	 	instance.mesh = new THREE.Mesh( geometry, material );

		instance.calculateStepSize();
	} );
}

Bot.prototype.loadAudio = function( audioListener )
{
  var loader = new THREE.AudioLoader();

	var instance = this; 	// so we can access bot inside anon-function

	loader.load( 'audio/43801__daveincamas__modelahorn.wav',
      function ( audioBuffer ) {
        //on load
        instance.audioBusHorn = new THREE.Audio( audioListener );
        instance.audioBusHorn.setBuffer( audioBuffer );
      } 
    );
  	loader.load( 'audio/86044__nextmaking__bus.wav',
      function ( audioBuffer ) {
        //on load
        instance.audioBusMove = new THREE.Audio( audioListener );
        instance.audioBusMove.setBuffer( audioBuffer );
      } 
    ); 
    loader.load( 'audio/86044__nextmaking__bus_reversed.wav',
      function ( audioBuffer ) {
        //on load
        instance.audioBusTurn = new THREE.Audio( audioListener );
        instance.audioBusTurn.setBuffer( audioBuffer );
      } 
    ); 
    loader.load( 'audio/360662__inspectorj__falling-comedic-a.wav',
      function ( audioBuffer ) {
        //on load
        instance.audioBusFall = new THREE.Audio( audioListener );
        instance.audioBusFall.setBuffer( audioBuffer );
      } 
    ); 
    loader.load( 'audio/333083__soundslikewillem__releasing-pressure.wav',
      function ( audioBuffer ) {
        //on load
        instance.audioBusWait = new THREE.Audio( audioListener );
        instance.audioBusWait.setBuffer( audioBuffer );
      } 
    ); 
}

Bot.prototype.waitForLoad = function( isCreatedCallback, context ) 
{
  var waitForAll = setInterval( function(){
    if( context.mesh != null &&
        context.audioBusMove != null &&
        context.audioBusTurn != null &&
        context.audioBusHorn != null &&
        context.audioBusWait != null &&
        context.audioBusFall != null )
      {
        clearInterval( waitForAll );
        context.isLoaded = 1;
        isCreatedCallback();
    }
  }, 100 );
}

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
      var executionTime = this.calculateDeathTime(timeElapsed);
      this.doDeath( executionTime );
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

            this.preInstructionStart();
          }
        break;

        case TState.EXECUTING:

          if( this.instructionTimer <= 0 )
          {
              // instruction finished so pause
              newState = TState.WAITING;
          }

          if( this.isOnMap() == 0 )
          {
            newState = TState.DYING
          }

        break;

        case TState.WAITING:
          if( this.delayTimer <= 0)
          {
            newState = TState.READY;
          }
        break;

        case TState.DYING:
          if( this.deathTimer <= 0)
          {
            newState = TState.DEAD;
          }
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
              this.scale = 1.0;
    break;

    case TState.EXECUTING:
      this.delayTimer = 0;
      this.instructionTimer = OP_TIME_STEP;
    break;

    case TState.WAITING:
      this.delayTimer = OP_DELAY;
    break;

    case TState.DYING:
      this.setupDeath();
    break;
  }
}

/**
* handleInstructionStartAudio()
*
*
*/
Bot.prototype.preInstructionStart = function()
{
  var currentOp = this.instructionMgr.currentInstruction();

  if( currentOp == this.instructionMgr.instructionConfig.FIRE )
  {
    if( this.audioBusHorn != null )
    {
      this.audioBusHorn.play();
    }
  }
  else if( currentOp == this.instructionMgr.instructionConfig.PAUSE )
  {
    if( this.audioBusWait != null )
    {
      this.audioBusWait.play();
    }
  }
  else if( currentOp == this.instructionMgr.instructionConfig.LEFT ||
           currentOp == this.instructionMgr.instructionConfig.RIGHT )
  {
    if( this.audioBusTurn != null )
    {
      this.audioBusTurn.play();
    }
  }
  else
  {
    if( this.audioBusMove != null )
    {
      this.audioBusMove.play();
    }
  }
}

/**
* setupDeath()
*
*
*/
Bot.prototype.setupDeath = function()
{
    this.deathTimer = OP_DEATH_TIME_STEP;
    this.deathSpin = TDeathSpin.UNKNOWN;

    this.audioBusFall.play();

    var wayFacing = this.mesh.getWorldRotation();
    if( wayFacing.y < 0 )
    {
      if( wayFacing.y >= -2 && wayFacing.y <= -1 ) {
          this.deathSpin = TDeathSpin.RIGHT;
      }
      else {
          this.deathSpin = TDeathSpin.BACK;
      }
    }
    else {
      if( wayFacing.y >= 1 && wayFacing.y <= 2 ) {
          this.deathSpin = TDeathSpin.LEFT;
      }
      else {
          this.deathSpin = TDeathSpin.FORWARD;
      }
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

    case TState.DYING:
      this.deathTimer = 0;
    break;
  }
}

/**
* prepareForNewInstruction()
*
*
*/
// This method should only be called if the bot isn't busy (isBusy())
Bot.prototype.prepareForNewInstruction = function()
{
  this.instructionReady = 1;
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

	this.updateMesh();
}

/**
*
*
*
*/
Bot.prototype.isOnMap = function()
{
  var isOnMap = 0;
  var mapTiles = this.mapManager.getTileObjects();
  if( mapTiles.length > 0 )
  {
    var botPos = new THREE.Vector3;
    botPos.y = g_Bot.mesh.position.y + 1; // bus is at same y pos as tiles so raise
    botPos.x = g_Bot.mesh.position.x;
    botPos.z = g_Bot.mesh.position.z;

    var vec = new THREE.Vector3;
    vec.x = 0;
    vec.y = -1;
    vec.z = 0;

    this.raycaster.set( botPos, vec.normalize() );

    var intersects = this.raycaster.intersectObjects(mapTiles); // store intersecting objects

    if( intersects.length > 0 )
    {
      isOnMap = 1;
    }
  }

  return isOnMap;
}

/**
* calculateMovementTime()
*
* @param {integer} timeElapsed - Time elapsed since last update
*
*/
Bot.prototype.calculateMovementTime = function( timeElapsed )
{
  var movementTime = 0;

  if( timeElapsed >= this.instructionTimer )
  {
    // Out of time in this step
    movementTime = this.instructionTimer;   // use up remaining
    this.instructionTimer = 0;
  }
  else {
    movementTime = timeElapsed;
    this.instructionTimer = this.instructionTimer - timeElapsed;
  }

  return movementTime;
}

Bot.prototype.calculateDeathTime = function( timeElapsed )
{
  var movementTime = 0;

  if( timeElapsed >= this.deathTimer )
  {
    // Out of time in this step
    movementTime = this.deathTimer;   // use up remaining
    this.deathTimer = 0;
  }
  else {
    movementTime = timeElapsed;
    this.deathTimer = this.deathTimer - timeElapsed;
  }

  return movementTime;
}

Bot.prototype.doDeath = function( movementTime )
{
  var fallSpeed = this.stepSize*4;

  // drop down, shrink and rotate
  var movementThisFrame = movementTime * (fallSpeed/ OP_TIME_STEP);

  var rotationThisFrame = movementTime * (ROTATE_STEP / OP_TIME_STEP);

  // shrink 100% in this.deathTimer ms
  var shrinkageThisFrame = movementTime * (1.0 / OP_DEATH_TIME_STEP);

  this.moveInFall = -movementThisFrame;
  this.rotationInFall += rotationThisFrame;
  this.scale = this.scale - shrinkageThisFrame;
  if( this.scale < 0 ) {
    this.scale = 0;
  }
  console.log( "shrinkage = " + this.scale);
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
			this.moveOnRoad = movementThisFrame;
		}
		else
		{
			this.moveOnRoad = -movementThisFrame;
		}
	}
	else if( currentOp == this.instructionMgr.instructionConfig.LEFT ||
			 currentOp == this.instructionMgr.instructionConfig.RIGHT )
	{
		var rotationThisFrame = movementTime * (ROTATE_STEP / OP_TIME_STEP);

		if( currentOp == this.instructionMgr.instructionConfig.LEFT )
		{
			this.rotationOnRoad += rotationThisFrame;
		}
		else
		{
			this.rotationOnRoad -= rotationThisFrame;
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

    var x = 0.0;
    var y = this.rotationOnRoad;
    var z = 0.0;

    if( this.state == TState.DYING ) {

      if( this.deathSpin == TDeathSpin.LEFT ) {
        z = -this.rotationInFall;
      }
      else if( this.deathSpin == TDeathSpin.RIGHT) {
        z = this.rotationInFall;
      }
      else if( this.deathSpin == TDeathSpin.BACK )
      {
        x = -this.rotationInFall;
      }
      else if( this.deathSpin == TDeathSpin.FORWARD )
      {
        x = this.rotationInFall;
      }

      this.mesh.scale.set( this.scale, this.scale, this.scale );
    }

    this.mesh.rotation.set( x, y, z, 'XZY' );

		if( this.moveOnRoad != 0 )
		{
			this.mesh.translateZ( this.moveOnRoad );

			this.moveOnRoad = 0; 		// we moved, so reset
		}

    if( this.moveInFall != 0 )
		{
      // Don't translateY as 'down' changes depending on orientation of object
      // instead we need to move along world Y via position
      this.mesh.position.y = this.mesh.position.y + this.moveInFall;
			this.moveInFall = 0; 		// we moved, so reset
		}
	}
}
