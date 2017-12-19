/**
	The MapManager class.

	Requires THREE.JS to have been loaded.

	Author: Ian Felstead
*/

"use strict";

/**
 * @namespace The algo-mission namespace
 */
var ALGO = ALGO || {};

/**
* constructor
* @class The MapManager class. Manages maps in the game.
*/
var MapManager = function ()
{
	this.tileLength = 0; 	// resized after bot is loaded
	this.tileHeight = 0.1; 	// resized after bot is loaded

  	// tileConfig;
  	// updated with loadedTexture & loadedTextureFlipped when loaded
  	this.tileConfig = {};

	this.tileTextures = {}; 	// loaded later. key = id, value = {texture, flippedTexture}

	this.availableMaps = []; 	// loaded from an overview JSON file later

	this.activeMapObjects = []; 	// updated when a map is loaded
	this.idToMapObject = []; 		// key: map object name, value: role

  	this.loadedTextures = {};   // texture path/name to loaded texture;

	// Positioning:
	// 	All tile positions are relative to the start tile (at 0,0)
	//      (on which the bus will be placed).
	//      Positions should be unique i.e. only one tile in a particular spot
	//	Positions values will be translated to world coordinates
	this.jsonMaps = [];

	// set to 1 when the JSON map/tile config has been loaded
	this.mapLoaded = 0;

	this.raycaster = new THREE.Raycaster();

	this.currentActiveTile = "";

	this.observers = [];
}

MapManager.prototype.registerObserver = function(observer)
{
	this.observers.push(observer);
}

MapManager.prototype.unregisterObserver = function(fn)
{
	this.observers = this.observers.filter(
		function(existingObserver) {
			if(existingObserver !== observer) {
				return existingObserver;
			}
		}
	);
}

MapManager.prototype.notifyObservers = function(tileRole)
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
* @param {function} callbackFn - called when map manger is ready (i.e. textures loaded)
*/
MapManager.prototype.load = function (textureLoader, callbackFn )
{
	this.mapLoaded = 0;
	var instance = this; 	// so we can access map inside anon-function

	this.loadJSON("maps_set1.json",
			function(data) {
				instance.jsonMaps = data.mapDefinition;
				instance.tileConfig = data.tileConfig;
				instance.mapLoaded = 1;
			},
			function(xhr) { console.error(xhr); }
	);

	var waitForLoad = setInterval( function(){
		if( instance.mapLoaded == 1 )
		{
			instance.loadTextures( textureLoader, callbackFn  );
			clearInterval( waitForLoad );
		}
	}, 100 );
}

/**
*  loadTextures
*
* @param {THREE.TextureLoader} textureLoader - for loading textures
* @param {function} callbackFn - called when map manger is ready (i.e. textures loaded)
*/
MapManager.prototype.loadTextures = function (textureLoader, callbackFn )
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

/**
* Class Constants
*
*/
MapManager.prototype.INITIAL_MAP_ID = 0;

/**
* loadMap()
* Loads the map definition related to the supplied map id.
*
* @param {int} mapId - (optional) mapId from the map summary file (see load()). Loads first map if unspecified.
*
*/
MapManager.prototype.loadMap = function( mapId, sceneToUpdate )
{
	if( typeof mapId == 'undefined' )
	{
		mapId = 0;
	}

	var mapDef = this.jsonMaps[ mapId ]; 

	this.removeMapFromScene( sceneToUpdate );

	this.activeMapObjects = [];
	this.idToMapObject = {};

	this.createMapObjects( mapDef );

	this.addMapToScene( sceneToUpdate );
};

/**
* getMapInfo()
* tbd
*
*/
MapManager.prototype.getMapInfo = function( )
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
* resize()
*
* Resizes the map tiles.
* Usually called to adjust the map tiles to fit the configured Bot's length.
*
* @param {int} tileLength - required length of each map tile
* @param (int) tileHeight - required height of each map tile
*/
MapManager.prototype.resize = function( tileLength, tileHeight )
{
	if( tileLength != this.tileLength || tileHeight != this.tileHeight )
	{
		this.tileLength = tileLength;
		this.tileHeight = tileHeight;
	}
};

