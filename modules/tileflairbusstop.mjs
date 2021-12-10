/**
  The Tile Flair class.

  Author: Ian Felstead
*/

"use strict";

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
        // NOOP
    }

    deactivate( gameMgr ) {
        // NOOP
    }

    doSpecial( gameMgr ) {
        // NOOP
    }
}

 export {TileFlairBusStop};
