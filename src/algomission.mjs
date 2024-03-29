/**
    The main class, AlgoMission

    Author: Ian Felstead
*/

"use strict";

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { Bot } from './modules/bot.mjs';
import { MapManager } from './modules/mapmanager.mjs';
import { InstructionManager } from './modules/instructionmanager.mjs';
import { ControlPanel } from './modules/controlpanel.mjs';
import { ScoreManager } from './modules/scoremanager.mjs';
import { LoadingManager } from './modules/loadingmanager.mjs';

import { calculateMeshHeight, messageToMesh, limitViaScale, getScreenHeightAtCameraDistance, getScreenWidthAtCameraDistance, getBestSelectMapScreenWidth } from './modules/algoutils.js'; 	        // utility functions
import { TitleScreen } from './modules/titlescreen.mjs';
import { MapScreen } from './modules/mapscreen.mjs';
import { WinScreen } from './modules/winscreen.mjs';
import { DeathScreen } from './modules/deathscreen.mjs';

// Global Namespace
var ALGO = ALGO || {};

class AlgoMission {
 
    static VERSION = 1.0;

    static SKY_TEXTURE = "textures/sky_twilight.jpg";   // Texture taken from Optikz 2004 post on blenderartists,org

    static UPDATE_TIME_STEP = 0.033;                    // 33ms = approx 30 FPS game loop

    static TAppState = {
        INITIAL: 0,
        SETUP: 1,
        LOADED: 2,
        READY: 3,
        WAITING: 4,
        RUNNING: 5,
        WIN: 6,
        DEAD: 7,
        RETRY: 8,
        SELECTMAP: 9
    };

    // Observer notification types (central)
	static TNotificationType = {
        TILE_CHANGE:  0, 		// other param will be tile role
		SCORE_CHANGE: 1, 		// other param will be  score delta 			
		STATE_CHANGE: 2 		// other param will be  win, die
	};

    static CAMERA_Y_OFFSET = 60;
    static CAMERA_Z_OFFSET = -40;

    // Job groups
    // These cover multiple assets, and are used to generalise loading progress
    static JOB_GROUP_BOT = "job";
    static JOB_GROUP_MAP = "map";
    static JOB_GROUP_SKY = "sky";
    static JOB_GROUP_AUDIO = "audio";

    constructor() {
        this.m_State = AlgoMission.TAppState.INITIAL;

        //
        // the following are set later during game intitialisation
        //
        this.m_MapManager = null;

        // Main Screen support
        this.m_Scene = null;
        this.m_Camera = null;
        this.m_Renderer = null;
        this.m_Element = null;
        this.m_Container = null;

        // Bot
        this.m_Bot = null;

        this.m_InstructionMgr = null;

        this.m_ControlPanel = null;

        // Collision Detection
        this.m_Raycaster = null;

        // overlays a grid to help users
        this.m_GridHelperObject = null;

        this.m_MouseControls = null;

        // game loop support
        this.m_Clock = null;
        this.m_Lag = 0; 	// used in game loop for fixed step update

        this.m_Retry = false;
        this.m_SelectMap = false;
        this.m_SelectedMap = -1;

        // audio support
        this.m_AudioListener = null;
        this.m_AmbientButtonClickSound = null;
        
        

        this.m_Observers = [];

        this.m_ScoreManager = null;

        this.m_LoadingManager = null;

        // These are the jobs that we need to wait for (i.e. things the loading screen covers)
        this.m_StartupLoadJobNames = [ AlgoMission.JOB_GROUP_BOT, AlgoMission.JOB_GROUP_SKY, AlgoMission.JOB_GROUP_MAP, AlgoMission.JOB_GROUP_AUDIO ];

        this.m_ClickBlackoutHack = false;

        this.m_TitleScreen = null;

        this.m_MapScreen = null;

        this.m_WinScreen = null;

        this.m_DeathScreen = null;
    }

    // called by things that want to observe us
    registerObserver(observer)
	{
		this.m_Observers.push(observer);
	}

