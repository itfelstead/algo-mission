/**
	The InstructionManager class.

	Author: Ian Felstead
*/

"use strict";

/**
 * @namespace The algo-mission namespace
 */
var ALGO = ALGO || {};

var TMapState = {
	NONE: 0,
	BAD: 1,
	GOOD: 2
  };

/**
* constructor
* @class The InstructionManager class. Manages the instruction window in the game.
*/
var InstructionManager = function (mapManager)
{
	this.instructions = [];
	this.html = "<b>Instructions:<b><p>";
	this.instructionPtr = this.instructionConfig.NO_INSTRUCTION; 	// index into this.instructions

	this.mapManager = mapManager;   		// for map tile events that impact the instruction list
	mapManager.registerObserver( this );    // We want to know something of interest happens (e.g. moved tile)	

	this.currentHint = TMapState.NONE;
};

InstructionManager.prototype.updateTriggered = function( role )
{
  console.log("InstructionManager got an event from the map, " + role);

  // Make bot react to move to a new tile role (if supported)
  if( role != "" )
  {
	if( role == "NO_TILE")
	{
		this.currentHint = TMapState.BAD;
	}
	else if( role == "END" )
	{
		this.currentHint = TMapState.GOOD;
	}
  }
}

/**
* Supported Instructions
*/
InstructionManager.prototype.instructionConfig = Object.freeze(
	{
		NO_INSTRUCTION: -1,
		FORWARD: 1,
	   	BACK: 2,
	   	LEFT: 3,
	   	RIGHT: 4,
	   	GO: 5,
	   	FIRE: 6,
	   	PAUSE: 7,
	   	CLEAR: 8,
		GRID: 9,

	   	properties: {
			1: {displayString: "forward<p>", value: 1},
			2: {displayString: "back<p>", value: 2},
	       	3: {displayString: "left<p>", value: 3},
	       	4: {displayString: "right<p>", value: 4},
	       	5: {displayString: "go<p>", value: 5},
	       	6: {displayString: "honk!<p>", value: 6},
	       	7: {displayString: "pause..<p>", value: 7},
	       	8: {displayString: "", value: 8},
			9: {displayString: "", value: 9}
		}
	}
);

/**
* addInstructionWindow()
*
*
*/
InstructionManager.prototype.addInstructionWindow = function()
{
	var instructionDiv = document.createElement('div');

	instructionDiv.id = "instructionTextBox";
	instructionDiv.style.cssText =
	            "width: 200px;" +
				"height: 200px;" +
				"left: 20px;" +
				"top: 20px;" +
				"max-height: 200px;" +
				"min-height: 200px;" +
				"border: none;" +  /* or e.g. '2px solid black' */
				"background-color: DimGray;" +
				"color: White;" +
				// we want a 50% transparent background, but not
				// transparent text, so use rgba rather than opacity.
				"background: rgba(105, 105, 105, 0.5);" +
				"overflow: auto;" +
				"position: absolute;" +
				"font: 12px arial,serif;";

	instructionDiv.style.opacity = 0.0;		// we'll set to 1 after loading

	document.body.appendChild(instructionDiv);
}

/**
* setWindowOpacity()
*
*
*/
InstructionManager.prototype.setWindowOpacity = function( opacity )
{
	document.getElementById("instructionTextBox").style.opacity = opacity;
}

/**
* updateWindow()
*
*
*/
InstructionManager.prototype.updateWindow = function(scrollType)
{
	document.getElementById("instructionTextBox").innerHTML = this.generateInstructionHtml();
	if( scrollType == 1 )
	{
		this.followScroll();
	}
	else
	{
		this.tailScroll();
	}
}

/**
* generateInstructionHtml()
*
*
*/
InstructionManager.prototype.generateInstructionHtml = function( )
{
	var html = "<b style='color:#ffeaf8;'>Instructions</b><p>";

	var numInstructions = this.instructions.length;
	for( var i = 0; i < numInstructions; i++ )
	{
		if( i == this.instructionPtr )
		{
			if( this.currentHint == TMapState.BAD ) 	// bad move
			{
				html += "<b><i style='color:#cc0000;' >";
			}
			else if( this.currentHint == TMapState.GOOD ) // good move
			{
				html += "<b><i style='color:#ffc61a;' >";
			}
			else 		// neutral move
			{
				 html += "<b><i style='color:#a3ff5e;' >";
			}
		}

		var operEnum = this.instructions[i];

		html += this.instructionConfig.properties[ operEnum ].displayString;

		if( i == this.instructionPtr )
		{
			 html += " </i></b>";
		}
	}

	return html;
}

/**
* tailScroll()
*
*
*/
InstructionManager.prototype.tailScroll = function()
{
	document.getElementById("instructionTextBox").scrollTop = document.getElementById("instructionTextBox").scrollHeight;
}

/**
* followScroll()
*
*
*/
InstructionManager.prototype.followScroll = function()
{
	var followTop = (document.getElementById("instructionTextBox").scrollHeight / this.instructions.length) * this.instructionPtr;

	document.getElementById("instructionTextBox").scrollTop = followTop;
}

/**
* clearInstructions()
*
*
*/
InstructionManager.prototype.clearInstructions = function()
{
	this.instructionPtr = this.instructionConfig.NO_INSTRUCTION;
	this.instructions = [];
	this.currentHint = TMapState.NONE;
}

/**
* addInstruction()
*
*
*/
InstructionManager.prototype.addInstruction = function( instructionName )
{
	this.instructions.push( instructionName );
}

/**
* isRunning()
*
* true if instructions are in progress, false if not.
*/
InstructionManager.prototype.isRunning = function()
{
	return (this.instructionPtr != this.instructionConfig.NO_INSTRUCTION);
}

/**
* startInstructions()
*
*/
InstructionManager.prototype.startInstructions = function()
{
	this.instructionPtr = 0;  // point to 1st instruction
}

/**
* currentInstruction()
*
*
*/
InstructionManager.prototype.currentInstruction = function()
{
	return this.instructions[ this.instructionPtr ];
}

/**
* currentInstruction()
*
*
*/
InstructionManager.prototype.nextInstruction = function()
{
	this.instructionPtr++;
	console.log("nextInstruction; ", this.instructionPtr);
	if( this.instructionPtr >= this.instructions.length )
	{
		this.instructionPtr = this.instructionConfig.NO_INSTRUCTION;
    	return undefined;
	}

	return this.instructions[ this.instructionPtr ];
}

/**
* numInstructions()
*
*
*/
InstructionManager.prototype.numInstructions = function()
{
	return 	this.instructions.length;
}
