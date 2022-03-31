/**
    MapScreen

    Author: Ian Felstead
*/

"use strict";

// Global Namespace
var ALGO = ALGO || {};

import * as THREE from 'three';

import { getBestSelectMapScreenWidth, boundedScaleTo, messageToMesh, limitViaScale, determineScale, getScreenHeightAtCameraDistance, getScreenWidthAtCameraDistance } from './algoutils.js'; 	        // utility functions

class MapScreen {

    static LOADER_JOB_NAME = "arrows";

    constructor( camera, loadingManager, mapManager ) {

        this.m_MapManager = mapManager;
        this.m_LoadingManager = loadingManager;
        this.m_MapSelectionObjects = [];

        this.m_Camera = camera;
        this.m_DistanceFromCamera = 10;

        this.m_NextArrow = null;
        this.m_PrevArrow = null;
        this.m_ArrowLoaded = false;
        this.m_ArrowsSpinning = false;

        this.m_MapSelectIndex = 0;
        //this.m_Finished = false;
    }

    create( ) {
        // NOOP - it will be created on first time display

    }

    update() {
        // do any animation

        if( this.m_ArrowsSpinning ) {

            const rotateStep = 0.03;
            if( this.m_NextArrow ) {
                this.m_NextArrow.rotation.x -= rotateStep;
            }
            if( this.m_PrevArrow ) {
                this.m_PrevArrow.rotation.x -= rotateStep;
            }
        }
    }

    destroy() {

    }

    show( currentMap ) {
        this.m_MapSelectIndex = Math.max(0, currentMap);     // start selection at current map

        if( this.m_ArrowLoaded == false ) {
            this.m_LoadingManager.loadModel( "./models/Arrow_JakobHenerey/scene.gltf", this.arrowCreatedCb.bind(this), MapScreen.LOADER_JOB_NAME );
        }

        this.waitForMapSelectLoad( this.runMapSelectScreen.bind(this), this );
    }

    hide() {
        this.removeMapSelectionMeshes();
        this.m_ArrowsSpinning = false;
    }

    getMapSelectionObjects() {
        return this.m_MapSelectionObjects;
    }

    handleClick( objClicked ) {
        let mapId = -1;

        if( objClicked == "mapSelectPrevArrow" ) {
            let batch = Math.trunc(this.m_MapSelectIndex / this.m_MapBatchSize);
            batch--;
            //this.m_MapSelectIndex = Math.max(0, batch * this.m_MapBatchSize);
            let prevMapIdx = Math.max(0, batch * this.m_MapBatchSize);
            this.show( prevMapIdx );
        }
        else if( objClicked == "mapSelectNextArrow" ) {
            let batch = Math.trunc(this.m_MapSelectIndex / this.m_MapBatchSize);
            batch++;

            if( batch * this.m_MapBatchSize >= this.m_MapManager.jsonMaps.length ) {
                batch--;
            }

            let nextMapIdx = batch * this.m_MapBatchSize;
            this.show( nextMapIdx );
        }
        if( objClicked > -1 ) {
            mapId = objClicked;
        }

        return mapId;
    }

    runMapSelectScreen() {

        // remove any old map meshes
        this.removeMapSelectionMeshes();

        let selectMapScreenSize = getBestSelectMapScreenWidth( this.m_DistanceFromCamera, this.m_Camera.aspect, this.m_Camera.fov );

        if( selectMapScreenSize < 17 ) {
            this.m_MapBatchSize = 1;
        }
        else if( selectMapScreenSize < 20 ) {
            this.m_MapBatchSize = 2;
        }
        else {
            this.m_MapBatchSize = 3;
        }

        let numMapsPerPage = this.m_MapBatchSize;
        if( this.m_MapManager.jsonMaps.length < this.m_MapBatchSize ) {
            numMapsPerPage = this.m_MapManager.jsonMaps.length;
        }

        let mapSpacing = selectMapScreenSize * 0.05; // 5% spacing

        let spaceForSpacing = ((numMapsPerPage+1) * mapSpacing);

        let thumbnailWidth = (selectMapScreenSize-spaceForSpacing) / numMapsPerPage;

        // camera coordinates, 0,0 is center, so need to offset
        let xOffset = -(selectMapScreenSize/2) + mapSpacing;   // .. as camera 0,0 is middle of screen
        xOffset += (thumbnailWidth/2);                         // .. as coordinates are in middle of tile
        let yOffset = 0;                                       // fine, keep it in the middle

        let currentMapOffset = Math.max(this.m_MapSelectIndex, 0);
 
        this.displayMapSet( numMapsPerPage, currentMapOffset, xOffset, thumbnailWidth, mapSpacing, this.m_DistanceFromCamera );
    }



