/**
	The ControlPanel class.

	Author: Ian Felstead
*/

"use strict";
 
/**
 * @namespace The algo-mission namespace
 */
var ALGO = ALGO || {};

// Inset Command Window Globals
var INSET_DIV_NAME = "CommandInset";
var INSET_CANVAS_WIDTH = 200;
var INSET_CANVAS_HEIGHT = 200;
var INSET_LEFT_OFFSET = 0;
var INSET_BOTTOM_OFFSET = 10;
var INSET_MARGIN = 20;
var INSET_CAM_FOV =30 
var INSET_CAM_NEAR = 1;
var INSET_CAM_FAR = 1000;

/**
* constructor
* @class The ControlPanel class.
*/
var ControlPanel = function () 
{
	this.controlPanelObjects = {}; // an array of buttons (meshes)
	
	this.panelScene = null;
	
	this.panelCamera = null;
	
	this.panelRenderer = null;
};

/**
* addControlPanel()
* 
*
*/
ControlPanel.prototype.addControlPanel = function ( cameraUp, instructionMgr, textureLoader )
{
	this.addControlPanelWindow( cameraUp );
	this.addControlPanelButtons( instructionMgr, textureLoader );
}

/**
* panelWidth()
* 
*
*/
ControlPanel.prototype.panelWidth = function ( )
{
	return this.panelRenderer.domElement.clientWidth;
}

/**
* panelHeight()
* 
*
*/
ControlPanel.prototype.panelHeight = function ( )
{
	return this.panelRenderer.domElement.clientHeight;
}

/**
* addControlPanelWindow()
* 
*
*/
ControlPanel.prototype.addControlPanelWindow = function( cameraUp )
{
	// create & append panel window
	var insetDiv = document.createElement( "div" );
	insetDiv.id = INSET_DIV_NAME;
	insetDiv.style.cssText ="width: " + INSET_CANVAS_WIDTH + "px; " +
				"height: " + INSET_CANVAS_HEIGHT + "px; " +
				"left: " + INSET_LEFT_OFFSET + "px; " +
				"bottom: " + INSET_BOTTOM_OFFSET + "px;" +
				"background-color: transparent;" + /* or #fff */
				"opacity: 1; " + /* affects whole window */
				"border: none; " + /* or e.g. '2px solid black' */
				"margin: " + INSET_MARGIN + "px; " +
				"padding: 0px; " +
				"position: absolute; z-index: 100;";

	insetDiv.style.opacity = 0.0; 		// we'll set to 1 after loading
	
	document.body.appendChild( insetDiv );
				
	// create panel renderer, scene & camera
	var panelContainer = document.getElementById( INSET_DIV_NAME );
	
	// use 'alpha' to allow transparent inset window
	this.panelRenderer = new THREE.WebGLRenderer( { alpha: true } );
	this.panelRenderer.setSize( INSET_CANVAS_WIDTH, INSET_CANVAS_HEIGHT );

	panelContainer.appendChild( this.panelRenderer.domElement );


	this.panelScene = new THREE.Scene();
	this.panelCamera = new THREE.PerspectiveCamera( INSET_CAM_FOV, 
							INSET_CANVAS_WIDTH / INSET_CANVAS_HEIGHT, 
							INSET_CAM_NEAR, 
							INSET_CAM_FAR );
	this.panelCamera.up = cameraUp;
	this.panelCamera.position.set(0, 0, -50);
}

/**
* update()
* 
*
*/
ControlPanel.prototype.update = function( timeElapsed )
{
	this.panelCamera.lookAt( this.panelScene.position );
}

/**
* render()
* 
*
*/
ControlPanel.prototype.render = function()
{
	this.panelRenderer.render( this.panelScene, this.panelCamera);
}

/**
* setWindowOpacity()
* 
*
*/
ControlPanel.prototype.setWindowOpacity = function( opacity )
{
	document.getElementById(INSET_DIV_NAME).style.opacity = opacity;
}

