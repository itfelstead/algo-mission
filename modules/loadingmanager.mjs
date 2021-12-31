/**
    LoadingManager

    Author: Ian Felstead
*/

"use strict";

// Global Namespace
var ALGO = ALGO || {};

import { AlgoMission } from '../algomission.mjs'; 	// for stuff that should really be in a utils class

class LoadingManager {

    constructor( gameMgr, jobs ) {
        this.m_GameMgr = gameMgr;

        this.m_JobMonitor = [];
        this.addJobMonitors( jobs );
    }

    addJobMonitors( jobs ) {
        for (let i = 0; i < jobs.length; ++i ) {
            this.addJobMonitor( jobs[i] );
        }
    }

    addJobMonitor( resource ) {
        if( this.m_JobMonitor.hasOwnProperty(resource) ) {
            console.log("Warning: Job already present; " + resource );
        }
        this.m_JobMonitor[resource] = false;
    }

    markJobComplete( resource ) {
        if( this.m_JobMonitor.hasOwnProperty(resource) ) {
            this.m_JobMonitor[resource] = true;
        }
        else {
            console.log("Warning: Job not present; " + resource );
        }
    }

    loadComplete( jobs ) {
        for (let i = 0; i < jobs.length; ++i ) {
            if( this.isLoaded( jobs[i] ) == false ) {
                return false;
            }
        }
        return true;
    }

    isLoaded( job ) {
        if( this.m_JobMonitor.hasOwnProperty(job) ) {
            return this.m_JobMonitor[job];
        }
        console.log("Warning: Job not found; " + job );
        return false;
    }

    displayLoadingScreen() {

        let distanceFromCamera = 10;
        const screenHeight = this.m_GameMgr.getScreenHeightAtCameraDistance( distanceFromCamera );
        const screenWidth = this.m_GameMgr.getScreenWidthAtCameraDistance( distanceFromCamera, screenHeight );

        let loadingMsgMesh = this.m_GameMgr.messageToMesh("Loading...", 1.25, 0xFFFFFF, undefined);
        
        loadingMsgMesh.position.set( -(loadingMsgMesh.userData.width/2), (screenHeight/2) - loadingMsgMesh.userData.height/2, -distanceFromCamera );  // top, middle
        loadingMsgMesh.name = "loadingMsgMesh";
        this.m_GameMgr.getCamera().add(loadingMsgMesh);

    }

    removeLoadingScreen() {
        let loadingMsgMesh = this.m_GameMgr.getCamera().getObjectByName("loadingMsgMesh");
        if( loadingMsgMesh ) {
            this.m_GameMgr.getCamera().remove( loadingMsgMesh );
        }

        /*
        var fadeStep = 0.05;
        var fadePauseMs = 100;
        var fade = 1.0;

        // setting html to '' also tells the progress bar to finish
        document.getElementById("loadingScreen").innerHTML = "";

        (function fadeDivs() {
            document.getElementById("loadingScreen").style.opacity = fade;

            fade -= fadeStep;
            if (fade > 0) {
                setTimeout(fadeDivs, fadePauseMs);
            }
            else {
                document.getElementById("loadingScreen").remove();
            }
        })();
        */
    }
}

export { LoadingManager };