/**
* createMapObjects()
*
* Create and position map tile objects ready for adding to a
* scene via setMapVisibility().
*
* @param {hash} mapDef - map definition hash
*
*/
MapManager.prototype.createMapObjects = function( mapDef )
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
		var boxMaterial = new THREE.MeshFaceMaterial(materials);

		var tileObject = new THREE.Mesh( stdTileGeo, boxMaterial );

		this.translateTilePosition( tileObject, mapTile.x, mapTile.z );

		tileObject.name = "Tile_" + i;

		if( mapTile.hasOwnProperty('role') )
		{
			tileObject.role = mapTile.role;
		}

		this.activeMapObjects.push( tileObject );
		this.idToMapObject[ tileObject.name ] = tileObject;
	}
}

/**
* getTileObjects
*
*
*/
MapManager.prototype.getTileObjects = function()
{
	return this.activeMapObjects;
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
MapManager.prototype.translateTilePosition = function ( tileObject, relativeX, relativeZ )
{
	var x = relativeX * this.tileLength;
	var y = 0; 	// TBD: Only supporting a single height at this point
	var z = relativeZ * this.tileLength;

	tileObject.position.set( x, y, z );
}

/**
* addMapToScene()
*
* Adds the map tiles in activeMapObjects to the scene
*
* @param {THREE.Scene} sceneToUpdate - scene to add map objects to
*
*/
MapManager.prototype.addMapToScene = function ( sceneToUpdate )
{
	for( var i = 0; i < this.activeMapObjects.length; i++ )
	{
		var tileObject = this.activeMapObjects[i];
		sceneToUpdate.add( tileObject );
	}
};

/**
* removeMapFromScene()
*
* Removed the current map tiles in activeMapObjects from the scene
*
* @param {THREE.Scene} sceneToUpdate - scene to remove map objects from
*
*/
MapManager.prototype.removeMapToScene = function ( sceneToUpdate )
{
	for( var i = 0; i < this.activeMapObjects.length; i++ )
	{
		var tileObject = this.activeMapObjects[i];
		sceneToUpdate.remove( tileObject.name );
	}
};


/**
* removeMapFromScene()
*
* Removes the map tiles listed in activeMapObjects from the scene
*
* @param {THREE.Scene} sceneToUpdate - scene to remove map objects from
*
*/
MapManager.prototype.removeMapFromScene = function ( sceneToUpdate )
{
	for( var i = 0; i < this.activeMapObjects.length; i++ )
	{
		var tileObject = this.activeMapObjects[i];
		sceneToUpdate.remove( tileObject );
	}
};

// if tileBeneath == "" then off map, else will hold textual id of tile.
//
MapManager.prototype.getTileUnderPos = function( xPos, yPos, zPos )
{
	var tileBeneath = "";
	var mapTiles = this.getTileObjects();
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

MapManager.prototype.activateTileUnderPos = function ( xPos, yPos, zPos )
{
	var tileId = this.getTileUnderPos( xPos, yPos, zPos );
	this.activateTile( tileId );
}

MapManager.prototype.activateTile = function ( tileId )
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

MapManager.prototype.getTileRole = function ( tileId )
{
	console.log("Map, tile is triggered: ", tileId );

	var role = '';

	var tileObject = this.idToMapObject[ tileId ];
	if( typeof(tileObject) == "undefined" )
	{
		role = "NO_TILE";
	}
	else if( tileObject.hasOwnProperty("role") )
	{
		role = tileObject.role;
	}

	return role;
}

/**
* update()
*
*
*/
MapManager.prototype.update = function ( timeElapsed )
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
MapManager.prototype.loadJSON = function(path, successFn, errorFn)
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