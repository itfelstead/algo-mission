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
var MapManager = function ( textureLoader ) 
{
	// ctor
	this.textureLoader = textureLoader;

	this.tileLength = 0; 	// resized after bot is loaded
	this.tileHeight = 0.1; 	// resized after bot is loaded
	
	this.availableMaps = []; 	// loaded from an overview JSON file later

	this.activeMapObjects = []; 	// updated when a map is loaded
		
	// Positioning:
	// 	All tile positions are relative to the start tile (at 0,0) 
	//      (on which the bus will be placed).
	//      Positions should be unique i.e. only one tile in a particular spot
	//	Positions values will be translated to world coordinates
	this.hardcodedMaps = [
		{
			// mapId: 0,
			tiles: [
				// Start; 0, 0  means start: all other tiles are relative to start
				{ x: 0, z:-1, texture: 'road/256_tear_bottom.png' },
				{ x: 0, z: 0, texture: 'road/256_vertical.png' }, 	// start pos
				{ x: 0, z: 1, texture: 'road/256_vertical.png' },
				{ x: 0, z: 2, texture: 'road/256_tjunct_horizontal_up.png' },
				{ x: 1, z: 2, texture: 'road/256_horizontal.png' },
				{ x:-1, z: 2, texture: 'road/256_horizontal.png' },
				{ x:-2, z: 2, texture: 'road/256_left_tear.png' },
				{ x: 2, z: 2, texture: 'road/256_right_tear.png' }
			]
		},
		{
			// mapId: 1,
			tiles: [
				// Start; 0, 0  means start: all other tiles are relative to start
				{ x: 0, z:-1, texture: 'road/256_tear_bottom.png' },
				{ x: 0, z: 0, texture: 'road/256_vertical.png' }, 	// start pos
				{ x: 0, z: 1, texture: 'road/256_vertical.png' },
				{ x: 0, z: 2, texture: 'road/256_tjunct_horizontal_up.png' },
				{ x: 1, z: 2, texture: 'road/256_horizontal.png' },
				{ x:-1, z: 2, texture: 'road/256_horizontal.png' },
				{ x:-2, z: 2, texture: 'road/256_left_tear.png' },
				{ x: 2, z: 2, texture: 'road/256_right_tear.png' }
			]
		},
		// other maps here
	];
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
	var tiles = mapDef.tiles;

	var stdTileGeo = new THREE.BoxGeometry( this.tileLength, this.tileHeight, this.tileLength );

	for( var i = 0; i < tiles.length; i++ )
	{
		var tileDef = tiles[i];

		var borderMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 });
		var texture = this.textureLoader.load( "textures/" + tileDef.texture );
		var topMaterial = new THREE.MeshBasicMaterial( {map: texture, transparent: true} );

		// TBD clone() doesn't seem to be working.. so doing a duplicate load for not.
		// var flippedTexture = texture.clone();
		var flippedTexture = this.textureLoader.load( "textures/" + tileDef.texture );
		flippedTexture.flipY = false;
		var bottomMaterial = new THREE.MeshBasicMaterial( {map: flippedTexture, transparent: true} );

		var materials = [
			borderMaterial, borderMaterial,	// left, right
			topMaterial, bottomMaterial, 	// top, bottom
			borderMaterial, borderMaterial 	// front, back
		];
		var boxMaterial = new THREE.MeshFaceMaterial(materials); 

		var tileObject = new THREE.Mesh( stdTileGeo, boxMaterial );

		this.translateTilePosition( tileObject, tileDef.x, tileDef.z );

		tileObject.name = "Tile_" + i;
		
		this.activeMapObjects.push( tileObject );
	}
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