    unregisterObserver()
	{
		this.m_Observers = this.m_Observers.filter(
			function(existingObserver) {
				if(existingObserver !== observer) {
					return existingObserver;
				}
			}
		);
	}

    notifyObservers(notificationType, notificationValue)
	{
		this.m_Observers.forEach(
			function(observer) {
				observer.updateTriggered( notificationType, notificationValue );
			}
		);
	}

    updateTriggered(notificationType, notificationValue) {
        // console.log("Window got an event from the map, " + notificationType + ", " + notificationValue);
        
        switch( notificationType ) {
            case AlgoMission.TNotificationType.TILE_CHANGE:
                // If the current tile is 'no tile', then we're in the air...
                if( notificationValue == MapManager.NO_TILE ) {
                    // Tell the bot the bad news... this in turn will trigger out own state change (once bot has finished dying)
                    this.notifyObservers( AlgoMission.TNotificationType.STATE_CHANGE, AlgoMission.TAppState.DEAD );
                }
            break;

            case AlgoMission.TNotificationType.SCORE_CHANGE:
                // NOOP - we don't care
            break;

            default:
                console.log("unsupported notification: " + notificationType );
        }
    }  

    getCamera() {
        return this.m_Camera;
    }

    getBot() {
        return this.m_Bot.getBot();
    }

    getLoadingManager() {
        return this.m_LoadingManager;
    }

    getMapManager() {
        return this.m_MapManager;
    }

    getInstructionMgr() {
        return this.m_InstructionMgr;
    }

    getControlPanel() {
        return this.m_ControlPanel;
    }

    getScoreManager() {
        return this.m_ScoreManager;
    }

    runGame() {
        console.log("algo-mission v" + AlgoMission.VERSION + " starting...");
        
        this.m_State = AlgoMission.TAppState.INITIAL;

        this.setupBasicScene();

        this.setupGameLoop();

        this.gameLoop(); 	// intial kickoff, subsequest calls via requestAnimationFrame()
    }

    actOnState( timeElapsed ) {
        switch (this.m_State) {
            case AlgoMission.TAppState.INITIAL:
                // NOOP
                break;
            case AlgoMission.TAppState.SETUP:
                // During this state we're just waiting for loading
                if( this.getLoadingManager().loadComplete( this.m_StartupLoadJobNames ) == true ) {
                    this.getLoadingManager().startLoadingScreenShutdown();
                }
                this.getLoadingManager().update();
                break;

            case AlgoMission.TAppState.LOADED:
                this.getTitleScreen().update();
                break;

            case AlgoMission.TAppState.READY:
                // allow user freedom to look around
                this.m_MouseControls.enabled = true;
                break;

            case AlgoMission.TAppState.RUNNING:

                if (!this.m_Bot.isBusy() && this.m_InstructionMgr.nextInstruction() != undefined) {
                    this.m_Bot.prepareForNewInstruction();      // e.g. movement instructions affect bot location
                }

                // camera must follow bot
                this.m_MouseControls.enabled = false;

                this.updateCamera();

                break;

            case AlgoMission.TAppState.WIN:
                this.getWinScreen().update( timeElapsed );   // e.g. animate trophy
                break;

            case AlgoMission.TAppState.DEAD:
                this.getDeathScreen().update();
                this.m_MouseControls.enabled = false;
                break;

            case AlgoMission.TAppState.RETRY:
                // NOOP - we move straight out of this state
                break;

            case AlgoMission.TAppState.SELECTMAP:
                this.getMapScreen().update();       // e.g. animate arrows
                break;
        }

        if (this.m_State != AlgoMission.TAppState.INITIAL && 
            this.m_State != AlgoMission.TAppState.SETUP &&
            this.m_State != AlgoMission.TAppState.LOADED &&
            this.m_State != AlgoMission.TAppState.DEAD) {

            this.getControlPanel().update(AlgoMission.UPDATE_TIME_STEP);

            this.m_Bot.update(AlgoMission.UPDATE_TIME_STEP)

            this.m_MapManager.update(AlgoMission.UPDATE_TIME_STEP);
        }
    }

