/**
    The main class, AlgoMission

    Author: Ian Felstead
*/

"use strict";

import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports,min/optimized/three.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.135.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.135.0/examples/jsm/controls/OrbitControls.js';

import { Bot } from './modules/bot.mjs';
import { MapManager } from './modules/mapmanager.mjs';
import { InstructionManager } from './modules/instructionmanager.mjs';
import { ControlPanel } from './modules/controlpanel.mjs';

// Global Namespace
var ALGO = ALGO || {};

class AlgoMission {
 
    static VERSION = 0.2;

    static SKY_TEXTURE = "textures/sky_twilight.jpg";   // Texture taken from Optikz 2004 post on blenderartists,org

    static UPDATE_TIME_STEP = 0.033;                    // 33ms = approx 30 FPS game loop

    static TAppState = {
        INITIAL: 1,
        READY: 2,
        WAITING: 3,
        RUNNING: 4,
        WIN: 5,
        DEAD: 6,
        RETRY: 7,
        SELECTMAP: 8
    };

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
        this.m_BotLoaded = false;

        this.m_MapLoaded = false;

        this.m_SkyLoaded = false;

        this.m_InstructionMgr = null;

        this.m_ControlPanel = null;

        // Collision Detection
        this.m_Raycaster = null;

        // overlays a grid to help users
        this.m_GridHelperObject = null;

        this.m_MouseControls = null;

        this.m_TextureLoader = null;

        this.m_GLTFLoader = null;

        // game loop support
        this.m_Clock = null;
        this.m_Lag = 0; 	// used in game loop for fixed step update

        this.m_Retry = false;
        this.m_SelectMap = false;
        this.m_SelectedMap = -1;

        this.m_Win = 0;

        // audio support
        this.m_AudioListener = null;
        this.m_AmbientButtonClickSound = null;
        this.m_WinnerSound = null;
        this.m_AudioLoaded = null;
        this.m_WinnerAudioLoaded = null;