/**
* addControlPanelButtons()
* 
*
*/
ControlPanel.prototype.addControlPanelButtons = function( instructionMgr, textureLoader )
{
	this.controlPanelObjects = {};

	// Layout is something like this (x grows left, y grows up)
	//
	//                 [forward]
	//           [left] [pause] [right]
	//    [fire]        [back]
	//           [clear]        [go]
	//
	var boxSize = 1; 	// for display size is irrelevant as FoV will alter to fill window
	var gridSize = 4; 	// panel buttons are placed on a 4x4 grid
	var defaultZ = 1;
	var stepSize = boxSize * 1.25;
	var offset = (-(gridSize * stepSize) / 2) + (boxSize/2);

	var panelConfig = [
		{ "id": instructionMgr.instructionConfig.FORWARD,    "x": 1, "y": 3, "z": defaultZ, "pic": "Up256.png" },
		{ "id": instructionMgr.instructionConfig.BACK,  "x": 1, "y": 1, "z": defaultZ, "pic": "Back256.png" },
		{ "id": instructionMgr.instructionConfig.LEFT,  "x": 2, "y": 2, "z": defaultZ, "pic": "Left256.png" },
		{ "id": instructionMgr.instructionConfig.RIGHT, "x": 0, "y": 2, "z": defaultZ, "pic": "Right256.png" },
		{ "id": instructionMgr.instructionConfig.CLEAR, "x": 2, "y": 0, "z": defaultZ, "pic": "Clear256.png" },
		{ "id": instructionMgr.instructionConfig.GO,    "x": 0, "y": 0, "z": defaultZ, "pic": "Go256.png" },
		{ "id": instructionMgr.instructionConfig.FIRE,  "x": 3, "y": 1, "z": defaultZ, "pic": "Fire256.png" },
		{ "id": instructionMgr.instructionConfig.PAUSE, "x": 1, "y": 2, "z": defaultZ, "pic": "Stop256.png" }
	];

	
	for (var i = 0; i < panelConfig.length; i++) 
	{
		var buttonConfig = panelConfig[i];
		var picture = buttonConfig.pic;
		var texture = textureLoader.load( "textures/" + picture );

		var buttonGeo = new THREE.BoxGeometry( boxSize, boxSize, 0.1 );
		var buttonMaterial = new THREE.MeshBasicMaterial( {map: texture } );
		var buttonMesh = new THREE.Mesh( buttonGeo, buttonMaterial );

		buttonMesh.position.set( offset + (buttonConfig.x*stepSize), offset + (buttonConfig.y*stepSize), buttonConfig.z );

		buttonMesh.name = buttonConfig.id;

		this.controlPanelObjects[ buttonConfig.id ] = buttonMesh;

		this.panelScene.add( buttonMesh );
	}

	// Adjust the FoV to fill the whole view with the control panel
	var dist = (-this.panelCamera.position.z) + defaultZ;
	var height = gridSize * stepSize;
	var fov = 2 * Math.atan( height / ( 2 * dist ) ) * ( 180 / Math.PI );
	this.panelCamera.fov = fov;
	this.panelCamera.updateProjectionMatrix();

}

/**
* detectInstructionPress()
* 
*
*/
ControlPanel.prototype.detectInstructionPress = function( xPos, yPos, parentHeight, raycaster )
{
	var instructionClicked;
	
	if( typeof(raycaster) == "undefined" )
	{
		return;	
	}
	
	// The event's X & Y are in relation to the main window
	// so we adjust them to be in relation to the inset window
	var insetClientX = xPos - (INSET_LEFT_OFFSET + INSET_MARGIN);
	var insetClientY = yPos - (parentHeight - INSET_CANVAS_HEIGHT - (INSET_BOTTOM_OFFSET + INSET_MARGIN));

	// Normalise the X & Y and test for intersection with inset window objects
	var mouse = new THREE.Vector2();
	mouse.x = ( insetClientX / this.panelWidth() ) * 2 - 1;
	mouse.y = - ( insetClientY / this.panelHeight() ) * 2 + 1;
	
	raycaster.setFromCamera( mouse, this.panelCamera );
	
	
	var buttonObjects = [];
	for( var key in this.controlPanelObjects )
	{
	    var mesh = this.controlPanelObjects[ key ];
	    
	    buttonObjects.push( mesh );
	}
	
	var buttonIntersects = raycaster.intersectObjects( buttonObjects );

	if( buttonIntersects.length > 0 )
	{
		// Intersection detected
		instructionClicked = buttonIntersects[ 0 ].object.name;
	}
	
	return instructionClicked;
}