    updateState(timestep) {
        var newState = this.m_State;

        switch (this.m_State) {
            case AlgoMission.TAppState.INITIAL:
                // We're up, so start setting up
                newState = AlgoMission.TAppState.SETUP;
                break;

            case AlgoMission.TAppState.SETUP:
                if( this.getLoadingManager().isFinished() ) {
                    newState = AlgoMission.TAppState.LOADED;
                }
                break;
            
            case AlgoMission.TAppState.LOADED:
                if( this.m_SelectMap == true ) {
                    newState = AlgoMission.TAppState.SELECTMAP;
                    this.m_SelectMap = false;
                }
                break;

            case AlgoMission.TAppState.READY:
                if (this.m_InstructionMgr.isRunning()) {
                    newState = AlgoMission.TAppState.RUNNING;
                }
                break;

            case AlgoMission.TAppState.RUNNING:
                if (this.m_Bot.isDead()) {
                    newState = AlgoMission.TAppState.DEAD;

                    // record the highest score regardless of win or fail
                    this.getMapManager().applyScore( this.getScoreManager().getScore() );
                }
                else if (this.m_InstructionMgr.isRunning() == false) {
                    
                    // record the highest score regardless of win or fail
                    this.getMapManager().applyScore( this.getScoreManager().getScore() );

                    if( this.m_MapManager.isCurrentMapComplete() ) {
                        this.notifyObservers( AlgoMission.TNotificationType.STATE_CHANGE, AlgoMission.TAppState.WIN )
                        newState = AlgoMission.TAppState.WIN;
                    }
                    else {
                        // Must complete with a single instruction set, so failed
                        newState = AlgoMission.TAppState.DEAD;
                    }
                }
                else {
                    this.m_InstructionMgr.updateWindow(1); // highlight current instruction
                }
                break;

            case AlgoMission.TAppState.WIN:
                if (this.getWinScreen().isFinished()) {
                    newState = AlgoMission.TAppState.SELECTMAP;
                }
                break;

            case AlgoMission.TAppState.DEAD:
                if (this.m_Retry == true) {
                    newState = AlgoMission.TAppState.RETRY;
                    this.m_Retry = false;
                }
                else if (this.m_SelectMap == true) {
                    newState = AlgoMission.TAppState.SELECTMAP;
                    this.m_SelectMap = false;
                }
                break;

            case AlgoMission.TAppState.RETRY:
                if (!this.m_Bot.isDead()) {     // waits for bot respawn
                    newState = AlgoMission.TAppState.READY;
                }
                break;

            case AlgoMission.TAppState.SELECTMAP:
                if (this.m_SelectedMap != -1) {
                    this.resetPlayArea();
                    newState = AlgoMission.TAppState.RETRY;
                }
                break;
        }

        // Change state if required
        if (this.m_State != newState) {
            // console.log("App State changing from " + this.m_State + " to " + newState);
            this.onExitState();
            this.m_State = newState;
            this.onEnterState();
        }
    }

    onEnterState() {
        switch (this.m_State) {
            case AlgoMission.TAppState.INITIAL:
                console.log("Warning: Should not be possible to enter initial state");
                break;
            case AlgoMission.TAppState.SETUP: 
                this.addLoadingManager();
                this.getLoadingManager().displayLoadingScreen( this.m_Camera );
                this.initialise();
                break;
            case AlgoMission.TAppState.LOADED:

                // adjust map and bot step measurements according to Bot length
                this.m_MapManager.resize(this.m_Bot.getStepSize(), 0.1);

                this.createTitleScreen();
                this.getTitleScreen().show();

                break;
            case AlgoMission.TAppState.READY:
                this.showPlayArea();
                break;
            case AlgoMission.TAppState.RUNNING:
                break;
            case AlgoMission.TAppState.WIN:
                this.getControlPanel().hide();
                this.getWinScreen().show();
                break;
            case AlgoMission.TAppState.DEAD:
                this.hidePlayArea();
                this.getDeathScreen().show();
                break;
            case AlgoMission.TAppState.RETRY:
                this.resetPlayArea();
                this.showPlayArea();
                break;
            case AlgoMission.TAppState.SELECTMAP:
                this.hidePlayArea();
                //this.m_MapSelectIndex = Math.max(0, this.m_SelectedMap);     // start selection at current map
                let oldMap = this.m_SelectedMap;
                this.m_SelectedMap = -1;
                this.getMapScreen().show( oldMap );
                break;
        }
    }

