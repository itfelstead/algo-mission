/**
  The Tile Flair class.

  Author: Ian Felstead
*/

"use strict";

/**
 * @namespace The algo-mission namespace
 */
 var ALGO = ALGO || {};

class TileFlair {

    /**
     * constructor
     * @class The Tile Flair class. Represents an individual tile flair item.
     *
    */
     constructor( flairName, flairType, flairMesh ) {
        this.m_Name = flairName;
        this.m_FlairMesh = flairMesh;
        this.m_FlairMesh.name = this.m_Name;

        this.m_Type = flairType;
    }

    getMesh() {
        return this.m_FlairMesh;
    }

    getName() {
        return this.m_Name;
    }

    trigger() {
        // animate?
    }
}

 export {TileFlair};
