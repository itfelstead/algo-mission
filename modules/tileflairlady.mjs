/**
  The Tile Flair class.

  Author: Ian Felstead
*/

"use strict";

import { InstructionManager } from './instructionmanager.mjs';

/**
 * @namespace The algo-mission namespace
 */
 var ALGO = ALGO || {};

class TileFlairLady {

    /**
     * constructor
     * @class The Lady Tile Flair class. Represents an individual tile flair item.
     *
    */
     constructor( flairName, flairMesh, gameMgr ) {
        this.m_Name = flairName;
        this.m_FlairMesh = flairMesh;
        this.m_FlairMesh.visible = true;
        this.m_FlairMesh.name = this.m_Name;
        this.m_GameMgr = gameMgr;
        this.m_BoardingTriggered = false;
    }

    getMesh() {
        return this.m_FlairMesh;
    }

    getName() {
        return this.m_Name;
    }

    activate() {
        // NOOP - perhaps lady tracks bus? 
    }

    deactivate() {
        // NOOP - perhaps angry if bus didn't pick her up?
    }

    doSpecial( instruction ) {
        if( instruction == InstructionManager.instructionConfig.PAUSE && 
            this.m_BoardingTriggered == false ) {

            this.m_BoardingTriggered = true;
            let bot = this.m_GameMgr.getBot();
            let targetPos = bot.mesh.position;
            this.runBoardingAnim( targetPos );
    
            this.m_GameMgr.m_MapManager.registerFlairSuccess( 1000, true );
        }
       // else if( instruction == InstructionManager.instructionConfig.FIRE ) {
            // eek -100 points
       // }


    }

    update( timeElapsed ) {

    }

    runBoardingAnim( targetPos ) {
        let maxAnimTimeMs = 2000;     // Hit target in 2 seconds
        let animDelayMs = 10;
        let numSteps = maxAnimTimeMs/animDelayMs;
        let tStep = 1 / numSteps;
        let t = 0;  // complete when t = 1

        let instance = this;
        (function animateLadyBoarding() {
            if( t < 1 ) {
                t = t + tStep;
                let newX = instance.lerp( instance.m_FlairMesh.position.x, targetPos.x, tStep );
                let newY = instance.lerp( instance.m_FlairMesh.position.y, targetPos.y, tStep );
                let newZ = instance.lerp( instance.m_FlairMesh.position.z, targetPos.z, tStep );
                
                instance.m_FlairMesh.position.set( newX, newY, newZ );
               
                setTimeout(animateLadyBoarding, animDelayMs);
            }
            else {
                instance.m_FlairMesh.visible = false;
            }

        })();
    }

    lerp( a, b, t ) {
        return a + (b-a) * t;
    }
}

 export {TileFlairLady};
