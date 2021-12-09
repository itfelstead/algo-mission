/**
	The MapManager Module.

	Requires THREE.JS to have been loaded.

	Author: Ian Felstead
*/

"use strict";

import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports,min/optimized/three.js';

import { MapTile } from "./maptile.mjs";
import { TileFlair } from "./tileflair.mjs";
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.135.0/examples/jsm/loaders/GLTFLoader.js';

/**
 * @namespace The algo-mission namespace
 */
var ALGO = ALGO || {};

// Instruction Manager can be a map tile observer
import { InstructionManager } from './instructionmanager.mjs';
// Bot can be a map tile observer
import { Bot } from './bot.mjs';

class MapManager 
{
	/**
	* Class Constants
	*
	*/
	static INITIAL_MAP_ID = 0;

	/**
	* constructor
	* @class The MapManager class. Manages maps in the game.
	*/
	constructor() 
	{
		this.tileLength = 0; 	// resized after bot is loaded
		this.tileHeight = 0.1; 	// resized after bot is loaded
	
		// tileConfig;
		// updated with loadedTexture & loadedTextureFlipped when loaded
		this.tileConfig = {};
	
		this.tileTextures = {}; 	// loaded later. key = id, value = {texture, flippedTexture}
	
		this.availableMaps = []; 	// loaded from an overview JSON file later
	
		this.activeTileObjects = []; 	// updated when a map is loaded
		this.activeTileMeshes = []; 	// the THREE.Mesh's used by the tiles
		this.idToMapObject = []; 		// key: map object name, value: MapTile object
	
		this.loadedTextures = {};   // texture path/name to loaded texture;
	
		// Positioning:
		// 	All tile positions are relative to the start tile (at 0,0)
		//      (on which the bus will be placed).
		//      Positions should be unique i.e. only one tile in a particular spot
		//	Positions values will be translated to world coordinates
		this.jsonMaps = [];
	
		// set to true when the JSON map/tile config has been loaded
		this.mapLoaded = false;
		this.flairLoaded = false;
		this.flairBusStopModel = null;
	
		this.raycaster = new THREE.Raycaster();
	
		this.currentActiveTile = "";
	
		this.observers = [];
	}

	registerObserver(observer)
	{
		this.observers.push(observer);
	}

	unregisterObserver(fn)
	{
		this.observers = this.observers.filter(
			function(existingObserver) {
				if(existingObserver !== observer) {
					return existingObserver;
				}
			}
		);
	}

	notifyObservers(tileRole)
	{
		this.observers.forEach(
			function(observer) {
				observer.updateTriggered( tileRole );
			}
		);
	}

	/**
	*  load
	*
	* @param {THREE.TextureLoader} textureLoader - for loading textures
	* @param {GLTFLoader} glTFLoader - for loading GLTF models
	* @param {function} callbackFn - called when map manger is ready (i.e. textures loaded)
	*/
	load(textureLoader, glTFLoader, callbackFn )
	{
		this.mapLoaded = false;
		// note: we don't reset flair loaded, as flair applied to all maps
		var instance = this; 	// so we can access map inside anon-function

		this.loadJSON("maps_set1.json",
				function(data) {
					instance.jsonMaps = data.mapDefinition;
					instance.tileConfig = data.tileConfig;
					instance.mapLoaded = true;
				},
				function(xhr) { console.error(xhr); }
		);

		var waitForLoad = setInterval( function(){
			if( instance.mapLoaded == true )
			{
				instance.loadTextures( textureLoader, callbackFn  );
				clearInterval( waitForLoad );
			}
		}, 100 ); 

        this.loadFlairModels( glTFLoader );

        this.waitForMapLoad( callbackFn, this );
	}

	loadFlairModels( glTFLoader )
	{
		if( this.flairLoaded == false ) {
			this.loadModel( "./models/BusStop_Raid/scene.gltf", glTFLoader, this.busStopLoadedCb.bind(this) );
		}
	}

