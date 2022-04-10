/**
	The ControlPanel class.

	Author: Ian Felstead
*/

"use strict";

/**
 * @namespace The algo-mission namespace
 */
var ALGO = ALGO || {};

import * as THREE from 'three';

import { InstructionManager } from './instructionmanager.mjs';
import { limitViaScale, getFov, getAspect, getScreenHeightAtCameraDistance, getScreenWidthAtCameraDistance, calculateMeshDimensions } from './algoutils.js'; 	        // utility functions

class ControlPanel {

	/**
	* constructor
	* @class The ControlPanel class.
	*/
	constructor( camera, renderer ) {
		this.m_ControlPanelGroup = null
		this.m_DistanceFromCamera = 10;
		this.m_NumButtonsToCreate = 0;
		this.m_Camera = camera;
		this.m_Renderer = renderer;
	}

	/**
	* update()
	*
	*
	*/
	update(timeElapsed) {
		// NOOP - any animation?
	}
	
	/**
	* createControlPanel()
	*
	*
	*/
	createControlPanel( loadingManager ) {

		if( this.m_ControlPanelGroup != null ) {
			console.log("Warning: control panel already exists");
			return;
		}

		// Layout is something like this (x grows left, y grows up)
		//
		//                 [forward]
		//           [left] [pause] [right]
		//    [fire]        [back]
		//           [clear][grid][go]
		//
		const defaultZ = 1;
		var panelConfig = [
			{ "id": InstructionManager.instructionConfig.FORWARD, "x": 1, "y": 3, "z": defaultZ, "pic": "Up256.png" },
			{ "id": InstructionManager.instructionConfig.BACK, "x": 1, "y": 1, "z": defaultZ, "pic": "Back256.png" },
			{ "id": InstructionManager.instructionConfig.LEFT, "x": 2, "y": 2, "z": defaultZ, "pic": "Left256.png" },
			{ "id": InstructionManager.instructionConfig.RIGHT, "x": 0, "y": 2, "z": defaultZ, "pic": "Right256.png" },
			{ "id": InstructionManager.instructionConfig.CLEAR, "x": 2, "y": 0, "z": defaultZ, "pic": "Clear256.png" },
			{ "id": InstructionManager.instructionConfig.GRID, "x": 1, "y": 0, "z": defaultZ, "pic": "Grid256.png" },
			{ "id": InstructionManager.instructionConfig.GO, "x": 0, "y": 0, "z": defaultZ, "pic": "Go256.png" },
			{ "id": InstructionManager.instructionConfig.FIRE, "x": 3, "y": 1, "z": defaultZ, "pic": "Fire256.png" },
			{ "id": InstructionManager.instructionConfig.PAUSE, "x": 1, "y": 2, "z": defaultZ, "pic": "Stop256.png" }
		];

		this.m_ControlPanelGroup = new THREE.Group();

		this.m_NumButtonsToCreate = panelConfig.length;

		this.createButtons( panelConfig, loadingManager );
		this.positionPanelOnLoad( panelConfig, loadingManager );
	}

	createButtons( panelConfig, loadingManager ) {
		for (var i = 0; i < panelConfig.length; i++) {
			var buttonConfig = panelConfig[i];
			var picture = buttonConfig.pic;

			loadingManager.loadTexture( "textures/" + picture, 
										this.textureLoadedCb.bind(this, buttonConfig), 
										picture ); 
		}
	}

	textureLoadedCb( buttonConfig, texture ) {

		var boxSize = 1; 	// for display size is irrelevant as FoV will alter to fill window
		var gridSize = 4; 	// panel buttons are placed on a 4x4 grid
		var stepSize = boxSize * 1.25;
		var gridOffset = (-(gridSize * stepSize) / 2) + (boxSize / 2);

		var buttonGeo = new THREE.PlaneGeometry(boxSize,boxSize);
		var buttonMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent:true, opacity:1.0 });
		var buttonMesh = new THREE.Mesh(buttonGeo, buttonMaterial);
		buttonMesh.name = buttonConfig.id;
		buttonMesh.position.set(-(gridOffset + (buttonConfig.x * stepSize)), gridOffset + (buttonConfig.y * stepSize), 0);
		
		this.m_ControlPanelGroup.add( buttonMesh );

		--this.m_NumButtonsToCreate;
	}

	positionPanelOnLoad( panelConfig, loadingManager ) {
		if( this.m_NumButtonsToCreate > 0 ) {
			setTimeout(this.positionPanelOnLoad.bind(this, panelConfig, loadingManager), 33);
		}
		else {
			this.updatePanelPosition();
		}
	}

	updatePanelPosition() {

		// Scale the panel 15% of the screen width, and postion it on the lower left
		this.m_ControlPanelGroup.scale.set( 1, 1, 1);  // reset earlier scaling
		const size = calculateMeshDimensions( this.m_ControlPanelGroup );

		const screenHeight = getScreenHeightAtCameraDistance( this.m_DistanceFromCamera, getFov(this.m_Renderer,this.m_Camera) );
		const screenWidth = getScreenWidthAtCameraDistance( this.m_DistanceFromCamera, screenHeight, getAspect(this.m_Renderer,this.m_Camera) );

		const targetPercentOfScreen = 0.20;
		const desiredWidth = screenWidth * targetPercentOfScreen;
		const requiredScale = desiredWidth/size.x;
		this.m_ControlPanelGroup.scale.set( requiredScale, requiredScale, 1);

		const xPos = -(screenWidth/2) + desiredWidth;
		const yPos = -((size.y/2) * requiredScale);
		this.m_ControlPanelGroup.position.set( xPos, yPos, -this.m_DistanceFromCamera );

	}

	hide() {
		this.m_Camera.remove( this.m_ControlPanelGroup  );
    }

    show() {
		this.m_Camera.add( this.m_ControlPanelGroup );
	}

	getActiveButtons() {
		return this.m_ControlPanelGroup.children;
	}
}

export { ControlPanel };