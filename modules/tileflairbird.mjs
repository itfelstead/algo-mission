/**
  The Tile Flair class.

  Author: Ian Felstead
*/

"use strict";

import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports,min/optimized/three.js';
import { AlgoMission } from "../algomission.mjs";

/**
 * @namespace The algo-mission namespace
 */
 var ALGO = ALGO || {};

class TileFlairBird {

    /**
     * constructor
     * @class The Bus Stop Tile Flair class. Represents an individual tile flair item.
     *
    */
     constructor( flairName, flairMesh ) {
        this.m_Name = flairName;
        this.m_FlairMesh = flairMesh;
        this.m_FlairMesh.visible = true;
        this.m_FlairMesh.name = this.m_Name;

        this.m_SpecialTriggered = false;
    }

    getMesh() {
        return this.m_FlairMesh;
    }

    getName() {
        return this.m_Name;
    }

    activate( gameMgr ) {
        // NOOP
    }

    deactivate( gameMgr ) {
        if( this.m_SpecialTriggered == false ) {
            let camera = gameMgr.getCamera();
            let targetPos = camera.position;
            this.runAngryBirdAnim( targetPos );
            this.m_SpecialTriggered = true;

            gameMgr.updateScore( -100 );
        }
    }

    doSpecial( gameMgr ) {
        if( this.m_SpecialTriggered == false ) {

            this.m_SpecialTriggered = true;
            this.runHappyBirdAnim();

            gameMgr.updateScore( 5000 );
        }
    }

    runHappyBirdAnim() {
        let animDelayMs = 10;
        let finalY = 600;
        let flyStep = 0.5;
        let instance = this;
        (function animateBirdFly() {
            if( instance.m_FlairMesh.position.y < finalY ) {
                instance.m_FlairMesh.position.y = instance.m_FlairMesh.position.y + flyStep;
                instance.m_FlairMesh.position.x = instance.m_FlairMesh.position.x + flyStep/2;
                setTimeout(animateBirdFly, animDelayMs);
            }
            else
            {
                instance.m_FlairMesh.visible = false;
            }
        })();
    }

    runAngryBirdAnim( targetPos ) {
        let maxFlightTimeMs = 3000;     // Hit target in 2 seconds of flight
        let animDelayMs = 10;
        let numFlySteps = maxFlightTimeMs/animDelayMs;
        let tStep = 1 / numFlySteps;
        let t = 0;  // complete when t = 1

        let instance = this;
        (function animateBirdAttack() {
            if( t < 1 ) {
                t = t + tStep;
                let newX = instance.lerp( instance.m_FlairMesh.position.x, targetPos.x, t );
                let newY = instance.lerp( instance.m_FlairMesh.position.y, targetPos.y, t );
                let newZ = instance.lerp( instance.m_FlairMesh.position.z, targetPos.z, t );
                
                instance.m_FlairMesh.position.set( newX, newY, newZ );
               
                setTimeout(animateBirdAttack, animDelayMs);
            }
        })();
    }

    lerp( a, b, t ) {
        return a + (b-a) * t;
    }
}

export {TileFlairBird};
