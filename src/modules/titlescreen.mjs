/**
    TitleScreen

    Author: Ian Felstead
*/

"use strict";

// Global Namespace
var ALGO = ALGO || {};

import * as THREE from 'three';

import { boundedScaleTo, messageToMesh, limitViaScale, determineScale, getScreenHeightAtCameraDistance, getScreenWidthAtCameraDistance } from './algoutils.js'; 	        // utility functions

class TitleScreen {

    static SMILEY = "\uD83D\uDE00";
    static BUSSTOP = "\uD83D\uDE8F";
    static BUS = "\uD83D\uDE8C";
    static BIRD = "\uD83D\uDC26";
    static NOENTRY = "\u26D4";
    static COLLISION = "\uD83D\uDCA5";

    constructor( camera, botMesh ) {
        this.m_ObjectsToCleanUp = [];
        this.m_MoveJobs = [];

        this.m_Camera = camera;
        this.m_DistanceFromCamera = 10;

        this.m_BotMesh = botMesh;

        this.m_Finished = false;
    }

    show() {

        this.m_Finished = false;

        const tips = [
            TitleScreen.BIRD + "Use your horn to scare off any nearby birds!" + TitleScreen.BIRD,
            TitleScreen.BUSSTOP + "Remember to use the bus stop button to make the bus wait at stops!" + TitleScreen.BUSSTOP,
            TitleScreen.NOENTRY + "Don't be afraid to experiment - you can always retry!" + TitleScreen.NOENTRY,
            TitleScreen.COLLISION + "No people or birds are harmed in this game! It's OK if you don't get it right " + TitleScreen.SMILEY,
            TitleScreen.COLLISION + "Don't be afraid of making mistakes: Mistakes are how you learn!" + TitleScreen.SMILEY,
            TitleScreen.BIRD + "You get lots of points for using the horn to warn the birds!" + TitleScreen.BIRD,
            TitleScreen.BUSSTOP + "You might lose points if you use the horn near a person waiting to be picked up..." + TitleScreen.BUSSTOP
        ];

        const screenHeight = getScreenHeightAtCameraDistance( this.m_DistanceFromCamera, this.m_Camera.fov );
        const screenWidth = getScreenWidthAtCameraDistance( this.m_DistanceFromCamera, screenHeight, this.m_Camera.aspect );

        // TITLE TEXT
        let name = "titleMsg";
        let titleMsgMesh = this.prepareMsgObject( "Algo-mission ", name, 1, 0xFFFFFF, screenWidth, 100 );
        let titleBotMesh = this.prepareBot( titleMsgMesh, this.m_BotMesh, name + "_bot" );

        const titleSpeed = 0.3;
        let yPos = (screenHeight/2) - (titleMsgMesh.userData.height*titleMsgMesh.scale.y);
        this.animateMsg( name, titleBotMesh, titleMsgMesh, screenWidth, yPos, -this.m_DistanceFromCamera, titleSpeed );

        yPos -= (titleMsgMesh.userData.height*titleMsgMesh.scale.y) / 2;
        const urlDelayMs = 3000;
        name = "urlMsg";
        let urlMsgMesh = this.prepareMsgObject( "(https://github.com/itfelstead/algo-mission)", name, 0.25, 0xFFFFFF, screenWidth, 30 );
        setTimeout( this.displaySimpleMsg.bind(this, urlMsgMesh, yPos, -this.m_DistanceFromCamera), urlDelayMs );

        const titlePadding = (titleMsgMesh.userData.height*titleMsgMesh.scale.y);
        let remainingHeight = screenHeight - (titleMsgMesh.userData.height*titleMsgMesh.scale.y) - titlePadding;
        
        // info #
        const infoDelayMs = 3000;
        yPos -= titlePadding;
        name = "info1Msg";
        let info1MsgMesh = this.prepareMsgObject( "Mission: Can you tell the bus exactly how to get to the bus stop?", name, 0.5, 0xFFFFFF, screenWidth, 60 );
        setTimeout( this.displaySimpleMsg.bind(this, info1MsgMesh, yPos, -this.m_DistanceFromCamera), infoDelayMs );

        let padding = (info1MsgMesh.userData.height*info1MsgMesh.scale.y)+2 ;
        yPos -= ((info1MsgMesh.userData.height*info1MsgMesh.scale.y) + padding);

        // tip
        const tipDelayMs = 10000;
        let tipIdx = Math.floor(Math.random() * tips.length);
        name = "tip";
        let tipMsgMesh = this.prepareMsgObject( "Tip: " + tips[tipIdx], name, 0.33, 0xFFFFFF, screenWidth, 40 );
        let tipBotMesh = this.prepareBot( tipMsgMesh, this.m_BotMesh, name + "_bot" );
        this.animateMotivationMsg( tipDelayMs, name, tipBotMesh, tipMsgMesh, screenWidth, yPos, -this.m_DistanceFromCamera );

        // click to continue
        padding = (tipMsgMesh.userData.height*tipMsgMesh.scale.y);
        yPos -= ((tipMsgMesh.userData.height*tipMsgMesh.scale.y) + padding);
        const clickDelayMs = 3000;
        let clickMsgMesh = this.prepareMsgObject( TitleScreen.SMILEY + "Click to continue" + TitleScreen.SMILEY, name, 0.5, 0xFFFFFF, screenWidth, 40 );

        yPos = -((screenHeight/2) - (clickMsgMesh.userData.height*clickMsgMesh.scale.y));
        let clickBotMesh = this.prepareBot( clickMsgMesh, this.m_BotMesh, name + "_bot" );
        this.animateMotivationMsg( clickDelayMs, name, clickBotMesh, clickMsgMesh, screenWidth, yPos, -this.m_DistanceFromCamera );

    }

