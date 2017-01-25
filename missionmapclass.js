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
*
* @param {THREE.TextureLoader} textureLoader - for loading textures
* @param {function} callbackFn - called when map manger is ready (i.e. textures loaded)
*/
var MapManager = function ( textureLoader, callbackFn )
{
	// ctor
	this.textureLoader = textureLoader;

	this.tileLength = 0; 	// resized after bot is loaded
	this.tileHeight = 0.1; 	// resized after bot is loaded

  // tileConfig;
  // updated with loadedTexture & loadedTextureFlipped when loaded
  this.tileConfig = {
    tile_bottom_deadend: { textureFile: 'road/256_tear_bottom.png' },
    tile_vert: { textureFile: 'road/256_vertical.png' },
    tile_tjunct_horiz_up: { textureFile: 'road/256_tjunct_horizontal_up.png' },
    tile_horiz: { textureFile: 'road/256_horizontal.png' },
    tile_left_deadend: { textureFile: 'road/256_left_tear.png' },
    tile_right_deadend: { textureFile: 'road/256_right_tear.png' }
  };

	this.tileTextures = {}; 	// loaded later. key = id, value = {texture, flippedTexture}

	this.availableMaps = []; 	// loaded from an overview JSON file later

	this.activeMapObjects = []; 	// updated when a map is loaded

  this.loadedTextures = {};   // texture path/name to loaded texture;

	// Positioning:
	// 	All tile positions are relative to the start tile (at 0,0)
	//      (on which the bus will be placed).
	//      Positions should be unique i.e. only one tile in a particular spot
	//	Positions values will be translated to world coordinates
	this.hardcodedMaps = [
		{
			// mapId: 0,
			tileLayout: [
				// Start; 0, 0  means start: all other tiles are relative to start
				{ x: 0, z:-1, id: 'tile_bottom_deadend' },
				{ x: 0, z: 0, id: 'tile_vert' }, 	// start pos
				{ x: 0, z: 1, id: 'tile_vert' },
				{ x: 0, z: 2, id: 'tile_tjunct_horiz_up' },
				{ x: 1, z: 2, id: 'tile_horiz' },
				{ x:-1, z: 2, id: 'tile_horiz' },
				{ x:-2, z: 2, id: 'tile_left_deadend' },
				{ x: 2, z: 2, id: 'tile_right_deadend' }
			]
		},
		{
			// mapId: 1,
			tileLayout: [
				// Start; 0, 0  means start: all other tiles are relative to start
        { x: 0, z:-1, id: 'tile_bottom_deadend' },
				{ x: 0, z: 0, id: 'tile_vert' }, 	// start pos
				{ x: 0, z: 1, id: 'tile_vert' },
				{ x: 0, z: 2, id: 'tile_tjunct_horiz_up' },
				{ x: 1, z: 2, id: 'tile_horiz' },
				{ x:-1, z: 2, id: 'tile_horiz' },
				{ x:-2, z: 2, id: 'tile_left_deadend' },
				{ x: 2, z: 2, id: 'tile_right_deadend' }
			]
		},
		// other maps here
	];

  // load the textures
	for( var tileId in this.tileConfig )
	{
		var tileEntry = this.tileConfig[tileId];
		if( tileEntry && tileEntry.hasOwnProperty("textureFile") )
		{
			// Load texture
			this.textureLoader.load( "textures/" + tileEntry.textureFile,

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
			this.textureLoader.load( "textures/" + tileEntry.textureFile,
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

};

/**
* Class Constants
*
*/
MapManager.prototype.INITIAL_MAP_ID = 0;


/**
* loadMapSummary()
* Loads the map summary from the specified file. TODO Not called at present
*
* @param {string} map - name of file holding desired JSON map summary definition
*
*/
MapManager.prototype.loadMapSummary = function( map )
{
	// TODO Load from JSON file defining availble maps and play sequence. Hardcode for now
	this.availableMaps = [
		{
			id: 0,
			name: "initial map test",
			difficulty: 1,
			instructions: "pickup person",
			fileName: "TODO1",
			playSequence: 1
		},
		{
			id: 1,
			name: "second level map test",
			difficulty: 4,
			instructions: "pickup 600 people",
			fileName: "TODO2",
			playSequence: 2
		}
	];
};

/**
* loadMap()
* Loads the map definition related to the supplied map id. TODO
*
* @param {int} mapId - (optional) mapId from the map summary file (see load()). Loads first map if unspecified.
*
*/
MapManager.prototype.loadMap = function( mapId )
{
	if( typeof mapId == 'undefined' )
	{
		mapId = 0;
	}

	// TODO: Load JSON file for specific map level. Hardcode for now
	var mapDef = this.hardcodedMaps[ mapId ];  // var mapDef = this.load( mapId );

	this.createMapObjects( mapDef );
};

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

		this.activeMapObjects.push( tileObject );
	}
}

/**
*
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

/**
* update()
*
*
*/
MapManager.prototype.update = function ( timeElapsed )
{
	// TODO animate the map?
}
