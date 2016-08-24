/**
	The InstructionManager class.

	Author: Ian Felstead
*/

"use strict";
 
/**
 * @namespace The algo-mission namespace
 */
var ALGO = ALGO || {};

/**
* constructor
* @class The InstructionManager class. Manages the instruction window in the game.
*/
var InstructionManager = function () 
{
	this.instructions = [];
	this.html = "<b>Instructions:<b><p>";
	this.instructionPtr = this.instructionConfig.NO_INSTRUCTION; 	// index into this.instructions
};

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
	   
	   	properties: {
			1: {displayString: "forward<p>", value: 1},
			2: {displayString: "back<p>", value: 2},
	       	3: {displayString: "left<p>", value: 3},
	       	4: {displayString: "right<p>", value: 4},               
	       	5: {displayString: "go<p>", value: 5},
	       	6: {displayString: "fire!<p>", value: 6},
	       	7: {displayString: "pause..<p>", value: 7},
	       	8: {displayString: "", value: 8}
		}
	}
);

/**
* generateInstructionHtml()
* 
*
*/
InstructionManager.prototype.generateInstructionHtml = function()
{
	var html = "<b>Instructions<b><p>";
	
	var numInstructions = this.instructions.length;
	for( var i = 0; i < numInstructions; i++ )
	{
		if( i == this.instructionPtr )
		{
			 html += "<b>";
		}

		var operEnum = this.instructions[i];

		html += this.instructionConfig.properties[ operEnum ].displayString;

		if( i == this.instructionPtr )
		{
			 html += "</b>";
		}
	}

	return html;
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
	if( this.instructionPtr >= this.instructions.length )
	{
		this.instructionPtr = this.instructionConfig.NO_INSTRUCTION;
	}
	return this.instructions[ this.instructionPtr ];
}