    loadModel(model, glTFLoader, isCreatedCallback) {
        var instance = this;
        glTFLoader.load( model, 
            // Loaded    
            function (gltf) {
                isCreatedCallback(gltf);
            },
            // Progress
            function (xhr ) {
                console.log( model + " " + ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
            },
            // Error
            function( error ) {
                console.log( 'Failed to load model ' + model );
            }
        );
    }

	busStopLoadedCb( glftObj ) {
        var threeGroup = glftObj.scene;
        var object3d  = threeGroup.getObjectByName( "OSG_Scene" );
		this.flairBusStopModel = object3d;
        this.flairLoaded = true; 	// only one model for now, so set here
    }

	waitForMapLoad(isCreatedCallback, context) 
	{
        var waitForAll = setInterval(function () {
          if (context.mapLoaded == true &&
			  context.flairLoaded == true ) {
            clearInterval(waitForAll);
            isCreatedCallback(); 
          }
        }, 100);
    }

	/**
	* getMapInfo()
	* tbd
	*
	*/
	getMapInfo( )
	{
		var mapInfo = [];
		for( var i = 0; i < this.jsonMaps.length; ++i )
		{
			var info = {};
			var mapDetails = this.jsonMaps[i];
			info.mapid = mapDetails.mapid;
			info.name = mapDetails.name;
			info.instructions = mapDetails.instructions;
			info.difficulty = mapDetails.difficulty;

			mapInfo.push( info );
		}

		return mapInfo;
	}


	/**
	* loadMap()
	* Loads the map definition related to the supplied map id.
	*
	* @param {int} mapId - (optional) mapId from the map summary file (see load()). Loads first map if unspecified.
	*
	*/
	loadMap( mapId, sceneToUpdate )
	{
		if( typeof mapId == 'undefined' )
		{
			mapId = 0;
		}

		var mapDef = this.jsonMaps[ mapId ]; 

		this.removeMapFromScene( sceneToUpdate );

		this.activeTileObjects = [];
		this.activeTileMeshes = [];
		this.idToMapObject = {};

		this.createMapObjects( mapDef );

		this.addMapToScene( sceneToUpdate );
	}

	/**
	* resize()
	*
	* Resizes the map tiles.
	* Usually called to adjust the map tiles to fit the configured Bot's length.
	*
	* @param {int} tileLength - required length of each map tile
	* @param (int) tileHeight - required height of each map tile
	*/
	resize( tileLength, tileHeight )
	{
		if( tileLength != this.tileLength || tileHeight != this.tileHeight )
		{
			this.tileLength = tileLength;
			this.tileHeight = tileHeight;
		}
	}

	/**
	* createMapObjects()
	*
	* Create and position map tile objects ready for adding to a
	* scene via setMapVisibility().
	*
	* @param {hash} mapDef - map definition hash
	*
	*/
	createMapObjects( mapDef )
	{
		var layout = mapDef.tileLayout;

		var stdTileGeo = new THREE.BoxGeometry( this.tileLength, this.tileHeight, this.tileLength );

		for( var i = 0; i < layout.length; i++ )
		{
			var mapTile = layout[i];

			// Get pre-loaded texture
			var texture = null;
			var flippedTexture = null;
			var tileId = mapTile.id;

			if( mapTile.id )
			{
				var tileCfg = this.tileConfig[mapTile.id];
				if( tileCfg &&
					tileCfg.hasOwnProperty('loadedTexture') && tileCfg.hasOwnProperty('loadedTextureFlipped') )
				{
					texture = tileCfg.loadedTexture;
					flippedTexture = tileCfg.loadedTextureFlipped;
				}
			}

			var borderMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 });
			var topMaterial = new THREE.MeshBasicMaterial( {map: texture, transparent: true} );
			var bottomMaterial = new THREE.MeshBasicMaterial( {map: flippedTexture, transparent: true} );

			var materials = [
				borderMaterial, borderMaterial,	// left, right
				topMaterial, bottomMaterial, 	// top, bottom
				borderMaterial, borderMaterial 	// front, back
			];

			var tileObject = new MapTile( "Tile_" + i, stdTileGeo, materials  );
			let tileMesh = tileObject.getTileMesh();
			tileObject.setTileType( tileId );
			this.translateTilePosition( tileObject, mapTile.x, mapTile.z );

			if( mapTile.hasOwnProperty('role') )
			{
				tileObject.setTileRole( mapTile.role );
			
				// We'll add bus stops and people to all 'END' tiles
				if( mapTile.role == "END" ) {

					let busStopMesh = this.flairBusStopModel; 	// take a copy and rename??
					// TODO: set mesh position based on current type/id!!
					var busStop = new TileFlair( "BusStop_" + i, "BusStop", busStopMesh );
					this.positionBusStop( tileObject, busStopMesh );
					busStopMesh.scale.set(0.3,0.3,0.3);
					tileObject.addFlair( busStop );
				}
			}

			this.activeTileObjects.push( tileObject );
			this.activeTileMeshes.push( tileMesh ); 	// to ease intersection checks
			this.idToMapObject[ tileObject.m_Name ] = tileObject;
		}
	}

	positionBusStop( tileObject, busStopMesh )
	{
		let tileMesh = tileObject.getTileMesh();
		let x = tileMesh.position.x;
		let y = tileMesh.position.y;
		let z = tileMesh.position.z
		
		let rotX = 0;
		let rotY = 0;
		let rotZ = 0;

		switch( tileObject.getTileType() ) {
			case "tile_vert": 
				x = x - 5;
				rotY = 1.5;
			break;

			case "tile_horiz": 
				z = z + 5;
				rotY = 3.1;
			break;

			case "tile_cross":
			case "tile_top_deadend":
			case "tile_bottom_deadend":
			case "tile_right_deadend":
			case "tile_left_deadend":
			case "tile_tjunct_horiz_down":
			case "tile_tjunct_horiz_up":
			case "tile_tjunct_vert_left":
			case "tile_tjunct_vert_right":
			case "tile_vert":
			case "tile_horiz":
			case "tile_bend_left_up":
			case "tile_bend_left_down":
			case "tile_bend_right_up":
			case "tile_bend_right_down":
				// TODO
			break;
		}

		busStopMesh.rotation.set( rotX, rotY, rotZ );
		busStopMesh.position.set( x , y, z );
	}

	/**
	* getTileMeshes
	*
	*
	*/
	getTileMeshes()
	{
		return this.activeTileMeshes;
	}

	/**
	* translateTilePosition()
	*
	* Positions a map tile by translating the relative positions
	* used in the map definition file to actual positions in the
	* scene.
	*
	* @param {hash} tileObject - map tile to position
	* @param {hash} relativeX - map definition x position
	* @param {hash} relativeZ - map definition z position
	*
	*/
	translateTilePosition( tileObject, relativeX, relativeZ )
	{
		var x = relativeX * this.tileLength;
		var y = 0; 	// TBD: Only supporting a single height at this point
		var z = relativeZ * this.tileLength;

		tileObject.setTilePosition( x, y, z );
	}

	/**
	* addMapToScene()
	*
	* Adds the map tiles in activeTileObjects to the scene
	*
	* @param {THREE.Scene} sceneToUpdate - scene to add map objects to
	*
	*/
	addMapToScene( sceneToUpdate )
	{
		this.applyToScene( sceneToUpdate, true );
	}

	/**
	* removeMapFromScene()
	*
	* Removes the map tiles listed in activeTileObjects from the scene
	*
	* @param {THREE.Scene} sceneToUpdate - scene to remove map objects from
	*
	*/
	removeMapFromScene( sceneToUpdate )
	{
		this.applyToScene( sceneToUpdate, false );
	}

	applyToScene( sceneToUpdate, addMeshes ) 
	{
		for( var i = 0; i < this.activeTileObjects.length; i++ )
		{
			var tileObject = this.activeTileObjects[i];

			if( addMeshes == true ) {
				sceneToUpdate.add( tileObject.getTileMesh() );
			}
			else {
				sceneToUpdate.remove( tileObject.getTileMesh() );
			}

			var flairMeshes = tileObject.getFlairMeshes();
			if( flairMeshes ) {
				flairMeshes.forEach( function(flair) {
					if( addMeshes == true ) {
						sceneToUpdate.add( flair );
					}
					else {
						sceneToUpdate.remove( flair );
					}
				} );
			}
		}
	}

	// if tileBeneath == "" then off map, else will hold textual id of tile.
	//
	getTileUnderPos( xPos, yPos, zPos )
	{
		var tileBeneath = "";
		var mapTiles = this.getTileMeshes();
		if( mapTiles.length > 0 )
		{
			var botPos = new THREE.Vector3;
			botPos.y = yPos;
			botPos.x = xPos;
			botPos.z = zPos; 
		
			var vec = new THREE.Vector3;
			vec.x = 0;
			vec.y = -1;
			vec.z = 0;
		
			this.raycaster.set( botPos, vec.normalize() );
		
			var intersects = this.raycaster.intersectObjects(mapTiles); // store intersecting objects
		
			if( intersects.length > 0 )
			{
				console.log( "getTileUnderBot() num tiles under bot is ", intersects.length );
				tileBeneath = intersects[0].object.name;
			}
		}
	
		return tileBeneath;
	}

	activateTileUnderPos( xPos, yPos, zPos )
	{
		var tileId = this.getTileUnderPos( xPos, yPos, zPos );
		this.activateTile( tileId );
	}

	activateTile( tileId )
	{
		if( this.currentActiveTile != tileId )
		{
			var role = this.getTileRole( tileId );

			// Any Map animation besed on entering a tile can go here
			// TODO

			this.notifyObservers( role );

			this.currentActiveTile = tileId;
		}
	}

	getTileRole( tileId )
	{
		console.log("Map, tile is triggered: ", tileId );

		var role = '';

		var tileObject = this.idToMapObject[ tileId ];
		if( typeof(tileObject) == "undefined" )
		{
			role = "NO_TILE";
		}
		else
		{
			role = tileObject.getTileRole();
		}

		return role;
	}

	/**
	* update()
	*
	*
	*/
	update( timeElapsed )
	{
		// TODO animate the map?
	}

	/**
	* loadJSON()
	*
	* @param {string} path - file name (and path) of JSON map file
	* @param {function} successFn 
	* @param {function} errorFn 
	*/
	loadJSON(path, successFn, errorFn)
	{
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function()
		{
			if (xhr.readyState === XMLHttpRequest.DONE) {
				if (xhr.status === 200) {
					if (successFn) {
						successFn(JSON.parse(xhr.responseText));
					}
				} else {
					if (errorFn) {
						errorFn(xhr);
					}
				}
			}
		};
		xhr.open("GET", path, true);
		xhr.send();
	}


	/**
	*  loadTextures
	*
	* @param {THREE.TextureLoader} textureLoader - for loading textures
	* @param {function} callbackFn - called when map manger is ready (i.e. textures loaded)
	*/
	loadTextures(textureLoader, callbackFn )
	{
		for( var tileId in this.tileConfig )
		{
			var tileEntry = this.tileConfig[tileId];
			if( tileEntry && tileEntry.hasOwnProperty("textureFile") )
			{
				// Load texture
				textureLoader.load( "textures/" + tileEntry.textureFile,

					// on load
					(function() {	var tileEntry_ = tileEntry; return function( texture )	{
						// console.log("loaded texture " + texture.id)
						tileEntry_.loadedTexture = texture;
					}	})(),

					// on download progress
					(function() {	var tileEntry_ = tileEntry; return function( xhr ) {
						//console.log( "textures/" + tileEntry_.textureFile + " " + (xhr.loaded / xhr.total * 100) + '% loaded' );
					}	})(),

					// on error
					(function() {	var tileEntry_ = tileEntry; return function( xhr ) {
						//console.log( 'Error loading textures/' + tileEntry_.textureFile );
					}	})()
				);

				// Load Flipped Texture
				// TBD clone() doesn't seem to be working.. so doing a duplicate load for now.
				// var flippedTexture = texture.clone();
				textureLoader.load( "textures/" + tileEntry.textureFile,
					// on load
					(function() {	var tileEntry_ = tileEntry; return function( texture )	{
						//console.log("loaded flipped texture " + texture.id)
						texture.flipY = false;
						tileEntry_.loadedTextureFlipped = texture;
					}	})(),

					// on download progress
					(function() {	var tileEntry_ = tileEntry; return function( xhr ) {
						//console.log( "textures/" + tileEntry_.textureFile + " " + (xhr.loaded / xhr.total * 100) + '% loaded' );
					}	})(),

					// on error
					(function() {	var tileEntry_ = tileEntry; return function( xhr ) {
						//console.log( 'Error loading textures/' + tileEntry_.textureFile );
					}	})()
				);
			}
		}

		function createMyInterval(f,dynamicParameter,interval) { return setInterval(function() { f(dynamicParameter); }, interval); }
		var waitForTextures = createMyInterval(
			function(tileConfig) {
				var allDone = true;
				for( var tileId in tileConfig )
				{
					var tileEntry = tileConfig[tileId];
					if( tileEntry.hasOwnProperty("loadedTexture") == false ||
							tileEntry.hasOwnProperty("loadedTextureFlipped") == false )
					{
						// at least one not loaded, so continue to wait
						allDone = false;
						break;
					}
				}
				if( allDone == true )
				{
					// all tile textures loaded, inform caller via callback
					clearInterval(waitForTextures);
					if( callbackFn && typeof(callbackFn) === "function")
					{
						callbackFn();
					}
				}
			}, this.tileConfig, 500 );
	}
}

export { MapManager };