    removeMapSelectionMeshes( ) {
        for( var i = 0; i < this.m_MapSelectionObjects.length; i++ ) {
            this.m_Camera.remove( this.m_MapSelectionObjects[i] );
        }
        this.m_MapSelectionObjects = [];

        this.m_Camera.remove( this.m_Camera.getObjectByName("mapSelectNextSpotlight") );
        this.m_Camera.remove( this.m_Camera.getObjectByName("mapSelectPrevSpotlight") );
    }

    displayMapSet( numToShow, firstId, xOffset, thumbnailWidth, mapSpacing, distanceFromCamera ) {
        let screenOrder = 0;
        let thumbnailHeight = thumbnailWidth;
        let mapY = 0;
        let batch = Math.trunc(firstId / numToShow);
        let mapIdx = numToShow*batch;
        
        let lastMapToShow = Math.min( this.m_MapManager.jsonMaps.length, (numToShow*batch)+numToShow );
        for( ; mapIdx < lastMapToShow; ++mapIdx ) {
            var mapDef = this.m_MapManager.jsonMaps[ mapIdx ];
            if( !mapDef.hasOwnProperty('thumbnailTexture') ) {
                console.log("WARNING: Map " + mapIdx + " lacks a thumbnail");
                continue;
            }

            this.addMapSelectThumbnail( mapDef, mapIdx, thumbnailWidth, thumbnailHeight, screenOrder, mapSpacing, xOffset, mapY, distanceFromCamera );
            screenOrder++;
        }

        let arrowYOffset = mapY + (thumbnailWidth/2) + this.m_ArrowHeightOffset; 

        if( lastMapToShow < this.m_MapManager.jsonMaps.length )
        {
            this.addMapSelectArrow( this.m_NextArrow, "mapSelectNextArrow", 3, -(arrowYOffset), -distanceFromCamera, 1.6 )
        }

        if( batch > 0 ) {
            this.addMapSelectArrow( this.m_PrevArrow, "mapSelectPrevArrow", -3, -(arrowYOffset), -distanceFromCamera, -1.6 )
        }
 
        // Set the arrows spinning only once per 'selectLevel' state
        if( !this.m_ArrowsSpinning ) {
            this.m_ArrowsSpinning = true;
        }

        let spotlight = new THREE.SpotLight( 0xffffff, 1, 20, Math.PI/2  );
        spotlight.position.set(this.m_NextArrow.position.x,this.m_NextArrow.position.y,0);
        spotlight.target = this.m_NextArrow;
        spotlight.name = "mapSelectNextSpotlight";
        this.m_Camera.add(spotlight);

        let prevSpotlight = new THREE.SpotLight( 0xffffff, 1, 20, Math.PI/2  );
        prevSpotlight.position.set(this.m_PrevArrow.position.x,this.m_PrevArrow.position.y,0);
        prevSpotlight.target = this.m_PrevArrow;
        prevSpotlight.name = "mapSelectPrevSpotlight";
        this.m_Camera.add(prevSpotlight);
    }