    onExitState() {
        switch (this.m_State) {
            case AlgoMission.TAppState.INITIAL:
                // NOOP
                break;
            case AlgoMission.TAppState.SETUP:
                // loading screen is already gone by this point
                this.setMeshVisibility( "sky", true);
                break;
            case AlgoMission.TAppState.LOADED:
                this.getTitleScreen().hide( this.m_Camera );
                this.toggleGridHelper();
                this.m_ScoreManager.createScore( this.m_Camera );
                break;
            case AlgoMission.TAppState.READY:
                break;
            case AlgoMission.TAppState.RUNNING:
                break;
            case AlgoMission.TAppState.WIN:
                this.getWinScreen().hide();
                break;
            case AlgoMission.TAppState.DEAD:
                this.getDeathScreen().hide();
                break;
            case AlgoMission.TAppState.RETRY:
                break;
            case AlgoMission.TAppState.SELECTMAP:
                this.getMapScreen().hide();     // if present
                break;
        }
    }

    updateCamera() {
        this.m_Camera.updateProjectionMatrix();
        this.m_Camera.position.set(this.m_Bot.getBot().position.x, 
                                    this.m_Bot.getBot().position.y + AlgoMission.CAMERA_Y_OFFSET, 
                                    this.m_Bot.getBot().position.z + AlgoMission.CAMERA_Z_OFFSET);
        this.m_Camera.lookAt(this.m_Bot.getBot().position);
    }

    resetPlayArea() {
        this.m_InstructionMgr.clearInstructions();
        this.m_InstructionMgr.updateWindow();

        this.m_MapManager.loadMap(this.m_SelectedMap, this.m_Scene);

        this.m_Bot.respawnBot();

        this.m_ScoreManager.resetScore();

        this.updateCamera();
    }

    //
    // Initialisation
    //

    initialise() {

        this.addAudio(this.m_Camera);

        this.addSky();

        this.addAmbientLight();

        this.addMouseControls();

        this.addMapManager();

        this.addInstructionManager(this);

        this.addControlPanel();

        this.addScoreManager();

        this.addBot();

        this.setupCollisionDetection();

        this.addEventListeners();

        this.createMapScreen();

        this.createWinScreen();

        this.createDeathScreen();
    }

    createTitleScreen() {
        this.m_TitleScreen = new TitleScreen( this.m_Camera, this.getBot() );
    }

    getTitleScreen() {
        return this.m_TitleScreen;
    }

    createMapScreen() {
        this.m_MapScreen = new MapScreen( this.m_Camera, this.getLoadingManager(), this.getMapManager() );
    }

    getMapScreen() {
        return this.m_MapScreen;
    }
    
    createWinScreen() {
        this.m_WinScreen = new WinScreen( this.m_Camera, this.m_AudioListener,  this.getLoadingManager() );
    }

    getWinScreen() {
        return this.m_WinScreen;
    }

    createDeathScreen() {
        this.m_DeathScreen = new DeathScreen( this.m_Camera );
    }

    getDeathScreen() {
        return this.m_DeathScreen;
    }


    hidePlayArea() {
        this.getControlPanel().hide();
        this.m_Scene.remove(this.m_Bot.getBot());
        this.m_ScoreManager.hideScore( this.m_Camera );

        this.getInstructionMgr().hide();
    }

    showPlayArea() {
        this.getInstructionMgr().show();
        this.m_ScoreManager.showScore( this.m_Camera );
        this.m_Scene.add(this.m_Bot.getBot());
        this.getControlPanel().show();
    }

    setupGameLoop() {
        this.m_Clock = new THREE.Clock();

        this.m_Lag = 0;
    }

