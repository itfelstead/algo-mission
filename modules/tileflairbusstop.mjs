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

class TileFlairBusStop {

    /**
     * constructor
     * @class The Bus Stop Tile Flair class. Represents an individual tile flair item.
     *
    */
     constructor( flairName, flairMesh, gameMgr ) {
        this.m_Name = flairName;
        this.m_FlairMesh = flairMesh;
        this.m_FlairMesh.name = this.m_Name;
        this.m_GameMgr = gameMgr;
    }

    getMesh() {
        return this.m_FlairMesh;
    }

    getName() {
        return this.m_Name;
    }

    activate() {
        // NOOP
    }

    deactivate() {
        // NOOP
    }

    update( timeElapsed ) {

    }

    doSpecial( instruction ) {
        // NOOP
    }
}

 export {TileFlairBusStop};
