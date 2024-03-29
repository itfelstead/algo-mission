/**
    ScoreManager

    Author: Ian Felstead
*/

"use strict";

import * as THREE from 'three';

import { AlgoMission } from '../algomission.mjs'; 	// for observer notification types
import { limitViaScale, getScreenHeightAtCameraDistance, getScreenWidthAtCameraDistance } from './algoutils.js'; 	        // utility functions


// Global Namespace
var ALGO = ALGO || {};

class ScoreManager {

    constructor( mapManager ) {
        this.m_TotalScore = 0;
        this.m_ScoreMesh = null;
        this.m_ScoreCanvas = null;
        this.m_ScoreLoaded = false;

        mapManager.registerObserver(this);  // for score updates
    }

    createScore( camera ) {
        if( this.m_ScoreMesh == null ) {
            const wideDummyText = "---------------";
            this.createScoreMesh( wideDummyText, 1.25, 0xffffff, 0x000000);
            
            const distanceFromCamera = 10;
            const screenHeight = getScreenHeightAtCameraDistance(distanceFromCamera, camera.fov);
            const screenWidth = getScreenWidthAtCameraDistance( distanceFromCamera, screenHeight, camera.aspect );
            const maxWidth = screenWidth/5;

            limitViaScale( this.m_ScoreMesh, this.m_ScoreMesh.userData.width, maxWidth );

            const xPos = (screenWidth/2) - (this.m_ScoreMesh.userData.width*this.m_ScoreMesh.scale.x)/2;
            const yPos = (screenHeight/2) - (this.m_ScoreMesh.userData.height*this.m_ScoreMesh.scale.y)/2;
            this.m_ScoreMesh.position.set( xPos, yPos, -distanceFromCamera );
            this.m_ScoreMesh.name = "scoreMsg";
            
            this.resetScore();
        }
    }

    showScore( camera ) {
        camera.add(this.m_ScoreMesh);
    }

    hideScore( camera ) {
        camera.remove(this.m_ScoreMesh);
    }

    updateTriggered(notificationType, notificationValue) {
        switch( notificationType ) {
            case AlgoMission.TNotificationType.SCORE_CHANGE:
                this.updateScore( notificationValue );
            break;
        }
    }

    updateScore( delta ) {
        this.m_TotalScore = this.m_TotalScore + delta;

        let update = this.m_TotalScore.toString();
        this.updateScoreCanvas(update, 1.25, 0xffffff, 0x000000);

        if( delta < 0 ) {
            // TODO short sad sound?
        }
        else {
            // TODO short happy sound?
        }
    }

    getScore() {
        return this.m_TotalScore;
    }

    resetScore() {
        this.m_TotalScore = 0;
        let update = this.m_TotalScore.toString();
        this.updateScoreCanvas(update, 1.25, 0xffffff, 0x000000);
    }

    createScoreMesh( msg, msgHeight, fgColour, optionalBgColour ) {
        this.m_ScoreCanvas = document.createElement("canvas");
        let context = this.m_ScoreCanvas.getContext("2d");
        context.font = "40px sans-serif"; 
        let border = 0.25;

        let worldMultiplier = msgHeight/40;     // i.e. font size
        let msgWidth = (context.measureText(msg).width * worldMultiplier) + border;
        let totalWidth = Math.ceil( msgWidth/ worldMultiplier);
        let totalHeight = Math.ceil( (msgHeight+border) / worldMultiplier);
        this.m_ScoreCanvas.width = totalWidth;
        this.m_ScoreCanvas.height = totalHeight;

        if (optionalBgColour != undefined) {
            context.fillStyle = "#" + optionalBgColour.toString(16).padStart(6, '0');
            context.fillRect( 0,0, totalWidth,totalHeight);
        }

        context.textAlign = "center";
        context.textBaseline = "middle"; 
        context.fillStyle = "#" + fgColour.toString(16).padStart(6, '0');
        context.font = "40px sans-serif"; 
        context.fillText(msg, totalWidth/2, totalHeight/2);

        let texture = new THREE.Texture(this.m_ScoreCanvas);
        texture.minFilter = THREE.LinearFilter;
        texture.needsUpdate = true;

        let planeGeo = new THREE.PlaneGeometry(msgWidth, (msgHeight+border) );
        let material = new THREE.MeshBasicMaterial( { side:THREE.DoubleSide, map:texture, transparent:true, opacity:1.0 } );
        this.m_ScoreMesh = new THREE.Mesh(planeGeo, material);
        this.m_ScoreMesh.ctx = context; 
        this.m_ScoreMesh.wPxAll = totalWidth;
        this.m_ScoreMesh.hPxAll = totalHeight;
        this.m_ScoreMesh.userData.width = msgWidth;
        this.m_ScoreMesh.userData.height = (msgHeight+border);
    }

    updateScoreCanvas( msg, msgHeight, fgColour, optionalBgColour ) {

        this.m_ScoreMesh.material.map.needsUpdate = true;

        this.m_ScoreMesh.ctx.fillStyle = "#000000"; 
        this.m_ScoreMesh.ctx.fillRect( 0, 0, this.m_ScoreMesh.wPxAll, this.m_ScoreMesh.hPxAll );
        this.m_ScoreMesh.ctx.fillStyle = "#ffffff"; 
        this.m_ScoreMesh.ctx.fillText(msg,this.m_ScoreMesh.wPxAll/2, this.m_ScoreMesh.hPxAll/2);
    }

}

export { ScoreManager };