    setupBasicScene() {
        this.m_Renderer = new THREE.WebGLRenderer();
        this.m_Element = this.m_Renderer.domElement;
        this.m_Container = document.getElementById('AlgoMission');
        this.m_Container.appendChild(this.m_Element);

        this.m_Scene = new THREE.Scene();

        this.addCamera();
    }

    addCamera() {
        this.m_Camera = new THREE.PerspectiveCamera(90, 1, 0.001, 1700);
        // look over bots shoulder
        this.m_Camera.position.set(0, AlgoMission.CAMERA_Y_OFFSET, AlgoMission.CAMERA_Z_OFFSET);
        this.m_Camera.lookAt(new THREE.Vector3(0, 0, 0));
        this.m_Scene.add(this.m_Camera);

        this.handleResize();    // make sure camera is using current window size
    }

    addMouseControls() {
        this.m_MouseControls = new OrbitControls(this.m_Camera, this.m_Element);

        // Rotate about the center.
        this.m_MouseControls.target.set(0, 0, 0);

        // Future note: If you wanted a VR like rotation then change
        // to rotate about camera position (plus a small offset) instead
        // and turn off pan/zoom. e.g.
        //m_MouseControls.target.set( this.m_Camera.position.x+0.1, this.m_Camera.position.y, this.m_Camera.position.z );
        //m_MouseControls.noZoom = true;
        //m_MouseControls.noPan = true;
    }

    addAmbientLight() {
        var white = 0xA0A0A0;
        this.m_Scene.add(new THREE.AmbientLight(white));
    }

    addSky() {
        this.getLoadingManager().loadTexture( AlgoMission.SKY_TEXTURE, this.skyLoadedCb.bind(this), AlgoMission.JOB_GROUP_SKY );
    }

    skyLoadedCb( texture ) {
        const name = "sky";
        var skyGeo = new THREE.SphereGeometry(500, 60, 40);
        skyGeo.scale(- 1, 1, 1);
        var material = new THREE.MeshBasicMaterial({ map: texture });
        var mesh = new THREE.Mesh(skyGeo, material);
        mesh.name = name;
        mesh.visible = false;       // don't show it straight away
        this.m_Scene.add(mesh);
    }

    setMeshVisibility( meshName, visibility ) {
        let mesh = this.m_Scene.getObjectByName(meshName);
        if( mesh ) {
            mesh.visible = visibility;
        }
    }

    addAudio(camera) {

        this.m_AudioListener = new THREE.AudioListener();
        camera.add(this.m_AudioListener);

        this.m_AmbientButtonClickSound = new THREE.Audio(this.m_AudioListener);
        this.m_Scene.add(this.m_AmbientButtonClickSound);

        this.getLoadingManager().loadAudio( 'audio/107132__bubaproducer__button-14.wav', this.audioLoadedCb.bind(this), AlgoMission.JOB_GROUP_AUDIO);
    }

    audioLoadedCb( audioBuffer ) {
        this.m_AmbientButtonClickSound.setBuffer(audioBuffer);
    }

    addBot() {
        this.m_Bot = new Bot( this );
        this.m_Bot.load(this.getLoadingManager(), this.m_AudioListener, this.botCreatedCb.bind(this));
    }

    botCreatedCb() {
        // Note: this group job was added on startup
        this.getLoadingManager().markJobComplete( AlgoMission.JOB_GROUP_BOT );
    }

    addLoadingManager() {
        this.m_LoadingManager = new LoadingManager( this, this.m_StartupLoadJobNames );
    }

    addMapManager() {
        this.m_MapManager = new MapManager( this );
        var self = this;

        // we listen to the map manager for tile changes
        this.m_MapManager.registerObserver(this);

        this.m_MapManager.load(this.getLoadingManager(), 
                function () { 
                    // Note: this group job was added on startup
                    self.getLoadingManager().markJobComplete(AlgoMission.JOB_GROUP_MAP);
                });
    }

    addInstructionManager(mapManager) {
        this.m_InstructionMgr = new InstructionManager(mapManager);
        this.m_InstructionMgr.addInstructionWindow();
        this.m_InstructionMgr.updateWindow();
    }

