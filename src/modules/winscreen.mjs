/**
    WinScreen

    Author: Ian Felstead
*/

"use strict";

// Global Namespace
var ALGO = ALGO || {};

import * as THREE from 'three';

import { getFov, getAspect, calculateMeshHeight, messageToMesh, limitViaScale, getScreenHeightAtCameraDistance, getScreenWidthAtCameraDistance } from './algoutils.js'; 	        // utility functions

class WinScreen {

    static BUTTON_REVEAL_DELAY_SEC = 4;

    static TROPHY_MODEL = "./models/Trophy_SyntyStudios/scene.gltf";
    static WIN_AUDIO = "audio/462362__breviceps__small-applause.wav";
    static TROPHY_JOB = "trophy";
    static WIN_AUDIO_JOB = "winner audio";

    constructor( renderer, camera, audioListener, loadingManager ) {

        this.m_LoadingManager = loadingManager;

        //this.m_ScreenObjects = [];

        this.m_Renderer = renderer;
        this.m_Camera = camera;
        this.m_DistanceFromCamera = 10;

        this.m_AudioListener = audioListener;
        this.m_WinnerSound = new THREE.Audio(this.m_AudioListener);
        this.m_Camera.add(this.m_WinnerSound);  // Note: actual sound buffer is yet to be loaded

        // Winner
        this.m_Trophy = null;

        this.m_ButtonRevealCountdown = 0;

        this.m_ShowTriggered = false;
    }

    show() {
        this.m_WinScreenFinished = false;
        this.load();        // (if required)
        this.m_ShowTriggered = true;
        this.m_HideTriggered = false;
        
    }

    load() {
        if( !this.m_LoadingManager.jobExists(WinScreen.TROPHY_JOB) ) {
            this.m_LoadingManager.loadModel( WinScreen.TROPHY_MODEL, this.trophyCreatedCb.bind(this), WinScreen.TROPHY_JOB );
        }
        if( !this.m_LoadingManager.jobExists(WinScreen.WIN_AUDIO_JOB) ) {
            this.m_LoadingManager.loadAudio( WinScreen.WIN_AUDIO, this.audioCreatedCb.bind(this), WinScreen.WIN_AUDIO_JOB  )
        }
    }

    trophyCreatedCb( obj ) {
        var threeGroup = obj.scene;
        var object3d  = threeGroup.getObjectByName( "OSG_Scene" );
        this.m_Trophy = object3d;
    }

    audioCreatedCb( audioBuffer ) {
        this.m_WinnerSound.setBuffer(audioBuffer);
    }

    hide() {

        this.m_HideTriggered = true;

        let missionMsg = this.m_Camera.getObjectByName("newMissionMsg");
        if( missionMsg ) {
            this.m_Camera.remove( missionMsg );
        }

        let wellDoneMsg = this.m_Camera.getObjectByName("wellDoneMsg");
        if( wellDoneMsg ) {
            this.m_Camera.remove( wellDoneMsg );
        }
    }

    isFinished() {
        return this.m_WinScreenFinished;
    }

    // Called each tick by main game loop
    update( timeElapsedInSeconds ) {

        // when triggered, only display the screen when all assets are in place
        if( this.m_ShowTriggered == true ) {
            if( this.m_LoadingManager.loadComplete( [ "trophy", "winner audio" ] ) == true ) {
                this.showWinnerScreen();
                this.m_ShowTriggered = false;
            }
        }
        else if( this.m_HideTriggered == true ) {
            // Zoom away, then remove
            const finalZ = 1;
            const zoomStep = 0.6;
            if( this.m_Trophy.position.z < finalZ  ) {
                this.m_Trophy.position.z = this.m_Trophy.position.z + zoomStep;
            }
            else {
                this.m_HideTriggered = false;
                this.m_Camera.remove(this.m_Trophy);

                let trophySpotlight = this.m_Camera.getObjectByName("trophySpotlight");
                if( trophySpotlight ) {
                    this.m_Camera.remove(trophySpotlight);
                }

                this.m_WinScreenFinished = true;
            }
        }
        else {

            if( this.m_Trophy ) {
                const finalZ = -5;
                const zoomStep = 0.3;
                const rotateStep = 0.03;
                // Trophy zoom anim:
                if( this.m_Trophy.position.z > finalZ ) {
                    this.m_Trophy.position.z = this.m_Trophy.position.z - zoomStep;
                }

                // trophy spin anim:
                this.m_Trophy.rotation.y = this.m_Trophy.rotation.y - rotateStep;
            }

            // button reveal:
            if( this.m_ButtonRevealCountdown > 0 ) {   
                this.m_ButtonRevealCountdown -= timeElapsedInSeconds;
                if( this.m_ButtonRevealCountdown <= 0 ) {
                    // Time to show the options
                    let newMissionMsg = this.m_Camera.getObjectByName("newMissionMsg");
                    if( newMissionMsg ) {
                        newMissionMsg.visible = true;
                    }
                }
            }
        }
    }
    
    showWinnerScreen() {
 
        this.m_ButtonRevealCountdown = WinScreen.BUTTON_REVEAL_DELAY_SEC;

        this.m_WinnerSound.play();

        let startZ = 1;
        this.m_Trophy.position.set( 0, -1, startZ );     // note; start behind camera (Z) for later zoom
        this.m_Camera.add(this.m_Trophy);

        let trophySpotlight = new THREE.SpotLight( 0xffffff, 1, 10 );
        trophySpotlight.position.set(0,0,1);
        trophySpotlight.target = this.m_Trophy;
        trophySpotlight.name = "trophySpotlight";
        this.m_Camera.add(trophySpotlight);
        
        const trophyHeight = calculateMeshHeight( this.m_Trophy );

		const screenHeight = getScreenHeightAtCameraDistance( this.m_DistanceFromCamera, getFov(this.m_Renderer,this.m_Camera) );
        const screenWidth = getScreenWidthAtCameraDistance( this.m_DistanceFromCamera, screenHeight, getAspect(this.m_Renderer,this.m_Camera) );

        let messageMesh = messageToMesh(document, "Well done!", 1.25, 0xFFFFFF, undefined);
        messageMesh.name = "wellDoneMsg";
        limitViaScale( messageMesh, messageMesh.userData.width, screenWidth );
        messageMesh.position.set( 0, -(trophyHeight + (messageMesh.userData.height/2)), -this.m_DistanceFromCamera );
        this.m_Camera.add(messageMesh);

        let newMissionMesh = messageToMesh(document, "(click mouse for a new mission)", 1, 0xDDDDDD, undefined);
        newMissionMesh.name = "newMissionMsg";
        limitViaScale( newMissionMesh, newMissionMesh.userData.width, screenWidth );
        newMissionMesh.position.set( 0, messageMesh.position.y - (messageMesh.userData.height/2) - newMissionMesh.userData.height, -this.m_DistanceFromCamera );
        newMissionMesh.visible = false;
        this.m_Camera.add(newMissionMesh);  // will show after a delay; see update()
    }

}

export { WinScreen };