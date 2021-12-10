/**
  The Tile Flair class.

  Author: Ian Felstead
*/

"use strict";

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
     constructor( flairName, flairMesh ) {
        this.m_Name = flairName;
        this.m_FlairMesh = flairMesh;
        this.m_FlairMesh.name = this.m_Name;
    }

    getMesh() {
        return this.m_FlairMesh;
    }

    getName() {
        return this.m_Name;
    }

    activate( gameMgr ) {
        let bot = gameMgr.getBot();
        let targetPos = bot.mesh.position;
        this.runBoardingAnim( targetPos );
    }

    deactivate( gameMgr ) {
        // NOOP
    }

    doSpecial( gameMgr ) {
        // NOOP
    }

    runBoardingAnim( targetPos ) {
        let maxAnimTimeMs = 2000;     // Hit target in 2 seconds of flight
        let animDelayMs = 10;
        let numSteps = maxAnimTimeMs/animDelayMs;
        let tStep = 1 / numSteps;
        let t = 0;  // complete when t = 1

        let instance = this;
        (function animateLadyBoarding() {
            if( t < 1 ) {
                t = t + tStep;
                let newX = instance.lerp( instance.m_FlairMesh.position.x, targetPos.x, t );
                let newY = instance.lerp( instance.m_FlairMesh.position.y, targetPos.y, t );
                let newZ = instance.lerp( instance.m_FlairMesh.position.z, targetPos.z, t );
                
                instance.m_FlairMesh.position.set( newX, newY, newZ );
               
                setTimeout(animateLadyBoarding, animDelayMs);
            }
        })();
    }

    lerp( a, b, t ) {
        return a + (b-a) * t;
    }
}

 export {TileFlairLady};