    addControlPanel() {
        this.m_ControlPanel = new ControlPanel(this.m_Camera);
        this.m_ControlPanel.createControlPanel(this.getLoadingManager());
    }

    addScoreManager( ) {
        this.m_ScoreManager = new ScoreManager( this.getMapManager() );
    }

    addEventListeners() {
        window.addEventListener('resize', this.handleResize.bind(this), false);
        setTimeout(this.handleResize.bind(this), 1);
    }

    setupCollisionDetection() {
        this.m_Raycaster = new THREE.Raycaster();

        document.addEventListener('mousedown', this.onDocumentMouseDown.bind(this), false);
        document.addEventListener('touchstart', this.onDocumentTouchStart.bind(this), false);
    }

    //
    // Game Loop
    //

    // gameLoop()
    // Standard game loop with a fixed update rate to keep
    // things consistent, and a variable render rate to allow
    // for differences in machine performance
    //
    gameLoop() {
        var elapsedTime = this.m_Clock.getDelta();

        this.m_Lag += elapsedTime;

        // perform as many updates as we should do
        // based on the time elapsed from last gameloop call
        while (this.m_Lag >= AlgoMission.UPDATE_TIME_STEP) {

            this.update();

            this.m_Lag -= AlgoMission.UPDATE_TIME_STEP;
        }

        this.render();

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update() {
        // Note: The time elapsed is AlgoMission.UPDATE_TIME_STEP as we update in fixed steps
        this.actOnState(AlgoMission.UPDATE_TIME_STEP);
        this.updateState();
    }

    render() {
        this.m_Renderer.render(this.m_Scene, this.m_Camera);
    }

    handleResize() {
        var width = this.m_Container.offsetWidth;
        var height = this.m_Container.offsetHeight;

        this.m_Camera.aspect = width / height;
        this.m_Camera.updateProjectionMatrix();

        this.m_Renderer.setSize(width, height);
    }

    // For touch screens we have to mess about a bit to avoid accidental double clicks
    onDocumentTouchStart(event) {
        event.preventDefault();
        event.clientX = event.touches[0].clientX;
        event.clientY = event.touches[0].clientY;
        this.onDocumentMouseDown(event);
    }
   
    onDocumentMouseDown(event) {
        event.preventDefault();

        if( this.m_ClickBlackoutHack == false ) {
            this.m_ClickBlackoutHack = true;
            let self = this;
            setTimeout( function() {
                self.m_ClickBlackoutHack = false;
            }, 100);
            this.handleClickByState( event );
        }
    }

    handleClickByState( event ) {

        switch( this.m_State ) {
            case AlgoMission.TAppState.INITIAL:
                // NOOP
                break;
            case AlgoMission.TAppState.LOADED:
                // If we're on the title screen, then a click just means
                // select next map - don't detect any other button presses
                this.m_SelectMap = true;
                break;
            case AlgoMission.TAppState.READY:
                var instructionsUpdated = 0;
                var instructionClicked =
                    this.detectInstructionPress(event.clientX, event.clientY, this.m_Raycaster);
    
                if (instructionClicked >= 0) {
                    this.m_AmbientButtonClickSound.play();
    
                    // We handle CLEAR and GO here, others are added to the instruction list
                    if (instructionClicked == InstructionManager.instructionConfig.CLEAR) {
                        if (!this.m_InstructionMgr.isRunning()) {
                            this.m_InstructionMgr.clearInstructions();
    
                            instructionsUpdated = 1;
                        }
                    }
                    else if (instructionClicked == InstructionManager.instructionConfig.GO) {
                        if (!this.m_InstructionMgr.isRunning() && this.m_InstructionMgr.numInstructions() > 0) {
                            this.m_InstructionMgr.startInstructions();
                            this.m_Bot.prepareForNewInstruction();
                        }
                    }
                    else if (instructionClicked == InstructionManager.instructionConfig.GRID) {
                        this.toggleGridHelper();
                    }
                    else {
                        this.m_InstructionMgr.addInstruction(instructionClicked);
                        instructionsUpdated = 1;
                    }
                }
                this.m_InstructionMgr.updateWindow();
                break;
            case AlgoMission.TAppState.RUNNING:
                // NOOP
                break;
            case AlgoMission.TAppState.WIN:
                // If we're on the winner screen, then a click just means
                // select next map - don't detect any other button presses
                this.getWinScreen().hide();
                break;
            case AlgoMission.TAppState.DEAD:
                let buttonSelected = this.detectButtonPress( event.clientX, event.clientY, this.m_Raycaster, this.getDeathScreen().getActiveObjects() );
                if( buttonSelected == "retryButton" ) {
                    this.m_Retry = true;
                }
                else if( buttonSelected == "chooseMapButton" ) {
                    this.m_SelectMap = true;
                }
                break;
            case AlgoMission.TAppState.RETRY:
                // NOOP
                break;
            case AlgoMission.TAppState.SELECTMAP:
                let mapSelected = this.detectButtonPress( event.clientX, event.clientY, this.m_Raycaster, this.getMapScreen().getMapSelectionObjects() );
                let mapId = this.getMapScreen().handleClick(mapSelected);
                if( mapId != -1 ) {
                    // a new map was selected
                    this.m_SelectedMap = mapId;
                }
                break;
        }
    }

	detectInstructionPress(xPos, yPos, raycaster) {
        return this.detectButtonPress( xPos, yPos, raycaster, this.getControlPanel().getActiveButtons() );
    }

    detectButtonPress( xPos, yPos, raycaster, buttonsToCheck ) {
        let selection = -1;

        if (typeof (raycaster) == "undefined") {
			return selection;
		}

        var mouse = new THREE.Vector2(); // TODO: create once
    
        mouse.x = ( xPos / this.m_Renderer.domElement.clientWidth ) * 2 - 1;
        mouse.y = - ( yPos / this.m_Renderer.domElement.clientHeight ) * 2 + 1;
        
        raycaster.setFromCamera( mouse, this.m_Camera );

        var intersects = raycaster.intersectObjects( buttonsToCheck );

        if( intersects.length > 0 ) {
            selection = intersects[0].object.name;
        }

		return selection;
    }

    toggleGridHelper() {
        if (this.m_GridHelperObject == null || this.m_Scene.getObjectByName("GridHelper") == null) {
            if (this.m_GridHelperObject == null) {
                var numSquares = 9; 		// Must be an odd number to centre the bus

                var botSize = this.m_Bot.getStepSize();
                var size = (botSize * numSquares);
                var offset = (botSize / 2); 	// we want bus in center of square
                var height = 1; 			// +ve = above road

                const points = [];
                var gridMaterial = new THREE.LineBasicMaterial({ color: 'white' });

                var adjustedHorizWidth = size / 2;  			// adjusted for centre being 0,0
                for (var horizSquareNum = 0; horizSquareNum <= numSquares; ++horizSquareNum) {
                    var depthPos = (botSize * horizSquareNum) - offset;
                    points.push(new THREE.Vector3(-adjustedHorizWidth, height, depthPos));
                    points.push(new THREE.Vector3(adjustedHorizWidth, height, depthPos));
                }

                var adjustedHorizStart = 0 - (botSize / 2); 	// start lines just behind bus (0,0)
                for (var vertSquareNum = 0; vertSquareNum <= numSquares; ++vertSquareNum) {
                    var horizPos = ((botSize * vertSquareNum) - adjustedHorizWidth);

                    points.push(new THREE.Vector3(horizPos, height, adjustedHorizStart));
                    points.push(new THREE.Vector3(horizPos, height, size - offset));
                }

                var gridGeo = new THREE.BufferGeometry().setFromPoints( points );
                this.m_GridHelperObject = new THREE.LineSegments(gridGeo, gridMaterial);
            }
            this.m_GridHelperObject.name = "GridHelper";
            this.m_Scene.add(this.m_GridHelperObject);
        }
        else {
            this.m_Scene.remove(this.m_GridHelperObject);
        }
    }

    //
    // Debugging Functions
    //

    addAxisHelper() {
        this.m_Scene.add(new THREE.AxisHelper(50));
    }
}

export { AlgoMission };