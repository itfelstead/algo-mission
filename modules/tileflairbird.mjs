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

    static TBirdState = {
        INITIAL: 1,
        READY: 2,
        HELLO_BOT: 3,
        GOODBYE_BOT: 4,
        GONE: 5,
        DOING_SPECIAL: 6
    };

    /**
     * constructor
     * @class The Bus Stop Tile Flair class. Represents an individual tile flair item.
     *
    */
     constructor( flairName, flairMesh, gltf, gameMgr ) {
        this.m_Name = flairName;
        this.m_Gltf = gltf;
        this.m_FlairMesh = flairMesh;
        this.m_GameMgr = gameMgr;

        this.m_FlairMesh.visible = true;
        this.m_FlairMesh.name = this.m_Name;
        
        this.m_SpecialTriggered = false;
        this.m_DoneSpecial = false;

        this.m_Mixer = null;
        this.m_AnimAction = null;
        this.m_FlownAway = false;

        this.m_State = TileFlairBird.TBirdState.INITIAL;
    }

    getMesh() {
        return this.m_FlairMesh;
    }

    getName() {
        return this.m_Name;
    }

    activate() {
        this.m_BotPresentOnTile = true;
    }

    deactivate() {
        this.m_BotPresentOnTile = false;
    }

    update( timeElapsed ) {

        this.actOnState();
        this.updateState();

        if( this.m_Mixer ) {
            this.m_Mixer.update( timeElapsed );
        }
    }

    actOnState( ) {

        switch (this.m_State) {
            case TileFlairBird.TBirdState.INITIAL:
                // NOOP
                break;
            case TileFlairBird.TBirdState.READY:
                    // TODO - maybe play a little fast flap randomly every not wan then?
                break;
            case TileFlairBird.TBirdState.HELLO_BOT:
                // NOOP
                break;
            case TileFlairBird.TBirdState.GOODBYE_BOT:
                // NOOP
                break;
            case TileFlairBird.TBirdState.GONE:
                break;
            case TileFlairBird.TBirdState.DOING_SPECIAL:
                this.m_DoneSpecial = true;
                this.runHappyBirdAnim();
                this.flap();
                this.m_GameMgr.updateScore( 5000 );
                break;
        }
    }

    updateState() {
        var newState = this.m_State;

        if( this.m_FlownAway ) {
            newState = TileFlairBird.TBirdState.GONE;
        }
        else {
            switch (this.m_State) {
                case TileFlairBird.TBirdState.INITIAL:
                    newState = TileFlairBird.TBirdState.READY;
                    break;
                case TileFlairBird.TBirdState.READY:
                    if( this.m_BotPresentOnTile ) {
                        newState = TileFlairBird.TBirdState.HELLO_BOT;
                    }
                    break;
                case TileFlairBird.TBirdState.HELLO_BOT:
                    if( !this.m_BotPresentOnTile ) {
                        newState = TileFlairBird.TBirdState.GOODBYE_BOT;
                    }
                    else {
                        if( this.m_SpecialTriggered == true && !this.m_DoneSpecial ) {
                            newState = TileFlairBird.TBirdState.DOING_SPECIAL;
                        } 
                    }
                    break;
                case TileFlairBird.TBirdState.GOODBYE_BOT:
                    if( this.m_BotPresentOnTile ) {
                        newState = TileFlairBird.TBirdState.HELLO_BOT;
                    }
                    break;
                case TileFlairBird.TBirdState.GONE: 
                    // NOOP - gone forever, no state change
                    break;

               case TileFlairBird.TBirdState.DOING_SPECIAL:
                    // return to the hello state immediately - actoOn will have handled the special activation
                    newState = TileFlairBird.TBirdState.HELLO_BOT;
                    break;
            }
        }

        // Change state if required
        if (this.m_State != newState) {
            console.log("Bird State changing from " + this.m_State + " to " + newState);
            this.onExitState();
            this.m_State = newState;
            this.onEnterState();
        }
    }

    onEnterState( ) {

        switch (this.m_State) {
            case TileFlairBird.TBirdState.INITIAL:
                // NOOP
                break;
            case TileFlairBird.TBirdState.READY:
                // NOOP
                break;
            case TileFlairBird.TBirdState.HELLO_BOT:
                // NOOP
                break;
            case TileFlairBird.TBirdState.GOODBYE_BOT:
                    // if we aren't gone, then the bot has tried to run us over!
                    let camera = this.m_GameMgr.getCamera();
                    let targetPos = camera.position;
                    this.runAngryBirdAnim( targetPos );
                    this.flap();
                    this.m_GameMgr.updateScore( -100 );
                break;
            case TileFlairBird.TBirdState.GONE:
                break;
        }
    }

    onExitState( ) {

        switch (this.m_State) {
            case TileFlairBird.TBirdState.INITIAL:
                // NOOP
                break;
            case TileFlairBird.TBirdState.READY:
                // NOOP
                break;
            case TileFlairBird.TBirdState.HELLO_BOT:
                // NOOP
                break;
            case TileFlairBird.TBirdState.GOODBYE_BOT:
                // NOOP
                break;
            case TileFlairBird.TBirdState.GONE:
                break;
        }
    }

    doSpecial( gameMgr ) {
        if( this.m_SpecialTriggered == false ) {
            this.m_SpecialTriggered = true;
        }
    }

    flap() {
        if( this.m_Mixer == null ) {
            this.m_Mixer = new THREE.AnimationMixer(this.m_FlairMesh);
            const clips = this.m_Gltf.animations;
            const clip = THREE.AnimationClip.findByName( clips, 'Take 001' );
            this.m_AnimAction = this.m_Mixer.clipAction( clip );
        }
        if( !this.m_AnimAction.isRunning() ) {
            this.m_AnimAction.play();
        }
    }

    runHappyBirdAnim() {
        let animDelayMs = 10;
        let finalY = 600;
        let flyStep = 0.5;
        let instance = this;
        (function animateBirdFly() {
            instance.m_FlownAway = true;
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
        let maxFlightTimeMs = 2000;     // Hit target in # milliseconds of flight
        let animDelayMs = 10;
        let numFlySteps = maxFlightTimeMs/animDelayMs;
        let tStep = 1 / numFlySteps;
        let t = 0;  // complete when t = 1

        let targetYRot = 3; 

        let instance = this;
        (function animateBirdAttack() {
            instance.m_FlownAway = true;
            if( t < 1 ) {
                t = t + tStep;
                let newX = instance.lerp( instance.m_FlairMesh.position.x, targetPos.x, tStep );
                let newY = instance.lerp( instance.m_FlairMesh.position.y, targetPos.y, tStep );
                let newZ = instance.lerp( instance.m_FlairMesh.position.z, targetPos.z, tStep );
                
                instance.m_FlairMesh.position.set( newX, newY, newZ );

                // turn to attack camera
                if(instance.m_FlairMesh.rotation.y < targetYRot ) {
                    instance.m_FlairMesh.rotation.y += 0.1;
                }
               
                setTimeout(animateBirdAttack, animDelayMs);
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

export {TileFlairBird};