    addMapSelectThumbnail( mapDef, mapIdx, thumbnailWidth, thumbnailHeight, screenOrder, mapSpacing, xOffset, mapY, distanceFromCamera ) {

        let mapSelectGroup = new THREE.Group();

        var thumbnailTexture = mapDef.thumbnailTexture;
    
        let planeGeo = new THREE.PlaneGeometry(thumbnailWidth, thumbnailHeight);
        let material = new THREE.MeshBasicMaterial( { side:THREE.DoubleSide, map:thumbnailTexture, transparent:true, opacity:1 } );
        let thumbMesh = new THREE.Mesh(planeGeo, material);

        let mapX = (screenOrder * thumbnailWidth) + (screenOrder * mapSpacing);
        mapX += xOffset;    // center
        
        thumbMesh.position.set( mapX, mapY, -distanceFromCamera );
        thumbMesh.name = mapIdx;
        
        mapSelectGroup.add(thumbMesh);

        // Add completion awards
        let completionRate = this.m_MapManager.getCompletionRate(mapIdx);

        let spacing = 0.5;
        let awardXOffset = thumbMesh.position.x - (thumbnailWidth/2);
        let awardYOffset = thumbMesh.position.y + (thumbnailHeight/2);

        if( completionRate > 0 ) {
            let colour = 0xd9a004; // bronze
            if( completionRate >= 1 ) {
                colour = 0xdec990; // gold
            }
            else if( completionRate >= 0.5 ) {
                colour = 0xe8e5dc; // silver
            }

            const geometry = new THREE.CircleGeometry( 0.25, 16 );
            const material = new THREE.MeshStandardMaterial( { color: colour } );
            const awardMesh = new THREE.Mesh( geometry, material );
            awardMesh.position.set( awardXOffset+ spacing, awardYOffset - spacing, -(distanceFromCamera) )
            mapSelectGroup.add( awardMesh );
        }

        // Add highest score
        let highestScore = this.m_MapManager.getHighScore(mapIdx);
        let highScoreMsg = "High score: " + highestScore.toString();
        let highScoreMesh = messageToMesh(document, highScoreMsg, 0.33, 0xFFFFFF, undefined);
        let bottomOffset = thumbMesh.position.y - (thumbnailHeight/2);
        highScoreMesh.position.set( awardXOffset + (highScoreMesh.userData.width/2), bottomOffset + (highScoreMesh.userData.height/2), -10 );
        highScoreMesh.name = "highScoreMsg";
        mapSelectGroup.add(highScoreMesh);

        // Add map Id text
        let mapIdTextHeight = 0.75;
        let mapIdText = "Map " + mapIdx + ": " +  mapDef.name;
        let mapIdMsgMesh = messageToMesh(document, mapIdText, mapIdTextHeight, 0xFFFFFF, undefined);
        limitViaScale( mapIdMsgMesh, mapIdMsgMesh.userData.width, thumbnailWidth );
        mapIdMsgMesh.position.set( thumbMesh.position.x, thumbMesh.position.y+(thumbnailHeight/2)+mapIdTextHeight, -(distanceFromCamera) );
        mapIdMsgMesh.name = mapIdx;
        mapSelectGroup.add( mapIdMsgMesh );

        // Add map descriptive text
        let mapDescrTextHeight = 0.4;
        let mapDescrText = mapDef.instructions;
        let mapDescrMesh = messageToMesh(document, mapDescrText, mapDescrTextHeight, 0xFFFFFF, undefined);
        limitViaScale( mapDescrMesh, mapDescrMesh.userData.width, thumbnailWidth );
        mapDescrMesh.position.set( thumbMesh.position.x, thumbMesh.position.y-(thumbnailHeight/2)-mapDescrTextHeight, -(distanceFromCamera) );
        mapDescrMesh.name = mapIdx;
        mapSelectGroup.add( mapDescrMesh );

        this.m_MapSelectionObjects.push(mapSelectGroup);
        this.m_Camera.add(mapSelectGroup);
    }

    addMapSelectArrow( arrow, name, xPos, yPos, zPos, yRot ) {
        arrow.scale.set(0.5,0.5,0.5);
        arrow.rotation.set( 0, yRot, 0 );
        arrow.position.set( xPos, yPos, zPos );
        arrow.name = name;
        
        this.m_MapSelectionObjects.push(arrow);
        this.m_Camera.add(arrow);
    }

    arrowCreatedCb( obj ) {
        var threeGroup = obj.scene;
        var object3d  = threeGroup.getObjectByName( "OSG_Scene" );
       // this.m_Arrow = object3d;

        object3d.scale.set(0.5, 0.5, 0.5);
        object3d.rotation.set( 0, 1.6, 0 );

        this.m_ArrowHeightOffset = this.calculateArrowHeightOffset( object3d );

        // TODO - hack for now, figure out correct way to do this
        this.m_PrevArrow = object3d.clone();
        this.m_PrevArrow.children[0].children[0].children[0].children[0].name = "mapSelectPrevArrow";
        
        // TODO - hack for now, figure out correct way to do this
        this.m_NextArrow = object3d.clone();
        this.m_NextArrow.children[0].children[0].children[0].children[0].name = "mapSelectNextArrow";

        this.m_ArrowLoaded = true;
    }
    
    calculateArrowHeightOffset( arrow ) {
        let arrowHeightOffset = 0;
        arrow.traverse( function( node ) {

            if ( node.type == "Mesh" ) { //node instanceof THREE.Mesh ) {
                const box = new THREE.Box3();
                box.copy( node.geometry.boundingBox ).applyMatrix4( node.matrixWorld );
                let arrowSize = new THREE.Vector3();
                box.getSize( arrowSize );
                arrowHeightOffset = (arrowSize.y / 2);  
            }
        } );

        return arrowHeightOffset;
    }

    waitForMapSelectLoad(isCreatedCallback, context) {
        var waitForAll = setInterval(function () {
          if (context.m_ArrowLoaded == true ) {
            clearInterval(waitForAll);
            isCreatedCallback();
          }
        }, 100);
    }

}

export { MapScreen };