    // called via gameloop
    update() {
        if( this.m_Finished ) {
            // gamemgr will stop calling update when state is moved anyway
            return;
        }

        const screenHeight = getScreenHeightAtCameraDistance( this.m_DistanceFromCamera, this.m_Camera.fov );
        const screenWidth = getScreenWidthAtCameraDistance( this.m_DistanceFromCamera, screenHeight, this.m_Camera.aspect );

        for (var job in this.m_MoveJobs) {
            this.moveAcrossScreen( job, screenWidth );
        }
    }

    displaySimpleMsg( msgMesh, yPos, zPos ) {
        msgMesh.position.set( 0, yPos, zPos );
        msgMesh.visible = true;
    }

    animateMotivationMsg( delayMs, name, botMesh, msgMesh, screenWidth, yPos, zPos ) {
        const speed = 0.6;
        setTimeout(this.animateMsg.bind(this, name, botMesh, msgMesh, screenWidth, yPos, zPos, speed ), delayMs);
    }

    animateMsg( name, botMesh, msgMesh, screenWidth, yPos, zPos, moveStep ) {

        if( this.m_Finished ) {
            // no point adding a (delayed) job if title screen has exited
            return;
        }

        const effectiveBotWidth = botMesh.userData.depth*botMesh.scale.z;
        let botStart = (screenWidth / 2) + (effectiveBotWidth/2);
        let msgStart = botStart + (effectiveBotWidth/2) + ((msgMesh.userData.width*msgMesh.scale.x)/2);

        botMesh.visible = true;
        msgMesh.visible = true;

        botMesh.position.set( -botStart, yPos - ((msgMesh.userData.height*msgMesh.scale.y)/2), zPos );
        msgMesh.position.set( -msgStart, yPos, zPos );

        // create move job that gets picked up by update()
        let job = { "jobName": name,
                    "botMesh": botMesh,
                    "msgMesh": msgMesh,
                     "moveStep": moveStep };
        
        this.m_MoveJobs[name] = job;
    }

    moveAcrossScreen( jobName, screenWidth ) {

        if( !this.m_MoveJobs.hasOwnProperty(jobName) ) {
            return;
        }

        let job = this.m_MoveJobs[ jobName ];

        let msgMesh = job.msgMesh;
        let botMesh = job.botMesh;
        let moveStep = job.moveStep;

        // Stop moving the msgMesh when x >= 0 (i.e. drop it in middle of screen)
        if( msgMesh.position.x < 0 ) {
            msgMesh.position.x += moveStep;
        }

        // Stop moving and remove the botMesh when x > screenWidth + bot depth/2 (i.e. bot off screen)
        if( botMesh.position.x <= ( screenWidth + (botMesh.userData.depth/2) ) ) {
            botMesh.position.x += moveStep;
        }
        else {
            // Stop animation when bot off screen
            delete this.m_MoveJobs[job];
        }
    }

    prepareMsgObject( text, name, size, colour, screenWidth, percentOfWidth ) {

        let mesh = messageToMesh(document, text, size, colour, undefined );
        mesh.name = name;
        // scale msg to fit the screen.... but don't stretch it beyond 2.5 times

        let scale = boundedScaleTo( screenWidth, 2.5, mesh.userData.width );

        mesh.scale.set( scale, scale, 1 );
        mesh.visible = false;
 
        this.m_Camera.add(mesh);
        this.m_ObjectsToCleanUp.push(mesh.name);

        return mesh;
    }

    prepareBot( associatedMsgMesh, botMesh, name ) {
        // Add a suitably sized bus mesh 
        let botMsgCopy = botMesh.clone(); 
        botMsgCopy.name = name;
        botMsgCopy.rotateY(Math.PI/2);  // make bot face right

        let botHeight = botMsgCopy.userData.height;

        let botHeightAsPercentOfMsgHeight = 150;
        let botScale = determineScale( (associatedMsgMesh.userData.height * associatedMsgMesh.scale.y), botHeightAsPercentOfMsgHeight, botHeight );
        botMsgCopy.scale.set( 0.01, botScale, botScale );   // note: keep bot flat by making x scale small
        botMsgCopy.visible = false;

        this.m_Camera.add( botMsgCopy );
        this.m_ObjectsToCleanUp.push(botMsgCopy.name);

        return botMsgCopy;
    }

    hide() {
        for( let i=0; i < this.m_ObjectsToCleanUp.length; ++i ) {
            let obj = this.m_Camera.getObjectByName( this.m_ObjectsToCleanUp[i] );
            if( obj ) {
                this.m_Camera.remove( obj );
            }
        }
        this.m_Finished = true;
    }
}

export { TitleScreen };