        // Winner
        this.m_Trophy = null;
        this.m_TrophyLoaded = false;
    }

    runGame() {
        console.log("algo-mission v" + AlgoMission.VERSION + " starting...");

        this.m_State = AlgoMission.TAppState.INITIAL;
        this.initialise();

        // TODO: We'll implement a proper score manager at some point, For now, just listen for 'END'
        this.m_MapManager.registerObserver(this);


        //m_State = AlgoMission.TAppState.SELECTMAP;
        this.gameLoop(); 	// intial kickoff, subsequest calls via requestAnimationFrame()
    }

    updateTriggered(role) {
        console.log("Window got an event from the map, " + role);
        if (role == "END") {
            this.m_Win = 1;
        }
    }

    actOnState() {
        switch (this.m_State) {
            case AlgoMission.TAppState.INITIAL:
                // NOOP - should be initialised before we get here
                break;

            case AlgoMission.TAppState.READY:
                // allow user freedom to look around
                this.m_MouseControls.enabled = true;
                break;

            case AlgoMission.TAppState.RUNNING:

                if (!this.m_Bot.isBusy() && this.m_InstructionMgr.nextInstruction() != undefined) {
                    this.m_Bot.prepareForNewInstruction();
                }

                // camera must follow bot
                this.m_MouseControls.enabled = false;

                this.m_Camera.updateProjectionMatrix();
                this.m_Camera.position.set(this.m_Bot.mesh.position.x, this.m_Bot.mesh.position.y + 60, this.m_Bot.mesh.position.z - 40);
                this.m_Camera.lookAt(this.m_Bot.mesh.position);
                break;

            case AlgoMission.TAppState.WIN:
                // NOOP just wait for user to click a button
                break;

            case AlgoMission.TAppState.DEAD:
                // NOOP - we're just waiting for user to restart or choose map
                this.m_MouseControls.enabled = false;
                break;

            case AlgoMission.TAppState.RETRY:

                this.m_InstructionMgr.clearInstructions();
                this.m_InstructionMgr.updateWindow();
                this.m_Win = 0;

                this.m_Bot.respawnBot();

                this.m_Camera.updateProjectionMatrix();
                this.m_Camera.position.set(this.m_Bot.mesh.position.x, this.m_Bot.mesh.position.y + 60, this.m_Bot.mesh.position.z - 40);
                this.m_Camera.lookAt(this.m_Bot.mesh.position);

                break;

            case AlgoMission.TAppState.SELECTMAP:
                // NOOP just wait for user to select a map
                break;
        }

        if (this.m_State != AlgoMission.TAppState.INITIAL && this.m_State != AlgoMission.TAppState.DEAD) {

            this.m_ControlPanel.update(AlgoMission.UPDATE_TIME_STEP);

            this.m_Bot.update(AlgoMission.UPDATE_TIME_STEP)

            this.m_MapManager.update();
        }
    }

    updateState(timestep) {
        var newState = this.m_State;

        switch (this.m_State) {
            case AlgoMission.TAppState.INITIAL:
                if (this.m_Bot.mesh != null && typeof (this.m_Bot.mesh) != "undefined") {
                    newState = AlgoMission.TAppState.SELECTMAP;
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
                }
                else if (this.m_InstructionMgr.isRunning() == false) {
                    if (this.m_Win == 1) {
                        newState = AlgoMission.TAppState.WIN;
                    }
                    else {
                        newState = AlgoMission.TAppState.READY;
                    }
                }
                else {
                    this.m_InstructionMgr.updateWindow(1); // highlight current instruction
                }
                break;

            case AlgoMission.TAppState.WIN:
                if (this.m_SelectMap == true) {
                    newState = AlgoMission.TAppState.SELECTMAP;
                    this.m_SelectMap = false;
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
                if (!this.m_Bot.isDead()) {
                    newState = AlgoMission.TAppState.READY;
                }
                break;

            case AlgoMission.TAppState.SELECTMAP:
                if (this.m_SelectedMap != -1) {
                    this.m_MapManager.loadMap(this.m_SelectedMap, this.m_Scene);
                    newState = AlgoMission.TAppState.RETRY;
                }
                break;
        }

        // Change state if required
        if (this.m_State != newState) {
            console.log("App State changing from " + this.m_State + " to " + newState);
            this.onExitState();
            this.m_State = newState;
            this.onEnterState();
        }
    }

    onEnterState() {
        switch (this.m_State) {
            case AlgoMission.TAppState.INITIAL:
                this.m_Win = 0;
                break;
            case AlgoMission.TAppState.READY:
                break;
            case AlgoMission.TAppState.RUNNING:
                break;
            case AlgoMission.TAppState.WIN:
                this.displayWinnerScreen();
                break;
            case AlgoMission.TAppState.DEAD:
                this.displayDeathScreen();
                break;
            case AlgoMission.TAppState.RETRY:
                break;
            case AlgoMission.TAppState.SELECTMAP:
                this.m_SelectedMap = -1;
                this.displayMapScreen();
                break;
        }
    }

    onExitState() {
        switch (this.m_State) {
            case AlgoMission.TAppState.INITIAL:
                break;
            case AlgoMission.TAppState.READY:
                break;
            case AlgoMission.TAppState.RUNNING:
                break;
            case AlgoMission.TAppState.WIN:
                this.removeWinnerScreen();
                break;
            case AlgoMission.TAppState.DEAD:
                this.removeDeathScreen();
                break;
            case AlgoMission.TAppState.RETRY:
                break;
            case AlgoMission.TAppState.SELECTMAP:
                this.removeMapScreen();
                break;
        }
    }

    //
    // Initialisation
    //

    initialise() {
        this.displayLoadingScreen();

        this.setupBasicScene();

        this.addCamera();

        this.addSky();

        this.addAmbientLight();

        this.addMouseControls();

        this.addMapManager(this.m_TextureLoader);

        this.addInstructionManager(this.m_MapManager);

        this.addControlPanel(this.m_InstructionMgr, this.m_TextureLoader);

        this.addAudio(this.m_Camera);

        this.m_BotLoaded = false;
        this.addBot(this.m_InstructionMgr, this.m_MapManager, this.botCreatedCb.bind(this));

        // We use the calculated bot length to size the tiles
        // so wait until the model has loaded and the length
        // has been calculated
        var self = this;
        var myInterval = setInterval(function () {
            if (self.m_BotLoaded == true && self.m_MapLoaded == true) {
                // adjust map and bot step measurements according to Bot length
                self.m_MapManager.resize(self.m_Bot.getStepSize(), 0.1);

                //m_MapManager.loadMap(0, self.m_Scene);

                clearInterval(myInterval);
            }
        }, 100);

        this.setupGameLoop();

        this.setupCollisionDetection();

        this.addEventListeners();

        var waitForLoad = setInterval(function () {
            if (self.m_BotLoaded == true &&
                self.m_SkyLoaded == true &&
                self.m_MapLoaded == true &&
                self.m_WinnerAudioLoaded == true &&
                self.m_AudioLoaded == true) {
                clearInterval(waitForLoad);

                self.toggleGridHelper();

                self.removeLoadingScreen();
            }
        }, 100);

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

        this.m_TextureLoader = new THREE.TextureLoader();

        this.m_GLTFLoader = new GLTFLoader();

        this.m_Scene = new THREE.Scene();
    }

    addCamera() {
        this.m_Camera = new THREE.PerspectiveCamera(90, 1, 0.001, 1700);
        // look over bots shoulder
        this.m_Camera.position.set(0, 60, -40);
        this.m_Camera.lookAt(new THREE.Vector3(0, 0, 0));
        this.m_Scene.add(this.m_Camera);
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
        this.m_SkyLoaded = false;

        var skyGeo = new THREE.SphereGeometry(500, 60, 40);
        skyGeo.scale(- 1, 1, 1);

        var self = this;
        this.m_TextureLoader.load(AlgoMission.SKY_TEXTURE,

            // on load
            function (texture) {
                var material = new THREE.MeshBasicMaterial({ map: texture });
                var mesh = new THREE.Mesh(skyGeo, material);
                self.m_Scene.add(mesh);
                self.m_SkyLoaded = true;
            },
            // on download progress
            function (xhr) {
                //console.log( AlgoMission.SKY_TEXTURE + " " + (xhr.loaded / xhr.total * 100) + '% loaded' );
            },
            // on error
            function (xhr) {
                //console.log( 'Error loading sky texture ' + AlgoMission.SKY_TEXTURE );
            }
        );
    }

    addAudio(camera) {
        this.m_AudioLoaded = false;

        this.m_AudioListener = new THREE.AudioListener();
        camera.add(this.m_AudioListener);

        this.m_AmbientButtonClickSound = new THREE.Audio(this.m_AudioListener);
        this.m_Scene.add(this.m_AmbientButtonClickSound);

        var loader = new THREE.AudioLoader();
        var self = this;
        loader.load('audio/107132__bubaproducer__button-14.wav',
            function (audioBuffer) {
                //on load
                self.m_AmbientButtonClickSound.setBuffer(audioBuffer);
                self.m_AudioLoaded = true;
            }
        );

        this.m_WinnerAudioLoaded = false;
        this.m_WinnerSound = new THREE.Audio(this.m_AudioListener);
        this.m_Scene.add(this.m_WinnerSound);
        loader.load('audio/462362__breviceps__small-applause.wav',
            function (winnerAudioBuffer) {
                //on load
                self.m_WinnerSound.setBuffer(winnerAudioBuffer);
                self.m_WinnerAudioLoaded = true;
            }
        );

    }

    // calls botCb() when bot is ready
    addBot(instructionMgr, mapManager, botCb) {
        this.m_Bot = new Bot(instructionMgr, mapManager);
        this.m_Bot.load("models/ToonBus_VijayKumar/scene.gltf",
            this.m_GLTFLoader,
            this.m_AudioListener,
            botCb);
    }

    botCreatedCb() {
        this.m_Scene.add(this.m_Bot.mesh);
        this.m_BotLoaded = true;
    }

    addMapManager(textureLoader) {
        this.m_MapLoaded = false;
        this.m_MapManager = new MapManager();
        var self = this;
        this.m_MapManager.load(textureLoader, this.m_GLTFLoader, function () { self.m_MapLoaded = true; });
    }

    addInstructionManager(mapManager) {
        this.m_InstructionMgr = new InstructionManager(mapManager);
        this.m_InstructionMgr.addInstructionWindow();
        this.m_InstructionMgr.updateWindow();
    }

    addControlPanel(instructionMgr, textureLoader) {
        this.m_ControlPanel = new ControlPanel();
        this.m_ControlPanel.addControlPanel(this.m_Camera.up, instructionMgr, textureLoader);
    }

    addEventListeners() {
        window.addEventListener('resize', this.handleResize.bind(this), false);
        setTimeout(this.handleResize.bind(this), 1);
    }

    displayLoadingScreen() {
        var loadDiv = document.createElement('div');

        loadDiv.id = "loadingScreen";
        loadDiv.style.cssText =
            "width: 100%;" +
            "height: 100%;" +
            "left: 00px;" +
            "top: 00px;" +
            "background-color: DimGray;" +
            "color: White;" +
            // we want an opaque background, but not
            // transparent text, so use rgba rather than opacity.
            "background: rgba(105, 105, 105, 1.0);" +
            "overflow: auto;" +
            "position: absolute;" +
            "font: 24px arial,serif;";
        loadDiv.innerHTML = "Loading...";
        document.body.appendChild(loadDiv);

        var progressDots = 0;
        var progressIntervalMs = 500; 	// 0.5 seconds

        var progressBarInterval = setInterval(function () {
            var isFinished = true;

            // If the loadingScreen has gone or the html is "" then we
            // are finished and fading out
            var loadElem = document.getElementById("loadingScreen");
            if (loadElem) {
                if (loadElem.innerHTML != "") {
                    isFinished = false;

                    loadElem.innerHTML = loadElem.innerHTML + ".";
                    progressDots++;

                    if (progressDots >= 80) {
                        progressDots = 0;
                        loadElem.innerHTML = "Loading...";
                    }
                }
            }

            if (isFinished == true) {
                clearInterval(progressBarInterval);
            }
        }, progressIntervalMs);
    }

    removeLoadingScreen() {
        var fadeStep = 0.05;
        var fadePauseMs = 100;
        var fade = 1.0;

        // setting html to '' also tells the progress bar to finish
        document.getElementById("loadingScreen").innerHTML = "";

        (function fadeDivs() {
            document.getElementById("loadingScreen").style.opacity = fade;

            //	m_ControlPanel.setWindowOpacity( 1.0 - fade );
            //  this.m_InstructionMgr.setWindowOpacity( 1.0 - fade );

            fade -= fadeStep;
            if (fade > 0) {
                setTimeout(fadeDivs, fadePauseMs);
            }
            else {
                document.getElementById("loadingScreen").remove();
            }
        })();
    }

    displayWinnerScreen() {
        this.loadWinnerModels( this.m_GLTFLoader );
        this.waitForWinnerLoad( this.runWinnerScreen.bind(this), this );
    }

    loadWinnerModels( glTFLoader ) {
        if( this.m_TrophyLoaded == false ) {
            this.loadModel( "./models/Trophy_SyntyStudios/scene.gltf", glTFLoader, this.trophyCreatedCb.bind(this) );
        }
        console.log("loadWinnerModels ending");
    }

    loadModel(model, glTFLoader, isCreatedCallback) {
        var instance = this; 	// so we can access bot inside anon-function
        glTFLoader.load( model, 
            // Loaded    
            function (gltf) {
                isCreatedCallback(gltf);
            },
            // Progress
            function (xhr ) {
                console.log( model + " " + ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
            },
            // Error
            function( error ) {
                console.log( 'Failed to load model ' + model );
            }
        );
    }

    trophyCreatedCb( obj ) {
        var threeGroup = obj.scene;
        var object3d  = threeGroup.getObjectByName( "OSG_Scene" );
        this.m_Trophy = object3d;
        this.m_TrophyLoaded = true;
    }

    waitForWinnerLoad(isCreatedCallback, context) {

        var waitForAll = setInterval(function () {
          if (context.m_TrophyLoaded == true ) {
            clearInterval(waitForAll);
            isCreatedCallback();
          }
        }, 100);
        console.log("waitForWinnerLoad ending");
    }

    runWinnerScreen( ) {
        console.log("runWinnerScreen called");

        var instance = this;

        this.m_WinnerSound.play();

        let startZ = 1;
        this.m_Trophy.position.set( 0, -1, startZ );     // note; start behind camera (Z) for later zoom
        this.m_Camera.add(this.m_Trophy);

        let trophySpotlight = new THREE.SpotLight( 0xffffff );
        trophySpotlight.position.set(0,0,1);
        trophySpotlight.target = this.m_Trophy;
        trophySpotlight.name = "trophySpotlight";
        this.m_Camera.add(trophySpotlight);
        
        let messageMesh = this.messageToMesh("Well done!", 1.25, 0x000000, undefined);
        messageMesh.position.set( 0, -4, -10 );
        messageMesh.name = "wellDoneMsg";
        this.m_Camera.add(messageMesh);

        let newMissionMesh = this.messageToMesh("(click mouse for a new mission)", 1, 0x000000, undefined);
        newMissionMesh.position.set( 0, -6, -10 );
        newMissionMesh.name = "newMissionMsg";
        
        
        let animDelayMs = 10;

        let finalZ = -5;
        let zoomStep = 0.1;
        (function animateTrophyZoom() {
            if( instance.m_Trophy.position.z > finalZ  ) {
                instance.m_Trophy.position.z = instance.m_Trophy.position.z - zoomStep;
                setTimeout(animateTrophyZoom, animDelayMs);
            }
        })();

        let buttonRevealDelayMs = 4000;
        (function animateTrophyClickMsg() {
            if( buttonRevealDelayMs > 0 ) {
                buttonRevealDelayMs -= animDelayMs;
                if( buttonRevealDelayMs <= 0 ) {
                    // Time to show the options
                    instance.m_Camera.add(newMissionMesh);
                }
                else {
                    setTimeout(animateTrophyClickMsg, animDelayMs);
                }
            }
        })();

        let stopWinnerAnim = false;
        let rotateStep = 0.01;
        (function animateTrophySpin() {
            instance.m_Trophy.rotation.y = instance.m_Trophy.rotation.y - rotateStep;
            if (stopWinnerAnim==false) {
                setTimeout(animateTrophySpin, animDelayMs);
            }
        })();
    }

    messageToMesh( msg, msgHeight, fgColour, optionalBgColour ) {
        let msgCanvas = document.createElement("canvas");
        let context = msgCanvas.getContext("2d");
        context.font = "40px sans-serif";
        let border = 0.25;

        let worldMultiplier = msgHeight/40;     // i.e. font size
        let msgWidth = (context.measureText(msg).width * worldMultiplier) + border;
        let totalWidth = Math.ceil( msgWidth/ worldMultiplier);
        let totalHeight = Math.ceil( (msgHeight+border) / worldMultiplier);
        msgCanvas.width = totalWidth;
        msgCanvas.height = totalHeight;

        if (optionalBgColour != undefined) {
            context.fillStyle = "#" + optionalBgColour.toString(16).padStart(6, '0');
            context.fillRect( 0,0, totalWidth,totalHeight);
        }

        context.textAlign = "center";
        context.textBaseline = "middle"; 
        context.fillStyle = "#" + fgColour.toString(16).padStart(6, '0');
        context.font = "40px sans-serif"; 
        context.fillText(msg, totalWidth/2, totalHeight/2);
        
        let texture = new THREE.Texture(msgCanvas);
        texture.minFilter = THREE.LinearFilter;
        texture.needsUpdate = true;

        let planeGeo = new THREE.PlaneGeometry(msgWidth, (msgHeight+border) );
        let material = new THREE.MeshBasicMaterial( { side:THREE.DoubleSide, map:texture, transparent:true, opacity:1.0 } );
        let mesh = new THREE.Mesh(planeGeo, material);

        return mesh;
    }

    removeWinnerScreen() {

        let msg = this.m_Camera.getObjectByName("newMissionMsg");
        if( msg ) {
            this.m_Camera.remove( msg );
        }

        msg = this.m_Camera.getObjectByName("wellDoneMsg");
        if( msg ) {
            this.m_Camera.remove( msg );
        }

        let finalZ = 1;
        let zoomStep = 0.2;
        let animDelayMs = 10;
        var instance = this;
        (function animateTrophy() {
            if( instance.m_Trophy.position.z < finalZ  ) {
                instance.m_Trophy.position.z = instance.m_Trophy.position.z + zoomStep;
                setTimeout(animateTrophy, animDelayMs);
            }
            else {
                instance.m_Camera.remove(instance.m_Trophy);

                let trophySpotlight = instance.m_Camera.getObjectByName("trophySpotlight");
                if( trophySpotlight ) {
                    instance.m_Camera.remove(trophySpotlight);
                }
            }
        })();
    }

    displayDeathScreen() {
        var loadDiv = document.createElement('div');

        loadDiv.id = "deathScreen";
        loadDiv.style.cssText =
            "opacity: 0;" +
            "background-image: url('./images/retry.jpg');" +
            "background-repeat: no-repeat;" +
            "background-size: cover;" +
            "width: 50%;" +
            "height: 50%;" +
            "top: 50%;" +
            "left: 50%;" +
            "transform: translate(-50%, -50%); " + 	// makes sure we're dead center
            "text-align: center;" +
            "color: White;" +
            "overflow: auto;" +
            "position: fixed;" +
            "font: 20px arial,serif;" +
            "display:inline-block;" +
            "}";
        loadDiv.innerHTML = "Oops!... <p></p>";

        var retryButtonElement = document.createElement("button");
        retryButtonElement.onclick = this.retryMap.bind(this);
        retryButtonElement.id = "retryButton";
        retryButtonElement.textContent = "Try Again";
        retryButtonElement.style.cssText =
            "width: 25%;" +
            "height: 20%;" +
            "margin-left: 0%;" +
            "position: relative;" +
            "top: 0%;" +
            "font: 24px arial,serif;";
        loadDiv.appendChild(retryButtonElement);

        var selectButtonElement = document.createElement("button");
        selectButtonElement.onclick = this.selectMap.bind(this);
        selectButtonElement.id = "selectButton";
        selectButtonElement.textContent = "Change Mission";
        selectButtonElement.style.cssText =
            "width: 25%;" +
            "height: 20%;" +
            "margin-right: 0%;" +
            "position: relative;" +
            "top: -3%;" +
            "font: 24px arial,serif;";
        loadDiv.appendChild(selectButtonElement);

        document.body.appendChild(loadDiv);

        var fadeStep = 0.07;
        var fadePauseMs = 100;
        var fade = 0.0;
        var self = this;
        (function fadeDivs() {
            document.getElementById("deathScreen").style.opacity = fade;

            if (self.m_ControlPanel != null && self.m_InstructionMgr != null) {
                self.m_ControlPanel.setWindowOpacity(1.0 - fade);
                self.m_InstructionMgr.setWindowOpacity(1.0 - fade);
            }

            fade += fadeStep;
            if (fade < 1.0) {
                setTimeout(fadeDivs, fadePauseMs);
            }
        })();
    }

    retryMap() {
        this.m_Retry = true;
    }

    selectMap() {
        this.m_SelectMap = true;
    }

    removeDeathScreen() {
        var fadeStep = 0.1;
        var fadePauseMs = 100;
        var fade = 1.0;
        var self = this;
        (function fadeDivs() {
            document.getElementById("deathScreen").style.opacity = fade;

            // we only want to unfade the control panel on a retry (not map select)
            if (self.m_State != AlgoMission.TAppState.SELECTMAP) {
                self.m_ControlPanel.setWindowOpacity(1.0 - fade);
                self.m_InstructionMgr.setWindowOpacity(1.0 - fade);
            }
            fade -= fadeStep;
            if (fade > 0) {
                setTimeout(fadeDivs, fadePauseMs);
            }
            else {
                document.getElementById("deathScreen").remove();
                console.log("removing death screen");
            }
        })();
    }

    displayMapScreen() {
        var mapInfo = this.m_MapManager.getMapInfo();
        var mapText =
            "<table id='missionTable' width='100%' border='0' style='display:block;'>" +
            "<thead style='display:block;position: sticky;top:0;; background-color: grey;display:block;'>" +
            "<tr>" +
            "<td width='100%'>" +
            "<b>Hello bus driver. Please select a mission to try!<b>" +
            "</td>" +
            "</tr>" +
            "</thead>" +
            "<tbody>";

        for (var i = 0; i < mapInfo.length; ++i) {
            var difficulty = "beginner";
            switch (mapInfo[i].difficulty) {
                case 1:
                    difficulty = "beginner";
                    break;
                case 2:
                    difficulty = "normal";
                    break;
                case 3:
                    difficulty = "expert";
                    break;
                default:
                    difficulty = "beginner";
            }
            mapText += "<tr>";
            mapText += "<td id='" + mapInfo[i].mapid + "' width='30%'>" + "Mission: <b>" + mapInfo[i].name + "<b></td>";
            mapText += "<td width='70%'><i>" + mapInfo[i].instructions + "</i> (" + difficulty + ")</td>";
            mapText += "</tr>";
        }
        mapText += "</tbody>";

        var css = 'table tr:hover{ background-color: #00ff00 }';
        var style = document.createElement('style');
        if (style.styleSheet) {
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }
        document.getElementsByTagName('head')[0].appendChild(style);

        var loadDiv = document.createElement('div');
        loadDiv.id = "mapScreen";
        loadDiv.style.cssText =
            "opacity: 0;" +
            "background-image: url('./images/retry.jpg');" +
            "background-repeat: no-repeat;" +
            "background-size: cover;" +
            "width: 60%;" +
            "height: 80%;" +
            "top: 50%;" +
            "left: 50%;" +
            "transform: translate(-50%, -50%); " + 	// makes sure we're dead center
            "text-align: left;" +
            "color: White;" +
            "overflow: auto;" +
            "position: fixed;" +
            "font: 12px arial,serif;" +
            "display:inline-block;" +
            "}";

        loadDiv.innerHTML = mapText;

        document.body.appendChild(loadDiv);

        this.addMissionSelectRowHandlers();

        var fadeStep = 0.05;
        var fadePauseMs = 100;
        var fade = 0.0;

        (function fadeDivs() {
            document.getElementById("mapScreen").style.opacity = fade;

            fade += fadeStep;
            if (fade < 1.0) {
                setTimeout(fadeDivs, fadePauseMs);
            }
        })();
    }

    addMissionSelectRowHandlers() {
        var table = document.getElementById("missionTable");
        var rows = table.getElementsByTagName("tr");
        var self = this;
        for (var i = 0; i < rows.length; i++) {
            var currentRow = table.rows[i];

            var createClickHandler =
                function (row) {
                    return function () {
                        var cell = row.getElementsByTagName("td")[0];
                        if (cell.id != "") {
                            self.m_SelectedMap = cell.id;
                        }
                        console.log("selected map:" + self.m_SelectedMap);
                    };
                };

            currentRow.onclick = createClickHandler(currentRow);
        }
    }

    removeMapScreen() {
        var fadeStep = 0.1;
        var fadePauseMs = 100;
        var fade = 1.0;
        var self = this;
        (function fadeDivs() {
            document.getElementById("mapScreen").style.opacity = fade;

            self.m_ControlPanel.setWindowOpacity(1.0 - fade);
            self.m_InstructionMgr.setWindowOpacity(1.0 - fade);

            fade -= fadeStep;
            if (fade > 0) {
                setTimeout(fadeDivs, fadePauseMs);
            }
            else {
                document.getElementById("mapScreen").remove();
                console.log("removing map screen");
            }
        })();
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
        this.m_ControlPanel.render();
    }

    handleResize() {
        var width = this.m_Container.offsetWidth;
        var height = this.m_Container.offsetHeight;

        this.m_Camera.aspect = width / height;
        this.m_Camera.updateProjectionMatrix();

        this.m_Renderer.setSize(width, height);
    }

    // Detect object clicks
    onDocumentTouchStart(event) {
        event.preventDefault();
        event.clientX = event.touches[0].clientX;
        event.clientY = event.touches[0].clientY;
        this.onDocumentMouseDown(event);
    }

    onDocumentMouseDown(event) {
        event.preventDefault();

        // If we're on the winner screen, then a click just means
        // select next map - don't detect any other button presses
        if( this.m_State == AlgoMission.TAppState.WIN ) {
            this.m_SelectMap = true;
            return;
        }

        var mainElement = document.getElementById("AlgoMission");
        var mainWindowHeight = mainElement.clientHeight;

        // Check for instruction button presses
        //
        var instructionsUpdated = 0;
        var instructionClicked =
            this.m_ControlPanel.detectInstructionPress(event.clientX, event.clientY,
                mainElement.clientHeight, this.m_Raycaster);

        if (instructionClicked) {
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