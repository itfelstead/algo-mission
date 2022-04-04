/**
    DeathScreen

    Author: Ian Felstead
*/

"use strict";

// Global Namespace
var ALGO = ALGO || {};

import { getFov, getAspect, getBestSelectMapScreenWidth, messageToMesh, limitViaScale } from './algoutils.js'; 	        // utility functions

class DeathScreen {

    constructor( camera, renderer ) {
        this.m_RetryButtonObjects = [];

        this.m_Camera = camera;
        this.m_Renderer = renderer;
        this.m_DistanceFromCamera = 10;

        this.m_ScreenFinished = true;
    }

    show() {
        this.m_ScreenFinished = false;
        this.displayDeathScreen();
        
    }

    hide() {
        this.removeRetryButtons();
        this.m_ScreenFinished = true;
    }

    removeRetryButtons() {
        for( var i = 0; i < this.m_RetryButtonObjects.length; i++ ) {
            this.m_Camera.remove( this.m_RetryButtonObjects[i] );
        }
        this.m_RetryButtonObjects = [];
    }

    update() {
        // NOOP
    }
    
    getActiveObjects() {
        return this.m_RetryButtonObjects;
    }

    isFinished() {
        return this.m_ScreenFinished;
    }

    displayDeathScreen() {

        let screenWidth = getBestSelectMapScreenWidth(this.m_DistanceFromCamera, getAspect(this.m_Renderer,this.m_Camera), getFov(this.m_Renderer,this.m_Camera));
        let halfScreen = (screenWidth/2);    // as it is 0 centered
        let maxButtonWidth = screenWidth/4;
        let textHeight = 1;

        let retryMesh = messageToMesh(document, "Try again?", textHeight, 0xFFFFFF, undefined);
        retryMesh.name = "retryButton";
        limitViaScale( retryMesh, retryMesh.userData.width, maxButtonWidth );
        let retryScale = retryMesh.scale.x;
        let chooseMapMesh = messageToMesh(document, "Choose map", textHeight, 0xFFFFFF, undefined);
        chooseMapMesh.name = "chooseMapButton";
        limitViaScale( chooseMapMesh, chooseMapMesh.userData.width, maxButtonWidth );
        let chooseScale = chooseMapMesh.scale.x;

        let retryActualSize = retryMesh.userData.width*retryScale;
        let retryXPos = ((halfScreen - retryActualSize) / 2) + (retryActualSize/2); 

        retryMesh.position.set( -retryXPos, 0, -this.m_DistanceFromCamera );

        let chooseActualSize = chooseMapMesh.userData.width*chooseScale;
        let chooseXPos = ((halfScreen - chooseActualSize) / 2) + (chooseActualSize/2); 
        chooseMapMesh.position.set( chooseXPos, 0, -this.m_DistanceFromCamera );

        this.m_RetryButtonObjects.push(retryMesh);
        this.m_RetryButtonObjects.push(chooseMapMesh);

        this.m_Camera.add(retryMesh);
        this.m_Camera.add(chooseMapMesh);
    }
}

export { DeathScreen };