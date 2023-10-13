(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
exports = module.exports = stringify
exports.getSerialize = serializer

function stringify(obj, replacer, spaces, cycleReplacer) {
  return JSON.stringify(obj, serializer(replacer, cycleReplacer), spaces)
}

function serializer(replacer, cycleReplacer) {
  var stack = [], keys = []

  if (cycleReplacer == null) cycleReplacer = function(key, value) {
    if (stack[0] === value) return "[Circular ~]"
    return "[Circular ~." + keys.slice(0, stack.indexOf(value)).join(".") + "]"
  }

  return function(key, value) {
    if (stack.length > 0) {
      var thisPos = stack.indexOf(this)
      ~thisPos ? stack.splice(thisPos + 1) : stack.push(this)
      ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key)
      if (~stack.indexOf(value)) value = cycleReplacer.call(this, key, value)
    }
    else stack.push(value)

    return replacer == null ? value : replacer.call(this, key, value)
  }
}

},{}],2:[function(require,module,exports){
/*
 * random-seed
 * https://github.com/skratchdot/random-seed
 *
 * This code was originally written by Steve Gibson and can be found here:
 *
 * https://www.grc.com/otg/uheprng.htm
 *
 * It was slightly modified for use in node, to pass jshint, and a few additional
 * helper functions were added.
 *
 * Copyright (c) 2013 skratchdot
 * Dual Licensed under the MIT license and the original GRC copyright/license
 * included below.
 */
/*	============================================================================
									Gibson Research Corporation
				UHEPRNG - Ultra High Entropy Pseudo-Random Number Generator
	============================================================================
	LICENSE AND COPYRIGHT:  THIS CODE IS HEREBY RELEASED INTO THE PUBLIC DOMAIN
	Gibson Research Corporation releases and disclaims ALL RIGHTS AND TITLE IN
	THIS CODE OR ANY DERIVATIVES. Anyone may be freely use it for any purpose.
	============================================================================
	This is GRC's cryptographically strong PRNG (pseudo-random number generator)
	for JavaScript. It is driven by 1536 bits of entropy, stored in an array of
	48, 32-bit JavaScript variables.  Since many applications of this generator,
	including ours with the "Off The Grid" Latin Square generator, may require
	the deteriministic re-generation of a sequence of PRNs, this PRNG's initial
	entropic state can be read and written as a static whole, and incrementally
	evolved by pouring new source entropy into the generator's internal state.
	----------------------------------------------------------------------------
	ENDLESS THANKS are due Johannes Baagoe for his careful development of highly
	robust JavaScript implementations of JS PRNGs.  This work was based upon his
	JavaScript "Alea" PRNG which is based upon the extremely robust Multiply-
	With-Carry (MWC) PRNG invented by George Marsaglia. MWC Algorithm References:
	http://www.GRC.com/otg/Marsaglia_PRNGs.pdf
	http://www.GRC.com/otg/Marsaglia_MWC_Generators.pdf
	----------------------------------------------------------------------------
	The quality of this algorithm's pseudo-random numbers have been verified by
	multiple independent researchers. It handily passes the fermilab.ch tests as
	well as the "diehard" and "dieharder" test suites.  For individuals wishing
	to further verify the quality of this algorithm's pseudo-random numbers, a
	256-megabyte file of this algorithm's output may be downloaded from GRC.com,
	and a Microsoft Windows scripting host (WSH) version of this algorithm may be
	downloaded and run from the Windows command prompt to generate unique files
	of any size:
	The Fermilab "ENT" tests: http://fourmilab.ch/random/
	The 256-megabyte sample PRN file at GRC: https://www.GRC.com/otg/uheprng.bin
	The Windows scripting host version: https://www.GRC.com/otg/wsh-uheprng.js
	----------------------------------------------------------------------------
	Qualifying MWC multipliers are: 187884, 686118, 898134, 1104375, 1250205,
	1460910 and 1768863. (We use the largest one that's < 2^21)
	============================================================================ */
'use strict';
var stringify = require('json-stringify-safe');

/*	============================================================================
This is based upon Johannes Baagoe's carefully designed and efficient hash
function for use with JavaScript.  It has a proven "avalanche" effect such
that every bit of the input affects every bit of the output 50% of the time,
which is good.	See: http://baagoe.com/en/RandomMusings/hash/avalanche.xhtml
============================================================================
*/
var Mash = function () {
	var n = 0xefc8249d;
	var mash = function (data) {
		if (data) {
			data = data.toString();
			for (var i = 0; i < data.length; i++) {
				n += data.charCodeAt(i);
				var h = 0.02519603282416938 * n;
				n = h >>> 0;
				h -= n;
				h *= n;
				n = h >>> 0;
				h -= n;
				n += h * 0x100000000; // 2^32
			}
			return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
		} else {
			n = 0xefc8249d;
		}
	};
	return mash;
};

var uheprng = function (seed) {
	return (function () {
		var o = 48; // set the 'order' number of ENTROPY-holding 32-bit values
		var c = 1; // init the 'carry' used by the multiply-with-carry (MWC) algorithm
		var p = o; // init the 'phase' (max-1) of the intermediate variable pointer
		var s = new Array(o); // declare our intermediate variables array
		var i; // general purpose local
		var j; // general purpose local
		var k = 0; // general purpose local

		// when our "uheprng" is initially invoked our PRNG state is initialized from the
		// browser's own local PRNG. This is okay since although its generator might not
		// be wonderful, it's useful for establishing large startup entropy for our usage.
		var mash = new Mash(); // get a pointer to our high-performance "Mash" hash

		// fill the array with initial mash hash values
		for (i = 0; i < o; i++) {
			s[i] = mash(Math.random());
		}

		// this PRIVATE (internal access only) function is the heart of the multiply-with-carry
		// (MWC) PRNG algorithm. When called it returns a pseudo-random number in the form of a
		// 32-bit JavaScript fraction (0.0 to <1.0) it is a PRIVATE function used by the default
		// [0-1] return function, and by the random 'string(n)' function which returns 'n'
		// characters from 33 to 126.
		var rawprng = function () {
			if (++p >= o) {
				p = 0;
			}
			var t = 1768863 * s[p] + c * 2.3283064365386963e-10; // 2^-32
			return s[p] = t - (c = t | 0);
		};

		// this EXPORTED function is the default function returned by this library.
		// The values returned are integers in the range from 0 to range-1. We first
		// obtain two 32-bit fractions (from rawprng) to synthesize a single high
		// resolution 53-bit prng (0 to <1), then we multiply this by the caller's
		// "range" param and take the "floor" to return a equally probable integer.
		var random = function (range) {
			return Math.floor(range * (rawprng() + (rawprng() * 0x200000 | 0) * 1.1102230246251565e-16)); // 2^-53
		};

		// this EXPORTED function 'string(n)' returns a pseudo-random string of
		// 'n' printable characters ranging from chr(33) to chr(126) inclusive.
		random.string = function (count) {
			var i;
			var s = '';
			for (i = 0; i < count; i++) {
				s += String.fromCharCode(33 + random(94));
			}
			return s;
		};

		// this PRIVATE "hash" function is used to evolve the generator's internal
		// entropy state. It is also called by the EXPORTED addEntropy() function
		// which is used to pour entropy into the PRNG.
		var hash = function () {
			var args = Array.prototype.slice.call(arguments);
			for (i = 0; i < args.length; i++) {
				for (j = 0; j < o; j++) {
					s[j] -= mash(args[i]);
					if (s[j] < 0) {
						s[j] += 1;
					}
				}
			}
		};

		// this EXPORTED "clean string" function removes leading and trailing spaces and non-printing
		// control characters, including any embedded carriage-return (CR) and line-feed (LF) characters,
		// from any string it is handed. this is also used by the 'hashstring' function (below) to help
		// users always obtain the same EFFECTIVE uheprng seeding key.
		random.cleanString = function (inStr) {
			inStr = inStr.replace(/(^\s*)|(\s*$)/gi, ''); // remove any/all leading spaces
			inStr = inStr.replace(/[\x00-\x1F]/gi, ''); // remove any/all control characters
			inStr = inStr.replace(/\n /, '\n'); // remove any/all trailing spaces
			return inStr; // return the cleaned up result
		};

		// this EXPORTED "hash string" function hashes the provided character string after first removing
		// any leading or trailing spaces and ignoring any embedded carriage returns (CR) or Line Feeds (LF)
		random.hashString = function (inStr) {
			inStr = random.cleanString(inStr);
			mash(inStr); // use the string to evolve the 'mash' state
			for (i = 0; i < inStr.length; i++) { // scan through the characters in our string
				k = inStr.charCodeAt(i); // get the character code at the location
				for (j = 0; j < o; j++) { //	"mash" it into the UHEPRNG state
					s[j] -= mash(k);
					if (s[j] < 0) {
						s[j] += 1;
					}
				}
			}
		};

		// this EXPORTED function allows you to seed the random generator.
		random.seed = function (seed) {
			if (typeof seed === 'undefined' || seed === null) {
				seed = Math.random();
			}
			if (typeof seed !== 'string') {
				seed = stringify(seed, function (key, value) {
					if (typeof value === 'function') {
						return (value).toString();
					}
					return value;
				});
			}
			random.initState();
			random.hashString(seed);
		};

		// this handy exported function is used to add entropy to our uheprng at any time
		random.addEntropy = function ( /* accept zero or more arguments */ ) {
			var args = [];
			for (i = 0; i < arguments.length; i++) {
				args.push(arguments[i]);
			}
			hash((k++) + (new Date().getTime()) + args.join('') + Math.random());
		};

		// if we want to provide a deterministic startup context for our PRNG,
		// but without directly setting the internal state variables, this allows
		// us to initialize the mash hash and PRNG's internal state before providing
		// some hashing input
		random.initState = function () {
			mash(); // pass a null arg to force mash hash to init
			for (i = 0; i < o; i++) {
				s[i] = mash(' '); // fill the array with initial mash hash values
			}
			c = 1; // init our multiply-with-carry carry
			p = o; // init our phase
		};

		// we use this (optional) exported function to signal the JavaScript interpreter
		// that we're finished using the "Mash" hash function so that it can free up the
		// local "instance variables" is will have been maintaining.  It's not strictly
		// necessary, of course, but it's good JavaScript citizenship.
		random.done = function () {
			mash = null;
		};

		// if we called "uheprng" with a seed value, then execute random.seed() before returning
		if (typeof seed !== 'undefined') {
			random.seed(seed);
		}

		// Returns a random integer between 0 (inclusive) and range (exclusive)
		random.range = function (range) {
			return random(range);
		};

		// Returns a random float between 0 (inclusive) and 1 (exclusive)
		random.random = function () {
			return random(Number.MAX_VALUE - 1) / Number.MAX_VALUE;
		};

		// Returns a random float between min (inclusive) and max (exclusive)
		random.floatBetween = function (min, max) {
			return random.random() * (max - min) + min;
		};

		// Returns a random integer between min (inclusive) and max (inclusive)
		random.intBetween = function (min, max) {
			return Math.floor(random.random() * (max - min + 1)) + min;
		};

		// when our main outer "uheprng" function is called, after setting up our
		// initial variables and entropic state, we return an "instance pointer"
		// to the internal anonymous function which can then be used to access
		// the uheprng's various exported functions.  As with the ".done" function
		// above, we should set the returned value to 'null' once we're finished
		// using any of these functions.
		return random;
	}());
};

// Modification for use in node:
uheprng.create = function (seed) {
	return new uheprng(seed);
};
module.exports = uheprng;

},{"json-stringify-safe":1}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Map_1 = require("../DataTypes/Map");
/**
 * A manager class for all of the AI in a scene.
 * Keeps a list of registered actors and handles AI generation for actors.
 */
class AIManager {
    constructor() {
        this.actors = new Array();
        this.registeredAI = new Map_1.default();
    }
    /**
     * Registers an actor with the AIManager
     * @param actor The actor to register
     */
    registerActor(actor) {
        this.actors.push(actor);
    }
    removeActor(actor) {
        let index = this.actors.indexOf(actor);
        if (index !== -1) {
            this.actors.splice(index, 1);
        }
    }
    /**
     * Registers an AI with the AIManager for use later on
     * @param name The name of the AI to register
     * @param constr The constructor for the AI
     */
    registerAI(name, constr) {
        this.registeredAI.add(name, constr);
    }
    /**
     * Generates an AI instance from its name
     * @param name The name of the AI to add
     * @returns A new AI instance
     */
    generateAI(name) {
        if (this.registeredAI.has(name)) {
            return new (this.registeredAI.get(name))();
        }
        else {
            throw `Cannot create AI with name ${name}, no AI with that name is registered`;
        }
    }
    update(deltaT) {
        // Run the ai for every active actor
        this.actors.forEach(actor => { if (actor.aiActive)
            actor.ai.update(deltaT); });
    }
}
exports.default = AIManager;

},{"../DataTypes/Map":10}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const StateMachine_1 = require("../DataTypes/State/StateMachine");
/**
 * A version of a @reference[StateMachine] that is configured to work as an AI controller for a @reference[GameNode]
 */
class StateMachineAI extends StateMachine_1.default {
    // @implemented
    initializeAI(owner, config) { }
    // @implemented
    destroy() {
        // Get rid of our reference to the owner
        delete this.owner;
        this.receiver.destroy();
    }
    // @implemented
    activate(options) { }
}
exports.default = StateMachineAI;

},{"../DataTypes/State/StateMachine":21}],5:[function(require,module,exports){
"use strict";
// @ignorePage
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * A placeholder function for No Operation. Does nothing
 */
const NullFunc = () => { };
exports.default = NullFunc;

},{}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * A linked-list for the edges in a @reference[Graph].
 */
class EdgeNode {
    /**
     * Creates a new EdgeNode
     * @param index The index of the node this edge connects to
     * @param weight The weight of this edge
     */
    constructor(index, weight) {
        this.y = index;
        this.next = null;
        this.weight = weight ? weight : 1;
    }
}
exports.default = EdgeNode;

},{}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_V = void 0;
const EdgeNode_1 = require("./EdgeNode");
exports.MAX_V = 100;
/**
 * An implementation of a graph data structure using edge lists. Inspired by The Algorithm Design Manual.
 */
class Graph {
    /**
     * Constructs a new graph
     * @param directed Whether or not this graph is directed
     */
    constructor(directed = false) {
        this.directed = directed;
        this.weighted = false;
        this.numVertices = 0;
        this.numEdges = 0;
        this.edges = new Array(exports.MAX_V);
        this.degree = new Array(exports.MAX_V);
    }
    /** Adds a node to this graph and returns the index of it
     * @returns The index of the new node
    */
    addNode() {
        this.numVertices++;
        return this.numVertices;
    }
    /** Adds an edge between node x and y, with an optional weight
     * @param x The index of the start of the edge
     * @param y The index of the end of the edge
     * @param weight The optional weight of the new edge
    */
    addEdge(x, y, weight) {
        let edge = new EdgeNode_1.default(y, weight);
        if (this.edges[x]) {
            edge.next = this.edges[x];
        }
        this.edges[x] = edge;
        if (!this.directed) {
            edge = new EdgeNode_1.default(x, weight);
            if (this.edges[y]) {
                edge.next = this.edges[y];
            }
            this.edges[y] = edge;
        }
        this.numEdges += 1;
    }
    /**
     * Checks whether or not an edge exists between two nodes.
     * This check is directional if this is a directed graph.
     * @param x The first node
     * @param y The second node
     * @returns true if an edge exists, false otherwise
     */
    edgeExists(x, y) {
        let edge = this.edges[x];
        while (edge !== null) {
            if (edge.y === y) {
                return true;
            }
            edge = edge.next;
        }
    }
    /**
     * Gets the edge list associated with node x
     * @param x The index of the node
     * @returns The head of a linked-list of edges
     */
    getEdges(x) {
        return this.edges[x];
    }
    /**
     * Gets the degree associated with node x
     * @param x The index of the node
     */
    getDegree(x) {
        return this.degree[x];
    }
    /**
     * Converts the specifed node into a string
     * @param index The index of the node to convert to a string
     * @returns The string representation of the node: "Node x"
     */
    nodeToString(index) {
        return "Node " + index;
    }
    /**
     * Converts the Graph into a string format
     * @returns The graph as a string
     */
    toString() {
        let retval = "";
        for (let i = 0; i < this.numVertices; i++) {
            let edge = this.edges[i];
            let edgeStr = "";
            while (edge !== undefined && edge !== null) {
                edgeStr += edge.y.toString();
                if (this.weighted) {
                    edgeStr += " (" + edge.weight + ")";
                }
                if (edge.next !== null) {
                    edgeStr += ", ";
                }
                edge = edge.next;
            }
            retval += this.nodeToString(i) + ": " + edgeStr + "\n";
        }
        return retval;
    }
}
exports.default = Graph;

},{"./EdgeNode":6}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Graph_1 = require("./Graph");
/**
 * An extension of Graph that has nodes with positions in 2D space.
 * This is a weighted graph (though not inherently directd)
*/
class PositionGraph extends Graph_1.default {
    /**
     * Createes a new PositionGraph
     * @param directed Whether or not this graph is directed
     */
    constructor(directed = false) {
        super(directed);
        this.debugRender = () => {
            // for(let point of this.positions){
            // 	ctx.fillRect((point.x - origin.x - 4)*zoom, (point.y - origin.y - 4)*zoom, 8, 8);
            // }
        };
        this.positions = new Array(Graph_1.MAX_V);
    }
    /**
     * Adds a positioned node to this graph
     * @param position The position of the node to add
     * @returns The index of the added node
     */
    addPositionedNode(position) {
        this.positions[this.numVertices] = position;
        return this.addNode();
    }
    /**
     * Changes the position of a node.
     * Automatically adjusts the weights of the graph tied to this node.
     * As such, be warned that this function has an O(n + m) running time, and use it sparingly.
     * @param index The index of the node
     * @param position The new position of the node
     */
    setNodePosition(index, position) {
        this.positions[index] = position;
        // Recalculate all weights associated with this index
        for (let i = 0; i < this.numEdges; i++) {
            let edge = this.edges[i];
            while (edge !== null) {
                // If this node is on either side of the edge, recalculate weight
                if (i === index || edge.y === index) {
                    edge.weight = this.positions[i].distanceTo(this.positions[edge.y]);
                }
                edge = edge.next;
            }
        }
    }
    /**
     * Gets the position of a node
     * @param index The index of the node
     * @returns The position of the node
     */
    getNodePosition(index) {
        return this.positions[index];
    }
    /**
     * Adds an edge to this graph between node x and y.
     * Automatically calculates the weight of the edge as the distance between the nodes.
     * @param x The beginning of the edge
     * @param y The end of the edge
     */
    addEdge(x, y) {
        if (!this.positions[x] || !this.positions[y]) {
            throw "Can't add edge to un-positioned node!";
        }
        // Weight is the distance between the nodes
        let weight = this.positions[x].distanceTo(this.positions[y]);
        super.addEdge(x, y, weight);
    }
    // @override
    nodeToString(index) {
        return "Node " + index + " - " + this.positions[index].toString();
    }
}
exports.default = PositionGraph;

},{"./Graph":7}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRegion = void 0;
function isRegion(arg) {
    return arg && arg.size && arg.scale && arg.boundary;
}
exports.isRegion = isRegion;

},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Associates strings with elements of type T
 */
class Map {
    /** Creates a new map */
    constructor() {
        this.map = {};
    }
    /**
     * Adds a value T stored at a key.
     * @param key The key of the item to be stored
     * @param value The item to be stored
     */
    add(key, value) {
        this.map[key] = value;
    }
    /**
     * Get the value associated with a key.
     * @param key The key of the item
     * @returns The item at the key or undefined
     */
    get(key) {
        return this.map[key];
    }
    /**
     * An alias of add. Sets the value stored at key to the new specified value
     * @param key The key of the item to be stored
     * @param value The item to be stored
     */
    set(key, value) {
        this.add(key, value);
    }
    /**
     * Returns true if there is a value stored at the specified key, false otherwise.
     * @param key The key to check
     * @returns A boolean representing whether or not there is an item at the given key.
     */
    has(key) {
        return this.map[key] !== undefined;
    }
    /**
     * Returns an array of all of the keys in this map.
     * @returns An array containing all keys in the map.
     */
    keys() {
        return Object.keys(this.map);
    }
    // @implemented
    forEach(func) {
        Object.keys(this.map).forEach(key => func(key));
    }
    /**
     * Deletes an item associated with a key
     * @param key The key at which to delete an item
     */
    delete(key) {
        delete this.map[key];
    }
    // @implemented
    clear() {
        this.forEach(key => delete this.map[key]);
    }
    /**
     * Converts this map to a string representation.
     * @returns The string representation of this map.
     */
    toString() {
        let str = "";
        this.forEach((key) => str += key + " -> " + this.get(key).toString() + "\n");
        return str;
    }
}
exports.default = Map;

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("./Vec2");
/** A 4x4 matrix0 */
class Mat4x4 {
    constructor() {
        this.mat = new Float32Array([
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0
        ]);
    }
    // Static members
    static get IDENTITY() {
        return new Mat4x4().identity();
    }
    static get ZERO() {
        return new Mat4x4().zero();
    }
    // Accessors
    set _00(x) {
        this.mat[0] = x;
    }
    set(col, row, value) {
        if (col < 0 || col > 3 || row < 0 || row > 3) {
            throw `Error - index (${col}, ${row}) is out of bounds for Mat4x4`;
        }
        this.mat[row * 4 + col] = value;
        return this;
    }
    get(col, row) {
        return this.mat[row * 4 + col];
    }
    setAll(...items) {
        this.mat.set(items);
        return this;
    }
    identity() {
        return this.setAll(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    }
    zero() {
        return this.setAll(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
    /**
     * Makes this Mat4x4 a rotation matrix of the specified number of radians ccw
     * @param zRadians The number of radians to rotate
     * @returns this Mat4x4
     */
    rotate(zRadians) {
        return this.setAll(Math.cos(zRadians), -Math.sin(zRadians), 0, 0, Math.sin(zRadians), Math.cos(zRadians), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    }
    /**
     * Turns this Mat4x4 into a translation matrix of the specified translation
     * @param translation The translation in x and y
     * @returns this Mat4x4
     */
    translate(translation) {
        // If translation is a vec, get its array
        if (translation instanceof Vec2_1.default) {
            translation = translation.toArray();
        }
        return this.setAll(1, 0, 0, translation[0], 0, 1, 0, translation[1], 0, 0, 1, 0, 0, 0, 0, 1);
    }
    scale(scale) {
        // Make sure scale is a float32Array
        if (scale instanceof Vec2_1.default) {
            scale = scale.toArray();
        }
        else if (!(scale instanceof Float32Array)) {
            scale = new Float32Array([scale, scale]);
        }
        return this.setAll(scale[0], 0, 0, 0, 0, scale[1], 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    }
    /**
     * Returns a new Mat4x4 that represents the right side multiplication THIS x OTHER
     * @param other The other Mat4x4 to multiply by
     * @returns a new Mat4x4 containing the product of these two Mat4x4s
     */
    mult(other, out) {
        let temp = new Float32Array(16);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                let value = 0;
                for (let k = 0; k < 4; k++) {
                    value += this.get(k, i) * other.get(j, k);
                }
                temp[j * 4 + i] = value;
            }
        }
        if (out !== undefined) {
            return out.setAll(...temp);
        }
        else {
            return new Mat4x4().setAll(...temp);
        }
    }
    /**
     * Multiplies all given matricies in order. e.g. MULT(A, B, C) -> A*B*C
     * @param mats A list of Mat4x4s to multiply in order
     * @returns A new Mat4x4 holding the result of the operation
     */
    static MULT(...mats) {
        // Create a new array
        let temp = Mat4x4.IDENTITY;
        // Multiply by every array in order, in place
        for (let i = 0; i < mats.length; i++) {
            temp.mult(mats[i], temp);
        }
        return temp;
    }
    toArray() {
        return this.mat;
    }
    toString() {
        return `|${this.mat[0].toFixed(2)}, ${this.mat[1].toFixed(2)}, ${this.mat[2].toFixed(2)}, ${this.mat[3].toFixed(2)}|\n` +
            `|${this.mat[4].toFixed(2)}, ${this.mat[5].toFixed(2)}, ${this.mat[6].toFixed(2)}, ${this.mat[7].toFixed(2)}|\n` +
            `|${this.mat[8].toFixed(2)}, ${this.mat[9].toFixed(2)}, ${this.mat[10].toFixed(2)}, ${this.mat[11].toFixed(2)}|\n` +
            `|${this.mat[12].toFixed(2)}, ${this.mat[13].toFixed(2)}, ${this.mat[14].toFixed(2)}, ${this.mat[15].toFixed(2)}|`;
    }
}
exports.default = Mat4x4;

},{"./Vec2":24}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * A class that contains the area of overlap of two colliding objects to allow for sorting by the physics system.
 */
class AreaCollision {
    /**
     * Creates a new AreaCollision object
     * @param area The area of the collision
     * @param collider The other collider
     */
    constructor(area, collider, other, type, tile) {
        this.area = area;
        this.collider = collider;
        this.other = other;
        this.type = type;
        this.tile = tile;
    }
}
exports.default = AreaCollision;

},{}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("../Vec2");
/**
 * An object representing the data collected from a physics hit between two geometric objects.
 * Inspired by the helpful collision documentation @link(here)(https://noonat.github.io/intersect/).
 */
class Hit {
    constructor() {
        /** The near times of the collision */
        this.nearTimes = Vec2_1.default.ZERO;
        /** The position of the collision */
        this.pos = Vec2_1.default.ZERO;
        /** The overlap distance of the hit */
        this.delta = Vec2_1.default.ZERO;
        /** The normal vector of the hit */
        this.normal = Vec2_1.default.ZERO;
    }
}
exports.default = Hit;

},{"../Vec2":24}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * A FIFO queue with elements of type T
 */
class Queue {
    /**
     * Constructs a new queue
     * @param maxElements The maximum size of the stack
     */
    constructor(maxElements = 100) {
        this.MAX_ELEMENTS = maxElements;
        this.q = new Array(this.MAX_ELEMENTS);
        this.head = 0;
        this.tail = 0;
        this.size = 0;
    }
    /**
     * Adds an item to the back of the queue
     * @param item The item to add to the back of the queue
     */
    enqueue(item) {
        if ((this.tail + 1) % this.MAX_ELEMENTS === this.head) {
            throw new Error("Queue full - cannot add element");
        }
        this.size += 1;
        this.q[this.tail] = item;
        this.tail = (this.tail + 1) % this.MAX_ELEMENTS;
    }
    /**
     * Retrieves an item from the front of the queue
     * @returns The item at the front of the queue
     */
    dequeue() {
        if (this.head === this.tail) {
            throw new Error("Queue empty - cannot remove element");
        }
        this.size -= 1;
        let item = this.q[this.head];
        // Now delete the item
        delete this.q[this.head];
        this.head = (this.head + 1) % this.MAX_ELEMENTS;
        return item;
    }
    /**
     * Returns the item at the front of the queue, but does not remove it
     * @returns The item at the front of the queue
     */
    peekNext() {
        if (this.head === this.tail) {
            throw "Queue empty - cannot get element";
        }
        let item = this.q[this.head];
        return item;
    }
    /**
     * Returns true if the queue has items in it, false otherwise
     * @returns A boolean representing whether or not this queue has items
     */
    hasItems() {
        return this.head !== this.tail;
    }
    /**
     * Returns the number of elements in the queue.
     * @returns The size of the queue
     */
    getSize() {
        return this.size;
    }
    // @implemented
    clear() {
        this.forEach((item, index) => delete this.q[index]);
        this.size = 0;
        this.head = this.tail;
    }
    // @implemented
    forEach(func) {
        let i = this.head;
        while (i !== this.tail) {
            func(this.q[i], i);
            i = (i + 1) % this.MAX_ELEMENTS;
        }
    }
    /**
     * Converts this queue into a string format
     * @returns A string representing this queue
     */
    toString() {
        let retval = "";
        this.forEach((item, index) => {
            let str = item.toString();
            if (index !== 0) {
                str += " -> ";
            }
            retval = str + retval;
        });
        return "Top -> " + retval;
    }
}
exports.default = Queue;

},{}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** A container for info about a webGL shader program */
class WebGLProgramType {
    /**
     * Deletes this shader program
     */
    delete(gl) {
        // Clean up all aspects of this program
        if (this.program) {
            gl.deleteProgram(this.program);
        }
        if (this.vertexShader) {
            gl.deleteShader(this.vertexShader);
        }
        if (this.fragmentShader) {
            gl.deleteShader(this.fragmentShader);
        }
    }
}
exports.default = WebGLProgramType;

},{}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Shape_1 = require("./Shape");
const Vec2_1 = require("../Vec2");
const MathUtils_1 = require("../../Utils/MathUtils");
const Circle_1 = require("./Circle");
const Hit_1 = require("../Physics/Hit");
/**
 * An Axis-Aligned Bounding Box. In other words, a rectangle that is always aligned to the x-y grid.
 * Inspired by the helpful collision documentation @link(here)(https://noonat.github.io/intersect/).
 */
class AABB extends Shape_1.default {
    /**
     * Creates a new AABB
     * @param center The center of the AABB
     * @param halfSize The half size of the AABB - The distance from the center to an edge in x and y
     */
    constructor(center, halfSize) {
        super();
        this.center = center ? center : new Vec2_1.default(0, 0);
        this.halfSize = halfSize ? halfSize : new Vec2_1.default(0, 0);
    }
    /** Returns a point representing the top left corner of the AABB */
    get topLeft() {
        return new Vec2_1.default(this.left, this.top);
    }
    /** Returns a point representing the top right corner of the AABB */
    get topRight() {
        return new Vec2_1.default(this.right, this.top);
    }
    /** Returns a point representing the bottom left corner of the AABB */
    get bottomLeft() {
        return new Vec2_1.default(this.left, this.bottom);
    }
    /** Returns a point representing the bottom right corner of the AABB */
    get bottomRight() {
        return new Vec2_1.default(this.right, this.bottom);
    }
    // @override
    getBoundingRect() {
        return this.clone();
    }
    // @override
    getBoundingCircle() {
        let r = Math.max(this.hw, this.hh);
        return new Circle_1.default(this.center.clone(), r);
    }
    // @deprecated
    getHalfSize() {
        return this.halfSize;
    }
    // @deprecated
    setHalfSize(halfSize) {
        this.halfSize = halfSize;
    }
    // TODO - move these all to the Shape class
    /**
     * A simple boolean check of whether this AABB contains a point
     * @param point The point to check
     * @returns A boolean representing whether this AABB contains the specified point
     */
    containsPoint(point) {
        return point.x >= this.x - this.hw && point.x <= this.x + this.hw
            && point.y >= this.y - this.hh && point.y <= this.y + this.hh;
    }
    /**
     * A simple boolean check of whether this AABB contains a point
     * @param point The point to check
     * @returns A boolean representing whether this AABB contains the specified point
     */
    intersectPoint(point) {
        let dx = point.x - this.x;
        let px = this.hw - Math.abs(dx);
        if (px <= 0) {
            return false;
        }
        let dy = point.y - this.y;
        let py = this.hh - Math.abs(dy);
        if (py <= 0) {
            return false;
        }
        return true;
    }
    /**
     * A boolean check of whether this AABB contains a point with soft left and top boundaries.
     * In other words, if the top left is (0, 0), the point (0, 0) is not in the AABB
     * @param point The point to check
     * @returns A boolean representing whether this AABB contains the specified point
     */
    containsPointSoft(point) {
        return point.x > this.x - this.hw && point.x <= this.x + this.hw
            && point.y > this.y - this.hh && point.y <= this.y + this.hh;
    }
    /**
     * Returns the data from the intersection of this AABB with a line segment from a point in a direction
     * @param point The point that the line segment starts from
     * @param delta The direction and distance of the segment
     * @param padding Pads the AABB to make it wider for the intersection test
     * @returns The Hit object representing the intersection, or null if there was no intersection
     */
    intersectSegment(point, delta, padding) {
        let paddingX = padding ? padding.x : 0;
        let paddingY = padding ? padding.y : 0;
        let scaleX = 1 / delta.x;
        let scaleY = 1 / delta.y;
        let signX = MathUtils_1.default.sign(scaleX);
        let signY = MathUtils_1.default.sign(scaleY);
        let tnearx = scaleX * (this.x - signX * (this.hw + paddingX) - point.x);
        let tneary = scaleY * (this.y - signY * (this.hh + paddingY) - point.y);
        let tfarx = scaleX * (this.x + signX * (this.hw + paddingX) - point.x);
        let tfary = scaleY * (this.y + signY * (this.hh + paddingY) - point.y);
        if (tnearx > tfary || tneary > tfarx) {
            // We aren't colliding - we clear one axis before intersecting another
            return null;
        }
        let tnear = Math.max(tnearx, tneary);
        // Double check for NaNs
        if (tnearx !== tnearx) {
            tnear = tneary;
        }
        else if (tneary !== tneary) {
            tnear = tnearx;
        }
        let tfar = Math.min(tfarx, tfary);
        if (tnear === -Infinity) {
            return null;
        }
        if (tnear >= 1 || tfar <= 0) {
            return null;
        }
        // We are colliding
        let hit = new Hit_1.default();
        hit.time = MathUtils_1.default.clamp01(tnear);
        hit.nearTimes.x = tnearx;
        hit.nearTimes.y = tneary;
        if (tnearx > tneary) {
            // We hit on the left or right size
            hit.normal.x = -signX;
            hit.normal.y = 0;
        }
        else if (Math.abs(tnearx - tneary) < 0.0001) {
            // We hit on the corner
            hit.normal.x = -signX;
            hit.normal.y = -signY;
            hit.normal.normalize();
        }
        else {
            // We hit on the top or bottom
            hit.normal.x = 0;
            hit.normal.y = -signY;
        }
        hit.delta.x = (1.0 - hit.time) * -delta.x;
        hit.delta.y = (1.0 - hit.time) * -delta.y;
        hit.pos.x = point.x + delta.x * hit.time;
        hit.pos.y = point.y + delta.y * hit.time;
        return hit;
    }
    // @override
    overlaps(other) {
        if (other instanceof AABB) {
            return this.overlapsAABB(other);
        }
        throw "Overlap not defined between these shapes.";
    }
    /**
     * A simple boolean check of whether this AABB overlaps another
     * @param other The other AABB to check against
     * @returns True if this AABB overlaps the other, false otherwise
     */
    overlapsAABB(other) {
        let dx = other.x - this.x;
        let px = this.hw + other.hw - Math.abs(dx);
        if (px <= 0) {
            return false;
        }
        let dy = other.y - this.y;
        let py = this.hh + other.hh - Math.abs(dy);
        if (py <= 0) {
            return false;
        }
        return true;
    }
    /**
     * Determines whether these AABBs are JUST touching - not overlapping.
     * Vec2.x is -1 if the other is to the left, 1 if to the right.
     * Likewise, Vec2.y is -1 if the other is on top, 1 if on bottom.
     * @param other The other AABB to check
     * @returns The collision sides stored in a Vec2 if the AABBs are touching, null otherwise
     */
    touchesAABB(other) {
        let dx = other.x - this.x;
        let px = this.hw + other.hw - Math.abs(dx);
        let dy = other.y - this.y;
        let py = this.hh + other.hh - Math.abs(dy);
        // If one axis is just touching and the other is overlapping, true
        if ((px === 0 && py >= 0) || (py === 0 && px >= 0)) {
            let ret = new Vec2_1.default();
            if (px === 0) {
                ret.x = other.x < this.x ? -1 : 1;
            }
            if (py === 0) {
                ret.y = other.y < this.y ? -1 : 1;
            }
            return ret;
        }
        else {
            return null;
        }
    }
    /**
     * Determines whether these AABBs are JUST touching - not overlapping.
     * Also, if they are only touching corners, they are considered not touching.
     * Vec2.x is -1 if the other is to the left, 1 if to the right.
     * Likewise, Vec2.y is -1 if the other is on top, 1 if on bottom.
     * @param other The other AABB to check
     * @returns The side of the touch, stored as a Vec2, or null if there is no touch
     */
    touchesAABBWithoutCorners(other) {
        let dx = other.x - this.x;
        let px = this.hw + other.hw - Math.abs(dx);
        let dy = other.y - this.y;
        let py = this.hh + other.hh - Math.abs(dy);
        // If one axis is touching, and the other is strictly overlapping
        if ((px === 0 && py > 0) || (py === 0 && px > 0)) {
            let ret = new Vec2_1.default();
            if (px === 0) {
                ret.x = other.x < this.x ? -1 : 1;
            }
            else {
                ret.y = other.y < this.y ? -1 : 1;
            }
            return ret;
        }
        else {
            return null;
        }
    }
    /**
     * Calculates the area of the overlap between this AABB and another
     * @param other The other AABB
     * @returns The area of the overlap between the AABBs
     */
    overlapArea(other) {
        let leftx = Math.max(this.x - this.hw, other.x - other.hw);
        let rightx = Math.min(this.x + this.hw, other.x + other.hw);
        let dx = rightx - leftx;
        let lefty = Math.max(this.y - this.hh, other.y - other.hh);
        let righty = Math.min(this.y + this.hh, other.y + other.hh);
        let dy = righty - lefty;
        if (dx < 0 || dy < 0)
            return 0;
        return dx * dy;
    }
    /**
     * Moves and resizes this rect from its current position to the position specified
     * @param velocity The movement of the rect from its position
     * @param fromPosition A position specified to be the starting point of sweeping
     * @param halfSize The halfSize of the sweeping rect
     */
    sweep(velocity, fromPosition, halfSize) {
        if (!fromPosition) {
            fromPosition = this.center;
        }
        if (!halfSize) {
            halfSize = this.halfSize;
        }
        let centerX = fromPosition.x + velocity.x / 2;
        let centerY = fromPosition.y + velocity.y / 2;
        let minX = Math.min(fromPosition.x - halfSize.x, fromPosition.x + velocity.x - halfSize.x);
        let minY = Math.min(fromPosition.y - halfSize.y, fromPosition.y + velocity.y - halfSize.y);
        this.center.set(centerX, centerY);
        this.halfSize.set(centerX - minX, centerY - minY);
    }
    // @override
    clone() {
        return new AABB(this.center.clone(), this.halfSize.clone());
    }
    /**
     * Converts this AABB to a string format
     * @returns (center: (x, y), halfSize: (x, y))
     */
    toString() {
        return "(center: " + this.center.toString() + ", half-size: " + this.halfSize.toString() + ")";
    }
}
exports.default = AABB;

},{"../../Utils/MathUtils":102,"../Physics/Hit":13,"../Vec2":24,"./Circle":17,"./Shape":18}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("../Vec2");
const AABB_1 = require("./AABB");
const Shape_1 = require("./Shape");
/**
 * A Circle
 */
class Circle extends Shape_1.default {
    /**
     * Creates a new Circle
     * @param center The center of the circle
     * @param radius The radius of the circle
     */
    constructor(center, radius) {
        super();
        this._center = center ? center : new Vec2_1.default(0, 0);
        this.radius = radius ? radius : 0;
    }
    get center() {
        return this._center;
    }
    set center(center) {
        this._center = center;
    }
    get halfSize() {
        return new Vec2_1.default(this.radius, this.radius);
    }
    get r() {
        return this.radius;
    }
    set r(radius) {
        this.radius = radius;
    }
    // @override
    /**
     * A simple boolean check of whether this AABB contains a point
     * @param point The point to check
     * @returns A boolean representing whether this AABB contains the specified point
     */
    containsPoint(point) {
        return this.center.distanceSqTo(point) <= this.radius * this.radius;
    }
    // @override
    getBoundingRect() {
        return new AABB_1.default(this._center.clone(), new Vec2_1.default(this.radius, this.radius));
    }
    // @override
    getBoundingCircle() {
        return this.clone();
    }
    // @override
    overlaps(other) {
        throw new Error("Method not implemented.");
    }
    // @override
    clone() {
        return new Circle(this._center.clone(), this.radius);
    }
    toString() {
        return "(center: " + this.center.toString() + ", radius: " + this.radius + ")";
    }
}
exports.default = Circle;

},{"../Vec2":24,"./AABB":16,"./Shape":18}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("../Vec2");
const AABB_1 = require("./AABB");
/**
 * An abstract Shape class that acts as an interface for better interactions with subclasses.
 */
class Shape {
    get x() {
        return this.center.x;
    }
    get y() {
        return this.center.y;
    }
    get hw() {
        return this.halfSize.x;
    }
    get hh() {
        return this.halfSize.y;
    }
    get top() {
        return this.y - this.hh;
    }
    get bottom() {
        return this.y + this.hh;
    }
    get left() {
        return this.x - this.hw;
    }
    get right() {
        return this.x + this.hw;
    }
    static getTimeOfCollision(A, velA, B, velB) {
        if (A instanceof AABB_1.default && B instanceof AABB_1.default) {
            return Shape.getTimeOfCollision_AABB_AABB(A, velA, B, velB);
        }
    }
    static getTimeOfCollision_AABB_AABB(A, velA, B, velB) {
        let posSmaller = A.center;
        let posLarger = B.center;
        let sizeSmaller = A.halfSize;
        let sizeLarger = B.halfSize;
        let firstContact = new Vec2_1.default(0, 0);
        let lastContact = new Vec2_1.default(0, 0);
        let collidingX = false;
        let collidingY = false;
        // Sort by position
        if (posLarger.x < posSmaller.x) {
            // Swap, because smaller is further right than larger
            let temp;
            temp = sizeSmaller;
            sizeSmaller = sizeLarger;
            sizeLarger = temp;
            temp = posSmaller;
            posSmaller = posLarger;
            posLarger = temp;
            temp = velA;
            velA = velB;
            velB = temp;
        }
        // A is left, B is right
        firstContact.x = Infinity;
        lastContact.x = Infinity;
        if (posLarger.x - sizeLarger.x >= posSmaller.x + sizeSmaller.x) {
            // If we aren't currently colliding
            let relVel = velA.x - velB.x;
            if (relVel > 0) {
                // If they are moving towards each other
                firstContact.x = ((posLarger.x - sizeLarger.x) - (posSmaller.x + sizeSmaller.x)) / (relVel);
                lastContact.x = ((posLarger.x + sizeLarger.x) - (posSmaller.x - sizeSmaller.x)) / (relVel);
            }
        }
        else {
            collidingX = true;
        }
        if (posLarger.y < posSmaller.y) {
            // Swap, because smaller is further up than larger
            let temp;
            temp = sizeSmaller;
            sizeSmaller = sizeLarger;
            sizeLarger = temp;
            temp = posSmaller;
            posSmaller = posLarger;
            posLarger = temp;
            temp = velA;
            velA = velB;
            velB = temp;
        }
        // A is top, B is bottom
        firstContact.y = Infinity;
        lastContact.y = Infinity;
        if (posLarger.y - sizeLarger.y >= posSmaller.y + sizeSmaller.y) {
            // If we aren't currently colliding
            let relVel = velA.y - velB.y;
            if (relVel > 0) {
                // If they are moving towards each other
                firstContact.y = ((posLarger.y - sizeLarger.y) - (posSmaller.y + sizeSmaller.y)) / (relVel);
                lastContact.y = ((posLarger.y + sizeLarger.y) - (posSmaller.y - sizeSmaller.y)) / (relVel);
            }
        }
        else {
            collidingY = true;
        }
        return [firstContact, lastContact, collidingX, collidingY];
    }
}
exports.default = Shape;

},{"../Vec2":24,"./AABB":16}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * A LIFO stack with items of type T
 */
class Stack {
    /**
     * Constructs a new stack
     * @param maxElements The maximum size of the stack
     */
    constructor(maxElements = 100) {
        this.MAX_ELEMENTS = maxElements;
        this.stack = new Array(this.MAX_ELEMENTS);
        this.head = -1;
    }
    /**
     * Adds an item to the top of the stack
     * @param item The new item to add to the stack
     */
    push(item) {
        if (this.head + 1 === this.MAX_ELEMENTS) {
            throw "Stack full - cannot add element";
        }
        this.head += 1;
        this.stack[this.head] = item;
    }
    /**
     * Removes an item from the top of the stack
     * @returns The item at the top of the stack
     */
    pop() {
        if (this.head === -1) {
            throw "Stack empty - cannot remove element";
        }
        this.head -= 1;
        return this.stack[this.head + 1];
    }
    /**
     * Returns the element currently at the top of the stack
     * @returns The item at the top of the stack
     */
    peek() {
        if (this.head === -1) {
            throw "Stack empty - cannot get element";
        }
        return this.stack[this.head];
    }
    /** Returns true if this stack is empty
     * @returns A boolean that represents whether or not the stack is empty
    */
    isEmpty() {
        return this.head === -1;
    }
    // @implemented
    clear() {
        this.forEach((item, index) => delete this.stack[index]);
        this.head = -1;
    }
    /**
     * Returns the number of items currently in the stack
     * @returns The number of items in the stack
     */
    size() {
        return this.head + 1;
    }
    // @implemented
    forEach(func) {
        let i = 0;
        while (i <= this.head) {
            func(this.stack[i], i);
            i += 1;
        }
    }
    /**
     * Converts this stack into a string format
     * @returns A string representing this stack
     */
    toString() {
        let retval = "";
        this.forEach((item, index) => {
            let str = item.toString();
            if (index !== 0) {
                str += " -> ";
            }
            retval = str + retval;
        });
        return "Top -> " + retval;
    }
}
exports.default = Stack;

},{}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Emitter_1 = require("../../Events/Emitter");
/**
 * An abstract implementation of a state for a @reference[StateMachine].
 * This class should be extended to allow for custom state behaviors.
 */
class State {
    /**
     * Constructs a new State
     * @param parent The parent StateMachine of this state
     */
    constructor(parent) {
        this.parent = parent;
        this.emitter = new Emitter_1.default();
    }
    /**
     * Tells the state machine that this state has ended, and makes it transition to the new state specified
     * @param stateName The name of the state to transition to
     */
    finished(stateName) {
        this.parent.changeState(stateName);
    }
}
exports.default = State;

},{"../../Events/Emitter":27}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Stack_1 = require("../Stack");
const Map_1 = require("../Map");
const Receiver_1 = require("../../Events/Receiver");
const Emitter_1 = require("../../Events/Emitter");
/**
 * An implementation of a Push Down Automata State machine. States can also be hierarchical
 * for more flexibility, as described in @link(Game Programming Patterns)(https://gameprogrammingpatterns.com/state.html).
 */
class StateMachine {
    /**
     * Creates a new StateMachine
     */
    constructor() {
        this.stack = new Stack_1.default();
        this.stateMap = new Map_1.default();
        this.receiver = new Receiver_1.default();
        this.emitter = new Emitter_1.default();
        this.emitEventOnStateChange = false;
    }
    /**
     * Sets the activity state of this state machine
     * @param flag True if you want to set this machine running, false otherwise
     */
    setActive(flag) {
        this.active = flag;
    }
    /**
     * Makes this state machine emit an event any time its state changes
     * @param stateChangeEventName The name of the event to emit
     */
    setEmitEventOnStateChange(stateChangeEventName) {
        this.emitEventOnStateChange = true;
        this.stateChangeEventName = stateChangeEventName;
    }
    /**
     * Stops this state machine from emitting events on state change.
     */
    cancelEmitEventOnStateChange() {
        this.emitEventOnStateChange = false;
    }
    /**
     * Initializes this state machine with an initial state and sets it running
     * @param initialState The name of initial state of the state machine
     */
    initialize(initialState, options) {
        this.stack.push(this.stateMap.get(initialState));
        this.currentState = this.stack.peek();
        this.currentState.onEnter(options);
        this.setActive(true);
    }
    /**
     * Adds a state to this state machine
     * @param stateName The name of the state to add
     * @param state The state to add
     */
    addState(stateName, state) {
        this.stateMap.add(stateName, state);
    }
    /**
     * Changes the state of this state machine to the provided string
     * @param state The string name of the state to change to
     */
    changeState(state) {
        // Exit the current state
        let options = this.currentState.onExit();
        // Make sure the correct state is at the top of the stack
        if (state === "previous") {
            // Pop the current state off the stack
            this.stack.pop();
        }
        else {
            // Retrieve the new state from the statemap and put it at the top of the stack
            this.stack.pop();
            this.stack.push(this.stateMap.get(state));
        }
        // Retreive the new state from the stack
        this.currentState = this.stack.peek();
        // Emit an event if turned on
        if (this.emitEventOnStateChange) {
            this.emitter.fireEvent(this.stateChangeEventName, { state: this.currentState });
        }
        // Enter the new state
        this.currentState.onEnter(options);
    }
    /**
     * Handles input. This happens at the very beginning of this state machine's update cycle.
     * @param event The game event to process
     */
    handleEvent(event) {
        if (this.active) {
            this.currentState.handleInput(event);
        }
    }
    // @implemented
    update(deltaT) {
        // Distribute events
        while (this.receiver.hasNextEvent()) {
            let event = this.receiver.getNextEvent();
            this.handleEvent(event);
        }
        // Delegate the update to the current state
        this.currentState.update(deltaT);
    }
}
exports.default = StateMachine;

},{"../../Events/Emitter":27,"../../Events/Receiver":31,"../Map":10,"../Stack":19}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TiledCollectionTile = exports.TiledObject = exports.TiledLayerData = exports.TiledTilesetData = exports.TiledLayerProperty = exports.TiledTilemapData = void 0;
// @ignorePage
/**
 * a representation of Tiled's tilemap data
 */
class TiledTilemapData {
}
exports.TiledTilemapData = TiledTilemapData;
/**
 * A representation of a custom layer property in a Tiled tilemap
 */
class TiledLayerProperty {
}
exports.TiledLayerProperty = TiledLayerProperty;
/**
 * A representation of a tileset in a Tiled tilemap
 */
class TiledTilesetData {
}
exports.TiledTilesetData = TiledTilesetData;
/**
 * A representation of a layer in a Tiled tilemap
 */
class TiledLayerData {
}
exports.TiledLayerData = TiledLayerData;
class TiledObject {
    ;
}
exports.TiledObject = TiledObject;
class TiledCollectionTile {
}
exports.TiledCollectionTile = TiledCollectionTile;

},{}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ResourceManager_1 = require("../../ResourceManager/ResourceManager");
const Vec2_1 = require("../Vec2");
/**
 * The data representation of a Tileset for the game engine. This represents one image,
 * with a startIndex if required (as it is with Tiled using two images in one tilset).
 */
class Tileset {
    // TODO: Change this to be more general and work with other tileset formats
    constructor(tilesetData) {
        // Defer handling of the data to a helper class
        this.initFromTiledData(tilesetData);
    }
    /**
     * Initialize the tileset from the data from a Tiled json file
     * @param tiledData The parsed object from a Tiled json file
     */
    initFromTiledData(tiledData) {
        this.numRows = tiledData.tilecount / tiledData.columns;
        this.numCols = tiledData.columns;
        this.startIndex = tiledData.firstgid;
        this.endIndex = this.startIndex + tiledData.tilecount - 1;
        this.tileSize = new Vec2_1.default(tiledData.tilewidth, tiledData.tilewidth);
        this.imageKey = tiledData.image;
        this.imageSize = new Vec2_1.default(tiledData.imagewidth, tiledData.imageheight);
    }
    /**
     * Gets the image key associated with this tilemap
     * @returns The image key of this tilemap
     */
    getImageKey() {
        return this.imageKey;
    }
    /**
     * Returns a Vec2 containing the left and top offset from the image origin for this tile.
     * @param tileIndex The index of the tile from startIndex to endIndex of this tileset
     * @returns A Vec2 containing the offset for the specified tile.
     */
    getImageOffsetForTile(tileIndex) {
        // Get the true index
        let index = tileIndex - this.startIndex;
        let row = Math.floor(index / this.numCols);
        let col = index % this.numCols;
        let width = this.tileSize.x;
        let height = this.tileSize.y;
        // Calculate the position to start a crop in the tileset image
        let left = col * width;
        let top = row * height;
        return new Vec2_1.default(left, top);
    }
    /**
     * Gets the start index
     * @returns The start index
     */
    getStartIndex() {
        return this.startIndex;
    }
    /**
     * Gets the tile set
     * @returns A Vec2 containing the tile size
     */
    getTileSize() {
        return this.tileSize;
    }
    /**
     * Gets the number of rows in the tileset
     * @returns The number of rows
     */
    getNumRows() {
        return this.numRows;
    }
    /**
     * Gets the number of columns in the tilset
     * @returns The number of columns
     */
    getNumCols() {
        return this.numCols;
    }
    getTileCount() {
        return this.endIndex - this.startIndex + 1;
    }
    /**
     * Checks whether or not this tilset contains the specified tile index. This is used for rendering.
     * @param tileIndex The index of the tile to check
     * @returns A boolean representing whether or not this tilset uses the specified index
     */
    hasTile(tileIndex) {
        return tileIndex >= this.startIndex && tileIndex <= this.endIndex;
    }
    /**
     * Render a singular tile with index tileIndex from the tileset located at position dataIndex
     * @param ctx The rendering context
     * @param tileIndex The value of the tile to render
     * @param dataIndex The index of the tile in the data array
     * @param worldSize The size of the world
     * @param origin The viewport origin in the current layer
     * @param scale The scale of the tilemap
     */
    renderTile(ctx, tileIndex, dataIndex, maxCols, origin, scale, zoom) {
        let image = ResourceManager_1.default.getInstance().getImage(this.imageKey);
        // Get the true index
        let index = tileIndex - this.startIndex;
        let row = Math.floor(index / this.numCols);
        let col = index % this.numCols;
        let width = this.tileSize.x;
        let height = this.tileSize.y;
        // Calculate the position to start a crop in the tileset image
        let left = col * width;
        let top = row * height;
        // Calculate the position in the world to render the tile
        let x = Math.floor((dataIndex % maxCols) * width * scale.x);
        let y = Math.floor(Math.floor(dataIndex / maxCols) * height * scale.y);
        ctx.drawImage(image, left, top, width, height, Math.floor((x - origin.x) * zoom), Math.floor((y - origin.y) * zoom), Math.ceil(width * scale.x * zoom), Math.ceil(height * scale.y * zoom));
    }
}
exports.default = Tileset;

},{"../../ResourceManager/ResourceManager":83,"../Vec2":24}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MathUtils_1 = require("../Utils/MathUtils");
/**
 * A two-dimensional vector (x, y)
 */
class Vec2 {
    /**
     * Creates a new Vec2
     * @param x The x value of the vector
     * @param y The y value of the vector
     */
    constructor(x = 0, y = 0) {
        /**
         * When this vector changes its value, do something
         */
        this.onChange = () => { };
        this.vec = new Float32Array(2);
        this.vec[0] = x;
        this.vec[1] = y;
    }
    // Expose x and y with getters and setters
    get x() {
        return this.vec[0];
    }
    set x(x) {
        this.vec[0] = x;
        if (this.onChange) {
            this.onChange();
        }
    }
    get y() {
        return this.vec[1];
    }
    set y(y) {
        this.vec[1] = y;
        if (this.onChange) {
            this.onChange();
        }
    }
    static get ZERO() {
        return new Vec2(0, 0);
    }
    static get INF() {
        return new Vec2(Infinity, Infinity);
    }
    static get UP() {
        return new Vec2(0, -1);
    }
    static get DOWN() {
        return new Vec2(0, 1);
    }
    static get LEFT() {
        return new Vec2(-1, 0);
    }
    static get RIGHT() {
        return new Vec2(1, 0);
    }
    /**
     * The squared magnitude of the vector. This tends to be faster, so use it in situations where taking the
     * square root doesn't matter, like for comparing distances.
     * @returns The squared magnitude of the vector
     */
    magSq() {
        return this.x * this.x + this.y * this.y;
    }
    /**
     * The magnitude of the vector.
     * @returns The magnitude of the vector.
     */
    mag() {
        return Math.sqrt(this.magSq());
    }
    /**
     * Divdes x and y by the magnitude to obtain the unit vector in the direction of this vector.
     * @returns This vector as a unit vector.
     */
    normalize() {
        if (this.x === 0 && this.y === 0)
            return this;
        let mag = this.mag();
        this.x /= mag;
        this.y /= mag;
        return this;
    }
    /**
     * Works like normalize(), but returns a new Vec2
     * @returns A new vector that is the unit vector for this one
     */
    normalized() {
        if (this.isZero()) {
            return this;
        }
        let mag = this.mag();
        return new Vec2(this.x / mag, this.y / mag);
    }
    /**
     * Sets the x and y elements of this vector to zero.
     * @returns This vector, with x and y set to zero.
     */
    zero() {
        return this.set(0, 0);
    }
    /**
     * Sets the vector's x and y based on the angle provided. Goes counter clockwise.
     * @param angle The angle in radians
     * @param radius The magnitude of the vector at the specified angle
     * @returns This vector.
     */
    setToAngle(angle, radius = 1) {
        this.x = MathUtils_1.default.floorToPlace(Math.cos(angle) * radius, 5);
        this.y = MathUtils_1.default.floorToPlace(-Math.sin(angle) * radius, 5);
        return this;
    }
    /**
     * Returns a vector that point from this vector to another one
     * @param other The vector to point to
     * @returns A new Vec2 that points from this vector to the one provided
     */
    vecTo(other) {
        return new Vec2(other.x - this.x, other.y - this.y);
    }
    /**
     * Returns a vector containing the direction from this vector to another
     * @param other The vector to point to
     * @returns A new Vec2 that points from this vector to the one provided. This new Vec2 will be a unit vector.
     */
    dirTo(other) {
        return this.vecTo(other).normalize();
    }
    /**
     * Keeps the vector's direction, but sets its magnitude to be the provided magnitude
     * @param magnitude The magnitude the vector should be
     * @returns This vector with its magnitude set to the new magnitude
     */
    scaleTo(magnitude) {
        return this.normalize().scale(magnitude);
    }
    /**
     * Scales x and y by the number provided, or if two number are provided, scales them individually.
     * @param factor The scaling factor for the vector, or for only the x-component if yFactor is provided
     * @param yFactor The scaling factor for the y-component of the vector
     * @returns This vector after scaling
     */
    scale(factor, yFactor = null) {
        if (yFactor !== null) {
            this.x *= factor;
            this.y *= yFactor;
            return this;
        }
        this.x *= factor;
        this.y *= factor;
        return this;
    }
    /**
     * Returns a scaled version of this vector without modifying it.
     * @param factor The scaling factor for the vector, or for only the x-component if yFactor is provided
     * @param yFactor The scaling factor for the y-component of the vector
     * @returns A new vector that has the values of this vector after scaling
     */
    scaled(factor, yFactor = null) {
        return this.clone().scale(factor, yFactor);
    }
    /**
     * Rotates the vector counter-clockwise by the angle amount specified
     * @param angle The angle to rotate by in radians
     * @returns This vector after rotation.
     */
    rotateCCW(angle) {
        let cs = Math.cos(angle);
        let sn = Math.sin(angle);
        let tempX = this.x * cs - this.y * sn;
        let tempY = this.x * sn + this.y * cs;
        this.x = tempX;
        this.y = tempY;
        return this;
    }
    /**
     * Sets the vectors coordinates to be the ones provided
     * @param x The new x value for this vector
     * @param y The new y value for this vector
     * @returns This vector
     */
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    /**
     * Copies the values of the other Vec2 into this one.
     * @param other The Vec2 to copy
     * @returns This vector with its values set to the vector provided
     */
    copy(other) {
        return this.set(other.x, other.y);
    }
    /**
     * Adds this vector the another vector
     * @param other The Vec2 to add to this one
     * @returns This vector after adding the one provided
     */
    add(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }
    /**
     * Increments the fields of this vector. Both are incremented with a, if only a is provided.
     * @param a The first number to increment by
     * @param b The second number to increment by
     * @returnss This vector after incrementing
     */
    inc(a, b) {
        if (b === undefined) {
            this.x += a;
            this.y += a;
        }
        else {
            this.x += a;
            this.y += b;
        }
        return this;
    }
    /**
     * Subtracts another vector from this vector
     * @param other The Vec2 to subtract from this one
     * @returns This vector after subtracting the one provided
     */
    sub(other) {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }
    /**
     * Multiplies this vector with another vector element-wise. In other words, this.x *= other.x and this.y *= other.y
     * @param other The Vec2 to multiply this one by
     * @returns This vector after multiplying its components by this one
     */
    mult(other) {
        this.x *= other.x;
        this.y *= other.y;
        return this;
    }
    /**
     * Divides this vector with another vector element-wise. In other words, this.x /= other.x and this.y /= other.y
     * @param other The vector to divide this one by
     * @returns This vector after division
     */
    div(other) {
        if (other.x === 0 || other.y === 0)
            throw "Divide by zero error";
        this.x /= other.x;
        this.y /= other.y;
        return this;
    }
    /**
     * Does an element wise remainder operation on this vector. this.x %= other.x and this.y %= other.y
     * @param other The other vector
     * @returns this vector
     */
    remainder(other) {
        this.x = this.x % other.x;
        this.y = this.y % other.y;
        return this;
    }
    /**
     * Returns the squared distance between this vector and another vector
     * @param other The vector to compute distance squared to
     * @returns The squared distance between this vector and the one provided
     */
    distanceSqTo(other) {
        return (this.x - other.x) * (this.x - other.x) + (this.y - other.y) * (this.y - other.y);
    }
    /**
     * Returns the distance between this vector and another vector
     * @param other The vector to compute distance to
     * @returns The distance between this vector and the one provided
     */
    distanceTo(other) {
        return Math.sqrt(this.distanceSqTo(other));
    }
    /**
     * Returns the dot product of this vector and another
     * @param other The vector to compute the dot product with
     * @returns The dot product of this vector and the one provided.
     */
    dot(other) {
        return this.x * other.x + this.y * other.y;
    }
    /**
     * Returns the angle counter-clockwise in radians from this vector to another vector
     * @param other The vector to compute the angle to
     * @returns The angle, rotating CCW, from this vector to the other vector
     */
    angleToCCW(other) {
        let dot = this.dot(other);
        let det = this.x * other.y - this.y * other.x;
        let angle = -Math.atan2(det, dot);
        if (angle < 0) {
            angle += 2 * Math.PI;
        }
        return angle;
    }
    /**
     * Returns a string representation of this vector rounded to 1 decimal point
     * @returns This vector as a string
     */
    toString() {
        return this.toFixed();
    }
    /**
     * Returns a string representation of this vector rounded to the specified number of decimal points
     * @param numDecimalPoints The number of decimal points to create a string to
     * @returns This vector as a string
     */
    toFixed(numDecimalPoints = 1) {
        return "(" + this.x.toFixed(numDecimalPoints) + ", " + this.y.toFixed(numDecimalPoints) + ")";
    }
    /**
     * Returns a new vector with the same coordinates as this one.
     * @returns A new Vec2 with the same values as this one
     */
    clone() {
        return new Vec2(this.x, this.y);
    }
    /**
     * Returns true if this vector and other have the EXACT same x and y (not assured to be safe for floats)
     * @param other The vector to check against
     * @returns A boolean representing the equality of the two vectors
     */
    strictEquals(other) {
        return this.x === other.x && this.y === other.y;
    }
    /**
     * Returns true if this vector and other have the same x and y
     * @param other The vector to check against
     * @returns A boolean representing the equality of the two vectors
     */
    equals(other) {
        let xEq = Math.abs(this.x - other.x) < 0.0000001;
        let yEq = Math.abs(this.y - other.y) < 0.0000001;
        return xEq && yEq;
    }
    /**
     * Returns true if this vector is the zero vector exactly (not assured to be safe for floats).
     * @returns A boolean representing the equality of this vector and the zero vector
     */
    strictIsZero() {
        return this.x === 0 && this.y === 0;
    }
    /**
     * Returns true if this x and y for this vector are both zero.
     * @returns A boolean representing the equality of this vector and the zero vector
     */
    isZero() {
        return Math.abs(this.x) < 0.0000001 && Math.abs(this.y) < 0.0000001;
    }
    /**
     * Sets the function that is called whenever this vector is changed.
     * @param f The function to be called
     */
    setOnChange(f) {
        this.onChange = f;
    }
    toArray() {
        return this.vec;
    }
    /**
     * Performs linear interpolation between two vectors
     * @param a The first vector
     * @param b The second vector
     * @param t The time of the lerp, with 0 being vector A, and 1 being vector B
     * @returns A new Vec2 representing the lerp between vector a and b.
     */
    static lerp(a, b, t) {
        return new Vec2(MathUtils_1.default.lerp(a.x, b.x, t), MathUtils_1.default.lerp(a.y, b.y, t));
    }
}
exports.default = Vec2;
Vec2.ZERO_STATIC = new Vec2(0, 0);

},{"../Utils/MathUtils":102}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Map_1 = require("../DataTypes/Map");
const Vec2_1 = require("../DataTypes/Vec2");
const Color_1 = require("../Utils/Color");
/**
 * A util class for rendering Debug messages to the canvas.
 */
class Debug {
    /**
     * Add a message to display on the debug screen
     * @param id A unique ID for this message
     * @param messages The messages to print to the debug screen
     */
    static log(id, ...messages) {
        // let message = "";
        // for(let i = 0; i < messages.length; i++){
        // 	message += messages[i].toString();
        // }
        // Join all messages with spaces
        let message = messages.map((m) => m.toString()).join(" ");
        this.logMessages.add(id, message);
    }
    /**
     * Deletes a a key from the log and stops it from keeping up space on the screen
     * @param id The id of the log item to clear
     */
    static clearLogItem(id) {
        this.logMessages.delete(id);
    }
    /**
     * Sets the list of nodes to render with the debugger
     * @param nodes The new list of nodes
     */
    static setNodes(nodes) {
        this.nodes = nodes;
    }
    /**
     * Draws a box at the specified position
     * @param center The center of the box
     * @param halfSize The dimensions of the box
     * @param filled A boolean for whether or not the box is filled
     * @param color The color of the box to draw
     */
    static drawBox(center, halfSize, filled, color) {
        let alpha = this.debugRenderingContext.globalAlpha;
        this.debugRenderingContext.globalAlpha = color.a;
        if (filled) {
            this.debugRenderingContext.fillStyle = color.toString();
            this.debugRenderingContext.fillRect(center.x - halfSize.x, center.y - halfSize.y, halfSize.x * 2, halfSize.y * 2);
        }
        else {
            let lineWidth = 2;
            this.debugRenderingContext.lineWidth = lineWidth;
            this.debugRenderingContext.strokeStyle = color.toString();
            this.debugRenderingContext.strokeRect(center.x - halfSize.x, center.y - halfSize.y, halfSize.x * 2, halfSize.y * 2);
        }
        this.debugRenderingContext.globalAlpha = alpha;
    }
    /**
     * Draws a circle at the specified position
     * @param center The center of the circle
     * @param radius The dimensions of the box
     * @param filled A boolean for whether or not the circle is filled
     * @param color The color of the circle
     */
    static drawCircle(center, radius, filled, color) {
        let alpha = this.debugRenderingContext.globalAlpha;
        this.debugRenderingContext.globalAlpha = color.a;
        if (filled) {
            this.debugRenderingContext.fillStyle = color.toString();
            this.debugRenderingContext.beginPath();
            this.debugRenderingContext.arc(center.x, center.y, radius, 0, 2 * Math.PI);
            this.debugRenderingContext.closePath();
            this.debugRenderingContext.fill();
        }
        else {
            let lineWidth = 2;
            this.debugRenderingContext.lineWidth = lineWidth;
            this.debugRenderingContext.strokeStyle = color.toString();
            this.debugRenderingContext.beginPath();
            this.debugRenderingContext.arc(center.x, center.y, radius, 0, 2 * Math.PI);
            this.debugRenderingContext.closePath();
            this.debugRenderingContext.stroke();
        }
        this.debugRenderingContext.globalAlpha = alpha;
    }
    /**
     * Draws a ray at the specified position
     * @param from The starting position of the ray
     * @param to The ending position of the ray
     * @param color The color of the ray
     */
    static drawRay(from, to, color) {
        this.debugRenderingContext.lineWidth = 2;
        this.debugRenderingContext.strokeStyle = color.toString();
        this.debugRenderingContext.beginPath();
        this.debugRenderingContext.moveTo(from.x, from.y);
        this.debugRenderingContext.lineTo(to.x, to.y);
        this.debugRenderingContext.closePath();
        this.debugRenderingContext.stroke();
    }
    /**
     * Draws a point at the specified position
     * @param pos The position of the point
     * @param color The color of the point
     */
    static drawPoint(pos, color) {
        let pointSize = 6;
        this.debugRenderingContext.fillStyle = color.toString();
        this.debugRenderingContext.fillRect(pos.x - pointSize / 2, pos.y - pointSize / 2, pointSize, pointSize);
    }
    /**
     * Sets the default rendering color for text for the debugger
     * @param color The color to render the text
     */
    static setDefaultTextColor(color) {
        this.defaultTextColor = color;
    }
    /**
     * Performs any necessary setup operations on the Debug canvas
     * @param canvas The debug canvas
     * @param width The desired width of the canvas
     * @param height The desired height of the canvas
     * @returns The rendering context extracted from the canvas
     */
    static initializeDebugCanvas(canvas, width, height) {
        canvas.width = width;
        canvas.height = height;
        this.debugCanvasSize = new Vec2_1.default(width, height);
        this.debugRenderingContext = canvas.getContext("2d");
        return this.debugRenderingContext;
    }
    /** Clears the debug canvas */
    static clearCanvas() {
        this.debugRenderingContext.clearRect(0, 0, this.debugCanvasSize.x, this.debugCanvasSize.y);
    }
    /** Renders the text and nodes sent to the Debug system */
    static render() {
        this.renderText();
        this.renderNodes();
    }
    /** Renders the text sent to the Debug canvas */
    static renderText() {
        let y = 20;
        this.debugRenderingContext.font = "20px Arial";
        this.debugRenderingContext.fillStyle = this.defaultTextColor.toString();
        // Draw all of the text
        this.logMessages.forEach((key) => {
            this.debugRenderingContext.fillText(this.logMessages.get(key), 10, y);
            y += 30;
        });
    }
    /** Renders the nodes registered with the debug canvas */
    static renderNodes() {
        if (this.nodes) {
            this.nodes.forEach(node => {
                node.debugRender();
            });
        }
    }
}
exports.default = Debug;
/** A map of log messages to display on the screen */
Debug.logMessages = new Map_1.default();
/** The rendering color for text */
Debug.defaultTextColor = Color_1.default.WHITE;

},{"../DataTypes/Map":10,"../DataTypes/Vec2":24,"../Utils/Color":99}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Color_1 = require("../Utils/Color");
// @ignorePage
class Stats extends Object {
    static initStats() {
        let canvas = document.getElementById("stats-canvas");
        canvas.width = this.CANVAS_WIDTH;
        canvas.height = this.CANVAS_HEIGHT;
        this.ctx = canvas.getContext("2d");
        this.statsDiv = document.getElementById("stats-display");
        this.prevfps = new Array();
        this.prevClearTimes = new Array();
        this.SGClearTimes = new Array();
        this.avgSGClearTime = 0;
        this.prevFillTimes = new Array();
        this.SGFillTimes = new Array();
        this.avgSGFillTime = 0;
        this.prevUpdateTimes = new Array();
        this.SGUpdateTimes = new Array();
        this.avgSGUpdateTime = 0;
        this.prevQueryTimes = new Array();
        this.SGQueryTimes = new Array();
        this.avgSGQueryTime = 0;
        let clearTime = document.createElement("span");
        clearTime.setAttribute("id", "sgclear");
        let fillTime = document.createElement("span");
        fillTime.setAttribute("id", "sgfill");
        let updateTime = document.createElement("span");
        updateTime.setAttribute("id", "sgupdate");
        let queryTime = document.createElement("span");
        queryTime.setAttribute("id", "sgquery");
        let br1 = document.createElement("br");
        let br2 = document.createElement("br");
        let br3 = document.createElement("br");
        this.statsDiv.append(clearTime, br1, fillTime, br2, updateTime, br3, queryTime);
        this.graphChoices = document.getElementById("chart-option");
        let option1 = document.createElement("option");
        option1.value = "prevfps";
        option1.label = "FPS";
        let option2 = document.createElement("option");
        option2.value = "prevClearTimes";
        option2.label = "Clear Time";
        let option3 = document.createElement("option");
        option3.value = "prevFillTimes";
        option3.label = "Fill time";
        let option4 = document.createElement("option");
        option4.value = "prevUpdateTimes";
        option4.label = "Update time";
        let option5 = document.createElement("option");
        option5.value = "prevQueryTimes";
        option5.label = "Query Time";
        let optionAll = document.createElement("option");
        optionAll.value = "all";
        optionAll.label = "All";
        this.graphChoices.append(option1, option2, option3, option4, option5, optionAll);
    }
    static updateFPS(fps) {
        this.prevfps.push(fps);
        if (this.prevfps.length > Stats.NUM_POINTS) {
            this.prevfps.shift();
        }
        if (this.SGClearTimes.length > 0) {
            this.prevClearTimes.push(this.avgSGClearTime);
            if (this.prevClearTimes.length > this.NUM_POINTS) {
                this.prevClearTimes.shift();
            }
        }
        if (this.SGFillTimes.length > 0) {
            this.prevFillTimes.push(this.avgSGFillTime);
            if (this.prevFillTimes.length > this.NUM_POINTS) {
                this.prevFillTimes.shift();
            }
        }
        if (this.SGUpdateTimes.length > 0) {
            this.prevUpdateTimes.push(this.avgSGUpdateTime);
            if (this.prevUpdateTimes.length > this.NUM_POINTS) {
                this.prevUpdateTimes.shift();
            }
        }
        if (this.SGQueryTimes.length > 0) {
            this.prevQueryTimes.push(this.avgSGQueryTime);
            if (this.prevQueryTimes.length > this.NUM_POINTS) {
                this.prevQueryTimes.shift();
            }
        }
        this.updateSGStats();
    }
    static log(key, data) {
        if (key === "sgclear") {
            this.SGClearTimes.push(data);
            if (this.SGClearTimes.length > 100) {
                this.SGClearTimes.shift();
            }
        }
        else if (key === "sgfill") {
            this.SGFillTimes.push(data);
            if (this.SGFillTimes.length > 100) {
                this.SGFillTimes.shift();
            }
        }
        else if (key === "sgupdate") {
            this.SGUpdateTimes.push(data);
            if (this.SGUpdateTimes.length > 100) {
                this.SGUpdateTimes.shift();
            }
        }
        else if (key === "sgquery") {
            this.SGQueryTimes.push(data);
            if (this.SGQueryTimes.length > 1000) {
                this.SGQueryTimes.shift();
            }
        }
    }
    static render() {
        // Display stats
        this.drawCharts();
    }
    static drawCharts() {
        this.ctx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
        let paramString = this.graphChoices.value;
        if (paramString === "prevfps" || paramString === "all") {
            let param = this.prevfps;
            let color = Color_1.default.BLUE.toString();
            this.drawChart(param, color);
        }
        if (paramString === "prevClearTimes" || paramString === "all") {
            let param = this.prevClearTimes;
            let color = Color_1.default.RED.toString();
            this.drawChart(param, color);
        }
        if (paramString === "prevFillTimes" || paramString === "all") {
            let param = this.prevFillTimes;
            let color = Color_1.default.GREEN.toString();
            this.drawChart(param, color);
        }
        if (paramString === "prevUpdateTimes" || paramString === "all") {
            let param = this.prevUpdateTimes;
            let color = Color_1.default.CYAN.toString();
            this.drawChart(param, color);
        }
        if (paramString === "prevQueryTimes" || paramString === "all") {
            let param = this.prevQueryTimes;
            let color = Color_1.default.ORANGE.toString();
            this.drawChart(param, color);
        }
    }
    static drawChart(param, color) {
        this.ctx.strokeStyle = Color_1.default.BLACK.toString();
        this.ctx.beginPath();
        this.ctx.moveTo(10, 10);
        this.ctx.lineTo(10, this.CANVAS_HEIGHT - 10);
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(10, this.CANVAS_HEIGHT - 10);
        this.ctx.lineTo(this.CANVAS_WIDTH - 10, this.CANVAS_HEIGHT - 10);
        this.ctx.closePath();
        this.ctx.stroke();
        let max = Math.max(...param);
        let prevX = 10;
        let prevY = this.CANVAS_HEIGHT - 10 - param[0] / max * (this.CANVAS_HEIGHT - 20);
        this.ctx.strokeStyle = color;
        for (let i = 1; i < param.length; i++) {
            let fps = param[i];
            let x = 10 + i * (this.CANVAS_WIDTH - 20) / this.NUM_POINTS;
            let y = this.CANVAS_HEIGHT - 10 - fps / max * (this.CANVAS_HEIGHT - 20);
            this.ctx.beginPath();
            this.ctx.moveTo(prevX, prevY);
            this.ctx.lineTo(x, y);
            this.ctx.closePath();
            this.ctx.stroke();
            prevX = x;
            prevY = y;
        }
    }
    static updateSGStats() {
        if (this.SGClearTimes.length > 0) {
            this.avgSGClearTime = this.SGClearTimes.reduce((acc, val) => acc + val) / this.SGClearTimes.length;
        }
        if (this.SGFillTimes.length > 0) {
            this.avgSGFillTime = this.SGFillTimes.reduce((acc, val) => acc + val) / this.SGFillTimes.length;
        }
        if (this.SGUpdateTimes.length > 0) {
            this.avgSGUpdateTime = this.SGUpdateTimes.reduce((acc, val) => acc + val) / this.SGUpdateTimes.length;
        }
        if (this.SGQueryTimes.length > 0) {
            this.avgSGQueryTime = this.SGQueryTimes.reduce((acc, val) => acc + val) / this.SGQueryTimes.length;
        }
        document.getElementById("sgclear").innerHTML = "Avg SG clear time: " + this.avgSGClearTime;
        document.getElementById("sgfill").innerHTML = "Avg SG fill time: " + this.avgSGFillTime;
        document.getElementById("sgupdate").innerHTML = "Avg SG update time: " + this.avgSGUpdateTime;
        document.getElementById("sgquery").innerHTML = "Avg SG query time: " + this.avgSGQueryTime;
    }
}
exports.default = Stats;
Stats.NUM_POINTS = 60;
Stats.CANVAS_WIDTH = 300;
Stats.CANVAS_HEIGHT = 300;

},{"../Utils/Color":99}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventQueue_1 = require("./EventQueue");
const GameEvent_1 = require("./GameEvent");
/**
 * An event emitter object other systems can use to hook into the EventQueue.
 * Provides an easy interface for firing off events.
 */
class Emitter {
    /** Creates a new Emitter */
    constructor() {
        this.eventQueue = EventQueue_1.default.getInstance();
    }
    /**
     * Emit and event of type eventType with the data packet data
     * @param eventType The name of the event to fire off
     * @param data A @reference[Map] or record containing any data about the event
     */
    fireEvent(eventType, data = null) {
        this.eventQueue.addEvent(new GameEvent_1.default(eventType, data));
    }
}
exports.default = Emitter;

},{"./EventQueue":28,"./GameEvent":29}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Queue_1 = require("../DataTypes/Queue");
const Map_1 = require("../DataTypes/Map");
const GameEventType_1 = require("./GameEventType");
/**
 * The main event system of the game engine.
 * Events are sent to the EventQueue, which handles distribution to any systems that are listening for those events.
 * This allows for handling of input without having classes directly hook into javascript event handles,
 * and allows otherwise separate classes to communicate with each other cleanly, such as a Player object
 * requesting a sound be played by the audio system.
 *
 * The distribution of @reference[GameEvent]s happens as follows:
 *
 * Events are recieved throughout a frame and are queued up by the EventQueue.
 * At the beginning of the next frame, events are sent out to any receivers that are hooked into the event type.
 * @reference[Receiver]s are then free to process events as they see fit.
 *
 * Overall, the EventQueue can be considered as something similar to an email server,
 * and the @reference[Receiver]s can be considered as the client inboxes.
 *
 * See @link(Game Programming Patterns)(https://gameprogrammingpatterns.com/event-queue.html) for more discussion on EventQueues
 */
class EventQueue {
    constructor() {
        this.MAX_SIZE = 100;
        this.q = new Queue_1.default(this.MAX_SIZE);
        this.receivers = new Map_1.default();
    }
    /** Retrieves the instance of the Singleton EventQueue */
    static getInstance() {
        if (this.instance === null) {
            this.instance = new EventQueue();
        }
        return this.instance;
    }
    /** Adds an event to the EventQueue.
     * This is exposed to the rest of the game engine through the @reference[Emitter] class */
    addEvent(event) {
        this.q.enqueue(event);
    }
    /**
     * Associates a receiver with a type of event. Every time this event appears in the future,
     * it will be given to the receiver (and any others watching that type).
     * This is exposed to the rest of the game engine through the @reference[Receiver] class
     * @param receiver The event receiver
     * @param type The type or types of events to subscribe to
     */
    subscribe(receiver, type) {
        if (type instanceof Array) {
            // If it is an array, subscribe to all event types
            for (let t of type) {
                this.addListener(receiver, t);
            }
        }
        else {
            this.addListener(receiver, type);
        }
    }
    /**
     * Unsubscribes the specified receiver from all events, or from whatever events are provided
     * @param receiver The receiver to unsubscribe
     * @param keys The events to unsubscribe from. If none are provided, unsubscribe from all
     */
    unsubscribe(receiver, ...events) {
        this.receivers.forEach(eventName => {
            // If keys were provided, only continue if this key is one of them
            if (events.length > 0 && events.indexOf(eventName) === -1)
                return;
            // Find the index of our receiver for this key
            let index = this.receivers.get(eventName).indexOf(receiver);
            // If an index was found, remove the receiver
            if (index !== -1) {
                this.receivers.get(eventName).splice(index, 1);
            }
        });
    }
    // Associate the receiver and the type
    addListener(receiver, type) {
        if (this.receivers.has(type)) {
            this.receivers.get(type).push(receiver);
        }
        else {
            this.receivers.add(type, [receiver]);
        }
    }
    update(deltaT) {
        while (this.q.hasItems()) {
            // Retrieve each event
            let event = this.q.dequeue();
            // If a receiver has this event type, send it the event
            if (this.receivers.has(event.type)) {
                for (let receiver of this.receivers.get(event.type)) {
                    receiver.receive(event);
                }
            }
            // If a receiver is subscribed to all events, send it the event
            if (this.receivers.has(GameEventType_1.GameEventType.ALL)) {
                for (let receiver of this.receivers.get(GameEventType_1.GameEventType.ALL)) {
                    receiver.receive(event);
                }
            }
        }
    }
}
exports.default = EventQueue;
EventQueue.instance = null;

},{"../DataTypes/Map":10,"../DataTypes/Queue":14,"./GameEventType":30}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Map_1 = require("../DataTypes/Map");
/**
 * A representation of an in-game event that is passed through the @reference[EventQueue]
 */
class GameEvent {
    /**
     * Creates a new GameEvent.
     * This is handled implicitly through the @reference[Emitter] class
     * @param type The type of the GameEvent
     * @param data The data contained by the GameEvent
     */
    constructor(type, data = null) {
        // Parse the game event data
        if (data === null) {
            this.data = new Map_1.default();
        }
        else if (!(data instanceof Map_1.default)) {
            // data is a raw object, unpack
            this.data = new Map_1.default();
            for (let key in data) {
                this.data.add(key, data[key]);
            }
        }
        else {
            this.data = data;
        }
        this.type = type;
        this.time = Date.now();
    }
    /**
     * Checks the type of the GameEvent
     * @param type The type to check
     * @returns True if the GameEvent is the specified type, false otherwise.
     */
    isType(type) {
        return this.type === type;
    }
    /**
     * Returns this GameEvent as a string
     * @returns The string representation of the GameEvent
     */
    toString() {
        return this.type + ": @" + this.time;
    }
}
exports.default = GameEvent;

},{"../DataTypes/Map":10}],30:[function(require,module,exports){
"use strict";
// @ignorePage
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEventType = void 0;
var GameEventType;
(function (GameEventType) {
    /**
     * Mouse Down event. Has data: {position: Vec2 - Mouse Position}
     */
    GameEventType["MOUSE_DOWN"] = "mouse_down";
    /**
     * Mouse Up event. Has data: {position: Vec2 - Mouse Position}
     */
    GameEventType["MOUSE_UP"] = "mouse_up";
    /**
     * Mouse Move event. Has data: {position: Vec2 - Mouse Position}
     */
    GameEventType["MOUSE_MOVE"] = "mouse_move";
    /**
     * Key Down event. Has data: {key: string - The key that is down}
     */
    GameEventType["KEY_DOWN"] = "key_down";
    /**
     * Key Up event. Has data: {key: string - The key that is up}
     */
    GameEventType["KEY_UP"] = "key_up";
    /**
     * Canvas Blur event. Has data: {}
     */
    GameEventType["CANVAS_BLUR"] = "canvas_blur";
    /**
     * Mouse wheel up event. Has data: {}
     */
    GameEventType["WHEEL_UP"] = "wheel_up";
    /**
     * Mouse wheel down event. Has data: {}
     */
    GameEventType["WHEEL_DOWN"] = "wheel_down";
    /**
     * Start Recording event. Has data: {}
     */
    GameEventType["START_RECORDING"] = "start_recording";
    /**
     * Stop Recording event. Has data: {}
     */
    GameEventType["STOP_RECORDING"] = "stop_recording";
    /**
     * Play Recording event. Has data: {}
     */
    GameEventType["PLAY_RECORDING"] = "play_recording";
    /**
     * Play Sound event. Has data: {key: string, loop: boolean, holdReference: boolean }
     */
    GameEventType["PLAY_SOUND"] = "play_sound";
    /**
     * Play Sound event. Has data: {key: string}
     */
    GameEventType["STOP_SOUND"] = "stop_sound";
    /**
     * Play Sound event. Has data: {key: string, loop: boolean, holdReference: boolean, channel: AudioChannelType }
     */
    GameEventType["PLAY_SFX"] = "play_sfx";
    /**
     * Play Sound event. Has data: {key: string, loop: boolean, holdReference: boolean }
     */
    GameEventType["PLAY_MUSIC"] = "play_music";
    /**
     * Mute audio channel event. Has data: {channel: AudioChannelType}
     */
    GameEventType["MUTE_CHANNEL"] = "mute_channel";
    /**
     * Unmute audio channel event. Has data: {channel: AudioChannelType}
     */
    GameEventType["UNMUTE_CHANNEL"] = "unmute_channel";
    /**
     * Encompasses all event types. Used for receivers only.
     */
    GameEventType["ALL"] = "all";
})(GameEventType = exports.GameEventType || (exports.GameEventType = {}));

},{}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Queue_1 = require("../DataTypes/Queue");
const EventQueue_1 = require("./EventQueue");
/**
 * Receives subscribed events from the EventQueue.
 */
class Receiver {
    /** Creates a new Receiver */
    constructor() {
        this.MAX_SIZE = 100;
        this.q = new Queue_1.default(this.MAX_SIZE);
    }
    destroy() {
        EventQueue_1.default.getInstance().unsubscribe(this);
    }
    /**
     * Adds these types of events to this receiver's queue every update.
     * @param eventTypes The types of events this receiver will be subscribed to
     */
    subscribe(eventTypes) {
        EventQueue_1.default.getInstance().subscribe(this, eventTypes);
        this.q.clear();
    }
    /**
     * Adds an event to the queue of this reciever. This is used by the @reference[EventQueue] to distribute events
     * @param event The event to receive
     */
    receive(event) {
        try {
            this.q.enqueue(event);
        }
        catch (e) {
            console.warn("Receiver overflow for event " + event.toString());
            throw e;
        }
    }
    /**
     * Retrieves the next event from the receiver's queue
     * @returns The next GameEvent
     */
    getNextEvent() {
        return this.q.dequeue();
    }
    /**
     * Looks at the next event in the receiver's queue, but doesn't remove it from the queue
     * @returns The next GameEvent
     */
    peekNextEvent() {
        return this.q.peekNext();
    }
    /**
     * Returns true if the receiver has any events in its queue
     * @returns True if the receiver has another event, false otherwise
     */
    hasNextEvent() {
        return this.q.hasItems();
    }
    /**
     * Ignore all events this frame
     */
    ignoreEvents() {
        this.q.clear();
    }
}
exports.default = Receiver;

},{"../DataTypes/Queue":14,"./EventQueue":28}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Receiver_1 = require("../Events/Receiver");
const Map_1 = require("../DataTypes/Map");
const Vec2_1 = require("../DataTypes/Vec2");
const EventQueue_1 = require("../Events/EventQueue");
const GameEventType_1 = require("../Events/GameEventType");
/**
 * Receives input events from the @reference[EventQueue] and allows for easy access of information about input by other systems
 */
class Input {
    /**
     * Initializes the Input object
     * @param viewport A reference to the viewport of the game
     */
    static initialize(viewport, keyMap) {
        Input.viewport = viewport;
        Input.mousePressed = false;
        Input.mouseJustPressed = false;
        Input.receiver = new Receiver_1.default();
        Input.keyJustPressed = new Map_1.default();
        Input.keyPressed = new Map_1.default();
        Input.mousePosition = new Vec2_1.default(0, 0);
        Input.mousePressPosition = new Vec2_1.default(0, 0);
        Input.scrollDirection = 0;
        Input.justScrolled = false;
        Input.keysDisabled = false;
        Input.mouseDisabled = false;
        // Initialize the keymap
        Input.keyMap = new Map_1.default();
        // Add all keys to the keymap
        for (let entry in keyMap) {
            let name = keyMap[entry].name;
            let keys = keyMap[entry].keys;
            Input.keyMap.add(name, keys);
        }
        Input.eventQueue = EventQueue_1.default.getInstance();
        // Subscribe to all input events
        Input.eventQueue.subscribe(Input.receiver, [GameEventType_1.GameEventType.MOUSE_DOWN, GameEventType_1.GameEventType.MOUSE_UP, GameEventType_1.GameEventType.MOUSE_MOVE,
            GameEventType_1.GameEventType.KEY_DOWN, GameEventType_1.GameEventType.KEY_UP, GameEventType_1.GameEventType.CANVAS_BLUR, GameEventType_1.GameEventType.WHEEL_UP, GameEventType_1.GameEventType.WHEEL_DOWN]);
    }
    static update(deltaT) {
        // Reset the justPressed values to false
        Input.mouseJustPressed = false;
        Input.keyJustPressed.forEach((key) => Input.keyJustPressed.set(key, false));
        Input.justScrolled = false;
        Input.scrollDirection = 0;
        while (Input.receiver.hasNextEvent()) {
            let event = Input.receiver.getNextEvent();
            // Handle each event type
            if (event.type === GameEventType_1.GameEventType.MOUSE_DOWN) {
                Input.mouseJustPressed = true;
                Input.mousePressed = true;
                Input.mousePressPosition = event.data.get("position");
                Input.mouseButtonPressed = event.data.get("button");
            }
            if (event.type === GameEventType_1.GameEventType.MOUSE_UP) {
                Input.mousePressed = false;
            }
            if (event.type === GameEventType_1.GameEventType.MOUSE_MOVE) {
                Input.mousePosition = event.data.get("position");
            }
            if (event.type === GameEventType_1.GameEventType.KEY_DOWN) {
                let key = event.data.get("key");
                // Handle space bar
                if (key === " ") {
                    key = "space";
                }
                if (!Input.keyPressed.get(key)) {
                    Input.keyJustPressed.set(key, true);
                    Input.keyPressed.set(key, true);
                }
            }
            if (event.type === GameEventType_1.GameEventType.KEY_UP) {
                let key = event.data.get("key");
                // Handle space bar
                if (key === " ") {
                    key = "space";
                }
                Input.keyPressed.set(key, false);
            }
            if (event.type === GameEventType_1.GameEventType.CANVAS_BLUR) {
                Input.clearKeyPresses();
            }
            if (event.type === GameEventType_1.GameEventType.WHEEL_UP) {
                Input.scrollDirection = -1;
                Input.justScrolled = true;
            }
            else if (event.type === GameEventType_1.GameEventType.WHEEL_DOWN) {
                Input.scrollDirection = 1;
                Input.justScrolled = true;
            }
        }
    }
    static clearKeyPresses() {
        Input.keyJustPressed.forEach((key) => Input.keyJustPressed.set(key, false));
        Input.keyPressed.forEach((key) => Input.keyPressed.set(key, false));
    }
    /**
     * Returns whether or not a key was newly pressed Input frame.
     * If the key is still pressed from last frame and wasn't re-pressed, Input will return false.
     * @param key The key
     * @returns True if the key was just pressed, false otherwise
     */
    static isKeyJustPressed(key) {
        if (Input.keysDisabled)
            return false;
        if (Input.keyJustPressed.has(key)) {
            return Input.keyJustPressed.get(key);
        }
        else {
            return false;
        }
    }
    /**
     * Returns an array of all of the keys that are newly pressed Input frame.
     * If a key is still pressed from last frame and wasn't re-pressed, it will not be in Input list.
     * @returns An array of all of the newly pressed keys.
     */
    static getKeysJustPressed() {
        if (Input.keysDisabled)
            return [];
        let keys = Array();
        Input.keyJustPressed.forEach(key => {
            if (Input.keyJustPressed.get(key)) {
                keys.push(key);
            }
        });
        return keys;
    }
    /**
     * Returns whether or not a key is being pressed.
     * @param key The key
     * @returns True if the key is currently pressed, false otherwise
     */
    static isKeyPressed(key) {
        if (Input.keysDisabled)
            return false;
        if (Input.keyPressed.has(key)) {
            return Input.keyPressed.get(key);
        }
        else {
            return false;
        }
    }
    /**
     * Changes the binding of an input name to keys
     * @param inputName The name of the input
     * @param keys The corresponding keys
     */
    static changeKeyBinding(inputName, keys) {
        Input.keyMap.set(inputName, keys);
    }
    /**
     * Clears all key bindings
     */
    static clearAllKeyBindings() {
        Input.keyMap.clear();
    }
    /**
     * Returns whether or not an input was just pressed this frame
     * @param inputName The name of the input
     * @returns True if the input was just pressed, false otherwise
     */
    static isJustPressed(inputName) {
        if (Input.keysDisabled)
            return false;
        if (Input.keyMap.has(inputName)) {
            const keys = Input.keyMap.get(inputName);
            let justPressed = false;
            for (let key of keys) {
                justPressed = justPressed || Input.isKeyJustPressed(key);
            }
            return justPressed;
        }
        else {
            return false;
        }
    }
    /**
     * Returns whether or not an input is currently pressed
     * @param inputName The name of the input
     * @returns True if the input is pressed, false otherwise
     */
    static isPressed(inputName) {
        if (Input.keysDisabled)
            return false;
        if (Input.keyMap.has(inputName)) {
            const keys = Input.keyMap.get(inputName);
            let pressed = false;
            for (let key of keys) {
                pressed = pressed || Input.isKeyPressed(key);
            }
            return pressed;
        }
        else {
            return false;
        }
    }
    /**
     *
     * Returns whether or not the mouse was newly pressed Input frame.
     * @param mouseButton Optionally specify which mouse click you want to know was pressed.
     * 0 for left click, 1 for middle click, 2 for right click.
     * @returns True if the mouse was just pressed, false otherwise
     */
    static isMouseJustPressed(mouseButton) {
        if (mouseButton !== undefined) {
            return Input.mouseJustPressed && !Input.mouseDisabled && mouseButton == this.mouseButtonPressed;
        }
        return Input.mouseJustPressed && !Input.mouseDisabled;
    }
    /**
     * Returns whether or not the mouse is currently pressed
     * @param mouseButton Optionally specify which mouse click you want to know was pressed.
     * 0 for left click, 1 for middle click, 2 for right click.
     * @returns True if the mouse is currently pressed, false otherwise
     */
    static isMousePressed(mouseButton) {
        if (mouseButton !== undefined) {
            return Input.mousePressed && !Input.mouseDisabled && mouseButton == this.mouseButtonPressed;
        }
        return Input.mousePressed && !Input.mouseDisabled;
    }
    /**
     * Returns whether the user scrolled or not
     * @returns True if the user just scrolled Input frame, false otherwise
     */
    static didJustScroll() {
        return Input.justScrolled && !Input.mouseDisabled;
    }
    /**
     * Gets the direction of the scroll
     * @returns -1 if the user scrolled up, 1 if they scrolled down
     */
    static getScrollDirection() {
        return Input.scrollDirection;
    }
    /**
     * Gets the position of the player's mouse
     * @returns The mouse position stored as a Vec2
     */
    static getMousePosition() {
        return Input.mousePosition.scaled(1 / this.viewport.getZoomLevel());
    }
    /**
     * Gets the position of the player's mouse in the game world,
     * taking into consideration the scrolling of the viewport
     * @returns The mouse position stored as a Vec2
     */
    static getGlobalMousePosition() {
        return Input.mousePosition.clone().scale(1 / this.viewport.getZoomLevel()).add(Input.viewport.getOrigin());
    }
    /**
     * Gets the position of the last mouse press
     * @returns The mouse position stored as a Vec2
     */
    static getMousePressPosition() {
        return Input.getMousePosition();
    }
    /**
     * Gets the position of the last mouse press in the game world,
     * taking into consideration the scrolling of the viewport
     * @returns The mouse position stored as a Vec2
     */
    static getGlobalMousePressPosition() {
        return Input.mousePressPosition.clone().add(Input.viewport.getOrigin());
    }
    /**
     * Disables all keypress and mouse click inputs
     */
    static disableInput() {
        Input.keysDisabled = true;
        Input.mouseDisabled = true;
    }
    /**
     * Enables all keypress and mouse click inputs
     */
    static enableInput() {
        Input.keysDisabled = false;
        Input.mouseDisabled = false;
    }
}
exports.default = Input;

},{"../DataTypes/Map":10,"../DataTypes/Vec2":24,"../Events/EventQueue":28,"../Events/GameEventType":30,"../Events/Receiver":31}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventQueue_1 = require("../Events/EventQueue");
const Vec2_1 = require("../DataTypes/Vec2");
const GameEvent_1 = require("../Events/GameEvent");
const GameEventType_1 = require("../Events/GameEventType");
/**
 * Handles communication with the web browser to receive asynchronous events and send them to the @reference[EventQueue]
 */
class InputHandler {
    /**
     * Creates a new InputHandler
     * @param canvas The game canvas
     */
    constructor(canvas) {
        this.handleMouseDown = (event, canvas) => {
            let pos = this.getMousePosition(event, canvas);
            let button = event.button;
            let gameEvent = new GameEvent_1.default(GameEventType_1.GameEventType.MOUSE_DOWN, { position: pos, button: button });
            this.eventQueue.addEvent(gameEvent);
        };
        this.handleMouseUp = (event, canvas) => {
            let pos = this.getMousePosition(event, canvas);
            let gameEvent = new GameEvent_1.default(GameEventType_1.GameEventType.MOUSE_UP, { position: pos });
            this.eventQueue.addEvent(gameEvent);
        };
        this.handleMouseMove = (event, canvas) => {
            let pos = this.getMousePosition(event, canvas);
            let gameEvent = new GameEvent_1.default(GameEventType_1.GameEventType.MOUSE_MOVE, { position: pos });
            this.eventQueue.addEvent(gameEvent);
        };
        this.handleKeyDown = (event) => {
            let key = this.getKey(event);
            let gameEvent = new GameEvent_1.default(GameEventType_1.GameEventType.KEY_DOWN, { key: key });
            this.eventQueue.addEvent(gameEvent);
        };
        this.handleKeyUp = (event) => {
            let key = this.getKey(event);
            let gameEvent = new GameEvent_1.default(GameEventType_1.GameEventType.KEY_UP, { key: key });
            this.eventQueue.addEvent(gameEvent);
        };
        this.handleBlur = (event) => {
            let gameEvent = new GameEvent_1.default(GameEventType_1.GameEventType.CANVAS_BLUR, {});
            this.eventQueue.addEvent(gameEvent);
        };
        this.handleContextMenu = (event) => {
            event.preventDefault();
            event.stopPropagation();
        };
        this.handleWheel = (event) => {
            event.preventDefault();
            event.stopPropagation();
            let gameEvent;
            if (event.deltaY < 0) {
                gameEvent = new GameEvent_1.default(GameEventType_1.GameEventType.WHEEL_UP, {});
            }
            else {
                gameEvent = new GameEvent_1.default(GameEventType_1.GameEventType.WHEEL_DOWN, {});
            }
            this.eventQueue.addEvent(gameEvent);
        };
        this.eventQueue = EventQueue_1.default.getInstance();
        canvas.onmousedown = (event) => this.handleMouseDown(event, canvas);
        canvas.onmouseup = (event) => this.handleMouseUp(event, canvas);
        canvas.oncontextmenu = this.handleContextMenu;
        canvas.onmousemove = (event) => this.handleMouseMove(event, canvas);
        document.onkeydown = this.handleKeyDown;
        document.onkeyup = this.handleKeyUp;
        document.onblur = this.handleBlur;
        document.oncontextmenu = this.handleBlur;
        document.onwheel = this.handleWheel;
    }
    getKey(keyEvent) {
        return keyEvent.key.toLowerCase();
    }
    getMousePosition(mouseEvent, canvas) {
        let rect = canvas.getBoundingClientRect();
        let x = mouseEvent.clientX - rect.left;
        let y = mouseEvent.clientY - rect.top;
        return new Vec2_1.default(x, y);
    }
}
exports.default = InputHandler;

},{"../DataTypes/Vec2":24,"../Events/EventQueue":28,"../Events/GameEvent":29,"../Events/GameEventType":30}],34:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ignorePage
/**
 * Sets up the environment of the game engine
 */
class EnvironmentInitializer {
    static setup() {
        CanvasRenderingContext2D.prototype.roundedRect = function (x, y, w, h, r) {
            // Clamp the radius between 0 and the min of the width or height
            if (r < 0)
                r = 0;
            if (r > Math.min(w, h))
                r = Math.min(w, h);
            // Draw the rounded rect
            this.beginPath();
            // Top
            this.moveTo(x + r, y);
            this.lineTo(x + w - r, y);
            this.arcTo(x + w, y, x + w, y + r, r);
            // Right
            this.lineTo(x + w, y + h - r);
            this.arcTo(x + w, y + h, x + w - r, y + h, r);
            // Bottom
            this.lineTo(x + r, y + h);
            this.arcTo(x, y + h, x, y + h - r, r);
            // Left
            this.lineTo(x, y + r);
            this.arcTo(x, y, x + r, y, r);
            this.closePath();
        };
        CanvasRenderingContext2D.prototype.strokeRoundedRect = function (x, y, w, h, r) {
            this.roundedRect(x, y, w, h, r);
            this.stroke();
        };
        CanvasRenderingContext2D.prototype.fillRoundedRect = function (x, y, w, h, r) {
            this.roundedRect(x, y, w, h, r);
            this.fill();
        };
    }
}
exports.default = EnvironmentInitializer;

},{}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GameLoop_1 = require("./GameLoop");
const Debug_1 = require("../Debug/Debug");
const Stats_1 = require("../Debug/Stats");
/**
 * A game loop with a fixed update time and a variable render time.
 * Every frame, the game updates until all time since the last frame has been processed.
 * If too much time has passed, such as if the last update was too slow,
 * or if the browser was put into the background, the loop will panic and discard time.
 * A render happens at the end of every frame. This happens as fast as possible unless specified.
 * A loop of this type allows for deterministic behavior - No matter what the frame rate is, the update should behave the same,
 * as it is occuring in a fixed interval.
 */
class FixedUpdateGameLoop extends GameLoop_1.default {
    constructor() {
        super();
        /**
         * The main loop of the game. Updates until the current time is reached. Renders once
         * @param timestamp The current time in ms
         */
        this.doFrame = (timestamp) => {
            // If a pause was executed, stop doing the loop.
            if (this.paused) {
                return;
            }
            // Request animation frame to prepare for another update or render
            window.requestAnimationFrame((t) => this.doFrame(t));
            // If we are trying to render too soon, do nothing.
            if (timestamp < this.lastFrameTime + this.minFrameDelay) {
                return;
            }
            // A frame is actually happening
            this.startFrame(timestamp);
            // Update while there is still time to make up. If we do too many update steps, panic and exit the loop.
            this.numUpdateSteps = 0;
            let panic = false;
            while (this.frameDelta >= this.updateTimestep) {
                // Do an update
                this._doUpdate(this.updateTimestep / 1000);
                // Remove the update step time from the time we have to process
                this.frameDelta -= this.updateTimestep;
                // Increment steps and check if we've done too many
                this.numUpdateSteps++;
                if (this.numUpdateSteps > 100) {
                    panic = true;
                    break;
                }
            }
            // Updates are done, render
            this._doRender();
            // Wrap up the frame
            this.finishFrame(panic);
        };
        this.maxUpdateFPS = 60;
        this.updateTimestep = Math.floor(1000 / this.maxUpdateFPS);
        this.frameDelta = 0;
        this.lastFrameTime = 0;
        this.minFrameDelay = 0;
        this.frame = 0;
        this.fps = this.maxUpdateFPS; // Initialize the fps to the max allowed fps
        this.fpsUpdateInterval = 1000;
        this.lastFpsUpdate = 0;
        this.framesSinceLastFpsUpdate = 0;
        this.started = false;
        this.paused = false;
        this.running = false;
        this.numUpdateSteps = 0;
    }
    getFPS() {
        return 0;
    }
    /**
     * Updates the frame count and sum of time for the framerate of the game
     * @param timestep The current time in ms
     */
    updateFPS(timestamp) {
        this.fps = 0.9 * this.framesSinceLastFpsUpdate * 1000 / (timestamp - this.lastFpsUpdate) + (1 - 0.9) * this.fps;
        this.lastFpsUpdate = timestamp;
        this.framesSinceLastFpsUpdate = 0;
        Debug_1.default.log("fps", "FPS: " + this.fps.toFixed(1));
        Stats_1.default.updateFPS(this.fps);
    }
    /**
 * Changes the maximum allowed physics framerate of the game
 * @param initMax The max framerate
 */
    setMaxUpdateFPS(initMax) {
        this.maxUpdateFPS = initMax;
        this.updateTimestep = Math.floor(1000 / this.maxUpdateFPS);
    }
    /**
     * Sets the maximum rendering framerate
     * @param maxFPS The max framerate
     */
    setMaxFPS(maxFPS) {
        this.minFrameDelay = 1000 / maxFPS;
    }
    /**
     * This function is called when the game loop panics, i.e. it tries to process too much time in an entire frame.
     * This will reset the amount of time back to zero.
     * @returns The amount of time we are discarding from processing.
     */
    resetFrameDelta() {
        let oldFrameDelta = this.frameDelta;
        this.frameDelta = 0;
        return oldFrameDelta;
    }
    /**
     * Starts up the game loop and calls the first requestAnimationFrame
     */
    start() {
        if (!this.started) {
            this.started = true;
            window.requestAnimationFrame((timestamp) => this.doFirstFrame(timestamp));
        }
    }
    pause() {
        this.paused = true;
    }
    resume() {
        this.paused = false;
    }
    /**
     * The first game frame - initializes the first frame time and begins the render
     * @param timestamp The current time in ms
     */
    doFirstFrame(timestamp) {
        this.running = true;
        this._doRender();
        this.lastFrameTime = timestamp;
        this.lastFpsUpdate = timestamp;
        this.framesSinceLastFpsUpdate = 0;
        window.requestAnimationFrame((t) => this.doFrame(t));
    }
    /**
     * Handles any processing that needs to be done at the start of the frame
     * @param timestamp The time of the frame in ms
     */
    startFrame(timestamp) {
        // Update the amount of time we need our update to process
        this.frameDelta += timestamp - this.lastFrameTime;
        // Set the new time of the last frame
        this.lastFrameTime = timestamp;
        // Update the estimate of the framerate
        if (timestamp > this.lastFpsUpdate + this.fpsUpdateInterval) {
            this.updateFPS(timestamp);
        }
        // Increment the number of frames
        this.frame++;
        this.framesSinceLastFpsUpdate++;
    }
    /**
     * Wraps up the frame and handles the panic state if there is one
     * @param panic Whether or not the loop panicked
     */
    finishFrame(panic) {
        if (panic) {
            var discardedTime = Math.round(this.resetFrameDelta());
            console.warn('Main loop panicked, probably because the browser tab was put in the background. Discarding ' + discardedTime + 'ms');
        }
    }
}
exports.default = FixedUpdateGameLoop;

},{"../Debug/Debug":25,"../Debug/Stats":26,"./GameLoop":37}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventQueue_1 = require("../Events/EventQueue");
const Input_1 = require("../Input/Input");
const InputHandler_1 = require("../Input/InputHandler");
const Recorder_1 = require("../Playback/Recorder");
const Debug_1 = require("../Debug/Debug");
const ResourceManager_1 = require("../ResourceManager/ResourceManager");
const Viewport_1 = require("../SceneGraph/Viewport");
const SceneManager_1 = require("../Scene/SceneManager");
const AudioManager_1 = require("../Sound/AudioManager");
const Stats_1 = require("../Debug/Stats");
const CanvasRenderer_1 = require("../Rendering/CanvasRenderer");
const Color_1 = require("../Utils/Color");
const GameOptions_1 = require("./GameOptions");
const FixedUpdateGameLoop_1 = require("./FixedUpdateGameLoop");
const EnvironmentInitializer_1 = require("./EnvironmentInitializer");
const Vec2_1 = require("../DataTypes/Vec2");
const RegistryManager_1 = require("../Registry/RegistryManager");
const WebGLRenderer_1 = require("../Rendering/WebGLRenderer");
/**
 * The main loop of the game engine.
 * Handles the update order, and initializes all subsystems.
 * The Game manages the update cycle, and requests animation frames to render to the browser.
 */
class Game {
    /**
     * Creates a new Game
     * @param options The options for Game initialization
     */
    constructor(options) {
        // Before anything else, build the environment
        EnvironmentInitializer_1.default.setup();
        // Typecast the config object to a GameConfig object
        this.gameOptions = GameOptions_1.default.parse(options);
        this.showDebug = this.gameOptions.showDebug;
        this.showStats = this.gameOptions.showStats;
        // Create an instance of a game loop
        this.loop = new FixedUpdateGameLoop_1.default();
        // Get the game canvas and give it a background color
        this.GAME_CANVAS = document.getElementById("game-canvas");
        this.DEBUG_CANVAS = document.getElementById("debug-canvas");
        // Give the canvas a size and get the rendering context
        this.WIDTH = this.gameOptions.canvasSize.x;
        this.HEIGHT = this.gameOptions.canvasSize.y;
        // This step MUST happen before the resource manager does anything
        if (this.gameOptions.useWebGL) {
            this.renderingManager = new WebGLRenderer_1.default();
        }
        else {
            this.renderingManager = new CanvasRenderer_1.default();
        }
        this.initializeGameWindow();
        this.ctx = this.renderingManager.initializeCanvas(this.GAME_CANVAS, this.WIDTH, this.HEIGHT);
        this.clearColor = new Color_1.default(this.gameOptions.clearColor.r, this.gameOptions.clearColor.g, this.gameOptions.clearColor.b);
        // Initialize debugging and stats
        Debug_1.default.initializeDebugCanvas(this.DEBUG_CANVAS, this.WIDTH, this.HEIGHT);
        Stats_1.default.initStats();
        if (this.gameOptions.showStats) {
            // Find the stats output and make it no longer hidden
            document.getElementById("stats").hidden = false;
        }
        // Size the viewport to the game canvas
        const canvasSize = new Vec2_1.default(this.WIDTH, this.HEIGHT);
        this.viewport = new Viewport_1.default(canvasSize, this.gameOptions.zoomLevel);
        // Initialize all necessary game subsystems
        this.eventQueue = EventQueue_1.default.getInstance();
        this.inputHandler = new InputHandler_1.default(this.GAME_CANVAS);
        Input_1.default.initialize(this.viewport, this.gameOptions.inputs);
        this.recorder = new Recorder_1.default();
        this.resourceManager = ResourceManager_1.default.getInstance();
        this.sceneManager = new SceneManager_1.default(this.viewport, this.renderingManager);
        this.audioManager = AudioManager_1.default.getInstance();
    }
    /**
     * Set up the game window that holds the canvases
     */
    initializeGameWindow() {
        const gameWindow = document.getElementById("game-window");
        // Set the height of the game window
        gameWindow.style.width = this.WIDTH + "px";
        gameWindow.style.height = this.HEIGHT + "px";
    }
    /**
     * Retreives the SceneManager from the Game
     * @returns The SceneManager
     */
    getSceneManager() {
        return this.sceneManager;
    }
    /**
     * Starts the game
     */
    start(InitialScene, options) {
        // Set the update function of the loop
        this.loop.doUpdate = (deltaT) => this.update(deltaT);
        // Set the render function of the loop
        this.loop.doRender = () => this.render();
        // Preload registry items
        RegistryManager_1.default.preload();
        // Load the items with the resource manager
        this.resourceManager.loadResourcesFromQueue(() => {
            // When we're done loading, start the loop
            console.log("Finished Preload - loading first scene");
            this.sceneManager.changeToScene(InitialScene, {}, options);
            this.loop.start();
        });
    }
    /**
     * Updates all necessary subsystems of the game. Defers scene updates to the sceneManager
     * @param deltaT The time sine the last update
     */
    update(deltaT) {
        try {
            // Handle all events that happened since the start of the last loop
            this.eventQueue.update(deltaT);
            // Update the input data structures so game objects can see the input
            Input_1.default.update(deltaT);
            // Update the recording of the game
            this.recorder.update(deltaT);
            // Update all scenes
            this.sceneManager.update(deltaT);
            // Update all sounds
            this.audioManager.update(deltaT);
            // Load or unload any resources if needed
            this.resourceManager.update(deltaT);
        }
        catch (e) {
            this.loop.pause();
            console.warn("Uncaught Error in Update - Crashing gracefully");
            console.error(e);
        }
    }
    /**
     * Clears the canvas and defers scene rendering to the sceneManager. Renders the debug canvas
     */
    render() {
        try {
            // Clear the canvases
            Debug_1.default.clearCanvas();
            this.renderingManager.clear(this.clearColor);
            this.sceneManager.render();
            // Hacky debug mode
            if (Input_1.default.isKeyJustPressed("g")) {
                this.showDebug = !this.showDebug;
            }
            // Debug render
            if (this.showDebug) {
                Debug_1.default.render();
            }
            if (this.showStats) {
                Stats_1.default.render();
            }
        }
        catch (e) {
            this.loop.pause();
            console.warn("Uncaught Error in Render - Crashing gracefully");
            console.error(e);
        }
    }
}
exports.default = Game;

},{"../DataTypes/Vec2":24,"../Debug/Debug":25,"../Debug/Stats":26,"../Events/EventQueue":28,"../Input/Input":32,"../Input/InputHandler":33,"../Playback/Recorder":62,"../Registry/RegistryManager":65,"../Rendering/CanvasRenderer":71,"../Rendering/WebGLRenderer":76,"../ResourceManager/ResourceManager":83,"../Scene/SceneManager":91,"../SceneGraph/Viewport":95,"../Sound/AudioManager":96,"../Utils/Color":99,"./EnvironmentInitializer":34,"./FixedUpdateGameLoop":35,"./GameOptions":38}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const NullFunc_1 = require("../DataTypes/Functions/NullFunc");
/**
 * The main game loop of the game. Keeps track of fps and handles scheduling of updates and rendering.
 * This class is left abstract, so that a subclass can handle exactly how the loop is scheduled.
 * For an example of different types of game loop scheduling, check out @link(Game Programming Patterns)(https://gameprogrammingpatterns.com/game-loop.html)
 */
class GameLoop {
    constructor() {
        /** The function to call when an update occurs */
        this._doUpdate = NullFunc_1.default;
        /** The function to call when a render occurs */
        this._doRender = NullFunc_1.default;
    }
    set doUpdate(update) {
        this._doUpdate = update;
    }
    set doRender(render) {
        this._doRender = render;
    }
}
exports.default = GameLoop;

},{"../DataTypes/Functions/NullFunc":5}],38:[function(require,module,exports){
"use strict";
// @ignorePage
Object.defineProperty(exports, "__esModule", { value: true });
/** The options for initializing the @reference[GameLoop] */
class GameOptions {
    /**
     * Parses the data in the raw options object
     * @param options The game options as a Record
     * @returns A version of the options converted to a GameOptions object
     */
    static parse(options) {
        let gOpt = new GameOptions();
        gOpt.canvasSize = options.canvasSize ? options.canvasSize : { x: 800, y: 600 };
        gOpt.zoomLevel = options.zoomLevel ? options.zoomLevel : 1;
        gOpt.clearColor = options.clearColor ? options.clearColor : { r: 255, g: 255, b: 255 };
        gOpt.inputs = options.inputs ? options.inputs : [];
        gOpt.showDebug = !!options.showDebug;
        gOpt.showStats = !!options.showStats;
        gOpt.useWebGL = !!options.useWebGL;
        return gOpt;
    }
}
exports.default = GameOptions;

},{}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GameNode_1 = require("./GameNode");
const Vec2_1 = require("../DataTypes/Vec2");
const AABB_1 = require("../DataTypes/Shapes/AABB");
const Debug_1 = require("../Debug/Debug");
const Color_1 = require("../Utils/Color");
/**
 * The representation of an object in the game world that can be drawn to the screen
 */
class CanvasNode extends GameNode_1.default {
    constructor() {
        super();
        /** A flag for whether or not the CanvasNode is visible */
        this.visible = true;
        this._size = new Vec2_1.default(0, 0);
        this._size.setOnChange(() => this.sizeChanged());
        this._scale = new Vec2_1.default(1, 1);
        this._scale.setOnChange(() => this.scaleChanged());
        this._boundary = new AABB_1.default();
        this.updateBoundary();
        this._hasCustomShader = false;
    }
    get alpha() {
        return this._alpha;
    }
    set alpha(a) {
        this._alpha = a;
    }
    get size() {
        return this._size;
    }
    set size(size) {
        this._size = size;
        // Enter as a lambda to bind "this"
        this._size.setOnChange(() => this.sizeChanged());
        this.sizeChanged();
    }
    get scale() {
        return this._scale;
    }
    set scale(scale) {
        this._scale = scale;
        // Enter as a lambda to bind "this"
        this._scale.setOnChange(() => this.scaleChanged());
        this.scaleChanged();
    }
    set scaleX(value) {
        this.scale.x = value;
    }
    set scaleY(value) {
        this.scale.y = value;
    }
    get hasCustomShader() {
        return this._hasCustomShader;
    }
    get customShaderKey() {
        return this._customShaderKey;
    }
    // @override
    positionChanged() {
        super.positionChanged();
        this.updateBoundary();
    }
    /** Called if the size vector is changed or replaced. */
    sizeChanged() {
        this.updateBoundary();
    }
    /** Called if the scale vector is changed or replaced */
    scaleChanged() {
        this.updateBoundary();
    }
    // @docIgnore
    /** Called if the position, size, or scale of the CanvasNode is changed. Updates the boundary. */
    updateBoundary() {
        this._boundary.center.set(this.position.x, this.position.y);
        this._boundary.halfSize.set(this.size.x * this.scale.x / 2, this.size.y * this.scale.y / 2);
    }
    get boundary() {
        return this._boundary;
    }
    get sizeWithZoom() {
        let zoom = this.scene.getViewScale();
        return this.boundary.halfSize.clone().scaled(zoom, zoom);
    }
    /**
     * Adds a custom shader to this CanvasNode
     * @param key The registry key of the ShaderType
     */
    useCustomShader(key) {
        this._hasCustomShader = true;
        this._customShaderKey = key;
    }
    /**
     * Returns true if the point (x, y) is inside of this canvas object
     * @param x The x position of the point
     * @param y The y position of the point
     * @returns A flag representing whether or not this node contains the point.
     */
    contains(x, y) {
        return this._boundary.containsPoint(new Vec2_1.default(x, y));
    }
    // @implemented
    debugRender() {
        Debug_1.default.drawBox(this.relativePosition, this.sizeWithZoom, false, Color_1.default.BLUE);
        super.debugRender();
    }
}
exports.default = CanvasNode;

},{"../DataTypes/Shapes/AABB":16,"../DataTypes/Vec2":24,"../Debug/Debug":25,"../Utils/Color":99,"./GameNode":40}],40:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TweenableProperties = void 0;
const Vec2_1 = require("../DataTypes/Vec2");
const Receiver_1 = require("../Events/Receiver");
const Emitter_1 = require("../Events/Emitter");
const Region_1 = require("../DataTypes/Interfaces/Region");
const AABB_1 = require("../DataTypes/Shapes/AABB");
const TweenController_1 = require("../Rendering/Animations/TweenController");
const Debug_1 = require("../Debug/Debug");
const Color_1 = require("../Utils/Color");
const Circle_1 = require("../DataTypes/Shapes/Circle");
/**
 * The representation of an object in the game world.
 * To construct GameNodes, see the @reference[Scene] documentation.
 */
class GameNode {
    // Constructor docs are ignored, as the user should NOT create new GameNodes with a raw constructor
    constructor() {
        /*---------- PHYSICAL ----------*/
        this.hasPhysics = false;
        this.moving = false;
        this.frozen = false;
        this.onGround = false;
        this.onWall = false;
        this.onCeiling = false;
        this.active = false;
        this.isColliding = false;
        this.pathfinding = false;
        this._position = new Vec2_1.default(0, 0);
        this._position.setOnChange(() => this.positionChanged());
        this.receiver = new Receiver_1.default();
        this.emitter = new Emitter_1.default();
        this.tweens = new TweenController_1.default(this);
        this.rotation = 0;
    }
    destroy() {
        this.tweens.destroy();
        this.receiver.destroy();
        if (this.hasPhysics) {
            this.removePhysics();
        }
        if (this._ai) {
            this._ai.destroy();
            delete this._ai;
            this.scene.getAIManager().removeActor(this);
        }
        this.scene.remove(this);
        this.layer.removeNode(this);
    }
    /*---------- POSITIONED ----------*/
    get position() {
        return this._position;
    }
    set position(pos) {
        this._position = pos;
        this._position.setOnChange(() => this.positionChanged());
        this.positionChanged();
    }
    get relativePosition() {
        return this.inRelativeCoordinates(this.position);
    }
    /**
     * Converts a point to coordinates relative to the zoom and origin of this node
     * @param point The point to conver
     * @returns A new Vec2 representing the point in relative coordinates
     */
    inRelativeCoordinates(point) {
        let origin = this.scene.getViewTranslation(this);
        let zoom = this.scene.getViewScale();
        return point.clone().sub(origin).scale(zoom);
    }
    /*---------- UNIQUE ----------*/
    get id() {
        return this._id;
    }
    set id(id) {
        // id can only be set once
        if (this._id === undefined) {
            this._id = id;
        }
        else {
            throw "Attempted to assign id to object that already has id.";
        }
    }
    /*---------- PHYSICAL ----------*/
    // @implemented
    /**
     * @param velocity The velocity with which to move the object.
     */
    move(velocity) {
        if (this.frozen)
            return;
        this.moving = true;
        this._velocity = velocity;
    }
    ;
    moveOnPath(speed, path) {
        if (this.frozen)
            return;
        this.path = path;
        let dir = path.getMoveDirection(this);
        this.moving = true;
        this.pathfinding = true;
        this._velocity = dir.scale(speed);
    }
    // @implemented
    /**
     * @param velocity The velocity with which the object will move.
     */
    finishMove() {
        this.moving = false;
        this.position.add(this._velocity);
        if (this.pathfinding) {
            this.path.handlePathProgress(this);
            this.path = null;
            this.pathfinding = false;
        }
    }
    // @implemented
    /**
     * @param collisionShape The collider for this object. If this has a region (implements Region),
     * it will be used when no collision shape is specified (or if collision shape is null).
     * @param isCollidable Whether this is collidable or not. True by default.
     * @param isStatic Whether this is static or not. False by default
     */
    addPhysics(collisionShape, colliderOffset, isCollidable = true, isStatic = false) {
        // Initialize the physics variables
        this.hasPhysics = true;
        this.moving = false;
        this.onGround = false;
        this.onWall = false;
        this.onCeiling = false;
        this.active = true;
        this.isCollidable = isCollidable;
        this.isStatic = isStatic;
        this.isTrigger = false;
        this.triggerMask = 0;
        this.triggerEnters = new Array(32);
        this.triggerExits = new Array(32);
        this._velocity = Vec2_1.default.ZERO;
        this.sweptRect = new AABB_1.default();
        this.collidedWithTilemap = false;
        this.group = -1; // The default group, collides with everything
        // Set the collision shape if provided, or simply use the the region if there is one.
        if (collisionShape) {
            this.collisionShape = collisionShape;
            this.collisionShape.center = this.position;
        }
        else if (Region_1.isRegion(this)) {
            // If the gamenode has a region and no other is specified, use that
            this.collisionShape = this.boundary.clone();
        }
        else {
            throw "No collision shape specified for physics object.";
        }
        // If we were provided with a collider offset, set it. Otherwise there is no offset, so use the zero vector
        if (colliderOffset) {
            this.colliderOffset = colliderOffset;
        }
        else {
            this.colliderOffset = Vec2_1.default.ZERO;
        }
        // Initialize the swept rect
        this.sweptRect = this.collisionShape.getBoundingRect();
        // Register the object with physics
        this.scene.getPhysicsManager().registerObject(this);
    }
    /** Removes this object from the physics system */
    removePhysics() {
        // Remove this from the physics manager
        this.scene.getPhysicsManager().deregisterObject(this);
        // Nullify all physics fields
        this.hasPhysics = false;
        this.moving = false;
        this.onGround = false;
        this.onWall = false;
        this.onCeiling = false;
        this.active = false;
        this.isCollidable = false;
        this.isStatic = false;
        this.isTrigger = false;
        this.triggerMask = 0;
        this.triggerEnters = null;
        this.triggerExits = null;
        this._velocity = Vec2_1.default.ZERO;
        this.sweptRect = null;
        this.collidedWithTilemap = false;
        this.group = -1;
        this.collisionShape = null;
        this.colliderOffset = Vec2_1.default.ZERO;
        this.sweptRect = null;
    }
    /** Disables physics movement for this node */
    freeze() {
        this.frozen = true;
    }
    /** Reenables physics movement for this node */
    unfreeze() {
        this.frozen = false;
    }
    /** Prevents this object from participating in all collisions and triggers. It can still move. */
    disablePhysics() {
        this.active = false;
    }
    /** Enables this object to participate in collisions and triggers. This is only necessary if disablePhysics was called */
    enablePhysics() {
        this.active = true;
    }
    /**
     * Sets the collider for this GameNode
     * @param collider The new collider to use
     */
    setCollisionShape(collider) {
        this.collisionShape = collider;
        this.collisionShape.center.copy(this.position);
    }
    // @implemented
    /**
     * Sets this object to be a trigger for a specific group
     * @param group The name of the group that activates the trigger
     * @param onEnter The name of the event to send when this trigger is activated
     * @param onExit The name of the event to send when this trigger stops being activated
     */
    setTrigger(group, onEnter, onExit) {
        // Make this object a trigger
        this.isTrigger = true;
        // Get the number of the physics layer
        let layerNumber = this.scene.getPhysicsManager().getGroupNumber(group);
        if (layerNumber === 0) {
            console.warn(`Trigger for GameNode ${this.id} not set - group "${group}" was not recognized by the physics manager.`);
            return;
        }
        // Add this to the trigger mask
        this.triggerMask |= layerNumber;
        // Layer numbers are bits, so get which bit it is
        let index = Math.log2(layerNumber);
        // Set the event names
        this.triggerEnters[index] = onEnter;
        this.triggerExits[index] = onExit;
    }
    ;
    // @implemented
    /**
     * @param group The physics group this node should belong to
     */
    setGroup(group) {
        this.scene.getPhysicsManager().setGroup(this, group);
    }
    // @implemened
    getLastVelocity() {
        return this._velocity;
    }
    /*---------- ACTOR ----------*/
    get ai() {
        return this._ai;
    }
    set ai(ai) {
        if (!this._ai) {
            // If we haven't been previously had an ai, register us with the ai manager
            this.scene.getAIManager().registerActor(this);
        }
        this._ai = ai;
        this.aiActive = true;
    }
    // @implemented
    addAI(ai, options, type) {
        if (!this._ai) {
            this.scene.getAIManager().registerActor(this);
        }
        if (typeof ai === "string") {
            this._ai = this.scene.getAIManager().generateAI(ai);
        }
        else {
            this._ai = new ai();
        }
        // Question, how much do we want different type of AI to be handled the same, i.e. should GoapAI and AI similar methods and signatures for the sake of unity
        this._ai.initializeAI(this, options);
        this.aiActive = true;
    }
    // @implemented
    setAIActive(active, options) {
        this.aiActive = active;
        if (this.aiActive) {
            this.ai.activate(options);
        }
    }
    /*---------- TWEENABLE PROPERTIES ----------*/
    set positionX(value) {
        this.position.x = value;
    }
    set positionY(value) {
        this.position.y = value;
    }
    /*---------- GAME NODE ----------*/
    /**
     * Sets the scene for this object.
     * @param scene The scene this object belongs to.
     */
    setScene(scene) {
        this.scene = scene;
    }
    /**
     * Gets the scene this object is in.
     * @returns The scene this object belongs to
    */
    getScene() {
        return this.scene;
    }
    /**
     * Sets the layer of this object.
     * @param layer The layer this object will be on.
     */
    setLayer(layer) {
        this.layer = layer;
    }
    /**
     * Returns the layer this object is on.
     * @returns This layer this object is on.
    */
    getLayer() {
        return this.layer;
    }
    /** Called if the position vector is modified or replaced */
    positionChanged() {
        if (this.collisionShape) {
            if (this.colliderOffset) {
                this.collisionShape.center = this.position.clone().add(this.colliderOffset);
            }
            else {
                this.collisionShape.center = this.position.clone();
            }
        }
    }
    ;
    /**
     * Updates this GameNode
     * @param deltaT The timestep of the update.
     */
    update(deltaT) {
        // Defer event handling to AI.
        while (this.receiver.hasNextEvent()) {
            this._ai.handleEvent(this.receiver.getNextEvent());
        }
    }
    // @implemented
    debugRender() {
        // Draw the position of this GameNode
        Debug_1.default.drawPoint(this.relativePosition, Color_1.default.BLUE);
        // If velocity is not zero, draw a vector for it
        if (this._velocity && !this._velocity.isZero()) {
            Debug_1.default.drawRay(this.relativePosition, this._velocity.clone().scaleTo(20).add(this.relativePosition), Color_1.default.BLUE);
        }
        // If this has a collider, draw it
        if (this.collisionShape) {
            let color = this.isColliding ? Color_1.default.RED : Color_1.default.GREEN;
            if (this.isTrigger) {
                color = Color_1.default.MAGENTA;
            }
            color.a = 0.2;
            if (this.collisionShape instanceof AABB_1.default) {
                Debug_1.default.drawBox(this.inRelativeCoordinates(this.collisionShape.center), this.collisionShape.halfSize.scaled(this.scene.getViewScale()), true, color);
            }
            else if (this.collisionShape instanceof Circle_1.default) {
                Debug_1.default.drawCircle(this.inRelativeCoordinates(this.collisionShape.center), this.collisionShape.hw * this.scene.getViewScale(), true, color);
            }
        }
    }
}
exports.default = GameNode;
var TweenableProperties;
(function (TweenableProperties) {
    TweenableProperties["posX"] = "positionX";
    TweenableProperties["posY"] = "positionY";
    TweenableProperties["scaleX"] = "scaleX";
    TweenableProperties["scaleY"] = "scaleY";
    TweenableProperties["rotation"] = "rotation";
    TweenableProperties["alpha"] = "alpha";
})(TweenableProperties = exports.TweenableProperties || (exports.TweenableProperties = {}));

},{"../DataTypes/Interfaces/Region":9,"../DataTypes/Shapes/AABB":16,"../DataTypes/Shapes/Circle":17,"../DataTypes/Vec2":24,"../Debug/Debug":25,"../Events/Emitter":27,"../Events/Receiver":31,"../Rendering/Animations/TweenController":69,"../Utils/Color":99}],41:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CanvasNode_1 = require("./CanvasNode");
const Color_1 = require("../Utils/Color");
/**
 * The representation of a game object that doesn't rely on any resources to render - it is drawn to the screen by the canvas
 */
class Graphic extends CanvasNode_1.default {
    constructor() {
        super();
        this.color = Color_1.default.RED;
    }
    get alpha() {
        return this.color.a;
    }
    set alpha(a) {
        this.color.a = a;
    }
    // @deprecated
    /**
     * Sets the color of the Graphic. DEPRECATED
     * @param color The new color of the Graphic.
     */
    setColor(color) {
        this.color = color;
    }
    set colorR(r) {
        this.color.r = r;
    }
    get colorR() {
        return this.color.r;
    }
    set colorG(g) {
        this.color.g = g;
    }
    get colorG() {
        return this.color.g;
    }
    set colorB(b) {
        this.color.b = b;
    }
    get colorB() {
        return this.color.b;
    }
}
exports.default = Graphic;

},{"../Utils/Color":99,"./CanvasNode":39}],42:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphicType = void 0;
var GraphicType;
(function (GraphicType) {
    GraphicType["POINT"] = "POINT";
    GraphicType["RECT"] = "RECT";
    GraphicType["LINE"] = "LINE";
    GraphicType["PARTICLE"] = "PARTICLE";
})(GraphicType = exports.GraphicType || (exports.GraphicType = {}));

},{}],43:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Graphic_1 = require("../Graphic");
class Line extends Graphic_1.default {
    constructor(start, end) {
        super();
        this.start = start;
        this.end = end;
        this.thickness = 2;
        // Does this really have a meaning for lines?
        this.size.set(5, 5);
    }
    set start(pos) {
        this.position = pos;
    }
    get start() {
        return this.position;
    }
    set end(pos) {
        this._end = pos;
    }
    get end() {
        return this._end;
    }
}
exports.default = Line;

},{"../Graphic":41}],44:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Point_1 = require("./Point");
/**
 * - Position X
- Velocity (speed and direction) X
- Color X
- Lifetime
- Age can be handled as lifetime
- Shape X
- Size X
- Transparency X
 */
class Particle extends Point_1.default {
    constructor(position, size, mass) {
        // Are we making this a circle?
        super(position);
        this.inUse = false;
        this.mass = mass;
    }
    setParticleActive(lifetime, position) {
        this.age = lifetime;
        this.inUse = true;
        this.visible = true;
        this.position = position;
    }
    decrementAge(decay) {
        this.age -= decay;
    }
    setParticleInactive() {
        this.inUse = false;
        this.visible = false;
    }
    set velY(y) {
        this.vel.y = y;
    }
    get velY() {
        return this.vel.y;
    }
}
exports.default = Particle;

},{"./Point":45}],45:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Graphic_1 = require("../Graphic");
/** A basic point to be drawn on the screen. */
class Point extends Graphic_1.default {
    constructor(position) {
        // Are we making this a circle?
        super();
        this.position = position;
        this.size.set(5, 5);
    }
}
exports.default = Point;

},{"../Graphic":41}],46:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Graphic_1 = require("../Graphic");
const Color_1 = require("../../Utils/Color");
/** A basic rectangle to be drawn on the screen. */
class Rect extends Graphic_1.default {
    constructor(position, size) {
        super();
        this.position = position;
        this.size = size;
        this.borderColor = Color_1.default.TRANSPARENT;
        this.borderWidth = 0;
        this.fillWidth = null;
    }
    /**
     * Sets the border color of this rectangle
     * @param color The border color
     */
    setBorderColor(color) {
        this.borderColor = color;
    }
    // @deprecated
    getBorderColor() {
        return this.borderColor;
    }
    /**
     * Sets the border width of this rectangle
     * @param width The width of the rectangle in pixels
     */
    setBorderWidth(width) {
        this.borderWidth = width;
    }
    getBorderWidth() {
        return this.borderWidth;
    }
}
exports.default = Rect;

},{"../../Utils/Color":99,"../Graphic":41}],47:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Sprite_1 = require("./Sprite");
const AnimationManager_1 = require("../../Rendering/Animations/AnimationManager");
const Vec2_1 = require("../../DataTypes/Vec2");
/** An sprite with specified animation frames. */
class AnimatedSprite extends Sprite_1.default {
    constructor(spritesheet) {
        super(spritesheet.name);
        this.numCols = spritesheet.columns;
        this.numRows = spritesheet.rows;
        // Set the size of the sprite to the sprite size specified by the spritesheet
        this.size.set(spritesheet.spriteWidth, spritesheet.spriteHeight);
        this.animation = new AnimationManager_1.default(this);
        // Add the animations to the animated sprite
        for (let animation of spritesheet.animations) {
            this.animation.add(animation.name, animation);
        }
    }
    get cols() {
        return this.numCols;
    }
    get rows() {
        return this.numRows;
    }
    /**
     * Gets the image offset for the current index of animation
     * @param index The index we're at in the animation
     * @returns A Vec2 containing the image offset
     */
    getAnimationOffset(index) {
        return new Vec2_1.default((index % this.numCols) * this.size.x, Math.floor(index / this.numCols) * this.size.y);
    }
}
exports.default = AnimatedSprite;

},{"../../DataTypes/Vec2":24,"../../Rendering/Animations/AnimationManager":66,"./Sprite":48}],48:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CanvasNode_1 = require("../CanvasNode");
const ResourceManager_1 = require("../../ResourceManager/ResourceManager");
const Vec2_1 = require("../../DataTypes/Vec2");
/**
 * The representation of a sprite - an in-game image
 */
class Sprite extends CanvasNode_1.default {
    constructor(imageId) {
        super();
        this.imageId = imageId;
        let image = ResourceManager_1.default.getInstance().getImage(this.imageId);
        this.size = new Vec2_1.default(image.width, image.height);
        this.imageOffset = Vec2_1.default.ZERO;
        this.invertX = false;
        this.invertY = false;
    }
    /**
     * Sets the offset of the sprite from (0, 0) in the image's coordinates
     * @param offset The offset of the sprite from (0, 0) in image coordinates
     */
    setImageOffset(offset) {
        this.imageOffset = offset;
    }
}
exports.default = Sprite;

},{"../../DataTypes/Vec2":24,"../../ResourceManager/ResourceManager":83,"../CanvasNode":39}],49:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("../DataTypes/Vec2");
const CanvasNode_1 = require("./CanvasNode");
/**
 * The representation of a tilemap - this can consist of a combination of tilesets in one layer
 */
class Tilemap extends CanvasNode_1.default {
    // TODO: Make this no longer be specific to Tiled
    constructor(tilemapData, layer, tilesets, scale) {
        super();
        this.tilesets = tilesets;
        this.tileSize = new Vec2_1.default(0, 0);
        this.name = layer.name;
        let tilecount = 0;
        for (let tileset of tilesets) {
            tilecount += tileset.getTileCount() + 1;
        }
        this.collisionMap = new Array(tilecount);
        for (let i = 0; i < this.collisionMap.length; i++) {
            this.collisionMap[i] = false;
        }
        // Defer parsing of the data to child classes - this allows for isometric vs. orthographic tilemaps and handling of Tiled data or other data
        this.parseTilemapData(tilemapData, layer);
        this.scale.set(scale.x, scale.y);
    }
    /**
     * Returns an array of the tilesets associated with this tilemap
     * @returns An array of all of the tilesets assocaited with this tilemap.
     */
    getTilesets() {
        return this.tilesets;
    }
    /**
     * Returns the size of tiles in this tilemap as they appear in the game world after scaling
     * @returns A vector containing the size of tiles in this tilemap as they appear in the game world after scaling.
     */
    getTileSize() {
        return this.tileSize.scaled(this.scale.x, this.scale.y);
    }
    /**
     * Gets the tile size taking zoom into account
     * @returns The tile size with zoom
    */
    getTileSizeWithZoom() {
        let zoom = this.scene.getViewScale();
        return this.getTileSize().scale(zoom);
    }
    /**
     * Adds this tilemap to the physics system
    */
    addPhysics() {
        this.hasPhysics = true;
        this.active = true;
        this.group = -1;
        this.scene.getPhysicsManager().registerTilemap(this);
    }
}
exports.default = Tilemap;

},{"../DataTypes/Vec2":24,"./CanvasNode":39}],50:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Tilemap_1 = require("../Tilemap");
const Vec2_1 = require("../../DataTypes/Vec2");
const Debug_1 = require("../../Debug/Debug");
const Color_1 = require("../../Utils/Color");
/**
 * The representation of an orthogonal tilemap - i.e. a top down or platformer tilemap
 */
class OrthogonalTilemap extends Tilemap_1.default {
    // @override
    parseTilemapData(tilemapData, layer) {
        // The size of the tilemap in local space
        this.numCols = tilemapData.width;
        this.numRows = tilemapData.height;
        // The size of tiles
        this.tileSize.set(tilemapData.tilewidth, tilemapData.tileheight);
        // The size of the tilemap on the canvas
        this.size.set(this.numCols * this.tileSize.x, this.numRows * this.tileSize.y);
        this.position.copy(this.size.scaled(0.5));
        this.data = layer.data;
        this.visible = layer.visible;
        // Whether the tilemap is collidable or not
        this.isCollidable = false;
        if (layer.properties) {
            for (let item of layer.properties) {
                if (item.name === "Collidable") {
                    this.isCollidable = item.value;
                    // Set all tiles besides "empty: 0" to be collidable
                    for (let i = 1; i < this.collisionMap.length; i++) {
                        this.collisionMap[i] = true;
                    }
                }
            }
        }
    }
    /**
     * Gets the dimensions of the tilemap
     * @returns A Vec2 containing the number of columns and the number of rows in the tilemap.
     */
    getDimensions() {
        return new Vec2_1.default(this.numCols, this.numRows);
    }
    /**
     * Gets the data value of the tile at the specified world position
     * @param worldCoords The coordinates in world space
     * @returns The data value of the tile
     */
    getTileAtWorldPosition(worldCoords) {
        let localCoords = this.getColRowAt(worldCoords);
        return this.getTileAtRowCol(localCoords);
    }
    /**
     * Get the tile at the specified row and column
     * @param rowCol The coordinates in tilemap space
     * @returns The data value of the tile
     */
    getTileAtRowCol(rowCol) {
        if (rowCol.x < 0 || rowCol.x >= this.numCols || rowCol.y < 0 || rowCol.y >= this.numRows) {
            return -1;
        }
        return this.data[rowCol.y * this.numCols + rowCol.x];
    }
    /**
     * Gets the world position of the tile at the specified index
     * @param index The index of the tile
     * @returns A Vec2 containing the world position of the tile
     */
    getTileWorldPosition(index) {
        // Get the local position
        let col = index % this.numCols;
        let row = Math.floor(index / this.numCols);
        // Get the world position
        let x = col * this.tileSize.x * this.scale.x;
        let y = row * this.tileSize.y * this.scale.y;
        return new Vec2_1.default(x, y);
    }
    /**
     * Gets the data value of the tile at the specified index
     * @param index The index of the tile
     * @returns The data value of the tile
     */
    getTile(index) {
        return this.data[index];
    }
    // @override
    setTile(index, type) {
        this.data[index] = type;
    }
    /**
     * Sets the tile at the specified row and column
     * @param rowCol The position of the tile in tilemap space
     * @param type The new data value of the tile
     */
    setTileAtRowCol(rowCol, type) {
        let index = rowCol.y * this.numCols + rowCol.x;
        this.setTile(index, type);
    }
    /**
     * Returns true if the tile at the specified row and column of the tilemap is collidable
     * @param indexOrCol The index of the tile or the column it is in
     * @param row The row the tile is in
     * @returns A flag representing whether or not the tile is collidable.
     */
    isTileCollidable(indexOrCol, row) {
        // The value of the tile
        let tile = 0;
        if (row) {
            // We have a column and a row
            tile = this.getTileAtRowCol(new Vec2_1.default(indexOrCol, row));
            if (tile < 0) {
                return false;
            }
        }
        else {
            if (indexOrCol < 0 || indexOrCol >= this.data.length) {
                // Tiles that don't exist aren't collidable
                return false;
            }
            // We have an index
            tile = this.getTile(indexOrCol);
        }
        return this.collisionMap[tile];
    }
    /**
     * Takes in world coordinates and returns the row and column of the tile at that position
     * @param worldCoords The coordinates of the potential tile in world space
     * @returns A Vec2 containing the coordinates of the potential tile in tilemap space
     */
    getColRowAt(worldCoords) {
        let col = Math.floor(worldCoords.x / this.tileSize.x / this.scale.x);
        let row = Math.floor(worldCoords.y / this.tileSize.y / this.scale.y);
        return new Vec2_1.default(col, row);
    }
    // @override
    update(deltaT) { }
    // @override
    debugRender() {
        // Half of the tile size
        let zoomedHalfTileSize = this.getTileSizeWithZoom().scaled(0.5);
        let halfTileSize = this.getTileSize().scaled(0.5);
        // The center of the top left tile
        let topLeft = this.position.clone().sub(this.size.scaled(0.5));
        // A vec to store the center
        let center = Vec2_1.default.ZERO;
        for (let col = 0; col < this.numCols; col++) {
            // Calculate the x-position
            center.x = topLeft.x + col * 2 * halfTileSize.x + halfTileSize.x;
            for (let row = 0; row < this.numRows; row++) {
                if (this.isCollidable && this.isTileCollidable(col, row)) {
                    // Calculate the y-position
                    center.y = topLeft.y + row * 2 * halfTileSize.y + halfTileSize.y;
                    // Draw a box for this tile
                    Debug_1.default.drawBox(this.inRelativeCoordinates(center), zoomedHalfTileSize, false, Color_1.default.BLUE);
                }
            }
        }
    }
}
exports.default = OrthogonalTilemap;

},{"../../DataTypes/Vec2":24,"../../Debug/Debug":25,"../../Utils/Color":99,"../Tilemap":49}],51:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CanvasNode_1 = require("./CanvasNode");
const Color_1 = require("../Utils/Color");
const Vec2_1 = require("../DataTypes/Vec2");
const Input_1 = require("../Input/Input");
/**
 * The representation of a UIElement - the parent class of things like buttons
 */
class UIElement extends CanvasNode_1.default {
    constructor(position) {
        super();
        this.position = position;
        this.backgroundColor = new Color_1.default(0, 0, 0, 0);
        this.borderColor = new Color_1.default(0, 0, 0, 0);
        this.borderRadius = 5;
        this.borderWidth = 1;
        this.padding = Vec2_1.default.ZERO;
        this.onClick = null;
        this.onClickEventId = null;
        this.onRelease = null;
        this.onReleaseEventId = null;
        this.onEnter = null;
        this.onEnterEventId = null;
        this.onLeave = null;
        this.onLeaveEventId = null;
        this.isClicked = false;
        this.isEntered = false;
    }
    // @deprecated
    setBackgroundColor(color) {
        this.backgroundColor = color;
    }
    // @deprecated
    setPadding(padding) {
        this.padding.copy(padding);
    }
    update(deltaT) {
        super.update(deltaT);
        // See of this object was just clicked
        if (Input_1.default.isMouseJustPressed()) {
            let clickPos = Input_1.default.getMousePressPosition();
            if (this.contains(clickPos.x, clickPos.y) && this.visible && !this.layer.isHidden()) {
                this.isClicked = true;
                if (this.onClick !== null) {
                    this.onClick();
                }
                if (this.onClickEventId !== null) {
                    let data = {};
                    this.emitter.fireEvent(this.onClickEventId, data);
                }
            }
        }
        // If the mouse wasn't just pressed, then we definitely weren't clicked
        if (!Input_1.default.isMousePressed()) {
            if (this.isClicked) {
                this.isClicked = false;
            }
        }
        // Check if the mouse is hovering over this element
        let mousePos = Input_1.default.getMousePosition();
        if (mousePos && this.contains(mousePos.x, mousePos.y)) {
            this.isEntered = true;
            if (this.onEnter !== null) {
                this.onEnter();
            }
            if (this.onEnterEventId !== null) {
                let data = {};
                this.emitter.fireEvent(this.onEnterEventId, data);
            }
        }
        else if (this.isEntered) {
            this.isEntered = false;
            if (this.onLeave !== null) {
                this.onLeave();
            }
            if (this.onLeaveEventId !== null) {
                let data = {};
                this.emitter.fireEvent(this.onLeaveEventId, data);
            }
        }
        else if (this.isClicked) {
            // If mouse is dragged off of element while down, it is not clicked anymore
            this.isClicked = false;
        }
    }
    /**
     * Overridable method for calculating background color - useful for elements that want to be colored on different after certain events
     * @returns The background color of the UIElement
     */
    calculateBackgroundColor() {
        return this.backgroundColor;
    }
    /**
     * Overridable method for calculating border color - useful for elements that want to be colored on different after certain events
     * @returns The border color of the UIElement
     */
    calculateBorderColor() {
        return this.borderColor;
    }
}
exports.default = UIElement;

},{"../DataTypes/Vec2":24,"../Input/Input":32,"../Utils/Color":99,"./CanvasNode":39}],52:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Label_1 = require("./Label");
const Color_1 = require("../../Utils/Color");
/** A clickable button UIElement */
class Button extends Label_1.default {
    constructor(position, text) {
        super(position, text);
        this.backgroundColor = new Color_1.default(150, 75, 203);
        this.borderColor = new Color_1.default(41, 46, 30);
        this.textColor = new Color_1.default(255, 255, 255);
    }
    // @override
    calculateBackgroundColor() {
        // Change the background color if clicked or hovered
        if (this.isEntered && !this.isClicked) {
            return this.backgroundColor.lighten();
        }
        else if (this.isClicked) {
            return this.backgroundColor.darken();
        }
        else {
            return this.backgroundColor;
        }
    }
}
exports.default = Button;

},{"../../Utils/Color":99,"./Label":53}],53:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HAlign = exports.VAlign = void 0;
const Vec2_1 = require("../../DataTypes/Vec2");
const Color_1 = require("../../Utils/Color");
const UIElement_1 = require("../UIElement");
/** A basic text-containing label */
class Label extends UIElement_1.default {
    constructor(position, text) {
        super(position);
        this.text = text;
        this.textColor = new Color_1.default(0, 0, 0, 1);
        this.font = "Arial";
        this.fontSize = 30;
        this.hAlign = "center";
        this.vAlign = "center";
        this.sizeAssigned = false;
    }
    // @deprecated
    setText(text) {
        this.text = text;
    }
    // @deprecated
    setTextColor(color) {
        this.textColor = color;
    }
    /**
     * Gets a string containg the font details for rendering
     * @returns A string containing the font details
     */
    getFontString() {
        return this.fontSize + "px " + this.font;
    }
    /**
     * Overridable method for calculating text color - useful for elements that want to be colored on different after certain events
     * @returns a string containg the text color
     */
    calculateTextColor() {
        return this.textColor.toStringRGBA();
    }
    /**
     * Uses the canvas to calculate the width of the text
     * @param ctx The rendering context
     * @returns A number representing the rendered text width
     */
    calculateTextWidth(ctx) {
        ctx.font = this.fontSize + "px " + this.font;
        return ctx.measureText(this.text).width;
    }
    setHAlign(align) {
        this.hAlign = align;
    }
    setVAlign(align) {
        this.vAlign = align;
    }
    /**
     * Calculate the offset of the text - this is used for rendering text with different alignments
     * @param ctx The rendering context
     * @returns The offset of the text in a Vec2
     */
    calculateTextOffset(ctx) {
        let textWidth = this.calculateTextWidth(ctx);
        let offset = new Vec2_1.default(0, 0);
        let hDiff = this.size.x - textWidth;
        if (this.hAlign === HAlign.CENTER) {
            offset.x = hDiff / 2;
        }
        else if (this.hAlign === HAlign.RIGHT) {
            offset.x = hDiff;
        }
        if (this.vAlign === VAlign.TOP) {
            ctx.textBaseline = "top";
            offset.y = 0;
        }
        else if (this.vAlign === VAlign.BOTTOM) {
            ctx.textBaseline = "bottom";
            offset.y = this.size.y;
        }
        else {
            ctx.textBaseline = "middle";
            offset.y = this.size.y / 2;
        }
        return offset;
    }
    sizeChanged() {
        super.sizeChanged();
        this.sizeAssigned = true;
    }
    /**
     * Automatically sizes the element to the text within it
     * @param ctx The rendering context
     */
    autoSize(ctx) {
        let width = this.calculateTextWidth(ctx);
        let height = this.fontSize;
        this.size.set(width + this.padding.x * 2, height + this.padding.y * 2);
        this.sizeAssigned = true;
    }
    /**
     * Initially assigns a size to the UIElement if none is provided
     * @param ctx The rendering context
     */
    handleInitialSizing(ctx) {
        if (!this.sizeAssigned) {
            this.autoSize(ctx);
        }
    }
    /** On the next render, size this element to it's current text using its current font size */
    sizeToText() {
        this.sizeAssigned = false;
    }
}
exports.default = Label;
var VAlign;
(function (VAlign) {
    VAlign["TOP"] = "top";
    VAlign["CENTER"] = "center";
    VAlign["BOTTOM"] = "bottom";
})(VAlign = exports.VAlign || (exports.VAlign = {}));
var HAlign;
(function (HAlign) {
    HAlign["LEFT"] = "left";
    HAlign["CENTER"] = "center";
    HAlign["RIGHT"] = "right";
})(HAlign = exports.HAlign || (exports.HAlign = {}));

},{"../../DataTypes/Vec2":24,"../../Utils/Color":99,"../UIElement":51}],54:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("../../DataTypes/Vec2");
const Input_1 = require("../../Input/Input");
const Color_1 = require("../../Utils/Color");
const MathUtils_1 = require("../../Utils/MathUtils");
const UIElement_1 = require("../UIElement");
/** A slider UIElement */
class Slider extends UIElement_1.default {
    constructor(position, initValue) {
        super(position);
        this.value = initValue;
        this.nibColor = Color_1.default.RED;
        this.sliderColor = Color_1.default.BLACK;
        this.backgroundColor = Color_1.default.TRANSPARENT;
        this.borderColor = Color_1.default.TRANSPARENT;
        this.nibSize = new Vec2_1.default(10, 20);
        // Set a default size
        this.size.set(200, 20);
    }
    /**
     * Retrieves the value of the slider
     * @returns The value of the slider
     */
    getValue() {
        return this.value;
    }
    /** A method called in response to the value changing */
    valueChanged() {
        if (this.onValueChange) {
            this.onValueChange(this.value);
        }
        if (this.onValueChangeEventId) {
            this.emitter.fireEvent(this.onValueChangeEventId, { target: this, value: this.value });
        }
    }
    update(deltaT) {
        super.update(deltaT);
        if (this.isClicked) {
            let val = MathUtils_1.default.invLerp(this.position.x - this.size.x / 2, this.position.x + this.size.x / 2, Input_1.default.getMousePosition().x);
            this.value = MathUtils_1.default.clamp01(val);
            this.valueChanged();
        }
    }
}
exports.default = Slider;

},{"../../DataTypes/Vec2":24,"../../Input/Input":32,"../../Utils/Color":99,"../../Utils/MathUtils":102,"../UIElement":51}],55:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Color_1 = require("../../Utils/Color");
const Label_1 = require("./Label");
const Input_1 = require("../../Input/Input");
/** A text input UIElement */
class TextInput extends Label_1.default {
    constructor(position) {
        super(position, "");
        this.focused = false;
        this.cursorCounter = 0;
        // Give a default size to the x only
        this.size.set(200, this.fontSize);
        this.hAlign = "left";
        this.borderColor = Color_1.default.BLACK;
        this.backgroundColor = Color_1.default.WHITE;
    }
    update(deltaT) {
        super.update(deltaT);
        if (Input_1.default.isMouseJustPressed()) {
            let clickPos = Input_1.default.getMousePressPosition();
            if (this.contains(clickPos.x, clickPos.y)) {
                this.focused = true;
                this.cursorCounter = 30;
            }
            else {
                this.focused = false;
            }
        }
        if (this.focused) {
            let keys = Input_1.default.getKeysJustPressed();
            let nums = "1234567890";
            let specialChars = "`~!@#$%^&*()-_=+[{]}\\|;:'\",<.>/?";
            let letters = "qwertyuiopasdfghjklzxcvbnm";
            let mask = nums + specialChars + letters;
            keys = keys.filter(key => mask.includes(key));
            let shiftPressed = Input_1.default.isKeyPressed("shift");
            let backspacePressed = Input_1.default.isKeyJustPressed("backspace");
            let spacePressed = Input_1.default.isKeyJustPressed("space");
            if (backspacePressed) {
                this.text = this.text.substring(0, this.text.length - 1);
            }
            else if (spacePressed) {
                this.text += " ";
            }
            else if (keys.length > 0) {
                if (shiftPressed) {
                    this.text += keys[0].toUpperCase();
                }
                else {
                    this.text += keys[0];
                }
            }
        }
    }
}
exports.default = TextInput;

},{"../../Input/Input":32,"../../Utils/Color":99,"./Label":53}],56:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UIElementType = void 0;
var UIElementType;
(function (UIElementType) {
    UIElementType["BUTTON"] = "BUTTON";
    UIElementType["LABEL"] = "LABEL";
    UIElementType["SLIDER"] = "SLIDER";
    UIElementType["TEXT_INPUT"] = "TEXTINPUT";
})(UIElementType = exports.UIElementType || (exports.UIElementType = {}));

},{}],57:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Map_1 = require("../DataTypes/Map");
/**
 * The manager class for navigation.
 * Handles all navigable entities, such and allows them to be accessed by outside systems by requesting a path
 * from one position to another.
 */
class NavigationManager {
    constructor() {
        this.navigableEntities = new Map_1.default();
    }
    /**
     * Adds a navigable entity to the NavigationManager
     * @param navName The name of the navigable entitry
     * @param nav The actual Navigable instance
     */
    addNavigableEntity(navName, nav) {
        this.navigableEntities.add(navName, nav);
    }
    /**
     * Gets a path frome one point to another using a specified Navigable object
     * @param navName The name of the registered Navigable object
     * @param fromPosition The starting position of navigation
     * @param toPosition The ending position of Navigation
     * @param direct If true, go direct from fromPosition to toPosition, don't use NavMesh
     * @returns A NavigationPath containing the route to take over the Navigable entity to get between the provided positions.
     */
    getPath(navName, fromPosition, toPosition, direct) {
        let nav = this.navigableEntities.get(navName);
        return nav.getNavigationPath(fromPosition.clone(), toPosition.clone(), direct);
    }
}
exports.default = NavigationManager;

},{"../DataTypes/Map":10}],58:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("../DataTypes/Vec2");
/**
 * A path that AIs can follow. Uses finishMove() in Physical to determine progress on the route
 */
class NavigationPath {
    /**
     * Constructs a new NavigationPath
     * @param path The path of nodes to take
     */
    constructor(path) {
        this.path = path;
        this.currentMoveDirection = Vec2_1.default.ZERO;
        this.distanceThreshold = 4;
    }
    /**
     * Returns the status of navigation along this NavigationPath
     * @returns True if the node has reached the end of the path, false otherwise
     */
    isDone() {
        return this.path.isEmpty();
    }
    /**
     * Gets the movement direction in the current position along the path
     * @param node The node to move along the path
     * @returns The movement direction as a Vec2
     */
    getMoveDirection(node) {
        // Return direction to next point in the nav
        return node.position.dirTo(this.path.peek());
    }
    /**
     * Updates this NavigationPath to the current state of the GameNode
     * @param node The node moving along the path
     */
    handlePathProgress(node) {
        if (node.position.distanceSqTo(this.path.peek()) < this.distanceThreshold * this.distanceThreshold) {
            // We've reached our node, move on to the next destination
            this.path.pop();
        }
    }
    toString() {
        return this.path.toString();
    }
}
exports.default = NavigationPath;

},{"../DataTypes/Vec2":24}],59:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Stack_1 = require("../DataTypes/Stack");
const GraphUtils_1 = require("../Utils/GraphUtils");
const NavigationPath_1 = require("./NavigationPath");
/**
 * An implementation of a Navmesh. Navmeshes are graphs in the game world along which nodes can move.
 */
class Navmesh {
    /**
     * Creates a new Navmesh from the points in the speecified graph
     * @param graph The graph to construct a navmesh from
     */
    constructor(graph) {
        this.graph = graph;
    }
    // @implemented
    getNavigationPath(fromPosition, toPosition, direct) {
        let start = this.getClosestNode(fromPosition);
        let end = this.getClosestNode(toPosition);
        let pathStack = new Stack_1.default(this.graph.numVertices);
        // Push the final position and the final position in the graph
        pathStack.push(toPosition.clone());
        if (direct) {
            return new NavigationPath_1.default(pathStack);
        }
        pathStack.push(this.graph.positions[end]);
        let parent = GraphUtils_1.default.djikstra(this.graph, start);
        // Add all parents along the path
        let i = end;
        while (parent[i] !== -1) {
            pathStack.push(this.graph.positions[parent[i]]);
            i = parent[i];
        }
        return new NavigationPath_1.default(pathStack);
    }
    /**
     * Gets the closest node in this Navmesh to the specified position
     * @param position The position to query
     * @returns The index of the closest node in the Navmesh to the position
     */
    getClosestNode(position) {
        let n = this.graph.numVertices;
        let i = 1;
        let index = 0;
        let dist = position.distanceSqTo(this.graph.positions[0]);
        while (i < n) {
            let d = position.distanceSqTo(this.graph.positions[i]);
            if (d < dist) {
                dist = d;
                index = i;
            }
            i++;
        }
        return index;
    }
}
exports.default = Navmesh;

},{"../DataTypes/Stack":19,"../Utils/GraphUtils":101,"./NavigationPath":58}],60:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PhysicsManager_1 = require("./PhysicsManager");
const Vec2_1 = require("../DataTypes/Vec2");
const AABB_1 = require("../DataTypes/Shapes/AABB");
const OrthogonalTilemap_1 = require("../Nodes/Tilemaps/OrthogonalTilemap");
const AreaCollision_1 = require("../DataTypes/Physics/AreaCollision");
/**
 * ALGORITHM:
 * 	In an effort to keep things simple and working effectively, each dynamic node will resolve its
 * 	collisions considering the rest of the world as static.
 *
 * 	Collision detecting will happen first. This can be considered a broad phase, but it is not especially
 * 	efficient, as it does not need to be for this game engine. Every dynamic node is checked against every
 * 	other node for collision area. If collision area is non-zero (meaning the current node sweeps into another),
 * 	it is added to a list of hits.
 *
 * 	INITIALIZATION:
 * 		- Physics constants are reset
 * 		- Swept shapes are recalculated. If a node isn't moving, it is skipped.
 *
 * 	COLLISION DETECTION:
 * 		- For a node, collision area will be calculated using the swept AABB of the node against every other AABB in a static state
 * 		- These collisions will be sorted by area in descending order
 *
 * 	COLLISION RESOLUTION:
 * 		- For each hit, time of collision is calculated using a swept line through the AABB of the static node expanded
 * 			with minkowski sums (discretely, but the concept is there)
 * 		- The collision is resolved based on the near time of the collision (from method of separated axes)
 * 			- X is resolved by near x, Y by near y.
 * 			- There is some fudging to allow for sliding along walls of separate colliders. Sorting by area also helps with this.
 * 			- Corner to corner collisions are resolve to favor x-movement. This is in consideration of platformers, to give
 * 				the player some help with jumps
 *
 * 	Pros:
 * 		- Everything happens with a consistent time. There is a distinct before and after for each resolution.
 * 		- No back-tracking needs to be done. Once we resolve a node, it is definitively resolved.
 *
 * 	Cons:
 * 		- Nodes that are processed early have movement priority over other nodes. This can lead to some undesirable interactions.
 */
class BasicPhysicsManager extends PhysicsManager_1.default {
    constructor(options) {
        super();
        this.staticNodes = new Array();
        this.dynamicNodes = new Array();
        this.tilemaps = new Array();
        this.collisionMasks = new Array(32);
        // Parse options
        this.parseOptions(options);
    }
    /**
     * Parses the options for constructing the physics manager
     * @param options A record of options
     */
    parseOptions(options) {
        if (options.groupNames !== undefined && options.collisions !== undefined) {
            for (let i = 0; i < options.groupNames.length; i++) {
                let group = options.groupNames[i];
                // Register the group name and number
                this.groupNames[i] = group;
                this.groupMap.set(group, 1 << i);
                let collisionMask = 0;
                for (let j = 0; j < options.collisions[i].length; j++) {
                    if (options.collisions[i][j]) {
                        collisionMask |= 1 << j;
                    }
                }
                this.collisionMasks[i] = collisionMask;
            }
        }
    }
    // @override
    registerObject(node) {
        if (node.isStatic) {
            // Static and not collidable
            this.staticNodes.push(node);
        }
        else {
            // Dynamic and not collidable
            this.dynamicNodes.push(node);
        }
    }
    // @override
    deregisterObject(node) {
        if (node.isStatic) {
            // Remove the node from the static list
            const index = this.staticNodes.indexOf(node);
            this.staticNodes.splice(index, 1);
        }
        else {
            // Remove the node from the dynamic list
            const index = this.dynamicNodes.indexOf(node);
            this.dynamicNodes.splice(index, 1);
        }
    }
    // @override
    registerTilemap(tilemap) {
        this.tilemaps.push(tilemap);
    }
    // @override
    deregisterTilemap(tilemap) {
        const index = this.tilemaps.indexOf(tilemap);
        this.tilemaps.splice(index, 1);
    }
    // @override
    update(deltaT) {
        for (let node of this.dynamicNodes) {
            /*---------- INITIALIZATION PHASE ----------*/
            // Clear frame dependent boolean values for each node
            node.onGround = false;
            node.onCeiling = false;
            node.onWall = false;
            node.collidedWithTilemap = false;
            node.isColliding = false;
            // If this node is not active, don't process it
            if (!node.active) {
                continue;
            }
            // Update the swept shapes of each node
            if (node.moving) {
                // If moving, reflect that in the swept shape
                node.sweptRect.sweep(node._velocity, node.collisionShape.center, node.collisionShape.halfSize);
            }
            else {
                // If our node isn't moving, don't bother to check it (other nodes will detect if they run into it)
                node._velocity.zero();
                continue;
            }
            /*---------- DETECTION PHASE ----------*/
            // Gather a set of overlaps
            let overlaps = new Array();
            let groupIndex = node.group === -1 ? -1 : Math.log2(node.group);
            // First, check this node against every static node (order doesn't actually matter here, since we sort anyways)
            for (let other of this.staticNodes) {
                // Ignore inactive nodes
                if (!other.active)
                    continue;
                let collider = other.collisionShape.getBoundingRect();
                let area = node.sweptRect.overlapArea(collider);
                if (area > 0) {
                    // We had a collision
                    overlaps.push(new AreaCollision_1.default(area, collider, other, "GameNode", null));
                }
            }
            // Then, check it against every dynamic node
            for (let other of this.dynamicNodes) {
                // Ignore ourselves
                if (node === other)
                    continue;
                // Ignore inactive nodes
                if (!other.active)
                    continue;
                let collider = other.collisionShape.getBoundingRect();
                let area = node.sweptRect.overlapArea(collider);
                if (area > 0) {
                    // We had a collision
                    overlaps.push(new AreaCollision_1.default(area, collider, other, "GameNode", null));
                }
            }
            // Lastly, gather a set of AABBs from the tilemap.
            // This step involves the most extra work, so it is abstracted into a method
            for (let tilemap of this.tilemaps) {
                // Ignore inactive tilemaps
                if (!tilemap.active)
                    continue;
                if (tilemap instanceof OrthogonalTilemap_1.default) {
                    this.collideWithOrthogonalTilemap(node, tilemap, overlaps);
                }
            }
            // Sort the overlaps by area
            overlaps = overlaps.sort((a, b) => b.area - a.area);
            // Keep track of hits to use later
            let hits = [];
            /*---------- RESOLUTION PHASE ----------*/
            // For every overlap, determine if we need to collide with it and when
            for (let overlap of overlaps) {
                // Ignore nodes we don't interact with
                if (groupIndex !== -1 && overlap.other.group !== -1 && ((this.collisionMasks[groupIndex] & overlap.other.group) === 0))
                    continue;
                // Do a swept line test on the static AABB with this AABB size as padding (this is basically using a minkowski sum!)
                // Start the sweep at the position of this node with a delta of _velocity
                const point = node.collisionShape.center;
                const delta = node._velocity;
                const padding = node.collisionShape.halfSize;
                const otherAABB = overlap.collider;
                const hit = otherAABB.intersectSegment(node.collisionShape.center, node._velocity, node.collisionShape.halfSize);
                overlap.hit = hit;
                if (hit !== null) {
                    hits.push(hit);
                    // We got a hit, resolve with the time inside of the hit
                    let tnearx = hit.nearTimes.x;
                    let tneary = hit.nearTimes.y;
                    // Allow edge clipping (edge overlaps don't count, only area overlaps)
                    // Importantly don't allow both cases to be true. Then we clip through corners. Favor x to help players land jumps
                    if (tnearx < 1.0 && (point.y === otherAABB.top - padding.y || point.y === otherAABB.bottom + padding.y) && delta.x !== 0) {
                        tnearx = 1.0;
                    }
                    else if (tneary < 1.0 && (point.x === otherAABB.left - padding.x || point.x === otherAABB.right + padding.x) && delta.y !== 0) {
                        tneary = 1.0;
                    }
                    if (hit.nearTimes.x >= 0 && hit.nearTimes.x < 1) {
                        // Any tilemap objects that made it here are collidable
                        if (overlap.type === "Tilemap" || overlap.other.isCollidable) {
                            node._velocity.x = node._velocity.x * tnearx;
                            node.isColliding = true;
                        }
                    }
                    if (hit.nearTimes.y >= 0 && hit.nearTimes.y < 1) {
                        // Any tilemap objects that made it here are collidable
                        if (overlap.type === "Tilemap" || overlap.other.isCollidable) {
                            node._velocity.y = node._velocity.y * tneary;
                            node.isColliding = true;
                        }
                    }
                }
            }
            /*---------- INFORMATION/TRIGGER PHASE ----------*/
            // Check if we ended up on the ground, ceiling or wall
            // Also check for triggers
            for (let overlap of overlaps) {
                // Check for a trigger. If we care about the trigger, react
                if (overlap.other.isTrigger && (overlap.other.triggerMask & node.group) && node.group != -1) {
                    // Get the bit that this group is represented by
                    let index = Math.floor(Math.log2(node.group));
                    // Extract the triggerEnter event name
                    this.emitter.fireEvent(overlap.other.triggerEnters[index], {
                        node: node.id,
                        other: overlap.other.id
                    });
                }
                // Ignore collision sides for nodes we don't interact with
                if (groupIndex !== -1 && overlap.other.group !== -1 && ((this.collisionMasks[groupIndex] & overlap.other.group) === 0))
                    continue;
                // Only check for direction if the overlap was collidable
                if (overlap.type === "Tilemap" || overlap.other.isCollidable) {
                    let collisionSide = overlap.collider.touchesAABBWithoutCorners(node.collisionShape.getBoundingRect());
                    if (collisionSide !== null) {
                        // If we touch, not including corner cases, check the collision normal
                        if (overlap.hit !== null) {
                            // If we hit a tilemap, keep track of it
                            if (overlap.type == "Tilemap") {
                                node.collidedWithTilemap = true;
                            }
                            if (collisionSide.y === -1) {
                                // Node is on top of overlap, so onGround
                                node.onGround = true;
                            }
                            else if (collisionSide.y === 1) {
                                // Node is on bottom of overlap, so onCeiling
                                node.onCeiling = true;
                            }
                            else {
                                // Node wasn't touching on y, so it is touching on x
                                node.onWall = true;
                            }
                        }
                    }
                }
            }
            // Resolve the collision with the node, and move it
            node.finishMove();
        }
    }
    /**
     * Handles a collision between this node and an orthogonal tilemap
     * @param node The node
     * @param tilemap The tilemap the node may be colliding with
     * @param overlaps The list of overlaps
     */
    collideWithOrthogonalTilemap(node, tilemap, overlaps) {
        // Get the min and max x and y coordinates of the moving node
        let min = new Vec2_1.default(node.sweptRect.left, node.sweptRect.top);
        let max = new Vec2_1.default(node.sweptRect.right, node.sweptRect.bottom);
        // Convert the min/max x/y to the min and max row/col in the tilemap array
        let minIndex = tilemap.getColRowAt(min);
        let maxIndex = tilemap.getColRowAt(max);
        let tileSize = tilemap.getTileSize();
        // Loop over all possible tiles (which isn't many in the scope of the velocity per frame)
        for (let col = minIndex.x; col <= maxIndex.x; col++) {
            for (let row = minIndex.y; row <= maxIndex.y; row++) {
                if (tilemap.isTileCollidable(col, row)) {
                    // Get the position of this tile
                    let tilePos = new Vec2_1.default(col * tileSize.x + tileSize.x / 2, row * tileSize.y + tileSize.y / 2);
                    // Create a new collider for this tile
                    let collider = new AABB_1.default(tilePos, tileSize.scaled(1 / 2));
                    // Calculate collision area between the node and the tile
                    let area = node.sweptRect.overlapArea(collider);
                    if (area > 0) {
                        // We had a collision
                        overlaps.push(new AreaCollision_1.default(area, collider, tilemap, "Tilemap", new Vec2_1.default(col, row)));
                    }
                }
            }
        }
    }
}
exports.default = BasicPhysicsManager;

},{"../DataTypes/Physics/AreaCollision":12,"../DataTypes/Shapes/AABB":16,"../DataTypes/Vec2":24,"../Nodes/Tilemaps/OrthogonalTilemap":50,"./PhysicsManager":61}],61:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Receiver_1 = require("../Events/Receiver");
const Emitter_1 = require("../Events/Emitter");
const Map_1 = require("../DataTypes/Map");
/**
 * An abstract physics manager.
 * This class exposes functions for subclasses to implement that should allow for a working physics system to be created.
 */
class PhysicsManager {
    constructor() {
        this.receiver = new Receiver_1.default();
        this.emitter = new Emitter_1.default();
        // The creation and implementation of layers is deferred to the subclass
        this.groupMap = new Map_1.default();
        this.groupNames = new Array();
    }
    destroy() {
        this.receiver.destroy();
    }
    /**
     * Sets the physics layer of the GameNode
     * @param node The GameNode
     * @param group The group that the GameNode should be on
     */
    setGroup(node, group) {
        node.group = this.groupMap.get(group);
    }
    /**
     * Retrieves the layer number associated with the provided name
     * @param layer The name of the layer
     * @returns The layer number, or 0 if there is not a layer with that name registered
     */
    getGroupNumber(group) {
        if (this.groupMap.has(group)) {
            return this.groupMap.get(group);
        }
        else {
            return 0;
        }
    }
    /**
     * Gets all group names associated with the number provided
     * @param groups A mask of groups
     * @returns All groups contained in the mask
     */
    getGroupNames(groups) {
        if (groups === -1) {
            return [PhysicsManager.DEFAULT_GROUP];
        }
        else {
            let g = 1;
            let names = [];
            for (let i = 0; i < 32; i++) {
                if (g & groups) {
                    // This group is in the groups number
                    names.push(this.groupNames[i]);
                }
                // Shift the bit over
                g = g << 1;
            }
        }
    }
}
exports.default = PhysicsManager;
/** The default group name */
PhysicsManager.DEFAULT_GROUP = "Default";

},{"../DataTypes/Map":10,"../Events/Emitter":27,"../Events/Receiver":31}],62:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Queue_1 = require("../DataTypes/Queue");
const Receiver_1 = require("../Events/Receiver");
const EventQueue_1 = require("../Events/EventQueue");
const GameEventType_1 = require("../Events/GameEventType");
// @ignorePage
class Recorder {
    constructor() {
        this.receiver = new Receiver_1.default();
        this.log = new Queue_1.default(1000);
        this.recording = false;
        this.playing = false;
        this.frame = 0;
        this.eventQueue = EventQueue_1.default.getInstance();
        this.eventQueue.subscribe(this.receiver, "all");
    }
    update(deltaT) {
        if (this.recording) {
            this.frame += 1;
        }
        if (this.playing) {
            // If playing, ignore events, just feed the record to the event queue
            this.receiver.ignoreEvents();
            /*
                While there is a next item, and while it should occur in this frame,
                send the event. i.e., while current_frame * current_delta_t is greater
                than recorded_frame * recorded_delta_t
            */
            while (this.log.hasItems()
                && this.log.peekNext().frame * this.log.peekNext().delta < this.frame * deltaT) {
                let event = this.log.dequeue().event;
                console.log(event);
                this.eventQueue.addEvent(event);
            }
            if (!this.log.hasItems()) {
                this.playing = false;
            }
            this.frame += 1;
        }
        else {
            // If not playing, handle events
            while (this.receiver.hasNextEvent()) {
                let event = this.receiver.getNextEvent();
                if (event.type === GameEventType_1.GameEventType.STOP_RECORDING) {
                    this.recording = false;
                }
                if (this.recording) {
                    this.log.enqueue(new LogItem(this.frame, deltaT, event));
                }
                if (event.type === GameEventType_1.GameEventType.START_RECORDING) {
                    this.log.clear();
                    this.recording = true;
                    this.frame = 0;
                }
                if (event.type === GameEventType_1.GameEventType.PLAY_RECORDING) {
                    this.frame = 0;
                    this.recording = false;
                    this.playing = true;
                }
            }
        }
    }
}
exports.default = Recorder;
class LogItem {
    constructor(frame, deltaT, event) {
        this.frame = frame;
        this.delta = deltaT;
        this.event = event;
    }
}

},{"../DataTypes/Queue":14,"../Events/EventQueue":28,"../Events/GameEventType":30,"../Events/Receiver":31}],63:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Map_1 = require("../../DataTypes/Map");
/** */
class Registry extends Map_1.default {
}
exports.default = Registry;

},{"../../DataTypes/Map":10}],64:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LabelShaderType_1 = require("../../Rendering/WebGLRendering/ShaderTypes/LabelShaderType");
const PointShaderType_1 = require("../../Rendering/WebGLRendering/ShaderTypes/PointShaderType");
const RectShaderType_1 = require("../../Rendering/WebGLRendering/ShaderTypes/RectShaderType");
const SpriteShaderType_1 = require("../../Rendering/WebGLRendering/ShaderTypes/SpriteShaderType");
const ResourceManager_1 = require("../../ResourceManager/ResourceManager");
const Registry_1 = require("./Registry");
/**
 * A registry that handles shaders
 */
class ShaderRegistry extends Registry_1.default {
    constructor() {
        super(...arguments);
        this.registryItems = new Array();
    }
    /**
     * Preloads all built-in shaders
     */
    preload() {
        // Get the resourceManager and queue all built-in shaders for preloading
        const rm = ResourceManager_1.default.getInstance();
        // Queue a load for the point shader
        this.registerAndPreloadItem(ShaderRegistry.POINT_SHADER, PointShaderType_1.default, "builtin/shaders/point.vshader", "builtin/shaders/point.fshader");
        // Queue a load for the rect shader
        this.registerAndPreloadItem(ShaderRegistry.RECT_SHADER, RectShaderType_1.default, "builtin/shaders/rect.vshader", "builtin/shaders/rect.fshader");
        // Queue a load for the sprite shader
        this.registerAndPreloadItem(ShaderRegistry.SPRITE_SHADER, SpriteShaderType_1.default, "builtin/shaders/sprite.vshader", "builtin/shaders/sprite.fshader");
        // Queue a load for the label shader
        this.registerAndPreloadItem(ShaderRegistry.LABEL_SHADER, LabelShaderType_1.default, "builtin/shaders/label.vshader", "builtin/shaders/label.fshader");
        // Queue a load for any preloaded items
        for (let item of this.registryItems) {
            const shader = new item.constr(item.key);
            shader.initBufferObject();
            this.add(item.key, shader);
            // Load if desired
            if (item.preload !== undefined) {
                rm.shader(item.key, item.preload.vshaderLocation, item.preload.fshaderLocation);
            }
        }
    }
    /**
     * Registers a shader in the registry and loads it before the game begins
     * @param key The key you wish to assign to the shader
     * @param constr The constructor of the ShaderType
     * @param vshaderLocation The location of the vertex shader
     * @param fshaderLocation the location of the fragment shader
     */
    registerAndPreloadItem(key, constr, vshaderLocation, fshaderLocation) {
        let shaderPreload = new ShaderPreload();
        shaderPreload.vshaderLocation = vshaderLocation;
        shaderPreload.fshaderLocation = fshaderLocation;
        let registryItem = new ShaderRegistryItem();
        registryItem.key = key;
        registryItem.constr = constr;
        registryItem.preload = shaderPreload;
        this.registryItems.push(registryItem);
    }
    /**
     * Registers a shader in the registry. NOTE: If you use this, you MUST load the shader before use.
     * If you wish to preload the shader, use registerAndPreloadItem()
     * @param key The key you wish to assign to the shader
     * @param constr The constructor of the ShaderType
     */
    registerItem(key, constr) {
        let registryItem = new ShaderRegistryItem();
        registryItem.key = key;
        registryItem.constr = constr;
        this.registryItems.push(registryItem);
    }
}
exports.default = ShaderRegistry;
// Shader names
ShaderRegistry.POINT_SHADER = "point";
ShaderRegistry.RECT_SHADER = "rect";
ShaderRegistry.SPRITE_SHADER = "sprite";
ShaderRegistry.LABEL_SHADER = "label";
class ShaderRegistryItem {
}
class ShaderPreload {
}

},{"../../Rendering/WebGLRendering/ShaderTypes/LabelShaderType":78,"../../Rendering/WebGLRendering/ShaderTypes/PointShaderType":79,"../../Rendering/WebGLRendering/ShaderTypes/RectShaderType":81,"../../Rendering/WebGLRendering/ShaderTypes/SpriteShaderType":82,"../../ResourceManager/ResourceManager":83,"./Registry":63}],65:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Map_1 = require("../DataTypes/Map");
const ShaderRegistry_1 = require("./Registries/ShaderRegistry");
/**
 * The Registry is the system's way of converting classes and types into string
 * representations for use elsewhere in the application.
 * It allows classes to be accessed without explicitly using constructors in code,
 * and for resources to be loaded at Game creation time.
 */
class RegistryManager {
    static preload() {
        this.shaders.preload();
        this.registries.forEach((key) => this.registries.get(key).preload());
    }
    static addCustomRegistry(name, registry) {
        this.registries.add(name, registry);
    }
    static getRegistry(key) {
        return this.registries.get(key);
    }
}
exports.default = RegistryManager;
RegistryManager.shaders = new ShaderRegistry_1.default();
/** Additional custom registries to add to the registry manager */
RegistryManager.registries = new Map_1.default();

},{"../DataTypes/Map":10,"./Registries/ShaderRegistry":64}],66:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Map_1 = require("../../DataTypes/Map");
const Emitter_1 = require("../../Events/Emitter");
const AnimationTypes_1 = require("./AnimationTypes");
/**
 * An animation manager class for an animated CanvasNode.
 * This class keeps track of the possible animations, as well as the current animation state,
 * and abstracts all interactions with playing, pausing, and stopping animations as well as
 * creating new animations from the CanvasNode.
 */
class AnimationManager {
    /**
     * Creates a new AnimationManager
     * @param owner The owner of the AnimationManager
     */
    constructor(owner) {
        this.owner = owner;
        this.animationState = AnimationTypes_1.AnimationState.STOPPED;
        this.currentAnimation = "";
        this.currentFrame = 0;
        this.frameProgress = 0;
        this.loop = false;
        this.animations = new Map_1.default();
        this.onEndEvent = null;
        this.emitter = new Emitter_1.default();
    }
    /**
     * Add an animation to this sprite
     * @param key The unique key of the animation
     * @param animation The animation data
     */
    add(key, animation) {
        this.animations.add(key, animation);
    }
    /**
     * Gets the index specified by the current animation and current frame
     * @returns The index in the current animation
     */
    getIndex() {
        if (this.animations.has(this.currentAnimation)) {
            return this.animations.get(this.currentAnimation).frames[this.currentFrame].index;
        }
        else {
            // No current animation, warn the user
            console.warn(`Animation index was requested, but the current animation: ${this.currentAnimation} was invalid`);
            return 0;
        }
    }
    /**
     * Determines whether the specified animation is currently playing
     * @param key The key of the animation to check
     * @returns true if the specified animation is playing, false otherwise
     */
    isPlaying(key) {
        return this.currentAnimation === key && this.animationState === AnimationTypes_1.AnimationState.PLAYING;
    }
    /**
     * Retrieves the current animation index and advances the animation frame
     * @returns The index of the animation frame
     */
    getIndexAndAdvanceAnimation() {
        // If we aren't playing, we won't be advancing the animation
        if (!(this.animationState === AnimationTypes_1.AnimationState.PLAYING)) {
            return this.getIndex();
        }
        if (this.animations.has(this.currentAnimation)) {
            let currentAnimation = this.animations.get(this.currentAnimation);
            let index = currentAnimation.frames[this.currentFrame].index;
            // Advance the animation
            this.frameProgress += 1;
            if (this.frameProgress >= currentAnimation.frames[this.currentFrame].duration) {
                // We have been on this frame for its whole duration, go to the next one
                this.frameProgress = 0;
                this.currentFrame += 1;
                if (this.currentFrame >= currentAnimation.frames.length) {
                    // We have reached the end of this animation
                    if (this.loop) {
                        this.currentFrame = 0;
                        this.frameProgress = 0;
                    }
                    else {
                        this.endCurrentAnimation();
                    }
                }
            }
            // Return the current index
            return index;
        }
        else {
            // No current animation, can't advance. Warn the user
            console.warn(`Animation index and advance was requested, but the current animation (${this.currentAnimation}) in node with id: ${this.owner.id} was invalid`);
            return 0;
        }
    }
    /** Ends the current animation and fires any necessary events, as well as starting any new animations */
    endCurrentAnimation() {
        this.currentFrame = 0;
        this.animationState = AnimationTypes_1.AnimationState.STOPPED;
        if (this.onEndEvent !== null) {
            this.emitter.fireEvent(this.onEndEvent, { owner: this.owner.id, animation: this.currentAnimation });
        }
        // If there is a pending animation, play it
        if (this.pendingAnimation !== null) {
            this.play(this.pendingAnimation, this.pendingLoop, this.pendingOnEnd);
        }
    }
    /**
     * Plays the specified animation. Does not restart it if it is already playing
     * @param animation The name of the animation to play
     * @param loop Whether or not to loop the animation. False by default
     * @param onEnd The name of an event to send when this animation naturally stops playing. This only matters if loop is false.
     */
    playIfNotAlready(animation, loop, onEnd) {
        if (this.currentAnimation !== animation) {
            this.play(animation, loop, onEnd);
        }
    }
    /**
     * Plays the specified animation
     * @param animation The name of the animation to play
     * @param loop Whether or not to loop the animation. False by default
     * @param onEnd The name of an event to send when this animation naturally stops playing. This only matters if loop is false.
     */
    play(animation, loop, onEnd) {
        this.currentAnimation = animation;
        this.currentFrame = 0;
        this.frameProgress = 0;
        this.animationState = AnimationTypes_1.AnimationState.PLAYING;
        // If loop arg was provided, use that
        if (loop !== undefined) {
            this.loop = loop;
        }
        else {
            // Otherwise, use what the json file specified
            this.loop = this.animations.get(animation).repeat;
        }
        if (onEnd !== undefined) {
            this.onEndEvent = onEnd;
        }
        else {
            this.onEndEvent = null;
        }
        // Reset pending animation
        this.pendingAnimation = null;
    }
    /**
     * Queues a single animation to be played after the current one. Does NOT stack.
     * Queueing additional animations past 1 will just replace the queued animation
     * @param animation The animation to queue
     * @param loop Whether or not the loop the queued animation
     * @param onEnd The event to fire when the queued animation ends
     */
    queue(animation, loop = false, onEnd) {
        this.pendingAnimation = animation;
        this.pendingLoop = loop;
        if (onEnd !== undefined) {
            this.pendingOnEnd = onEnd;
        }
        else {
            this.pendingOnEnd = null;
        }
    }
    /** Pauses the current animation */
    pause() {
        this.animationState = AnimationTypes_1.AnimationState.PAUSED;
    }
    /** Resumes the current animation if possible */
    resume() {
        if (this.animationState === AnimationTypes_1.AnimationState.PAUSED) {
            this.animationState = AnimationTypes_1.AnimationState.PLAYING;
        }
    }
    /** Stops the current animation. The animation cannot be resumed after this. */
    stop() {
        this.animationState = AnimationTypes_1.AnimationState.STOPPED;
    }
}
exports.default = AnimationManager;

},{"../../DataTypes/Map":10,"../../Events/Emitter":27,"./AnimationTypes":67}],67:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TweenData = exports.TweenEffect = exports.AnimationData = exports.AnimationState = void 0;
// @ignorePage
var AnimationState;
(function (AnimationState) {
    AnimationState[AnimationState["STOPPED"] = 0] = "STOPPED";
    AnimationState[AnimationState["PAUSED"] = 1] = "PAUSED";
    AnimationState[AnimationState["PLAYING"] = 2] = "PLAYING";
})(AnimationState = exports.AnimationState || (exports.AnimationState = {}));
class AnimationData {
    constructor() {
        this.repeat = false;
    }
}
exports.AnimationData = AnimationData;
class TweenEffect {
}
exports.TweenEffect = TweenEffect;
class TweenData {
}
exports.TweenData = TweenData;

},{}],68:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ParticleSystemManager {
    constructor() {
        this.particleSystems = new Array();
    }
    static getInstance() {
        if (ParticleSystemManager.instance === null) {
            ParticleSystemManager.instance = new ParticleSystemManager();
        }
        return ParticleSystemManager.instance;
    }
    registerParticleSystem(system) {
        this.particleSystems.push(system);
    }
    deregisterParticleSystem(system) {
        let index = this.particleSystems.indexOf(system);
        this.particleSystems.splice(index, 1);
    }
    clearParticleSystems() {
        this.particleSystems = new Array();
    }
    update(deltaT) {
        for (let particleSystem of this.particleSystems) {
            particleSystem.update(deltaT);
        }
    }
}
exports.default = ParticleSystemManager;
ParticleSystemManager.instance = null;

},{}],69:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Map_1 = require("../../DataTypes/Map");
const AnimationTypes_1 = require("./AnimationTypes");
const EaseFunctions_1 = require("../../Utils/EaseFunctions");
const MathUtils_1 = require("../../Utils/MathUtils");
const TweenManager_1 = require("./TweenManager");
const Emitter_1 = require("../../Events/Emitter");
/**
 * A manager for the tweens of a GameNode.
 * Tweens are short animations played by interpolating between two properties using an easing function.
 * For a good visual representation of easing functions, check out @link(https://easings.net/)(https://easings.net/).
 * Multiple tween can be played at the same time, as long as they don't change the same property.
 * This allows for some interesting polishes or animations that may be very difficult to do with sprite work alone
 * - especially pixel art (such as rotations or scaling).
 */
class TweenController {
    /**
     * Creates a new TweenController
     * @param owner The owner of the TweenController
     */
    constructor(owner) {
        this.owner = owner;
        this.tweens = new Map_1.default();
        this.emitter = new Emitter_1.default();
        // Give ourselves to the TweenManager
        TweenManager_1.default.getInstance().registerTweenController(this);
    }
    /**
     * Destroys this TweenController
     */
    destroy() {
        // Only the gamenode and the tween manager should have a reference to this
        delete this.owner.tweens;
        TweenManager_1.default.getInstance().deregisterTweenController(this);
    }
    /**
     * Add a tween to this game node
     * @param key The name of the tween
     * @param tween The data of the tween
     */
    add(key, tween) {
        let typedTween = tween;
        // Initialize members that we need (and the user didn't provide)
        typedTween.progress = 0;
        typedTween.elapsedTime = 0;
        typedTween.animationState = AnimationTypes_1.AnimationState.STOPPED;
        this.tweens.add(key, typedTween);
    }
    /**
     * Play a tween with a certain name
     * @param key The name of the tween to play
     * @param loop Whether or not the tween should loop
     */
    play(key, loop) {
        if (this.tweens.has(key)) {
            let tween = this.tweens.get(key);
            // Set loop if needed
            if (loop !== undefined) {
                tween.loop = loop;
            }
            // Set the initial values
            for (let effect of tween.effects) {
                if (effect.resetOnComplete) {
                    effect.initialValue = this.owner[effect.property];
                }
            }
            // Start the tween running
            tween.animationState = AnimationTypes_1.AnimationState.PLAYING;
            tween.elapsedTime = 0;
            tween.progress = 0;
            tween.reversing = false;
        }
        else {
            console.warn(`Tried to play tween "${key}" on node with id ${this.owner.id}, but no such tween exists`);
        }
    }
    /**
     * Pauses a playing tween. Does not affect tweens that are stopped.
     * @param key The name of the tween to pause.
     */
    pause(key) {
        if (this.tweens.has(key)) {
            this.tweens.get(key).animationState = AnimationTypes_1.AnimationState.PAUSED;
        }
    }
    /**
     * Resumes a paused tween.
     * @param key The name of the tween to resume
     */
    resume(key) {
        if (this.tweens.has(key)) {
            let tween = this.tweens.get(key);
            if (tween.animationState === AnimationTypes_1.AnimationState.PAUSED)
                tween.animationState = AnimationTypes_1.AnimationState.PLAYING;
        }
    }
    /**
     * Stops a currently playing tween
     * @param key The key of the tween
     */
    stop(key) {
        if (this.tweens.has(key)) {
            let tween = this.tweens.get(key);
            tween.animationState = AnimationTypes_1.AnimationState.STOPPED;
            // Return to the initial values
            for (let effect of tween.effects) {
                if (effect.resetOnComplete) {
                    this.owner[effect.property] = effect.initialValue;
                }
            }
        }
    }
    /**
     * The natural stop of a currently playing tween
     * @param key The key of the tween
     */
    end(key) {
        this.stop(key);
        if (this.tweens.has(key)) {
            // Get the tween
            let tween = this.tweens.get(key);
            // If it has an onEnd, send an event
            if (tween.onEnd) {
                let data = { key: key, node: this.owner.id };
                // If it has onEnd event data, add each entry, as long as the key is not named 'key' or 'node'
                if (tween.onEndData) {
                    Object.keys(tween.onEndData).forEach(key => {
                        if (key !== "key" && key !== "node") {
                            data[key] = tween.onEndData[key];
                        }
                    });
                }
                this.emitter.fireEvent(tween.onEnd, data);
            }
        }
    }
    /**
     * Stops all currently playing tweens
     */
    stopAll() {
        this.tweens.forEach(key => this.stop(key));
    }
    update(deltaT) {
        this.tweens.forEach(key => {
            let tween = this.tweens.get(key);
            if (tween.animationState === AnimationTypes_1.AnimationState.PLAYING) {
                // Update the progress of the tween
                tween.elapsedTime += deltaT * 1000;
                // If we're past the startDelay, do the tween
                if (tween.elapsedTime >= tween.startDelay) {
                    if (!tween.reversing && tween.elapsedTime >= tween.startDelay + tween.duration) {
                        // If we're over time, stop the tween, loop, or reverse
                        if (tween.reverseOnComplete) {
                            // If we're over time and can reverse, do so
                            tween.reversing = true;
                        }
                        else if (tween.loop) {
                            // If we can't reverse and can loop, do so
                            tween.elapsedTime -= tween.duration;
                        }
                        else {
                            // We aren't looping and can't reverse, so stop
                            this.end(key);
                        }
                    }
                    // Check for the end of reversing
                    if (tween.reversing && tween.elapsedTime >= tween.startDelay + 2 * tween.duration) {
                        if (tween.loop) {
                            tween.reversing = false;
                            tween.elapsedTime -= 2 * tween.duration;
                        }
                        else {
                            this.end(key);
                        }
                    }
                    // Update the progress, make sure it is between 0 and 1. Errors from this should never be large
                    if (tween.reversing) {
                        tween.progress = MathUtils_1.default.clamp01((2 * tween.duration - (tween.elapsedTime - tween.startDelay)) / tween.duration);
                    }
                    else {
                        tween.progress = MathUtils_1.default.clamp01((tween.elapsedTime - tween.startDelay) / tween.duration);
                    }
                    for (let effect of tween.effects) {
                        // Get the value from the ease function that corresponds to our progress
                        let ease = EaseFunctions_1.default[effect.ease](tween.progress);
                        // Use the value to lerp the property
                        let value = MathUtils_1.default.lerp(effect.start, effect.end, ease);
                        // Assign the value of the property
                        this.owner[effect.property] = value;
                    }
                }
            }
        });
    }
}
exports.default = TweenController;

},{"../../DataTypes/Map":10,"../../Events/Emitter":27,"../../Utils/EaseFunctions":100,"../../Utils/MathUtils":102,"./AnimationTypes":67,"./TweenManager":70}],70:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TweenManager {
    constructor() {
        this.tweenControllers = new Array();
    }
    static getInstance() {
        if (TweenManager.instance === null) {
            TweenManager.instance = new TweenManager();
        }
        return TweenManager.instance;
    }
    registerTweenController(controller) {
        this.tweenControllers.push(controller);
    }
    deregisterTweenController(controller) {
        let index = this.tweenControllers.indexOf(controller);
        this.tweenControllers.splice(index, 1);
    }
    clearTweenControllers() {
        this.tweenControllers = new Array();
    }
    update(deltaT) {
        for (let tweenController of this.tweenControllers) {
            tweenController.update(deltaT);
        }
    }
}
exports.default = TweenManager;
TweenManager.instance = null;

},{}],71:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Graphic_1 = require("../Nodes/Graphic");
const Point_1 = require("../Nodes/Graphics/Point");
const Rect_1 = require("../Nodes/Graphics/Rect");
const Sprite_1 = require("../Nodes/Sprites/Sprite");
const OrthogonalTilemap_1 = require("../Nodes/Tilemaps/OrthogonalTilemap");
const UIElement_1 = require("../Nodes/UIElement");
const GraphicRenderer_1 = require("./CanvasRendering/GraphicRenderer");
const RenderingManager_1 = require("./RenderingManager");
const TilemapRenderer_1 = require("./CanvasRendering/TilemapRenderer");
const UIElementRenderer_1 = require("./CanvasRendering/UIElementRenderer");
const Label_1 = require("../Nodes/UIElements/Label");
const Button_1 = require("../Nodes/UIElements/Button");
const Slider_1 = require("../Nodes/UIElements/Slider");
const TextInput_1 = require("../Nodes/UIElements/TextInput");
const AnimatedSprite_1 = require("../Nodes/Sprites/AnimatedSprite");
const Vec2_1 = require("../DataTypes/Vec2");
const Line_1 = require("../Nodes/Graphics/Line");
/**
 * An implementation of the RenderingManager class using CanvasRenderingContext2D.
 */
class CanvasRenderer extends RenderingManager_1.default {
    constructor() {
        super();
    }
    // @override
    setScene(scene) {
        this.scene = scene;
        this.graphicRenderer.setScene(scene);
        this.tilemapRenderer.setScene(scene);
        this.uiElementRenderer.setScene(scene);
    }
    // @override
    initializeCanvas(canvas, width, height) {
        canvas.width = width;
        canvas.height = height;
        this.worldSize = new Vec2_1.default(width, height);
        this.ctx = canvas.getContext("2d");
        this.graphicRenderer = new GraphicRenderer_1.default(this.ctx);
        this.tilemapRenderer = new TilemapRenderer_1.default(this.ctx);
        this.uiElementRenderer = new UIElementRenderer_1.default(this.ctx);
        // For crisp pixel art
        this.ctx.imageSmoothingEnabled = false;
        return this.ctx;
    }
    // @override
    render(visibleSet, tilemaps, uiLayers) {
        // Sort by depth, then by visible set by y-value
        visibleSet.sort((a, b) => {
            if (a.getLayer().getDepth() === b.getLayer().getDepth()) {
                return (a.boundary.bottom) - (b.boundary.bottom);
            }
            else {
                return a.getLayer().getDepth() - b.getLayer().getDepth();
            }
        });
        let tilemapIndex = 0;
        let tilemapLength = tilemaps.length;
        let visibleSetIndex = 0;
        let visibleSetLength = visibleSet.length;
        while (tilemapIndex < tilemapLength || visibleSetIndex < visibleSetLength) {
            // Check conditions where we've already reached the edge of one list
            if (tilemapIndex >= tilemapLength) {
                // Only render the remaining visible set
                let node = visibleSet[visibleSetIndex++];
                if (node.visible) {
                    this.renderNode(node);
                }
                continue;
            }
            if (visibleSetIndex >= visibleSetLength) {
                // Only render tilemaps
                this.renderTilemap(tilemaps[tilemapIndex++]);
                continue;
            }
            // Render whichever is further down
            if (tilemaps[tilemapIndex].getLayer().getDepth() <= visibleSet[visibleSetIndex].getLayer().getDepth()) {
                this.renderTilemap(tilemaps[tilemapIndex++]);
            }
            else {
                let node = visibleSet[visibleSetIndex++];
                if (node.visible) {
                    this.renderNode(node);
                }
            }
        }
        // Render the uiLayers on top of everything else
        let sortedUILayers = new Array();
        uiLayers.forEach(key => sortedUILayers.push(uiLayers.get(key)));
        sortedUILayers = sortedUILayers.sort((ui1, ui2) => ui1.getDepth() - ui2.getDepth());
        sortedUILayers.forEach(uiLayer => {
            if (!uiLayer.isHidden())
                uiLayer.getItems().forEach(node => {
                    if (node.visible) {
                        this.renderNode(node);
                    }
                });
        });
    }
    /**
     * Renders a specified CanvasNode
     * @param node The CanvasNode to render
     */
    renderNode(node) {
        // Calculate the origin of the viewport according to this sprite
        this.origin = this.scene.getViewTranslation(node);
        // Get the zoom level of the scene
        this.zoom = this.scene.getViewScale();
        // Move the canvas to the position of the node and rotate
        let xScale = 1;
        let yScale = 1;
        if (node instanceof Sprite_1.default) {
            xScale = node.invertX ? -1 : 1;
            yScale = node.invertY ? -1 : 1;
        }
        this.ctx.setTransform(xScale, 0, 0, yScale, (node.position.x - this.origin.x) * this.zoom, (node.position.y - this.origin.y) * this.zoom);
        this.ctx.rotate(-node.rotation);
        let globalAlpha = this.ctx.globalAlpha;
        // if(node instanceof Rect){
        // Debug.log("node" + node.id, "Node" + node.id + " Alpha: " + node.alpha);
        // }
        this.ctx.globalAlpha = node.alpha;
        if (node instanceof AnimatedSprite_1.default) {
            this.renderAnimatedSprite(node);
        }
        else if (node instanceof Sprite_1.default) {
            this.renderSprite(node);
        }
        else if (node instanceof Graphic_1.default) {
            this.renderGraphic(node);
        }
        else if (node instanceof UIElement_1.default) {
            this.renderUIElement(node);
        }
        this.ctx.globalAlpha = globalAlpha;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // @override
    renderSprite(sprite) {
        // Get the image from the resource manager
        let image = this.resourceManager.getImage(sprite.imageId);
        /*
            Coordinates in the space of the image:
                image crop start -> x, y
                image crop size  -> w, h
            Coordinates in the space of the world
                image draw start -> x, y
                image draw size  -> w, h
        */
        this.ctx.drawImage(image, sprite.imageOffset.x, sprite.imageOffset.y, sprite.size.x, sprite.size.y, (-sprite.size.x * sprite.scale.x / 2) * this.zoom, (-sprite.size.y * sprite.scale.y / 2) * this.zoom, sprite.size.x * sprite.scale.x * this.zoom, sprite.size.y * sprite.scale.y * this.zoom);
    }
    // @override
    renderAnimatedSprite(sprite) {
        // Get the image from the resource manager
        let image = this.resourceManager.getImage(sprite.imageId);
        let animationIndex = sprite.animation.getIndexAndAdvanceAnimation();
        let animationOffset = sprite.getAnimationOffset(animationIndex);
        /*
            Coordinates in the space of the image:
                image crop start -> x, y
                image crop size  -> w, h
            Coordinates in the space of the world (given we moved)
                image draw start -> -w/2, -h/2
                image draw size  -> w, h
        */
        this.ctx.drawImage(image, sprite.imageOffset.x + animationOffset.x, sprite.imageOffset.y + animationOffset.y, sprite.size.x, sprite.size.y, (-sprite.size.x * sprite.scale.x / 2) * this.zoom, (-sprite.size.y * sprite.scale.y / 2) * this.zoom, sprite.size.x * sprite.scale.x * this.zoom, sprite.size.y * sprite.scale.y * this.zoom);
    }
    // @override
    renderGraphic(graphic) {
        if (graphic instanceof Point_1.default) {
            this.graphicRenderer.renderPoint(graphic, this.zoom);
        }
        else if (graphic instanceof Line_1.default) {
            this.graphicRenderer.renderLine(graphic, this.origin, this.zoom);
        }
        else if (graphic instanceof Rect_1.default) {
            this.graphicRenderer.renderRect(graphic, this.zoom);
        }
    }
    // @override
    renderTilemap(tilemap) {
        if (tilemap instanceof OrthogonalTilemap_1.default) {
            this.tilemapRenderer.renderOrthogonalTilemap(tilemap);
        }
    }
    // @override
    renderUIElement(uiElement) {
        if (uiElement instanceof Label_1.default) {
            this.uiElementRenderer.renderLabel(uiElement);
        }
        else if (uiElement instanceof Button_1.default) {
            this.uiElementRenderer.renderButton(uiElement);
        }
        else if (uiElement instanceof Slider_1.default) {
            this.uiElementRenderer.renderSlider(uiElement);
        }
        else if (uiElement instanceof TextInput_1.default) {
            this.uiElementRenderer.renderTextInput(uiElement);
        }
    }
    clear(clearColor) {
        this.ctx.clearRect(0, 0, this.worldSize.x, this.worldSize.y);
        this.ctx.fillStyle = clearColor.toString();
        this.ctx.fillRect(0, 0, this.worldSize.x, this.worldSize.y);
    }
}
exports.default = CanvasRenderer;

},{"../DataTypes/Vec2":24,"../Nodes/Graphic":41,"../Nodes/Graphics/Line":43,"../Nodes/Graphics/Point":45,"../Nodes/Graphics/Rect":46,"../Nodes/Sprites/AnimatedSprite":47,"../Nodes/Sprites/Sprite":48,"../Nodes/Tilemaps/OrthogonalTilemap":50,"../Nodes/UIElement":51,"../Nodes/UIElements/Button":52,"../Nodes/UIElements/Label":53,"../Nodes/UIElements/Slider":54,"../Nodes/UIElements/TextInput":55,"./CanvasRendering/GraphicRenderer":72,"./CanvasRendering/TilemapRenderer":73,"./CanvasRendering/UIElementRenderer":74,"./RenderingManager":75}],72:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ResourceManager_1 = require("../../ResourceManager/ResourceManager");
/**
 * A utility class to help the @reference[CanvasRenderer] render @reference[Graphic]s
 */
class GraphicRenderer {
    constructor(ctx) {
        this.resourceManager = ResourceManager_1.default.getInstance();
        this.ctx = ctx;
    }
    /**
     * Sets the scene of this GraphicRenderer
     * @param scene The current scene
     */
    setScene(scene) {
        this.scene = scene;
    }
    /**
     * Renders a point
     * @param point The point to render
     * @param zoom The zoom level
     */
    renderPoint(point, zoom) {
        this.ctx.fillStyle = point.color.toStringRGBA();
        this.ctx.fillRect((-point.size.x / 2) * zoom, (-point.size.y / 2) * zoom, point.size.x * zoom, point.size.y * zoom);
    }
    renderLine(line, origin, zoom) {
        this.ctx.strokeStyle = line.color.toStringRGBA();
        this.ctx.lineWidth = line.thickness;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo((line.end.x - line.start.x) * zoom, (line.end.y - line.start.y) * zoom);
        this.ctx.closePath();
        this.ctx.stroke();
    }
    /**
     * Renders a rect
     * @param rect The rect to render
     * @param zoom The zoom level
     */
    renderRect(rect, zoom) {
        // Draw the interior of the rect
        if (rect.color.a !== 0) {
            this.ctx.fillStyle = rect.color.toStringRGB();
            if (rect.fillWidth !== null) {
                this.ctx.fillRect((-rect.size.x / 2) * zoom, (-rect.size.y / 2) * zoom, rect.fillWidth * zoom, rect.size.y * zoom);
            }
            else {
                this.ctx.fillRect((-rect.size.x / 2) * zoom, (-rect.size.y / 2) * zoom, rect.size.x * zoom, rect.size.y * zoom);
            }
        }
        // Draw the border of the rect if it isn't transparent
        if (rect.borderColor.a !== 0) {
            this.ctx.strokeStyle = rect.getBorderColor().toStringRGB();
            this.ctx.lineWidth = rect.getBorderWidth();
            this.ctx.strokeRect((-rect.size.x / 2) * zoom, (-rect.size.y / 2) * zoom, rect.size.x * zoom, rect.size.y * zoom);
        }
    }
}
exports.default = GraphicRenderer;

},{"../../ResourceManager/ResourceManager":83}],73:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ResourceManager_1 = require("../../ResourceManager/ResourceManager");
const Vec2_1 = require("../../DataTypes/Vec2");
/**
 * A utility class for the @reference[CanvasRenderer] to render @reference[Tilemap]s
 */
class TilemapRenderer {
    constructor(ctx) {
        this.resourceManager = ResourceManager_1.default.getInstance();
        this.ctx = ctx;
    }
    /**
     * Sets the scene of this TilemapRenderer
     * @param scene The current scene
     */
    setScene(scene) {
        this.scene = scene;
    }
    /**
     * Renders an orthogonal tilemap
     * @param tilemap The tilemap to render
     */
    renderOrthogonalTilemap(tilemap) {
        let previousAlpha = this.ctx.globalAlpha;
        this.ctx.globalAlpha = tilemap.getLayer().getAlpha();
        let origin = this.scene.getViewTranslation(tilemap);
        let size = this.scene.getViewport().getHalfSize();
        let zoom = this.scene.getViewScale();
        let bottomRight = origin.clone().add(size.scaled(2 * zoom));
        if (tilemap.visible) {
            let minColRow = tilemap.getColRowAt(origin);
            let maxColRow = tilemap.getColRowAt(bottomRight);
            for (let x = minColRow.x; x <= maxColRow.x; x++) {
                for (let y = minColRow.y; y <= maxColRow.y; y++) {
                    // Get the tile at this position
                    let tile = tilemap.getTileAtRowCol(new Vec2_1.default(x, y));
                    // Extract the rot/flip parameters if there are any
                    const mask = (0xE << 28);
                    const rotFlip = ((mask & tile) >> 28) & 0xF;
                    tile = tile & ~mask;
                    // Find the tileset that owns this tile index and render
                    for (let tileset of tilemap.getTilesets()) {
                        if (tileset.hasTile(tile)) {
                            this.renderTile(tileset, tile, x, y, origin, tilemap.scale, zoom, rotFlip);
                        }
                    }
                }
            }
        }
        this.ctx.globalAlpha = previousAlpha;
    }
    /**
     * Renders a tile
     * @param tileset The tileset this tile belongs to
     * @param tileIndex The index of the tile
     * @param tilemapRow The row of the tile in the tilemap
     * @param tilemapCol The column of the tile in the tilemap
     * @param origin The origin of the viewport
     * @param scale The scale of the tilemap
     * @param zoom The zoom level of the viewport
     */
    renderTile(tileset, tileIndex, tilemapRow, tilemapCol, origin, scale, zoom, rotFlip) {
        let image = this.resourceManager.getImage(tileset.getImageKey());
        // Get the true index
        let index = tileIndex - tileset.getStartIndex();
        // Get the row and col of the tile in image space
        let row = Math.floor(index / tileset.getNumCols());
        let col = index % tileset.getNumCols();
        let width = tileset.getTileSize().x;
        let height = tileset.getTileSize().y;
        // Calculate the position to start a crop in the tileset image
        let left = col * width;
        let top = row * height;
        // Calculate the position in the world to render the tile
        let x = Math.floor(tilemapRow * width * scale.x);
        let y = Math.floor(tilemapCol * height * scale.y);
        let worldX = Math.floor((x - origin.x) * zoom);
        let worldY = Math.floor((y - origin.y) * zoom);
        let worldWidth = Math.ceil(width * scale.x * zoom);
        let worldHeight = Math.ceil(height * scale.y * zoom);
        if (rotFlip !== 0) {
            let scaleX = 1;
            let scaleY = 1;
            let shearX = 0;
            let shearY = 0;
            // Flip on the x-axis
            if (rotFlip & 8) {
                scaleX = -1;
            }
            // Flip on the y-axis
            if (rotFlip & 4) {
                scaleY = -1;
            }
            // Flip over the line y=x
            if (rotFlip & 2) {
                shearX = scaleY;
                shearY = scaleX;
                scaleX = 0;
                scaleY = 0;
            }
            this.ctx.setTransform(scaleX, shearX, shearY, scaleY, worldX + worldWidth / 2, worldY + worldHeight / 2);
            // Render the tile
            this.ctx.drawImage(image, left, top, width, height, -worldWidth / 2, -worldHeight / 2, worldWidth, worldHeight);
            if (rotFlip !== 0) {
                this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            }
        }
        else {
            // No rotations, don't do the calculations, just render the tile
            // Render the tile
            this.ctx.drawImage(image, left, top, width, height, worldX, worldY, worldWidth, worldHeight);
        }
    }
}
exports.default = TilemapRenderer;

},{"../../DataTypes/Vec2":24,"../../ResourceManager/ResourceManager":83}],74:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("../../DataTypes/Vec2");
const ResourceManager_1 = require("../../ResourceManager/ResourceManager");
const MathUtils_1 = require("../../Utils/MathUtils");
/**
 * A utility class to help the @reference[CanvasRenderer] render @reference[UIElement]s
 */
class UIElementRenderer {
    constructor(ctx) {
        this.resourceManager = ResourceManager_1.default.getInstance();
        this.ctx = ctx;
    }
    /**
     * Sets the scene of this UIElementRenderer
     * @param scene The current scene
     */
    setScene(scene) {
        this.scene = scene;
    }
    /**
     * Renders a label
     * @param label The label to render
     */
    renderLabel(label) {
        // // If the size is unassigned (by the user or automatically) assign it
        // label.handleInitialSizing(this.ctx);
        // // Grab the global alpha so we can adjust it for this render
        // let previousAlpha = this.ctx.globalAlpha;
        // // Get the font and text position in label
        // this.ctx.font = label.getFontString();
        // let offset = label.calculateTextOffset(this.ctx);
        // // Stroke and fill a rounded rect and give it text
        // this.ctx.globalAlpha = label.backgroundColor.a;
        // this.ctx.fillStyle = label.calculateBackgroundColor().toStringRGBA();
        // this.ctx.fillRoundedRect(-label.size.x/2, -label.size.y/2,
        // 	label.size.x, label.size.y, label.borderRadius);
        // this.ctx.strokeStyle = label.calculateBorderColor().toStringRGBA();
        // this.ctx.globalAlpha = label.borderColor.a;
        // this.ctx.lineWidth = label.borderWidth;
        // this.ctx.strokeRoundedRect(-label.size.x/2, -label.size.y/2,
        // 	label.size.x, label.size.y, label.borderRadius);
        // this.ctx.fillStyle = label.calculateTextColor();
        // this.ctx.globalAlpha = label.textColor.a;
        // this.ctx.fillText(label.text, offset.x - label.size.x/2, offset.y - label.size.y/2);
        // this.ctx.globalAlpha = previousAlpha;
        // If the size is unassigned (by the user or automatically) assign it
        let lines = label.text.split('\n');
        let tempText = label.text;
        if (lines.length > 1) {
            let max = 0;
            let maxLengthIndex = 0;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].length > max) {
                    max = lines[i].length;
                    maxLengthIndex = i;
                }
            }
            label.text = lines[maxLengthIndex];
        }
        label.handleInitialSizing(this.ctx);
        // Grab the global alpha so we can adjust it for this render
        let previousAlpha = this.ctx.globalAlpha;
        // Get the font and text position in label
        this.ctx.font = label.getFontString();
        let offset = label.calculateTextOffset(this.ctx);
        // Stroke and fill a rounded rect and give it text
        this.ctx.globalAlpha = label.backgroundColor.a;
        this.ctx.fillStyle = label.calculateBackgroundColor().toStringRGBA();
        this.ctx.fillRoundedRect(-label.size.x / 2, -label.size.y / 2, label.size.x, label.size.y, label.borderRadius);
        this.ctx.strokeStyle = label.calculateBorderColor().toStringRGBA();
        this.ctx.globalAlpha = label.borderColor.a;
        this.ctx.lineWidth = label.borderWidth;
        this.ctx.strokeRoundedRect(-label.size.x / 2, -label.size.y / 2, label.size.x, label.size.y + ((lines.length - 1) * label.fontSize), label.borderRadius);
        this.ctx.fillStyle = label.calculateTextColor();
        this.ctx.globalAlpha = label.textColor.a;
        if (lines.length === 1) {
            this.ctx.fillText(label.text, offset.x - label.size.x / 2, (offset.y - label.size.y / 2));
        }
        else {
            for (let i = 0; i < lines.length; i++) {
                let additionalY = i * (label.size.y / 2 + (label.fontSize === 40 ? 20 : 10));
                label.text = lines[i];
                offset = label.calculateTextOffset(this.ctx);
                this.ctx.fillText(lines[i], (offset.x - label.size.x / 2), (offset.y - label.size.y / 2 + additionalY));
            }
        }
        this.ctx.globalAlpha = previousAlpha;
        label.text = tempText;
    }
    /**
     * Renders a button
     * @param button The button to render
     */
    renderButton(button) {
        this.renderLabel(button);
    }
    /**
     * Renders a slider
     * @param slider The slider to render
     */
    renderSlider(slider) {
        // Grab the global alpha so we can adjust it for this render
        let previousAlpha = this.ctx.globalAlpha;
        this.ctx.globalAlpha = slider.getLayer().getAlpha();
        // Calcualate the slider size
        let sliderSize = new Vec2_1.default(slider.size.x, 2);
        // Draw the slider
        this.ctx.fillStyle = slider.sliderColor.toString();
        this.ctx.fillRoundedRect(-sliderSize.x / 2, -sliderSize.y / 2, sliderSize.x, sliderSize.y, slider.borderRadius);
        // Calculate the nib size and position
        let x = MathUtils_1.default.lerp(-slider.size.x / 2, slider.size.x / 2, slider.getValue());
        // Draw the nib
        this.ctx.fillStyle = slider.nibColor.toString();
        this.ctx.fillRoundedRect(x - slider.nibSize.x / 2, -slider.nibSize.y / 2, slider.nibSize.x, slider.nibSize.y, slider.borderRadius);
        // Reset the alpha
        this.ctx.globalAlpha = previousAlpha;
    }
    /**
     * Renders a textInput
     * @param textInput The textInput to render
     */
    renderTextInput(textInput) {
        // Show a cursor sometimes
        if (textInput.focused && textInput.cursorCounter % 60 > 30) {
            textInput.text += "|";
        }
        this.renderLabel(textInput);
        if (textInput.focused) {
            if (textInput.cursorCounter % 60 > 30) {
                textInput.text = textInput.text.substring(0, textInput.text.length - 1);
            }
            textInput.cursorCounter += 1;
            if (textInput.cursorCounter >= 60) {
                textInput.cursorCounter = 0;
            }
        }
    }
}
exports.default = UIElementRenderer;

},{"../../DataTypes/Vec2":24,"../../ResourceManager/ResourceManager":83,"../../Utils/MathUtils":102}],75:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ResourceManager_1 = require("../ResourceManager/ResourceManager");
/**
 * An abstract framework to put all rendering in once place in the application
 */
class RenderingManager {
    constructor() {
        this.resourceManager = ResourceManager_1.default.getInstance();
    }
    /**
     * Sets the scene currently being rendered
     * @param scene The current Scene
     */
    setScene(scene) {
        this.scene = scene;
    }
}
exports.default = RenderingManager;

},{"../ResourceManager/ResourceManager":83}],76:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("../DataTypes/Vec2");
const Graphic_1 = require("../Nodes/Graphic");
const Point_1 = require("../Nodes/Graphics/Point");
const Rect_1 = require("../Nodes/Graphics/Rect");
const AnimatedSprite_1 = require("../Nodes/Sprites/AnimatedSprite");
const Sprite_1 = require("../Nodes/Sprites/Sprite");
const UIElement_1 = require("../Nodes/UIElement");
const Label_1 = require("../Nodes/UIElements/Label");
const ShaderRegistry_1 = require("../Registry/Registries/ShaderRegistry");
const RegistryManager_1 = require("../Registry/RegistryManager");
const ResourceManager_1 = require("../ResourceManager/ResourceManager");
const ParallaxLayer_1 = require("../Scene/Layers/ParallaxLayer");
const RenderingManager_1 = require("./RenderingManager");
class WebGLRenderer extends RenderingManager_1.default {
    initializeCanvas(canvas, width, height) {
        canvas.width = width;
        canvas.height = height;
        this.worldSize = Vec2_1.default.ZERO;
        this.worldSize.x = width;
        this.worldSize.y = height;
        // Get the WebGL context
        this.gl = canvas.getContext("webgl");
        this.gl.viewport(0, 0, canvas.width, canvas.height);
        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.enable(this.gl.CULL_FACE);
        // Tell the resource manager we're using WebGL
        ResourceManager_1.default.getInstance().useWebGL(true, this.gl);
        // Show the text canvas and get its context
        let textCanvas = document.getElementById("text-canvas");
        textCanvas.hidden = false;
        this.textCtx = textCanvas.getContext("2d");
        // Size the text canvas to be the same as the game canvas
        textCanvas.height = height;
        textCanvas.width = width;
        return this.gl;
    }
    render(visibleSet, tilemaps, uiLayers) {
        for (let node of visibleSet) {
            this.renderNode(node);
        }
        uiLayers.forEach(key => {
            if (!uiLayers.get(key).isHidden())
                uiLayers.get(key).getItems().forEach(node => this.renderNode(node));
        });
    }
    clear(color) {
        this.gl.clearColor(color.r, color.g, color.b, color.a);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.textCtx.clearRect(0, 0, this.worldSize.x, this.worldSize.y);
    }
    renderNode(node) {
        // Calculate the origin of the viewport according to this sprite
        this.origin = this.scene.getViewTranslation(node);
        // Get the zoom level of the scene
        this.zoom = this.scene.getViewScale();
        if (node.hasCustomShader) {
            // If the node has a custom shader, render using that
            this.renderCustom(node);
        }
        else if (node instanceof Graphic_1.default) {
            this.renderGraphic(node);
        }
        else if (node instanceof Sprite_1.default) {
            if (node instanceof AnimatedSprite_1.default) {
                this.renderAnimatedSprite(node);
            }
            else {
                this.renderSprite(node);
            }
        }
        else if (node instanceof UIElement_1.default) {
            this.renderUIElement(node);
        }
    }
    renderSprite(sprite) {
        let shader = RegistryManager_1.default.shaders.get(ShaderRegistry_1.default.SPRITE_SHADER);
        let options = this.addOptions(shader.getOptions(sprite), sprite);
        shader.render(this.gl, options);
    }
    renderAnimatedSprite(sprite) {
        let shader = RegistryManager_1.default.shaders.get(ShaderRegistry_1.default.SPRITE_SHADER);
        let options = this.addOptions(shader.getOptions(sprite), sprite);
        shader.render(this.gl, options);
    }
    renderGraphic(graphic) {
        if (graphic instanceof Point_1.default) {
            let shader = RegistryManager_1.default.shaders.get(ShaderRegistry_1.default.POINT_SHADER);
            let options = this.addOptions(shader.getOptions(graphic), graphic);
            shader.render(this.gl, options);
        }
        else if (graphic instanceof Rect_1.default) {
            let shader = RegistryManager_1.default.shaders.get(ShaderRegistry_1.default.RECT_SHADER);
            let options = this.addOptions(shader.getOptions(graphic), graphic);
            shader.render(this.gl, options);
        }
    }
    renderTilemap(tilemap) {
        throw new Error("Method not implemented.");
    }
    renderUIElement(uiElement) {
        if (uiElement instanceof Label_1.default) {
            let shader = RegistryManager_1.default.shaders.get(ShaderRegistry_1.default.LABEL_SHADER);
            let options = this.addOptions(shader.getOptions(uiElement), uiElement);
            shader.render(this.gl, options);
            this.textCtx.setTransform(1, 0, 0, 1, (uiElement.position.x - this.origin.x) * this.zoom, (uiElement.position.y - this.origin.y) * this.zoom);
            this.textCtx.rotate(-uiElement.rotation);
            let globalAlpha = this.textCtx.globalAlpha;
            this.textCtx.globalAlpha = uiElement.alpha;
            // Render text
            this.textCtx.font = uiElement.getFontString();
            let offset = uiElement.calculateTextOffset(this.textCtx);
            this.textCtx.fillStyle = uiElement.calculateTextColor();
            this.textCtx.globalAlpha = uiElement.textColor.a;
            this.textCtx.fillText(uiElement.text, offset.x - uiElement.size.x / 2, offset.y - uiElement.size.y / 2);
            this.textCtx.globalAlpha = globalAlpha;
            this.textCtx.setTransform(1, 0, 0, 1, 0, 0);
        }
    }
    renderCustom(node) {
        let shader = RegistryManager_1.default.shaders.get(node.customShaderKey);
        let options = this.addOptions(shader.getOptions(node), node);
        shader.render(this.gl, options);
    }
    addOptions(options, node) {
        // Give the shader access to the world size
        options.worldSize = this.worldSize;
        // Adjust the origin position to the parallax
        let layer = node.getLayer();
        let parallax = new Vec2_1.default(1, 1);
        if (layer instanceof ParallaxLayer_1.default) {
            parallax = layer.parallax;
        }
        options.origin = this.origin.clone().mult(parallax);
        return options;
    }
}
exports.default = WebGLRenderer;

},{"../DataTypes/Vec2":24,"../Nodes/Graphic":41,"../Nodes/Graphics/Point":45,"../Nodes/Graphics/Rect":46,"../Nodes/Sprites/AnimatedSprite":47,"../Nodes/Sprites/Sprite":48,"../Nodes/UIElement":51,"../Nodes/UIElements/Label":53,"../Registry/Registries/ShaderRegistry":64,"../Registry/RegistryManager":65,"../ResourceManager/ResourceManager":83,"../Scene/Layers/ParallaxLayer":88,"./RenderingManager":75}],77:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ResourceManager_1 = require("../../ResourceManager/ResourceManager");
/**
 * A wrapper class for WebGL shaders.
 * This class is a singleton, and there is only one for each shader type.
 * All objects that use this shader type will refer to and modify this same type.
 */
class ShaderType {
    constructor(programKey) {
        this.programKey = programKey;
        this.resourceManager = ResourceManager_1.default.getInstance();
    }
    /**
     * Extracts the options from the CanvasNode and gives them to the render function
     * @param node The node to get options from
     * @returns An object containing the options that should be passed to the render function
     */
    getOptions(node) { return {}; }
}
exports.default = ShaderType;

},{"../../ResourceManager/ResourceManager":83}],78:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Mat4x4_1 = require("../../../DataTypes/Mat4x4");
const Vec2_1 = require("../../../DataTypes/Vec2");
const ResourceManager_1 = require("../../../ResourceManager/ResourceManager");
const QuadShaderType_1 = require("./QuadShaderType");
/** */
class LabelShaderType extends QuadShaderType_1.default {
    constructor(programKey) {
        super(programKey);
        this.resourceManager = ResourceManager_1.default.getInstance();
    }
    initBufferObject() {
        this.bufferObjectKey = "label";
        this.resourceManager.createBuffer(this.bufferObjectKey);
    }
    render(gl, options) {
        const backgroundColor = options.backgroundColor.toWebGL();
        const borderColor = options.borderColor.toWebGL();
        const program = this.resourceManager.getShaderProgram(this.programKey);
        const buffer = this.resourceManager.getBuffer(this.bufferObjectKey);
        gl.useProgram(program);
        const vertexData = this.getVertices(options.size.x, options.size.y);
        const FSIZE = vertexData.BYTES_PER_ELEMENT;
        // Bind the buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
        // Attributes
        const a_Position = gl.getAttribLocation(program, "a_Position");
        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 2 * FSIZE, 0 * FSIZE);
        gl.enableVertexAttribArray(a_Position);
        // Uniforms
        const u_BackgroundColor = gl.getUniformLocation(program, "u_BackgroundColor");
        gl.uniform4fv(u_BackgroundColor, backgroundColor);
        const u_BorderColor = gl.getUniformLocation(program, "u_BorderColor");
        gl.uniform4fv(u_BorderColor, borderColor);
        const u_MaxSize = gl.getUniformLocation(program, "u_MaxSize");
        gl.uniform2f(u_MaxSize, -vertexData[0], vertexData[1]);
        // Get transformation matrix
        // We want a square for our rendering space, so get the maximum dimension of our quad
        let maxDimension = Math.max(options.size.x, options.size.y);
        const u_BorderWidth = gl.getUniformLocation(program, "u_BorderWidth");
        gl.uniform1f(u_BorderWidth, options.borderWidth / maxDimension);
        const u_BorderRadius = gl.getUniformLocation(program, "u_BorderRadius");
        gl.uniform1f(u_BorderRadius, options.borderRadius / maxDimension);
        // The size of the rendering space will be a square with this maximum dimension
        let size = new Vec2_1.default(maxDimension, maxDimension).scale(2 / options.worldSize.x, 2 / options.worldSize.y);
        // Center our translations around (0, 0)
        const translateX = (options.position.x - options.origin.x - options.worldSize.x / 2) / maxDimension;
        const translateY = -(options.position.y - options.origin.y - options.worldSize.y / 2) / maxDimension;
        // Create our transformation matrix
        this.translation.translate(new Float32Array([translateX, translateY]));
        this.scale.scale(size);
        this.rotation.rotate(options.rotation);
        let transformation = Mat4x4_1.default.MULT(this.translation, this.scale, this.rotation);
        // Pass the translation matrix to our shader
        const u_Transform = gl.getUniformLocation(program, "u_Transform");
        gl.uniformMatrix4fv(u_Transform, false, transformation.toArray());
        // Draw the quad
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    /**
     * The rendering space always has to be a square, so make sure its square w.r.t to the largest dimension
     * @param w The width of the quad in pixels
     * @param h The height of the quad in pixels
     * @returns An array of the vertices of the quad
     */
    getVertices(w, h) {
        let x, y;
        if (h > w) {
            y = 0.5;
            x = w / (2 * h);
        }
        else {
            x = 0.5;
            y = h / (2 * w);
        }
        return new Float32Array([
            -x, y,
            -x, -y,
            x, y,
            x, -y
        ]);
    }
    getOptions(rect) {
        let options = {
            position: rect.position,
            backgroundColor: rect.calculateBackgroundColor(),
            borderColor: rect.calculateBorderColor(),
            borderWidth: rect.borderWidth,
            borderRadius: rect.borderRadius,
            size: rect.size,
            rotation: rect.rotation
        };
        return options;
    }
}
exports.default = LabelShaderType;

},{"../../../DataTypes/Mat4x4":11,"../../../DataTypes/Vec2":24,"../../../ResourceManager/ResourceManager":83,"./QuadShaderType":80}],79:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RenderingUtils_1 = require("../../../Utils/RenderingUtils");
const ShaderType_1 = require("../ShaderType");
class PointShaderType extends ShaderType_1.default {
    constructor(programKey) {
        super(programKey);
    }
    initBufferObject() {
        this.bufferObjectKey = "point";
        this.resourceManager.createBuffer(this.bufferObjectKey);
    }
    render(gl, options) {
        let position = RenderingUtils_1.default.toWebGLCoords(options.position, options.origin, options.worldSize);
        let color = RenderingUtils_1.default.toWebGLColor(options.color);
        const program = this.resourceManager.getShaderProgram(this.programKey);
        const buffer = this.resourceManager.getBuffer(this.bufferObjectKey);
        gl.useProgram(program);
        const vertexData = position;
        const FSIZE = vertexData.BYTES_PER_ELEMENT;
        // Bind the buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
        // Attributes
        const a_Position = gl.getAttribLocation(program, "a_Position");
        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 2 * FSIZE, 0 * FSIZE);
        gl.enableVertexAttribArray(a_Position);
        // Uniforms
        const u_Color = gl.getUniformLocation(program, "u_Color");
        gl.uniform4fv(u_Color, color);
        const u_PointSize = gl.getUniformLocation(program, "u_PointSize");
        gl.uniform1f(u_PointSize, options.pointSize);
        gl.drawArrays(gl.POINTS, 0, 1);
    }
    getOptions(point) {
        let options = {
            position: point.position,
            color: point.color,
            pointSize: point.size,
        };
        return options;
    }
}
exports.default = PointShaderType;

},{"../../../Utils/RenderingUtils":103,"../ShaderType":77}],80:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Mat4x4_1 = require("../../../DataTypes/Mat4x4");
const ShaderType_1 = require("../ShaderType");
/** Represents any WebGL objects that have a quad mesh (i.e. a rectangular game object composed of only two triangles) */
class QuadShaderType extends ShaderType_1.default {
    constructor(programKey) {
        super(programKey);
        this.scale = Mat4x4_1.default.IDENTITY;
        this.rotation = Mat4x4_1.default.IDENTITY;
        this.translation = Mat4x4_1.default.IDENTITY;
    }
}
exports.default = QuadShaderType;

},{"../../../DataTypes/Mat4x4":11,"../ShaderType":77}],81:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Mat4x4_1 = require("../../../DataTypes/Mat4x4");
const Vec2_1 = require("../../../DataTypes/Vec2");
const ResourceManager_1 = require("../../../ResourceManager/ResourceManager");
const QuadShaderType_1 = require("./QuadShaderType");
/** */
class RectShaderType extends QuadShaderType_1.default {
    constructor(programKey) {
        super(programKey);
        this.resourceManager = ResourceManager_1.default.getInstance();
    }
    initBufferObject() {
        this.bufferObjectKey = "rect";
        this.resourceManager.createBuffer(this.bufferObjectKey);
    }
    render(gl, options) {
        const color = options.color.toWebGL();
        const program = this.resourceManager.getShaderProgram(this.programKey);
        const buffer = this.resourceManager.getBuffer(this.bufferObjectKey);
        gl.useProgram(program);
        const vertexData = this.getVertices(options.size.x, options.size.y);
        const FSIZE = vertexData.BYTES_PER_ELEMENT;
        // Bind the buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
        // Attributes
        const a_Position = gl.getAttribLocation(program, "a_Position");
        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 2 * FSIZE, 0 * FSIZE);
        gl.enableVertexAttribArray(a_Position);
        // Uniforms
        const u_Color = gl.getUniformLocation(program, "u_Color");
        gl.uniform4fv(u_Color, color);
        // Get transformation matrix
        // We want a square for our rendering space, so get the maximum dimension of our quad
        let maxDimension = Math.max(options.size.x, options.size.y);
        // The size of the rendering space will be a square with this maximum dimension
        let size = new Vec2_1.default(maxDimension, maxDimension).scale(2 / options.worldSize.x, 2 / options.worldSize.y);
        // Center our translations around (0, 0)
        const translateX = (options.position.x - options.origin.x - options.worldSize.x / 2) / maxDimension;
        const translateY = -(options.position.y - options.origin.y - options.worldSize.y / 2) / maxDimension;
        // Create our transformation matrix
        this.translation.translate(new Float32Array([translateX, translateY]));
        this.scale.scale(size);
        this.rotation.rotate(options.rotation);
        let transformation = Mat4x4_1.default.MULT(this.translation, this.scale, this.rotation);
        // Pass the translation matrix to our shader
        const u_Transform = gl.getUniformLocation(program, "u_Transform");
        gl.uniformMatrix4fv(u_Transform, false, transformation.toArray());
        // Draw the quad
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    /*
        So as it turns out, WebGL has an issue with non-square quads.
        It doesn't like when you don't have a 1-1 scale, and rotations are entirely messed up if this is not the case.
        To solve this, I used the scale of the LARGEST dimension of the quad to make a square, then adjusted the vertex coordinates inside of that.
        A diagram of the solution follows.

        There is a bounding square for the quad with dimensions hxh (in this case, since height is the largest dimension).
        The offset in the vertical direction is therefore 0.5, as it is normally.
        However, the offset in the horizontal direction is not so straightforward, but isn't conceptually hard.
        All we really have to do is a range change from [0, height/2] to [0, 0.5], where our value is t = width/2, and 0 <= t <= height/2.

        So now we have our rect, in a space scaled with respect to the largest dimension.
        Rotations work as you would expect, even for long rectangles.

                    0.5
            __ __ __ __ __ __ __
            |	|88888888888|	|
            |	|88888888888|	|
            |	|88888888888|	|
        -0.5|_ _|88888888888|_ _|0.5
            |	|88888888888|	|
            |	|88888888888|	|
            |	|88888888888|	|
            |___|88888888888|___|
                    -0.5

        The getVertices function below does as described, and converts the range
    */
    /**
     * The rendering space always has to be a square, so make sure its square w.r.t to the largest dimension
     * @param w The width of the quad in pixels
     * @param h The height of the quad in pixels
     * @returns An array of the vertices of the quad
     */
    getVertices(w, h) {
        let x, y;
        if (h > w) {
            y = 0.5;
            x = w / (2 * h);
        }
        else {
            x = 0.5;
            y = h / (2 * w);
        }
        return new Float32Array([
            -x, y,
            -x, -y,
            x, y,
            x, -y
        ]);
    }
    getOptions(rect) {
        let options = {
            position: rect.position,
            color: rect.color,
            size: rect.size,
            rotation: rect.rotation
        };
        return options;
    }
}
exports.default = RectShaderType;

},{"../../../DataTypes/Mat4x4":11,"../../../DataTypes/Vec2":24,"../../../ResourceManager/ResourceManager":83,"./QuadShaderType":80}],82:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Mat4x4_1 = require("../../../DataTypes/Mat4x4");
const Vec2_1 = require("../../../DataTypes/Vec2");
const AnimatedSprite_1 = require("../../../Nodes/Sprites/AnimatedSprite");
const ResourceManager_1 = require("../../../ResourceManager/ResourceManager");
const QuadShaderType_1 = require("./QuadShaderType");
/** A shader for sprites and animated sprites */
class SpriteShaderType extends QuadShaderType_1.default {
    constructor(programKey) {
        super(programKey);
        this.resourceManager = ResourceManager_1.default.getInstance();
    }
    initBufferObject() {
        this.bufferObjectKey = "sprite";
        this.resourceManager.createBuffer(this.bufferObjectKey);
    }
    render(gl, options) {
        const program = this.resourceManager.getShaderProgram(this.programKey);
        const buffer = this.resourceManager.getBuffer(this.bufferObjectKey);
        const texture = this.resourceManager.getTexture(options.imageKey);
        gl.useProgram(program);
        const vertexData = this.getVertices(options.size.x, options.size.y, options.scale);
        const FSIZE = vertexData.BYTES_PER_ELEMENT;
        // Bind the buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
        // Attributes
        const a_Position = gl.getAttribLocation(program, "a_Position");
        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 4 * FSIZE, 0 * FSIZE);
        gl.enableVertexAttribArray(a_Position);
        const a_TexCoord = gl.getAttribLocation(program, "a_TexCoord");
        gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 4 * FSIZE, 2 * FSIZE);
        gl.enableVertexAttribArray(a_TexCoord);
        // Uniforms
        // Get transformation matrix
        // We want a square for our rendering space, so get the maximum dimension of our quad
        let maxDimension = Math.max(options.size.x, options.size.y);
        // The size of the rendering space will be a square with this maximum dimension
        let size = new Vec2_1.default(maxDimension, maxDimension).scale(2 / options.worldSize.x, 2 / options.worldSize.y);
        // Center our translations around (0, 0)
        const translateX = (options.position.x - options.origin.x - options.worldSize.x / 2) / maxDimension;
        const translateY = -(options.position.y - options.origin.y - options.worldSize.y / 2) / maxDimension;
        // Create our transformation matrix
        this.translation.translate(new Float32Array([translateX, translateY]));
        this.scale.scale(size);
        this.rotation.rotate(options.rotation);
        let transformation = Mat4x4_1.default.MULT(this.translation, this.scale, this.rotation);
        // Pass the translation matrix to our shader
        const u_Transform = gl.getUniformLocation(program, "u_Transform");
        gl.uniformMatrix4fv(u_Transform, false, transformation.toArray());
        // Set up our sampler with our assigned texture unit
        const u_Sampler = gl.getUniformLocation(program, "u_Sampler");
        gl.uniform1i(u_Sampler, texture);
        // Pass in texShift
        const u_texShift = gl.getUniformLocation(program, "u_texShift");
        gl.uniform2fv(u_texShift, options.texShift);
        // Pass in texScale
        const u_texScale = gl.getUniformLocation(program, "u_texScale");
        gl.uniform2fv(u_texScale, options.texScale);
        // Draw the quad
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    /**
     * The rendering space always has to be a square, so make sure its square w.r.t to the largest dimension
     * @param w The width of the quad in pixels
     * @param h The height of the quad in pixels
     * @returns An array of the vertices of the quad
     */
    getVertices(w, h, scale) {
        let x, y;
        if (h > w) {
            y = 0.5;
            x = w / (2 * h);
        }
        else {
            x = 0.5;
            y = h / (2 * w);
        }
        // Scale the rendering space if needed
        x *= scale[0];
        y *= scale[1];
        return new Float32Array([
            -x, y, 0.0, 0.0,
            -x, -y, 0.0, 1.0,
            x, y, 1.0, 0.0,
            x, -y, 1.0, 1.0
        ]);
    }
    getOptions(sprite) {
        let texShift;
        let texScale;
        if (sprite instanceof AnimatedSprite_1.default) {
            let animationIndex = sprite.animation.getIndexAndAdvanceAnimation();
            let offset = sprite.getAnimationOffset(animationIndex);
            texShift = new Float32Array([offset.x / (sprite.cols * sprite.size.x), offset.y / (sprite.rows * sprite.size.y)]);
            texScale = new Float32Array([1 / (sprite.cols), 1 / (sprite.rows)]);
        }
        else {
            texShift = new Float32Array([0, 0]);
            texScale = new Float32Array([1, 1]);
        }
        let options = {
            position: sprite.position,
            rotation: sprite.rotation,
            size: sprite.size,
            scale: sprite.scale.toArray(),
            imageKey: sprite.imageId,
            texShift,
            texScale
        };
        return options;
    }
}
exports.default = SpriteShaderType;

},{"../../../DataTypes/Mat4x4":11,"../../../DataTypes/Vec2":24,"../../../Nodes/Sprites/AnimatedSprite":47,"../../../ResourceManager/ResourceManager":83,"./QuadShaderType":80}],83:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Map_1 = require("../DataTypes/Map");
const Queue_1 = require("../DataTypes/Queue");
const StringUtils_1 = require("../Utils/StringUtils");
const AudioManager_1 = require("../Sound/AudioManager");
const WebGLProgramType_1 = require("../DataTypes/Rendering/WebGLProgramType");
/**
 * The resource manager for the game engine.
 * The resource manager interfaces with the loadable assets of a game such as images, data files,
 * and sounds, which are all found in the dist folder.
 * This class controls loading and updates the @reference[Scene] with the loading progress, so that the scene does
 * not start before all necessary assets are loaded.
 */
class ResourceManager {
    constructor() {
        this.loading = false;
        this.justLoaded = false;
        this.loadonly_imagesLoaded = 0;
        this.loadonly_imagesToLoad = 0;
        this.loadonly_imageLoadingQueue = new Queue_1.default();
        this.images = new Map_1.default();
        this.loadonly_spritesheetsLoaded = 0;
        this.loadonly_spritesheetsToLoad = 0;
        this.loadonly_spritesheetLoadingQueue = new Queue_1.default();
        this.spritesheets = new Map_1.default();
        this.loadonly_tilemapsLoaded = 0;
        this.loadonly_tilemapsToLoad = 0;
        this.loadonly_tilemapLoadingQueue = new Queue_1.default();
        this.tilemaps = new Map_1.default();
        this.loadonly_audioLoaded = 0;
        this.loadonly_audioToLoad = 0;
        this.loadonly_audioLoadingQueue = new Queue_1.default();
        this.audioBuffers = new Map_1.default();
        this.loadonly_jsonLoaded = 0;
        this.loadonly_jsonToLoad = 0;
        this.loadonly_jsonLoadingQueue = new Queue_1.default();
        this.jsonObjects = new Map_1.default();
        this.loadonly_gl_ShaderProgramsLoaded = 0;
        this.loadonly_gl_ShaderProgramsToLoad = 0;
        this.loadonly_gl_ShaderLoadingQueue = new Queue_1.default();
        this.gl_ShaderPrograms = new Map_1.default();
        this.gl_Textures = new Map_1.default();
        this.gl_NextTextureID = 0;
        this.gl_Buffers = new Map_1.default();
        this.resourcesToUnload = new Array();
        this.resourcesToKeep = new Array();
        this.loadonly_tilemapObjectToLoad = 0;
        this.loadonly_tilemapObjectToLoad = 0;
        this.loadonly_tilemapObjectLoadingQueue = new Queue_1.default();
    }
    ;
    /* ######################################## SINGLETON ########################################*/
    /**
     * Returns the current instance of this class or a new instance if none exist
     * @returns The resource manager
     */
    static getInstance() {
        if (!this.instance) {
            this.instance = new ResourceManager();
        }
        return this.instance;
    }
    /* ######################################## PUBLIC FUNCTION ########################################*/
    /**
     * Activates or deactivates the use of WebGL
     * @param flag True if WebGL should be used, false otherwise
     * @param gl The instance of the graphics context, if applicable
     */
    useWebGL(flag, gl) {
        this.gl_WebGLActive = flag;
        if (this.gl_WebGLActive) {
            this.gl = gl;
        }
    }
    /**
     * Loads an image from file
     * @param key The key to associate the loaded image with
     * @param path The path to the image to load
     */
    image(key, path) {
        this.loadonly_imageLoadingQueue.enqueue({ key: key, path: path });
    }
    /**
     * Tells the resource manager to keep this resource
     * @param key The key of the resource
     */
    keepImage(key) {
        this.keepResource(key, ResourceType.IMAGE);
    }
    /**
     * Retrieves a loaded image
     * @param key The key of the loaded image
     * @returns The image element associated with this key
     */
    getImage(key) {
        let image = this.images.get(key);
        // if (image === undefined) {
        //     throw `There is no image associated with key "${key}"`
        // }
        return image;
    }
    /**
     * Loads a spritesheet from file
     * @param key The key to associate the loaded spritesheet with
     * @param path The path to the spritesheet to load
     */
    spritesheet(key, path) {
        this.loadonly_spritesheetLoadingQueue.enqueue({ key: key, path: path });
    }
    /**
     * Tells the resource manager to keep this resource
     * @param key The key of the resource
     */
    keepSpritesheet(key) {
        this.keepResource(key, ResourceType.SPRITESHEET);
    }
    /**
     * Retrieves a loaded spritesheet
     * @param key The key of the spritesheet to load
     * @returns The loaded Spritesheet
     */
    getSpritesheet(key) {
        return this.spritesheets.get(key);
    }
    /**
     * Loads an audio file
     * @param key The key to associate with the loaded audio file
     * @param path The path to the audio file to load
     */
    audio(key, path) {
        this.loadonly_audioLoadingQueue.enqueue({ key: key, path: path });
    }
    /**
     * Tells the resource manager to keep this resource
     * @param key The key of the resource
     */
    keepAudio(key) {
        this.keepResource(key, ResourceType.AUDIO);
    }
    /**
     * Retrieves a loaded audio file
     * @param key The key of the audio file to load
     * @returns The AudioBuffer created from the loaded audio fle
     */
    getAudio(key) {
        return this.audioBuffers.get(key);
    }
    /**
     * Load a tilemap from a json file. Automatically loads related images
     * @param key The key to associate with the loaded tilemap
     * @param path The path to the tilemap to load
     */
    tilemap(key, path) {
        this.loadonly_tilemapLoadingQueue.enqueue({ key: key, path: path });
    }
    /**
     * Tells the resource manager to keep this resource
     * @param key The key of the resource
     */
    keepTilemap(key) {
        this.keepResource(key, ResourceType.TILEMAP);
    }
    /**
     * Retreives a loaded tilemap
     * @param key The key of the loaded tilemap
     * @returns The tilemap data associated with the key
     */
    getTilemap(key) {
        return this.tilemaps.get(key);
    }
    /**
     * Loads an object from a json file.
     * @param key The key to associate with the loaded object
     * @param path The path to the json file to load
     */
    object(key, path) {
        this.loadonly_jsonLoadingQueue.enqueue({ key: key, path: path });
    }
    /**
     * Tells the resource manager to keep this resource
     * @param key The key of the resource
     */
    keepObject(key) {
        this.keepResource(key, ResourceType.JSON);
    }
    /**
     * Retreives a loaded object
     * @param key The key of the loaded object
     * @returns The object data associated with the key
     */
    getObject(key) {
        return this.jsonObjects.get(key);
    }
    /* ######################################## LOAD FUNCTION ########################################*/
    /**
     * Loads all resources currently in the queue
     * @param callback The function to cal when the resources are finished loading
     */
    loadResourcesFromQueue(callback) {
        this.loadonly_typesToLoad = 5;
        this.loading = true;
        // Load everything in the queues. Tilemaps have to come before images because they will add new images to the queue
        this.loadTilemapObjectFromQueue(() => {
            console.log("Loaded TilemapObjects");
            this.loadTilemapsFromQueue(() => {
                console.log("Loaded Tilemaps");
                this.loadSpritesheetsFromQueue(() => {
                    console.log("Loaded Spritesheets");
                    this.loadImagesFromQueue(() => {
                        console.log("Loaded Images");
                        this.loadAudioFromQueue(() => {
                            console.log("Loaded Audio");
                            this.loadObjectsFromQueue(() => {
                                console.log("Loaded Objects");
                                if (this.gl_WebGLActive) {
                                    this.gl_LoadShadersFromQueue(() => {
                                        console.log("Loaded Shaders");
                                        this.finishLoading(callback);
                                    });
                                }
                                else {
                                    this.finishLoading(callback);
                                }
                            });
                        });
                    });
                });
            });
        });
    }
    finishLoading(callback) {
        // Done loading
        this.loading = false;
        this.justLoaded = true;
        callback();
    }
    /* ######################################## UNLOAD FUNCTION ########################################*/
    keepResource(key, type) {
        console.log("Keep resource...");
        for (let i = 0; i < this.resourcesToUnload.length; i++) {
            let resource = this.resourcesToUnload[i];
            if (resource.key === key && resource.resourceType === type) {
                console.log("Found resource " + key + " of type " + type + ". Keeping.");
                let resourceToMove = this.resourcesToUnload.splice(i, 1);
                this.resourcesToKeep.push(...resourceToMove);
                return;
            }
        }
    }
    /**
     * Deletes references to all resources in the resource manager
     */
    unloadAllResources() {
        this.loading = false;
        this.justLoaded = false;
        for (let resource of this.resourcesToUnload) {
            // Unload the resource
            this.unloadResource(resource);
        }
    }
    unloadResource(resource) {
        // Delete the resource itself
        switch (resource.resourceType) {
            case ResourceType.IMAGE:
                this.images.delete(resource.key);
                if (this.gl_WebGLActive) {
                    this.gl_Textures.delete(resource.key);
                }
                break;
            case ResourceType.TILEMAP:
                this.tilemaps.delete(resource.key);
                break;
            case ResourceType.SPRITESHEET:
                this.spritesheets.delete(resource.key);
                break;
            case ResourceType.AUDIO:
                this.audioBuffers.delete(resource.key);
                break;
            case ResourceType.JSON:
                this.jsonObjects.delete(resource.key);
                break;
            /*case ResourceType.SHADER:
                this.gl_ShaderPrograms.get(resource.key).delete(this.gl);
                this.gl_ShaderPrograms.delete(resource.key);
                break;*/
        }
        // Delete any dependencies
        for (let dependency of resource.dependencies) {
            this.unloadResource(dependency);
        }
    }
    /* ######################################## WORK FUNCTIONS ########################################*/
    /**
     * Loads all tilemaps currently in the tilemap loading queue
     * @param onFinishLoading The function to call when loading is complete
     */
    loadTilemapsFromQueue(onFinishLoading) {
        this.loadonly_tilemapsToLoad = this.loadonly_tilemapLoadingQueue.getSize();
        this.loadonly_tilemapsLoaded = 0;
        // If no items to load, we're finished
        if (this.loadonly_tilemapsToLoad === 0) {
            onFinishLoading();
            return;
        }
        while (this.loadonly_tilemapLoadingQueue.hasItems()) {
            let tilemap = this.loadonly_tilemapLoadingQueue.dequeue();
            this.loadTilemap(tilemap.key, tilemap.path, onFinishLoading);
        }
    }
    /**
     * Loads a singular tilemap
     * @param key The key of the tilemap
     * @param pathToTilemapJSON The path to the tilemap JSON file
     * @param callbackIfLast The function to call if this is the last tilemap to load
     */
    loadTilemap(key, pathToTilemapJSON, callbackIfLast) {
        this.loadTextFile(pathToTilemapJSON, (fileText) => {
            let tilemapObject = JSON.parse(fileText);
            // We can parse the object later - it's much faster than loading
            this.tilemaps.add(key, tilemapObject);
            let resource = new ResourceReference(key, ResourceType.TILEMAP);
            // Grab the tileset images we need to load and add them to the imageloading queue
            for (let tileset of tilemapObject.tilesets) {
                if (tileset.image) {
                    let key = tileset.image;
                    let path = StringUtils_1.default.getPathFromFilePath(pathToTilemapJSON) + key;
                    this.loadonly_imageLoadingQueue.enqueue({ key: key, path: path, isDependency: true });
                    // Add this image as a dependency to the tilemap
                    resource.addDependency(new ResourceReference(key, ResourceType.IMAGE));
                }
                else if (tileset.tiles) {
                    for (let tile of tileset.tiles) {
                        let key = tile.image;
                        let path = StringUtils_1.default.getPathFromFilePath(pathToTilemapJSON) + key;
                        this.loadonly_imageLoadingQueue.enqueue({ key: key, path: path, isDependency: true });
                        // Add this image as a dependency to the tilemap
                        resource.addDependency(new ResourceReference(key, ResourceType.IMAGE));
                    }
                }
            }
            // Add the resource reference to the list of resource to unload
            this.resourcesToUnload.push(resource);
            // Finish loading
            this.finishLoadingTilemap(callbackIfLast);
        });
    }
    /**
     * Finish loading a tilemap. Calls the callback function if this is the last tilemap being loaded
     * @param callback The function to call if this is the last tilemap to load
     */
    finishLoadingTilemap(callback) {
        this.loadonly_tilemapsLoaded += 1;
        if (this.loadonly_tilemapsLoaded === this.loadonly_tilemapsToLoad) {
            // We're done loading tilemaps
            callback();
        }
    }
    /**
     * Loads all spritesheets currently in the spritesheet loading queue
     * @param onFinishLoading The function to call when the spritesheets are done loading
     */
    loadSpritesheetsFromQueue(onFinishLoading) {
        this.loadonly_spritesheetsToLoad = this.loadonly_spritesheetLoadingQueue.getSize();
        this.loadonly_spritesheetsLoaded = 0;
        // If no items to load, we're finished
        if (this.loadonly_spritesheetsToLoad === 0) {
            onFinishLoading();
            return;
        }
        while (this.loadonly_spritesheetLoadingQueue.hasItems()) {
            let spritesheet = this.loadonly_spritesheetLoadingQueue.dequeue();
            this.loadSpritesheet(spritesheet.key, spritesheet.path, onFinishLoading);
        }
    }
    /**
     * Loads a singular spritesheet
     * @param key The key of the spritesheet to load
     * @param pathToSpritesheetJSON The path to the spritesheet JSON file
     * @param callbackIfLast The function to call if this is the last spritesheet
     */
    loadSpritesheet(key, pathToSpritesheetJSON, callbackIfLast) {
        this.loadTextFile(pathToSpritesheetJSON, (fileText) => {
            let spritesheet = JSON.parse(fileText);
            // We can parse the object later - it's much faster than loading
            this.spritesheets.add(key, spritesheet);
            let resource = new ResourceReference(key, ResourceType.SPRITESHEET);
            // Grab the image we need to load and add it to the imageloading queue
            let path = StringUtils_1.default.getPathFromFilePath(pathToSpritesheetJSON) + spritesheet.spriteSheetImage;
            this.loadonly_imageLoadingQueue.enqueue({ key: spritesheet.name, path: path, isDependency: true });
            resource.addDependency(new ResourceReference(spritesheet.name, ResourceType.IMAGE));
            this.resourcesToUnload.push(resource);
            // Finish loading
            this.finishLoadingSpritesheet(callbackIfLast);
        });
    }
    /**
     * Finish loading a spritesheet. Calls the callback function if this is the last spritesheet being loaded
     * @param callback The function to call if this is the last spritesheet to load
     */
    finishLoadingSpritesheet(callback) {
        this.loadonly_spritesheetsLoaded += 1;
        if (this.loadonly_spritesheetsLoaded === this.loadonly_spritesheetsToLoad) {
            // We're done loading spritesheets
            callback();
        }
    }
    /**
     * Loads all images currently in the image loading queue
     * @param onFinishLoading The function to call when there are no more images to load
     */
    loadImagesFromQueue(onFinishLoading) {
        this.loadonly_imagesToLoad = this.loadonly_imageLoadingQueue.getSize();
        this.loadonly_imagesLoaded = 0;
        // If no items to load, we're finished
        if (this.loadonly_imagesToLoad === 0) {
            onFinishLoading();
            return;
        }
        while (this.loadonly_imageLoadingQueue.hasItems()) {
            let image = this.loadonly_imageLoadingQueue.dequeue();
            this.loadImage(image.key, image.path, image.isDependency, onFinishLoading);
        }
    }
    /**
     * Loads a singular image
     * @param key The key of the image to load
     * @param path The path to the image to load
     * @param callbackIfLast The function to call if this is the last image
     */
    loadImage(key, path, isDependency, callbackIfLast) {
        var image = new Image();
        image.onload = () => {
            // Add to loaded images
            this.images.add(key, image);
            // If not a dependency, push it to the unload list. Otherwise it's managed by something else
            if (!isDependency) {
                this.resourcesToUnload.push(new ResourceReference(key, ResourceType.IMAGE));
            }
            // If WebGL is active, create a texture
            if (this.gl_WebGLActive) {
                this.createWebGLTexture(key, image);
            }
            // Finish image load
            this.finishLoadingImage(callbackIfLast);
        };
        image.src = path;
    }
    /**
     * Finish loading an image. If this is the last image, it calls the callback function
     * @param callback The function to call if this is the last image
     */
    finishLoadingImage(callback) {
        this.loadonly_imagesLoaded += 1;
        if (this.loadonly_imagesLoaded === this.loadonly_imagesToLoad) {
            // We're done loading images
            callback();
        }
    }
    /**
     * Loads all audio currently in the tilemap loading queue
     * @param onFinishLoading The function to call when tilemaps are done loading
     */
    loadAudioFromQueue(onFinishLoading) {
        this.loadonly_audioToLoad = this.loadonly_audioLoadingQueue.getSize();
        this.loadonly_audioLoaded = 0;
        // If no items to load, we're finished
        if (this.loadonly_audioToLoad === 0) {
            onFinishLoading();
            return;
        }
        while (this.loadonly_audioLoadingQueue.hasItems()) {
            let audio = this.loadonly_audioLoadingQueue.dequeue();
            this.loadAudio(audio.key, audio.path, onFinishLoading);
        }
    }
    /**
     * Load a singular audio file
     * @param key The key to the audio file to load
     * @param path The path to the audio file to load
     * @param callbackIfLast The function to call if this is the last audio file to load
     */
    loadAudio(key, path, callbackIfLast) {
        let audioCtx = AudioManager_1.default.getInstance().getAudioContext();
        let request = new XMLHttpRequest();
        request.open('GET', path, true);
        request.responseType = 'arraybuffer';
        request.onload = () => {
            audioCtx.decodeAudioData(request.response, (buffer) => {
                // Add to list of audio buffers
                this.audioBuffers.add(key, buffer);
                this.resourcesToUnload.push(new ResourceReference(key, ResourceType.AUDIO));
                // Finish loading sound
                this.finishLoadingAudio(callbackIfLast);
            }, (error) => {
                throw "Error loading sound";
            });
        };
        request.send();
    }
    /**
     * Finish loading an audio file. Calls the callback functon if this is the last audio sample being loaded.
     * @param callback The function to call if this is the last audio file to load
     */
    finishLoadingAudio(callback) {
        this.loadonly_audioLoaded += 1;
        if (this.loadonly_audioLoaded === this.loadonly_audioToLoad) {
            // We're done loading audio
            callback();
        }
    }
    /**
     * Loads all objects currently in the object loading queue
     * @param onFinishLoading The function to call when there are no more objects to load
     */
    loadObjectsFromQueue(onFinishLoading) {
        this.loadonly_jsonToLoad = this.loadonly_jsonLoadingQueue.getSize();
        this.loadonly_jsonLoaded = 0;
        // If no items to load, we're finished
        if (this.loadonly_jsonToLoad === 0) {
            onFinishLoading();
            return;
        }
        while (this.loadonly_jsonLoadingQueue.hasItems()) {
            let obj = this.loadonly_jsonLoadingQueue.dequeue();
            this.loadObject(obj.key, obj.path, onFinishLoading);
        }
    }
    /**
     * Loads a singular object
     * @param key The key of the object to load
     * @param path The path to the object to load
     * @param callbackIfLast The function to call if this is the last object
     */
    loadObject(key, path, callbackIfLast) {
        this.loadTextFile(path, (fileText) => {
            let obj = JSON.parse(fileText);
            this.jsonObjects.add(key, obj);
            this.resourcesToUnload.push(new ResourceReference(key, ResourceType.JSON));
            this.finishLoadingObject(callbackIfLast);
        });
    }
    /**
     * Finish loading an object. If this is the last object, it calls the callback function
     * @param callback The function to call if this is the last object
     */
    finishLoadingObject(callback) {
        this.loadonly_jsonLoaded += 1;
        if (this.loadonly_jsonLoaded === this.loadonly_jsonToLoad) {
            // We're done loading objects
            callback();
        }
    }
    /* ########## WEBGL SPECIFIC FUNCTIONS ########## */
    getTexture(key) {
        return this.gl_Textures.get(key);
    }
    getShaderProgram(key) {
        return this.gl_ShaderPrograms.get(key).program;
    }
    getBuffer(key) {
        return this.gl_Buffers.get(key);
    }
    createWebGLTexture(imageKey, image) {
        // Get the texture ID
        const textureID = this.getTextureID(this.gl_NextTextureID);
        // Create the texture
        const texture = this.gl.createTexture();
        // Set up the texture
        // Enable texture0
        this.gl.activeTexture(textureID);
        // Bind our texture to texture 0
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        // Set the texture parameters
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        // Set the texture image
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
        // Add the texture to our map with the same key as the image
        this.gl_Textures.add(imageKey, this.gl_NextTextureID);
        // Increment the key
        this.gl_NextTextureID += 1;
    }
    getTextureID(id) {
        // Start with 9 cases - this can be expanded if needed, but for the best performance,
        // Textures should be stitched into an atlas
        switch (id) {
            case 0: return this.gl.TEXTURE0;
            case 1: return this.gl.TEXTURE1;
            case 2: return this.gl.TEXTURE2;
            case 3: return this.gl.TEXTURE3;
            case 4: return this.gl.TEXTURE4;
            case 5: return this.gl.TEXTURE5;
            case 6: return this.gl.TEXTURE6;
            case 7: return this.gl.TEXTURE7;
            case 8: return this.gl.TEXTURE8;
            default: return this.gl.TEXTURE9;
        }
    }
    createBuffer(key) {
        if (this.gl_WebGLActive) {
            let buffer = this.gl.createBuffer();
            this.gl_Buffers.add(key, buffer);
        }
    }
    /**
     * Enqueues loading of a new shader program
     * @param key The key of the shader program
     * @param vShaderFilepath
     * @param fShaderFilepath
     */
    shader(key, vShaderFilepath, fShaderFilepath) {
        let splitPath = vShaderFilepath.split(".");
        let end = splitPath[splitPath.length - 1];
        if (end !== "vshader") {
            throw `${vShaderFilepath} is not a valid vertex shader - must end in ".vshader`;
        }
        splitPath = fShaderFilepath.split(".");
        end = splitPath[splitPath.length - 1];
        if (end !== "fshader") {
            throw `${fShaderFilepath} is not a valid vertex shader - must end in ".fshader`;
        }
        let paths = new KeyPath_Shader();
        paths.key = key;
        paths.vpath = vShaderFilepath;
        paths.fpath = fShaderFilepath;
        this.loadonly_gl_ShaderLoadingQueue.enqueue(paths);
    }
    /**
     * Tells the resource manager to keep this resource
     * @param key The key of the resource
     */
    keepShader(key) {
        this.keepResource(key, ResourceType.IMAGE);
    }
    gl_LoadShadersFromQueue(onFinishLoading) {
        this.loadonly_gl_ShaderProgramsToLoad = this.loadonly_gl_ShaderLoadingQueue.getSize();
        this.loadonly_gl_ShaderProgramsLoaded = 0;
        // If webGL isn'active or there are no items to load, we're finished
        if (!this.gl_WebGLActive || this.loadonly_gl_ShaderProgramsToLoad === 0) {
            onFinishLoading();
            return;
        }
        while (this.loadonly_gl_ShaderLoadingQueue.hasItems()) {
            let shader = this.loadonly_gl_ShaderLoadingQueue.dequeue();
            this.gl_LoadShader(shader.key, shader.vpath, shader.fpath, onFinishLoading);
        }
    }
    gl_LoadShader(key, vpath, fpath, callbackIfLast) {
        this.loadTextFile(vpath, (vFileText) => {
            const vShader = vFileText;
            this.loadTextFile(fpath, (fFileText) => {
                const fShader = fFileText;
                // Extract the program and shaders
                const [shaderProgram, vertexShader, fragmentShader] = this.createShaderProgram(vShader, fShader);
                // Create a wrapper type
                const programWrapper = new WebGLProgramType_1.default();
                programWrapper.program = shaderProgram;
                programWrapper.vertexShader = vertexShader;
                programWrapper.fragmentShader = fragmentShader;
                // Add to our map
                this.gl_ShaderPrograms.add(key, programWrapper);
                this.resourcesToUnload.push(new ResourceReference(key, ResourceType.SHADER));
                // Finish loading
                this.gl_FinishLoadingShader(callbackIfLast);
            });
        });
    }
    gl_FinishLoadingShader(callback) {
        this.loadonly_gl_ShaderProgramsLoaded += 1;
        if (this.loadonly_gl_ShaderProgramsLoaded === this.loadonly_gl_ShaderProgramsToLoad) {
            // We're done loading shaders
            callback();
        }
    }
    createShaderProgram(vShaderSource, fShaderSource) {
        const vertexShader = this.loadVertexShader(vShaderSource);
        const fragmentShader = this.loadFragmentShader(fShaderSource);
        if (vertexShader === null || fragmentShader === null) {
            // We had a problem intializing - error
            return null;
        }
        // Create a shader program
        const program = this.gl.createProgram();
        if (!program) {
            // Error creating
            console.warn("Failed to create program");
            return null;
        }
        // Attach our vertex and fragment shader
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        // Link
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            // Error linking
            const error = this.gl.getProgramInfoLog(program);
            console.warn("Failed to link program: " + error);
            // Clean up
            this.gl.deleteProgram(program);
            this.gl.deleteShader(vertexShader);
            this.gl.deleteShader(fragmentShader);
            return null;
        }
        // We successfully create a program
        return [program, vertexShader, fragmentShader];
    }
    loadVertexShader(shaderSource) {
        // Create a new vertex shader
        return this.loadShader(this.gl.VERTEX_SHADER, shaderSource);
    }
    loadFragmentShader(shaderSource) {
        // Create a new fragment shader
        return this.loadShader(this.gl.FRAGMENT_SHADER, shaderSource);
    }
    loadShader(type, shaderSource) {
        const shader = this.gl.createShader(type);
        // If we couldn't create the shader, error
        if (shader === null) {
            console.warn("Unable to create shader");
            return null;
        }
        // Add the source to the shader and compile
        this.gl.shaderSource(shader, shaderSource);
        this.gl.compileShader(shader);
        // Make sure there were no errors during this process
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            // Not compiled - error
            const error = this.gl.getShaderInfoLog(shader);
            console.warn("Failed to compile shader: " + error);
            // Clean up
            this.gl.deleteShader(shader);
            return null;
        }
        // Sucess, so return the shader
        return shader;
    }
    /* ########## GENERAL LOADING FUNCTIONS ########## */
    loadTextFile(textFilePath, callback) {
        let xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', textFilePath, true);
        xobj.onreadystatechange = function () {
            if ((xobj.readyState == 4) && (xobj.status == 200)) {
                callback(xobj.responseText);
            }
        };
        xobj.send(null);
    }
    /* ########## LOADING BAR INFO ########## */
    getLoadPercent() {
        return (this.loadonly_tilemapsLoaded / this.loadonly_tilemapsToLoad
            + this.loadonly_spritesheetsLoaded / this.loadonly_spritesheetsToLoad
            + this.loadonly_imagesLoaded / this.loadonly_imagesToLoad
            + this.loadonly_audioLoaded / this.loadonly_audioToLoad)
            / this.loadonly_typesToLoad;
    }
    // Customized funtions below
    // These funtions are NOT well tested!!!
    // Only used for shattered sword specific purpose!!!
    // Use them carefully!!!
    tilemapFromObject(key, tilemap) {
        this.loadonly_tilemapObjectLoadingQueue.enqueue({ key: key, map: tilemap });
    }
    loadTilemapObjectFromQueue(onFinishLoading) {
        this.loadonly_tilemapObjectToLoad = this.loadonly_tilemapObjectLoadingQueue.getSize();
        this.loadonly_tilemapObjectLoaded = 0;
        // If no items to load, we're finished
        if (this.loadonly_tilemapObjectToLoad === 0) {
            onFinishLoading();
            return;
        }
        while (this.loadonly_tilemapObjectLoadingQueue.hasItems()) {
            let map = this.loadonly_tilemapObjectLoadingQueue.dequeue();
            this.loadTilemapFromObject(map.key, map.map, onFinishLoading);
        }
    }
    loadTilemapFromObject(key, tiledMap, callbackIfLast) {
        // We can parse the object later - it's much faster than loading
        this.tilemaps.add(key, tiledMap);
        let resource = new ResourceReference(key, ResourceType.TILEMAP);
        // Grab the tileset images we need to load and add them to the imageloading queue
        for (let tileset of tiledMap.tilesets) {
            if (tileset.image) {
                let key = tileset.image;
                let path = key;
                this.loadonly_imageLoadingQueue.enqueue({ key: key, path: path, isDependency: true });
                // Add this image as a dependency to the tilemap
                resource.addDependency(new ResourceReference(key, ResourceType.IMAGE));
            }
        }
        // Add the resource reference to the list of resource to unload
        this.resourcesToUnload.push(resource);
        this.finishLoadingTilemapObject(callbackIfLast);
    }
    finishLoadingTilemapObject(callback) {
        this.loadonly_tilemapObjectLoaded += 1;
        if (this.loadonly_tilemapObjectLoaded === this.loadonly_tilemapObjectToLoad) {
            // We're done loading tilemaps
            callback();
        }
    }
    singleImage(key, path, callbackIfLast) {
        var image = new Image();
        image.onload = () => {
            // Add to loaded images
            this.images.add(key, image);
            this.resourcesToUnload.push(new ResourceReference(key, ResourceType.IMAGE));
            // If WebGL is active, create a texture
            if (this.gl_WebGLActive) {
                this.createWebGLTexture(key, image);
            }
            // Finish image load
            this.finishLoadingSingleObject(callbackIfLast);
        };
        image.src = path;
    }
    singleAudio(key, path, callbackIfLast) {
        let audioCtx = AudioManager_1.default.getInstance().getAudioContext();
        let request = new XMLHttpRequest();
        request.open('GET', path, true);
        request.responseType = 'arraybuffer';
        request.onload = () => {
            audioCtx.decodeAudioData(request.response, (buffer) => {
                // Add to list of audio buffers
                this.audioBuffers.add(key, buffer);
                this.resourcesToUnload.push(new ResourceReference(key, ResourceType.AUDIO));
                // Finish loading sound
                this.finishLoadingSingleObject(callbackIfLast);
            }, (error) => {
                throw "Error loading sound";
            });
        };
        request.send();
    }
    finishLoadingSingleObject(callback) {
        callback();
    }
    update(deltaT) {
        if (this.loading) {
            if (this.onLoadProgress) {
                this.onLoadProgress(this.getLoadPercent());
            }
        }
        else if (this.justLoaded) {
            this.justLoaded = false;
            if (this.onLoadComplete) {
                this.onLoadComplete();
            }
        }
    }
}
exports.default = ResourceManager;
/**
 * A class representing a reference to a resource.
 * This is used for the exemption list to assure assets and their dependencies don't get
 * destroyed if they are still needed.
 */
class ResourceReference {
    constructor(key, resourceType) {
        this.key = key;
        this.resourceType = resourceType;
        this.dependencies = new Array();
    }
    addDependency(resource) {
        this.dependencies.push(resource);
    }
}
var ResourceType;
(function (ResourceType) {
    ResourceType["IMAGE"] = "IMAGE";
    ResourceType["TILEMAP"] = "TILEMAP";
    ResourceType["SPRITESHEET"] = "SPRITESHEET";
    ResourceType["AUDIO"] = "AUDIO";
    ResourceType["JSON"] = "JSON";
    ResourceType["SHADER"] = "SHADER";
})(ResourceType || (ResourceType = {}));
/**
 * A pair representing a key and the path of the resource to load
 */
class KeyPathPair {
    constructor() {
        this.isDependency = false;
    }
}
class KeyMapPair {
}
class KeyPath_Shader {
}

},{"../DataTypes/Map":10,"../DataTypes/Queue":14,"../DataTypes/Rendering/WebGLProgramType":15,"../Sound/AudioManager":96,"../Utils/StringUtils":104}],84:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Sprite_1 = require("../../Nodes/Sprites/Sprite");
const AnimatedSprite_1 = require("../../Nodes/Sprites/AnimatedSprite");
const GraphicTypes_1 = require("../../Nodes/Graphics/GraphicTypes");
const UIElementTypes_1 = require("../../Nodes/UIElements/UIElementTypes");
const Point_1 = require("../../Nodes/Graphics/Point");
const Vec2_1 = require("../../DataTypes/Vec2");
const Button_1 = require("../../Nodes/UIElements/Button");
const Label_1 = require("../../Nodes/UIElements/Label");
const Slider_1 = require("../../Nodes/UIElements/Slider");
const TextInput_1 = require("../../Nodes/UIElements/TextInput");
const Rect_1 = require("../../Nodes/Graphics/Rect");
const ResourceManager_1 = require("../../ResourceManager/ResourceManager");
const Line_1 = require("../../Nodes/Graphics/Line");
const Particle_1 = require("../../Nodes/Graphics/Particle");
// @ignorePage
/**
 * A factory that abstracts adding @reference[CanvasNode]s to the @reference[Scene].
 * Access methods in this factory through Scene.add.[methodName]().
 */
class CanvasNodeFactory {
    constructor() {
        /**
         * Adds an instance of a UIElement to the current scene - i.e. any class that extends UIElement
         * @param type The type of UIElement to add
         * @param layerName The layer to add the UIElement to
         * @param options Any additional arguments to feed to the constructor
         * @returns A new UIElement
         */
        this.addUIElement = (type, layerName, options) => {
            // Get the layer
            let layer = this.scene.getLayer(layerName);
            let instance;
            switch (type) {
                case UIElementTypes_1.UIElementType.BUTTON:
                    instance = this.buildButton(options);
                    break;
                case UIElementTypes_1.UIElementType.LABEL:
                    instance = this.buildLabel(options);
                    break;
                case UIElementTypes_1.UIElementType.SLIDER:
                    instance = this.buildSlider(options);
                    break;
                case UIElementTypes_1.UIElementType.TEXT_INPUT:
                    instance = this.buildTextInput(options);
                    break;
                default:
                    throw `UIElementType '${type}' does not exist, or is registered incorrectly.`;
            }
            instance.setScene(this.scene);
            instance.id = this.scene.generateId();
            this.scene.getSceneGraph().addNode(instance);
            // Add instance to layer
            layer.addNode(instance);
            return instance;
        };
        /**
         * Adds a sprite to the current scene
         * @param key The key of the image the sprite will represent
         * @param layerName The layer on which to add the sprite
         * @returns A new Sprite
         */
        this.addSprite = (key, layerName) => {
            let layer = this.scene.getLayer(layerName);
            let instance = new Sprite_1.default(key);
            // Add instance to scene
            instance.setScene(this.scene);
            instance.id = this.scene.generateId();
            if (!(this.scene.isParallaxLayer(layerName) || this.scene.isUILayer(layerName))) {
                this.scene.getSceneGraph().addNode(instance);
            }
            // Add instance to layer
            layer.addNode(instance);
            return instance;
        };
        /**
         * Adds an AnimatedSprite to the current scene
         * @param key The key of the image the sprite will represent
         * @param layerName The layer on which to add the sprite
         * @returns A new AnimatedSprite
         */
        this.addAnimatedSprite = (key, layerName) => {
            let layer = this.scene.getLayer(layerName);
            let spritesheet = this.resourceManager.getSpritesheet(key);
            let instance = new AnimatedSprite_1.default(spritesheet);
            // Add instance fo scene
            instance.setScene(this.scene);
            instance.id = this.scene.generateId();
            if (!(this.scene.isParallaxLayer(layerName) || this.scene.isUILayer(layerName))) {
                this.scene.getSceneGraph().addNode(instance);
            }
            // Add instance to layer
            layer.addNode(instance);
            return instance;
        };
        /**
         * Adds a new graphic element to the current Scene
         * @param type The type of graphic to add
         * @param layerName The layer on which to add the graphic
         * @param options Any additional arguments to send to the graphic constructor
         * @returns A new Graphic
         */
        this.addGraphic = (type, layerName, options) => {
            // Get the layer
            let layer = this.scene.getLayer(layerName);
            let instance;
            switch (type) {
                case GraphicTypes_1.GraphicType.POINT:
                    instance = this.buildPoint(options);
                    break;
                case GraphicTypes_1.GraphicType.LINE:
                    instance = this.buildLine(options);
                    break;
                case GraphicTypes_1.GraphicType.RECT:
                    instance = this.buildRect(options);
                    break;
                case GraphicTypes_1.GraphicType.PARTICLE:
                    instance = this.buildParticle(options);
                    break;
                default:
                    throw `GraphicType '${type}' does not exist, or is registered incorrectly.`;
            }
            // Add instance to scene
            instance.setScene(this.scene);
            instance.id = this.scene.generateId();
            if (!(this.scene.isParallaxLayer(layerName) || this.scene.isUILayer(layerName))) {
                this.scene.getSceneGraph().addNode(instance);
            }
            // Add instance to layer
            layer.addNode(instance);
            return instance;
        };
    }
    init(scene) {
        this.scene = scene;
        this.resourceManager = ResourceManager_1.default.getInstance();
    }
    /* ---------- BUILDERS ---------- */
    buildButton(options) {
        this.checkIfPropExists("Button", options, "position", Vec2_1.default, "Vec2");
        this.checkIfPropExists("Button", options, "text", "string");
        return new Button_1.default(options.position, options.text);
    }
    buildLabel(options) {
        this.checkIfPropExists("Label", options, "position", Vec2_1.default, "Vec2");
        this.checkIfPropExists("Label", options, "text", "string");
        return new Label_1.default(options.position, options.text);
    }
    buildSlider(options) {
        this.checkIfPropExists("Slider", options, "position", Vec2_1.default, "Vec2");
        let initValue = 0;
        if (options.value !== undefined) {
            initValue = options.value;
        }
        return new Slider_1.default(options.position, initValue);
    }
    buildTextInput(options) {
        this.checkIfPropExists("TextInput", options, "position", Vec2_1.default, "Vec2");
        return new TextInput_1.default(options.position);
    }
    buildPoint(options) {
        this.checkIfPropExists("Point", options, "position", Vec2_1.default, "Vec2");
        return new Point_1.default(options.position);
    }
    buildParticle(options) {
        this.checkIfPropExists("Particle", options, "position", Vec2_1.default, "Vec2");
        this.checkIfPropExists("Particle", options, "size", Vec2_1.default, "Vec2");
        this.checkIfPropExists("Particle", options, "mass", "number", "number");
        //Changed for testing
        return new Particle_1.default(options.position, options.size, options.mass);
    }
    buildLine(options) {
        this.checkIfPropExists("Line", options, "start", Vec2_1.default, "Vec2");
        this.checkIfPropExists("Line", options, "end", Vec2_1.default, "Vec2");
        return new Line_1.default(options.start, options.end);
    }
    buildRect(options) {
        this.checkIfPropExists("Rect", options, "position", Vec2_1.default, "Vec2");
        this.checkIfPropExists("Rect", options, "size", Vec2_1.default, "Vec2");
        return new Rect_1.default(options.position, options.size);
    }
    /* ---------- ERROR HANDLING ---------- */
    checkIfPropExists(objectName, options, prop, type, typeName) {
        if (!options || options[prop] === undefined) {
            // Check that the options object has the property
            throw `${objectName} object requires argument ${prop} of type ${typeName}, but none was provided.`;
        }
        else {
            // Check that the property has the correct type
            if ((typeof type) === "string") {
                if (!(typeof options[prop] === type)) {
                    throw `${objectName} object requires argument ${prop} of type ${type}, but provided ${prop} was not of type ${type}.`;
                }
            }
            else if (type instanceof Function) {
                // If type is a constructor, check against that
                if (!(options[prop] instanceof type)) {
                    throw `${objectName} object requires argument ${prop} of type ${typeName}, but provided ${prop} was not of type ${typeName}.`;
                }
            }
            else {
                throw `${objectName} object requires argument ${prop} of type ${typeName}, but provided ${prop} was not of type ${typeName}.`;
            }
        }
    }
}
exports.default = CanvasNodeFactory;

},{"../../DataTypes/Vec2":24,"../../Nodes/Graphics/GraphicTypes":42,"../../Nodes/Graphics/Line":43,"../../Nodes/Graphics/Particle":44,"../../Nodes/Graphics/Point":45,"../../Nodes/Graphics/Rect":46,"../../Nodes/Sprites/AnimatedSprite":47,"../../Nodes/Sprites/Sprite":48,"../../Nodes/UIElements/Button":52,"../../Nodes/UIElements/Label":53,"../../Nodes/UIElements/Slider":54,"../../Nodes/UIElements/TextInput":55,"../../Nodes/UIElements/UIElementTypes":56,"../../ResourceManager/ResourceManager":83}],85:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CanvasNodeFactory_1 = require("./CanvasNodeFactory");
const TilemapFactory_1 = require("./TilemapFactory");
/**
 * The manager of all factories used for adding @reference[GameNode]s to the @reference[Scene].
 */
class FactoryManager {
    constructor(scene, tilemaps) {
        // Constructors are called here to allow assignment of their functions to functions in this class
        this.canvasNodeFactory = new CanvasNodeFactory_1.default();
        this.tilemapFactory = new TilemapFactory_1.default();
        this.canvasNodeFactory.init(scene);
        this.tilemapFactory.init(scene, tilemaps);
    }
    // Expose all of the factories through the factory manager
    /**
     * Adds an instance of a UIElement to the current scene - i.e. any class that extends UIElement
     * @param type The type of UIElement to add
     * @param layerName The layer to add the UIElement to
     * @param options Any additional arguments to feed to the constructor
     * @returns A new UIElement
     */
    uiElement(type, layerName, options) {
        return this.canvasNodeFactory.addUIElement(type, layerName, options);
    }
    /**
     * Adds a sprite to the current scene
     * @param key The key of the image the sprite will represent
     * @param layerName The layer on which to add the sprite
     * @returns A new Sprite
     */
    sprite(key, layerName) {
        return this.canvasNodeFactory.addSprite(key, layerName);
    }
    /**
     * Adds an AnimatedSprite to the current scene
     * @param key The key of the image the sprite will represent
     * @param layerName The layer on which to add the sprite
     * @returns A new AnimatedSprite
     */
    animatedSprite(key, layerName) {
        return this.canvasNodeFactory.addAnimatedSprite(key, layerName);
    }
    /**
     * Adds a new graphic element to the current Scene
     * @param type The type of graphic to add
     * @param layerName The layer on which to add the graphic
     * @param options Any additional arguments to send to the graphic constructor
     * @returns A new Graphic
     */
    graphic(type, layerName, options) {
        return this.canvasNodeFactory.addGraphic(type, layerName, options);
    }
    /**
     * Adds a tilemap to the scene
     * @param key The key of the loaded tilemap to load
     * @param constr The constructor of the desired tilemap
     * @param args Additional arguments to send to the tilemap constructor
     * @returns An array of Layers, each of which contains a layer of the tilemap as its own Tilemap instance.
     */
    tilemap(key, scale) {
        return this.tilemapFactory.add(key, scale);
    }
}
exports.default = FactoryManager;

},{"./CanvasNodeFactory":84,"./TilemapFactory":86}],86:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ResourceManager_1 = require("../../ResourceManager/ResourceManager");
const OrthogonalTilemap_1 = require("../../Nodes/Tilemaps/OrthogonalTilemap");
const Tileset_1 = require("../../DataTypes/Tilesets/Tileset");
const Vec2_1 = require("../../DataTypes/Vec2");
const PositionGraph_1 = require("../../DataTypes/Graphs/PositionGraph");
const Navmesh_1 = require("../../Pathfinding/Navmesh");
// @ignorePage
/**
 * A factory that abstracts adding @reference[Tilemap]s to the @reference[Scene].
 * Access methods in this factory through Scene.add.[methodName]().
 */
class TilemapFactory {
    constructor() {
        // TODO - This is specifically catered to Tiled tilemaps right now. In the future,
        // it would be good to have a "parseTilemap" function that would convert the tilemap
        // data into a standard format. This could allow for support from other programs
        // or the development of an internal level builder tool
        /**
         * Adds a tilemap to the scene
         * @param key The key of the loaded tilemap to load
         * @param constr The constructor of the desired tilemap
         * @param args Additional arguments to send to the tilemap constructor
         * @returns An array of Layers, each of which contains a layer of the tilemap as its own Tilemap instance.
         */
        this.add = (key, scale = new Vec2_1.default(1, 1)) => {
            // Get Tilemap Data
            let tilemapData = this.resourceManager.getTilemap(key);
            // Set the constructor for this tilemap to either be orthographic or isometric
            let constr;
            if (tilemapData.orientation === "orthographic") {
                constr = OrthogonalTilemap_1.default;
            }
            else {
                // No isometric tilemap support right now, so Orthographic tilemap
                constr = OrthogonalTilemap_1.default;
            }
            // Initialize the return value array
            let sceneLayers = new Array();
            // Create all of the tilesets for this tilemap
            let tilesets = new Array();
            let collectionTiles = new Array();
            for (let tileset of tilemapData.tilesets) {
                if (tileset.image) {
                    // If this is a standard tileset and not a collection, create a tileset for it.
                    // TODO - We are ignoring collection tilesets for now. This is likely not a great idea in practice,
                    // as theoretically someone could want to use one for a standard tilemap. We are assuming for now
                    // that we only want to use them for object layers
                    tilesets.push(new Tileset_1.default(tileset));
                }
                else {
                    tileset.tiles.forEach(tile => tile.id += tileset.firstgid);
                    collectionTiles.push(...tileset.tiles);
                }
            }
            // Loop over the layers of the tilemap and create tiledlayers or object layers
            for (let layer of tilemapData.layers) {
                let sceneLayer;
                let isParallaxLayer = false;
                let depth = 0;
                if (layer.properties) {
                    for (let prop of layer.properties) {
                        if (prop.name === "Parallax") {
                            isParallaxLayer = prop.value;
                        }
                        else if (prop.name === "Depth") {
                            depth = prop.value;
                        }
                    }
                }
                if (isParallaxLayer) {
                    sceneLayer = this.scene.addParallaxLayer(layer.name, new Vec2_1.default(1, 1), depth);
                }
                else {
                    sceneLayer = this.scene.addLayer(layer.name, depth);
                }
                if (layer.type === "tilelayer") {
                    // Create a new tilemap object for the layer
                    let tilemap = new constr(tilemapData, layer, tilesets, scale);
                    tilemap.id = this.scene.generateId();
                    tilemap.setScene(this.scene);
                    // Add tilemap to scene
                    this.tilemaps.push(tilemap);
                    sceneLayer.addNode(tilemap);
                    // Register tilemap with physics if it's collidable
                    if (tilemap.isCollidable) {
                        tilemap.addPhysics();
                        if (layer.properties) {
                            for (let item of layer.properties) {
                                if (item.name === "Group") {
                                    tilemap.setGroup(item.value);
                                }
                            }
                        }
                    }
                }
                else {
                    let isNavmeshPoints = false;
                    let navmeshName;
                    let edges;
                    if (layer.properties) {
                        for (let prop of layer.properties) {
                            if (prop.name === "NavmeshPoints") {
                                isNavmeshPoints = true;
                            }
                            else if (prop.name === "name") {
                                navmeshName = prop.value;
                            }
                            else if (prop.name === "edges") {
                                edges = prop.value;
                            }
                        }
                    }
                    if (isNavmeshPoints) {
                        let g = new PositionGraph_1.default();
                        for (let obj of layer.objects) {
                            g.addPositionedNode(new Vec2_1.default(obj.x, obj.y));
                        }
                        for (let edge of edges) {
                            g.addEdge(edge.from, edge.to);
                        }
                        this.scene.getNavigationManager().addNavigableEntity(navmeshName, new Navmesh_1.default(g));
                        continue;
                    }
                    // Layer is an object layer, so add each object as a sprite to a new layer
                    for (let obj of layer.objects) {
                        // Check if obj is collidable
                        let hasPhysics = false;
                        let isCollidable = false;
                        let isTrigger = false;
                        let onEnter = null;
                        let onExit = null;
                        let triggerGroup = null;
                        let group = "";
                        if (obj.properties) {
                            for (let prop of obj.properties) {
                                if (prop.name === "HasPhysics") {
                                    hasPhysics = prop.value;
                                }
                                else if (prop.name === "Collidable") {
                                    isCollidable = prop.value;
                                }
                                else if (prop.name === "Group") {
                                    group = prop.value;
                                }
                                else if (prop.name === "IsTrigger") {
                                    isTrigger = prop.value;
                                }
                                else if (prop.name === "TriggerGroup") {
                                    triggerGroup = prop.value;
                                }
                                else if (prop.name === "TriggerOnEnter") {
                                    onEnter = prop.value;
                                }
                                else if (prop.name === "TriggerOnExit") {
                                    onExit = prop.value;
                                }
                            }
                        }
                        let sprite;
                        // Check if obj is a tile from a tileset
                        for (let tileset of tilesets) {
                            if (tileset.hasTile(obj.gid)) {
                                // The object is a tile from this set
                                let imageKey = tileset.getImageKey();
                                let offset = tileset.getImageOffsetForTile(obj.gid);
                                sprite = this.scene.add.sprite(imageKey, layer.name);
                                let size = tileset.getTileSize().clone();
                                sprite.position.set((obj.x + size.x / 2) * scale.x, (obj.y - size.y / 2) * scale.y);
                                sprite.setImageOffset(offset);
                                sprite.size.copy(size);
                                sprite.scale.set(scale.x, scale.y);
                            }
                        }
                        // Not in a tileset, must correspond to a collection
                        if (!sprite) {
                            for (let tile of collectionTiles) {
                                if (obj.gid === tile.id) {
                                    let imageKey = tile.image;
                                    sprite = this.scene.add.sprite(imageKey, layer.name);
                                    sprite.position.set((obj.x + tile.imagewidth / 2) * scale.x, (obj.y - tile.imageheight / 2) * scale.y);
                                    sprite.scale.set(scale.x, scale.y);
                                }
                            }
                        }
                        // Now we have sprite. Associate it with our physics object if there is one
                        if (hasPhysics) {
                            // Make the sprite a static physics object
                            sprite.addPhysics(sprite.boundary.clone(), Vec2_1.default.ZERO, isCollidable, true);
                            sprite.setGroup(group);
                            if (isTrigger && triggerGroup !== null) {
                                sprite.setTrigger(triggerGroup, onEnter, onExit);
                            }
                        }
                    }
                }
                // Update the return value
                sceneLayers.push(sceneLayer);
            }
            return sceneLayers;
        };
    }
    init(scene, tilemaps) {
        this.scene = scene;
        this.tilemaps = tilemaps;
        this.resourceManager = ResourceManager_1.default.getInstance();
    }
}
exports.default = TilemapFactory;

},{"../../DataTypes/Graphs/PositionGraph":8,"../../DataTypes/Tilesets/Tileset":23,"../../DataTypes/Vec2":24,"../../Nodes/Tilemaps/OrthogonalTilemap":50,"../../Pathfinding/Navmesh":59,"../../ResourceManager/ResourceManager":83}],87:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MathUtils_1 = require("../Utils/MathUtils");
/**
 * A layer in the scene. Layers are used for sorting @reference[GameNode]s by depth.
 */
class Layer {
    /**
     * Creates a new layer. To do this in a game, use the addLayer() method in @refrence[Scene]
     * @param scene The scene to add the layer to
     * @param name The name of the layer
     */
    constructor(scene, name) {
        this.scene = scene;
        this.name = name;
        this.paused = false;
        this.hidden = false;
        this.alpha = 1;
        this.items = new Array();
        this.ySort = false;
        this.depth = 0;
    }
    /**
     * Retreives the name of the layer
     * @returns The name of the layer
     */
    getName() {
        return this.name;
    }
    /**
     * Pauses/Unpauses the layer. Affects all elements in this layer
     * @param pauseValue True if the layer should be paused, false if not
     */
    setPaused(pauseValue) {
        this.paused = pauseValue;
    }
    /**
     * Returns whether or not the layer is paused
     */
    isPaused() {
        return this.paused;
    }
    /**
     * Sets the opacity of the layer
     * @param alpha The new opacity value in the range [0, 1]
     */
    setAlpha(alpha) {
        this.alpha = MathUtils_1.default.clamp(alpha, 0, 1);
    }
    /**
     * Gets the opacity of the layer
     * @returns The opacity
     */
    getAlpha() {
        return this.alpha;
    }
    /**
     * Sets the layer's hidden value. If hidden, a layer will not be rendered, but will still update
     * @param hidden The hidden value of the layer
     */
    setHidden(hidden) {
        this.hidden = hidden;
    }
    /**
     * Returns the hideen value of the lyaer
     * @returns True if the scene is hidden, false otherwise
     */
    isHidden() {
        return this.hidden;
    }
    /** Pauses this scene and hides it */
    disable() {
        this.paused = true;
        this.hidden = true;
    }
    /** Unpauses this layer and makes it visible */
    enable() {
        this.paused = false;
        this.hidden = false;
    }
    /**
     * Sets whether or not the scene will ySort automatically.
     * ySorting means that CanvasNodes on this layer will have their depth sorted depending on their y-value.
     * This means that if an object is "higher" in the scene, it will sort behind objects that are "lower".
     * This is useful for 3/4 view games, or similar situations, where you sometimes want to be in front of objects,
     * and other times want to be behind the same objects.
     * @param ySort True if ySorting should be active, false if not
     */
    setYSort(ySort) {
        this.ySort = ySort;
    }
    /**
     * Gets the ySort status of the scene
     * @returns True if ySorting is occurring, false otherwise
     */
    getYSort() {
        return this.ySort;
    }
    /**
     * Sets the depth of the layer compared to other layers. A larger number means the layer will be closer to the screen.
     * @param depth The depth of the layer.
     */
    setDepth(depth) {
        this.depth = depth;
    }
    /**
     * Retrieves the depth of the layer.
     * @returns The depth
     */
    getDepth() {
        return this.depth;
    }
    /**
     * Adds a node to this layer
     * @param node The node to add to this layer.
     */
    addNode(node) {
        this.items.push(node);
        node.setLayer(this);
    }
    /**
     * Removes a node from this layer
     * @param node The node to remove
     * @returns true if the node was removed, false otherwise
     */
    removeNode(node) {
        // Find and remove the node
        let index = this.items.indexOf(node);
        if (index !== -1) {
            this.items.splice(index, 1);
            node.setLayer(undefined);
        }
    }
    /**
     * Retreives all GameNodes from this layer
     * @returns an Array that contains all of the GameNodes in this layer.
     */
    getItems() {
        return this.items;
    }
}
exports.default = Layer;

},{"../Utils/MathUtils":102}],88:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Layer_1 = require("../Layer");
/**
 * An extension of a Layer that has a parallax value.
 */
class ParallaxLayer extends Layer_1.default {
    /**
     * Creates a new ParallaxLayer.
     * Use addParallaxLayer() in @reference[Scene] to add a layer of this type to your game.
     * @param scene The Scene to add this ParallaxLayer to
     * @param name The name of the ParallaxLayer
     * @param parallax The parallax level
     */
    constructor(scene, name, parallax) {
        super(scene, name);
        this.parallax = parallax;
    }
}
exports.default = ParallaxLayer;

},{"../Layer":87}],89:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("../../DataTypes/Vec2");
const ParallaxLayer_1 = require("./ParallaxLayer");
/**
 * A Layer strictly to be used for managing UIElements.
 * This is intended to be a Layer that always stays in the same place,
 * and thus renders things like a HUD or an inventory without taking into consideration the \reference[Viewport] scroll.
 */
class UILayer extends ParallaxLayer_1.default {
    /**
     * Creates a new UILayer.
     * Use addUILayer() in @reference[Scene] to add a layer of this type to your game.
     * @param scene The Scene to add this UILayer to
     * @param name The name of the UILayer
     */
    constructor(scene, name) {
        super(scene, name, Vec2_1.default.ZERO);
    }
}
exports.default = UILayer;

},{"../../DataTypes/Vec2":24,"./ParallaxLayer":88}],90:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Layer_1 = require("./Layer");
const Vec2_1 = require("../DataTypes/Vec2");
const BasicPhysicsManager_1 = require("../Physics/BasicPhysicsManager");
const SceneGraphArray_1 = require("../SceneGraph/SceneGraphArray");
const FactoryManager_1 = require("./Factories/FactoryManager");
const ResourceManager_1 = require("../ResourceManager/ResourceManager");
const Receiver_1 = require("../Events/Receiver");
const Emitter_1 = require("../Events/Emitter");
const NavigationManager_1 = require("../Pathfinding/NavigationManager");
const AIManager_1 = require("../AI/AIManager");
const Map_1 = require("../DataTypes/Map");
const ParallaxLayer_1 = require("./Layers/ParallaxLayer");
const UILayer_1 = require("./Layers/UILayer");
const CanvasNode_1 = require("../Nodes/CanvasNode");
const SceneOptions_1 = require("./SceneOptions");
const Debug_1 = require("../Debug/Debug");
const TimerManager_1 = require("../Timing/TimerManager");
const TweenManager_1 = require("../Rendering/Animations/TweenManager");
const ParticleSystemManager_1 = require("../Rendering/Animations/ParticleSystemManager");
/**
 * Scenes are the main container in the game engine.
 * Your main scene is the current level or menu of the game, and will contain all of the GameNodes needed.
 * Scenes provide an easy way to load assets, add assets to the game world, and unload assets,
 * and have lifecycle methods exposed for these functions.
 */
class Scene {
    /**
     * Creates a new Scene. To add a new Scene in your game, use changeToScene() in @reference[SceneManager]
     * @param viewport The viewport of the game
     * @param sceneManager The SceneManager that owns this Scene
     * @param renderingManager The RenderingManager that will handle this Scene's rendering
     * @param game The instance of the Game
     * @param options The options for Scene initialization
     */
    constructor(viewport, sceneManager, renderingManager, options) {
        this.sceneOptions = SceneOptions_1.default.parse(options === undefined ? {} : options);
        this.worldSize = new Vec2_1.default(500, 500);
        this.viewport = viewport;
        this.viewport.setBounds(0, 0, 2560, 1280);
        this.running = false;
        this.sceneManager = sceneManager;
        this.receiver = new Receiver_1.default();
        this.emitter = new Emitter_1.default();
        this.tilemaps = new Array();
        this.sceneGraph = new SceneGraphArray_1.default(this.viewport, this);
        this.layers = new Map_1.default();
        this.uiLayers = new Map_1.default();
        this.parallaxLayers = new Map_1.default();
        this.physicsManager = new BasicPhysicsManager_1.default(this.sceneOptions.physics);
        this.navManager = new NavigationManager_1.default();
        this.aiManager = new AIManager_1.default();
        this.renderingManager = renderingManager;
        this.add = new FactoryManager_1.default(this, this.tilemaps);
        this.load = ResourceManager_1.default.getInstance();
        this.resourceManager = this.load;
        // Get the timer manager and clear any existing timers
        TimerManager_1.default.getInstance().clearTimers();
    }
    /** A lifecycle method that gets called immediately after a new scene is created, before anything else. */
    initScene(init) { }
    /** A lifecycle method that gets called when a new scene is created. Load all files you wish to access in the scene here. */
    loadScene() { }
    /** A lifecycle method called strictly after loadScene(). Create any game objects you wish to use in the scene here. */
    startScene() { }
    /**
     * A lifecycle method called every frame of the game. This is where you can dynamically do things like add in new enemies
     * @param delta The time this frame represents
     */
    updateScene(deltaT) { }
    /** A lifecycle method that gets called on scene destruction. Specify which files you no longer need for garbage collection. */
    unloadScene() { }
    update(deltaT) {
        this.updateScene(deltaT);
        // Do time updates
        TimerManager_1.default.getInstance().update(deltaT);
        // Do all AI updates
        this.aiManager.update(deltaT);
        // Update all physics objects
        this.physicsManager.update(deltaT);
        // Update all canvas objects
        this.sceneGraph.update(deltaT);
        // Update all tilemaps
        this.tilemaps.forEach(tilemap => {
            if (!tilemap.getLayer().isPaused()) {
                tilemap.update(deltaT);
            }
        });
        // Update all tweens
        TweenManager_1.default.getInstance().update(deltaT);
        // Update all particle systems
        ParticleSystemManager_1.default.getInstance().update(deltaT);
        // Update viewport
        this.viewport.update(deltaT);
    }
    /**
     * Collects renderable sets and coordinates with the RenderingManager to draw the Scene
     */
    render() {
        // Get the visible set of nodes
        let visibleSet = this.sceneGraph.getVisibleSet();
        // Add parallax layer items to the visible set (we're rendering them all for now)
        this.parallaxLayers.forEach(key => {
            let pLayer = this.parallaxLayers.get(key);
            for (let node of pLayer.getItems()) {
                if (node instanceof CanvasNode_1.default) {
                    visibleSet.push(node);
                }
            }
        });
        // Send the visible set, tilemaps, and uiLayers to the renderer
        this.renderingManager.render(visibleSet, this.tilemaps, this.uiLayers);
        let nodes = this.sceneGraph.getAllNodes();
        this.tilemaps.forEach(tilemap => tilemap.visible ? nodes.push(tilemap) : 0);
        Debug_1.default.setNodes(nodes);
    }
    /**
     * Sets the scene as running or not
     * @param running True if the Scene should be running, false if not
     */
    setRunning(running) {
        this.running = running;
    }
    /**
     * Returns whether or not the Scene is running
     * @returns True if the scene is running, false otherwise
     */
    isRunning() {
        return this.running;
    }
    /**
     * Removes a node from this Scene
     * @param node The node to remove
     */
    remove(node) {
        // Remove from the scene graph
        if (node instanceof CanvasNode_1.default) {
            this.sceneGraph.removeNode(node);
        }
    }
    /** Destroys this scene and all nodes in it */
    destroy() {
        for (let node of this.sceneGraph.getAllNodes()) {
            node.destroy();
        }
        for (let tilemap of this.tilemaps) {
            tilemap.destroy();
        }
        this.receiver.destroy();
        delete this.sceneGraph;
        delete this.physicsManager;
        delete this.navManager;
        delete this.aiManager;
        delete this.receiver;
    }
    /**
     * Adds a new layer to the scene and returns it
     * @param name The name of the new layer
     * @param depth The depth of the layer
     * @returns The newly created Layer
     */
    addLayer(name, depth) {
        if (this.layers.has(name) || this.parallaxLayers.has(name) || this.uiLayers.has(name)) {
            throw `Layer with name ${name} already exists`;
        }
        let layer = new Layer_1.default(this, name);
        this.layers.add(name, layer);
        if (depth) {
            layer.setDepth(depth);
        }
        return layer;
    }
    /**
     * Adds a new parallax layer to this scene and returns it
     * @param name The name of the parallax layer
     * @param parallax The parallax level
     * @param depth The depth of the layer
     * @returns The newly created ParallaxLayer
     */
    addParallaxLayer(name, parallax, depth) {
        if (this.layers.has(name) || this.parallaxLayers.has(name) || this.uiLayers.has(name)) {
            throw `Layer with name ${name} already exists`;
        }
        let layer = new ParallaxLayer_1.default(this, name, parallax);
        this.parallaxLayers.add(name, layer);
        if (depth) {
            layer.setDepth(depth);
        }
        return layer;
    }
    /**
     * Adds a new UILayer to the scene
     * @param name The name of the new UIlayer
     * @returns The newly created UILayer
     */
    addUILayer(name) {
        if (this.layers.has(name) || this.parallaxLayers.has(name) || this.uiLayers.has(name)) {
            throw `Layer with name ${name} already exists`;
        }
        let layer = new UILayer_1.default(this, name);
        this.uiLayers.add(name, layer);
        return layer;
    }
    /**
     * Gets a layer from the scene by name if it exists.
     * This can be a Layer or any of its subclasses
     * @param name The name of the layer
     * @returns The Layer found with that name
     */
    getLayer(name) {
        if (this.layers.has(name)) {
            return this.layers.get(name);
        }
        else if (this.parallaxLayers.has(name)) {
            return this.parallaxLayers.get(name);
        }
        else if (this.uiLayers.has(name)) {
            return this.uiLayers.get(name);
        }
        else {
            throw `Requested layer ${name} does not exist.`;
        }
    }
    /**
     * Returns true if this layer is a ParallaxLayer
     * @param name The name of the layer
     * @returns True if this layer is a ParallaxLayer
     */
    isParallaxLayer(name) {
        return this.parallaxLayers.has(name);
    }
    /**
     * Returns true if this layer is a UILayer
     * @param name The name of the layer
     * @returns True if this layer is ParallaxLayer
     */
    isUILayer(name) {
        return this.uiLayers.has(name);
    }
    /**
     * Returns the translation of this node with respect to camera space (due to the viewport moving).
     * This value is affected by the parallax level of the @reference[Layer] the node is on.
     * @param node The node to check the viewport with respect to
     * @returns A Vec2 containing the translation of viewport with respect to this node.
     */
    getViewTranslation(node) {
        let layer = node.getLayer();
        if (layer instanceof ParallaxLayer_1.default || layer instanceof UILayer_1.default) {
            return this.viewport.getOrigin().mult(layer.parallax);
        }
        else {
            return this.viewport.getOrigin();
        }
    }
    /**
     * Returns the scale level of the view
     * @returns The zoom level of the viewport
    */
    getViewScale() {
        return this.viewport.getZoomLevel();
    }
    /**
     * Returns the Viewport associated with this scene
     * @returns The current Viewport
     */
    getViewport() {
        return this.viewport;
    }
    /**
     * Gets the world size of this Scene
     * @returns The world size in a Vec2
     */
    getWorldSize() {
        return this.worldSize;
    }
    /**
     * Gets the SceneGraph associated with this Scene
     * @returns The SceneGraph
     */
    getSceneGraph() {
        return this.sceneGraph;
    }
    /**
     * Gets the PhysicsManager associated with this Scene
     * @returns The PhysicsManager
     */
    getPhysicsManager() {
        return this.physicsManager;
    }
    /**
     * Gets the NavigationManager associated with this Scene
     * @returns The NavigationManager
     */
    getNavigationManager() {
        return this.navManager;
    }
    /**
     * Gets the AIManager associated with this Scene
     * @returns The AIManager
     */
    getAIManager() {
        return this.aiManager;
    }
    /**
     * Generates an ID for a GameNode
     * @returns The new ID
     */
    generateId() {
        return this.sceneManager.generateId();
    }
    /**
     * Retrieves a Tilemap in this Scene
     * @param name The name of the Tilemap
     * @returns The Tilemap, if one this name exists, otherwise null
     */
    getTilemap(name) {
        for (let tilemap of this.tilemaps) {
            if (tilemap.name === name) {
                return tilemap;
            }
        }
        return null;
    }
}
exports.default = Scene;

},{"../AI/AIManager":3,"../DataTypes/Map":10,"../DataTypes/Vec2":24,"../Debug/Debug":25,"../Events/Emitter":27,"../Events/Receiver":31,"../Nodes/CanvasNode":39,"../Pathfinding/NavigationManager":57,"../Physics/BasicPhysicsManager":60,"../Rendering/Animations/ParticleSystemManager":68,"../Rendering/Animations/TweenManager":70,"../ResourceManager/ResourceManager":83,"../SceneGraph/SceneGraphArray":94,"../Timing/TimerManager":98,"./Factories/FactoryManager":85,"./Layer":87,"./Layers/ParallaxLayer":88,"./Layers/UILayer":89,"./SceneOptions":92}],91:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ResourceManager_1 = require("../ResourceManager/ResourceManager");
/**
 * The SceneManager acts as an interface to create Scenes, and handles the lifecycle methods of Scenes.
 * It gives Scenes access to information they need from the @reference[Game] class while keeping a layer of separation.
 */
class SceneManager {
    /**
     * Creates a new SceneManager
     * @param viewport The Viewport of the game
     * @param game The Game instance
     * @param renderingManager The RenderingManager of the game
     */
    constructor(viewport, renderingManager) {
        this.resourceManager = ResourceManager_1.default.getInstance();
        this.viewport = viewport;
        this.renderingManager = renderingManager;
        this.idCounter = 0;
        this.pendingScene = null;
    }
    /**
     * Add a scene as the main scene.
     * Use this method if you've created a subclass of Scene, and you want to add it as the main Scene.
     * @param constr The constructor of the scene to add
     * @param init An object to pass to the init function of the new scene
     */
    changeToScene(constr, init, options) {
        console.log("Creating the new scene - change is pending until next update");
        this.pendingScene = new constr(this.viewport, this, this.renderingManager, options);
        this.pendingSceneInit = init;
    }
    doSceneChange() {
        console.log("Performing scene change");
        this.viewport.setCenter(this.viewport.getHalfSize().x, this.viewport.getHalfSize().y);
        if (this.currentScene) {
            console.log("Unloading old scene");
            this.currentScene.unloadScene();
            console.log("Destroying old scene");
            this.currentScene.destroy();
        }
        console.log("Unloading old resources...");
        this.resourceManager.unloadAllResources();
        // Make the pending scene the current one
        this.currentScene = this.pendingScene;
        // Make the pending scene null
        this.pendingScene = null;
        // Init the scene
        this.currentScene.initScene(this.pendingSceneInit);
        // Enqueue all scene asset loads
        this.currentScene.loadScene();
        // Load all assets
        console.log("Starting Scene Load");
        this.resourceManager.loadResourcesFromQueue(() => {
            console.log("Starting Scene");
            this.currentScene.startScene();
            this.currentScene.setRunning(true);
        });
        this.renderingManager.setScene(this.currentScene);
    }
    /**
     * Generates a unique ID
     * @returns A new ID
     */
    generateId() {
        return this.idCounter++;
    }
    /**
     * Renders the current Scene
     */
    render() {
        if (this.currentScene) {
            this.currentScene.render();
        }
    }
    /**
     * Updates the current Scene
     * @param deltaT The timestep of the Scene
     */
    update(deltaT) {
        if (this.pendingScene !== null) {
            this.doSceneChange();
        }
        if (this.currentScene && this.currentScene.isRunning()) {
            this.currentScene.update(deltaT);
        }
    }
}
exports.default = SceneManager;

},{"../ResourceManager/ResourceManager":83}],92:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ignorePage
/**
 * The options to give a @reference[Scene] for initialization
 */
class SceneOptions {
    static parse(options) {
        let sOpt = new SceneOptions();
        if (options.physics === undefined) {
            sOpt.physics = { groups: undefined, collisions: undefined };
        }
        else {
            sOpt.physics = options.physics;
        }
        return sOpt;
    }
}
exports.default = SceneOptions;

},{}],93:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("../DataTypes/Vec2");
/**
 * An abstract interface of a SceneGraph.
 * Exposes methods for use by other code, but leaves the implementation up to the subclasses.
 * The SceneGraph manages the positions of all GameNodes, and can easily prune a visible set for rendering.
 */
class SceneGraph {
    /**
     * Creates a new SceneGraph
     * @param viewport The viewport
     * @param scene The Scene this SceneGraph belongs to
     */
    constructor(viewport, scene) {
        this.viewport = viewport;
        this.scene = scene;
        this.nodeMap = new Array();
        this.idCounter = 0;
    }
    /**
     * Add a node to the SceneGraph
     * @param node The CanvasNode to add to the SceneGraph
     * @returns The SceneGraph ID of this newly added CanvasNode
     */
    addNode(node) {
        this.nodeMap[node.id] = node;
        this.addNodeSpecific(node, this.idCounter);
        this.idCounter += 1;
        return this.idCounter - 1;
    }
    ;
    /**
     * Removes a node from the SceneGraph
     * @param node The node to remove
     */
    removeNode(node) {
        // Find and remove node in O(n)
        this.nodeMap[node.id] = undefined;
        this.removeNodeSpecific(node, node.id);
    }
    ;
    /**
     * Get a specific node using its id
     * @param id The id of the CanvasNode to retrieve
     * @returns The node with this ID
     */
    getNode(id) {
        return this.nodeMap[id];
    }
    /**
     * Returns the nodes at specific coordinates
     * @param vecOrX The x-coordinate of the position, or the coordinates in a Vec2
     * @param y The y-coordinate of the position
     * @returns An array of nodes found at the position provided
     */
    getNodesAt(vecOrX, y = null) {
        if (vecOrX instanceof Vec2_1.default) {
            return this.getNodesAtCoords(vecOrX.x, vecOrX.y);
        }
        else {
            return this.getNodesAtCoords(vecOrX, y);
        }
    }
    /**
     * Returns all nodes in the SceneGraph
     * @returns An Array containing all nodes in the SceneGraph
     */
    getAllNodes() {
        let arr = new Array();
        for (let i = 0; i < this.nodeMap.length; i++) {
            if (this.nodeMap[i] !== undefined) {
                arr.push(this.nodeMap[i]);
            }
        }
        return arr;
    }
}
exports.default = SceneGraph;

},{"../DataTypes/Vec2":24}],94:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SceneGraph_1 = require("./SceneGraph");
const Stats_1 = require("../Debug/Stats");
/**
 * An implementation of a SceneGraph that simply stored CanvasNodes in an array.
 */
class SceneGraphArray extends SceneGraph_1.default {
    /**
     * Creates a new SceneGraphArray
     * @param viewport The Viewport
     * @param scene The Scene this SceneGraph belongs to
     */
    constructor(viewport, scene) {
        super(viewport, scene);
        this.nodeList = new Array();
    }
    // @override
    addNodeSpecific(node, id) {
        this.nodeList.push(node);
    }
    // @override
    removeNodeSpecific(node, id) {
        let index = this.nodeList.indexOf(node);
        if (index > -1) {
            this.nodeList.splice(index, 1);
        }
    }
    // @override
    getNodesAtCoords(x, y) {
        let results = [];
        for (let node of this.nodeList) {
            if (node.contains(x, y)) {
                results.push(node);
            }
        }
        return results;
    }
    // @override
    getNodesInRegion(boundary) {
        let t0 = performance.now();
        let results = [];
        for (let node of this.nodeList) {
            if (boundary.overlaps(node.boundary)) {
                results.push(node);
            }
        }
        let t1 = performance.now();
        Stats_1.default.log("sgquery", (t1 - t0));
        return results;
    }
    update(deltaT) {
        let t0 = performance.now();
        for (let node of this.nodeList) {
            if (!node.getLayer().isPaused()) {
                node.update(deltaT);
            }
        }
        let t1 = performance.now();
        Stats_1.default.log("sgupdate", (t1 - t0));
    }
    render(ctx) { }
    // @override
    getVisibleSet() {
        let visibleSet = new Array();
        for (let node of this.nodeList) {
            if (!node.getLayer().isHidden() && node.visible && this.viewport.includes(node)) {
                visibleSet.push(node);
            }
        }
        return visibleSet;
    }
}
exports.default = SceneGraphArray;

},{"../Debug/Stats":26,"./SceneGraph":93}],95:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("../DataTypes/Vec2");
const MathUtils_1 = require("../Utils/MathUtils");
const Queue_1 = require("../DataTypes/Queue");
const AABB_1 = require("../DataTypes/Shapes/AABB");
const Input_1 = require("../Input/Input");
const ParallaxLayer_1 = require("../Scene/Layers/ParallaxLayer");
const UILayer_1 = require("../Scene/Layers/UILayer");
/**
 * The viewport of the game. Corresponds to the visible window displayed in the browser.
 * The viewport keeps track of its position in the game world, and can act as a camera to follow objects.
 */
class Viewport {
    constructor(canvasSize, zoomLevel) {
        /** The amount that is zoomed in or out. */
        this.ZOOM_FACTOR = 1.2;
        this.view = new AABB_1.default(Vec2_1.default.ZERO, Vec2_1.default.ZERO);
        this.boundary = new AABB_1.default(Vec2_1.default.ZERO, Vec2_1.default.ZERO);
        this.lastPositions = new Queue_1.default();
        this.smoothingFactor = 10;
        this.scrollZoomEnabled = false;
        this.canvasSize = Vec2_1.default.ZERO;
        this.focus = Vec2_1.default.ZERO;
        // Set the size of the canvas
        this.setCanvasSize(canvasSize);
        // Set the size of the viewport
        this.setSize(canvasSize);
        this.setZoomLevel(zoomLevel);
        // Set the center (and make the viewport stay there)
        this.setCenter(this.view.halfSize.clone());
        this.setFocus(this.view.halfSize.clone());
    }
    /** Enables the viewport to zoom in and out */
    enableZoom() {
        this.scrollZoomEnabled = true;
    }
    /**
     * Returns the position of the viewport
     * @returns The center of the viewport as a Vec2
     */
    getCenter() {
        return this.view.center;
    }
    /**
     * Returns a new Vec2 with the origin of the viewport
     * @returns The top left cornder of the Vieport as a Vec2
     */
    getOrigin() {
        return new Vec2_1.default(this.view.left, this.view.top);
    }
    /**
     * Returns the region visible to this viewport
     * @returns The AABB containing the region visible to the viewport
     */
    getView() {
        return this.view;
    }
    /**
     * Set the position of the viewport
     * @param vecOrX The new position or the x-coordinate of the new position
     * @param y The y-coordinate of the new position
     */
    setCenter(vecOrX, y = null) {
        let pos;
        if (vecOrX instanceof Vec2_1.default) {
            pos = vecOrX;
        }
        else {
            pos = new Vec2_1.default(vecOrX, y);
        }
        this.view.center = pos;
    }
    /**
     * Returns the size of the viewport as a Vec2
     * @returns The half-size of the viewport as a Vec2
     */
    getHalfSize() {
        return this.view.getHalfSize();
    }
    /**
     * Sets the size of the viewport
     * @param vecOrX The new width of the viewport or the new size as a Vec2
     * @param y The new height of the viewport
     */
    setSize(vecOrX, y = null) {
        if (vecOrX instanceof Vec2_1.default) {
            this.view.setHalfSize(vecOrX.scaled(1 / 2));
        }
        else {
            this.view.setHalfSize(new Vec2_1.default(vecOrX / 2, y / 2));
        }
    }
    /**
     * Sets the half-size of the viewport
     * @param vecOrX The new half-width of the viewport or the new half-size as a Vec2
     * @param y The new height of the viewport
     */
    setHalfSize(vecOrX, y = null) {
        if (vecOrX instanceof Vec2_1.default) {
            this.view.setHalfSize(vecOrX.clone());
        }
        else {
            this.view.setHalfSize(new Vec2_1.default(vecOrX, y));
        }
    }
    /**
     * Updates the viewport with the size of the current Canvas
     * @param vecOrX The width of the canvas, or the canvas size as a Vec2
     * @param y The height of the canvas
     */
    setCanvasSize(vecOrX, y = null) {
        if (vecOrX instanceof Vec2_1.default) {
            this.canvasSize = vecOrX.clone();
        }
        else {
            this.canvasSize = new Vec2_1.default(vecOrX, y);
        }
    }
    /**
     * Sets the zoom level of the viewport
     * @param zoom The zoom level
     */
    setZoomLevel(zoom) {
        this.view.halfSize.copy(this.canvasSize.scaled(1 / zoom / 2));
    }
    /**
     * Gets the zoom level of the viewport
     * @returns The zoom level
     */
    getZoomLevel() {
        return this.canvasSize.x / this.view.hw / 2;
    }
    /**
     * Sets the smoothing factor for the viewport movement.
     * @param smoothingFactor The smoothing factor for the viewport
     */
    setSmoothingFactor(smoothingFactor) {
        if (smoothingFactor < 1)
            smoothingFactor = 1;
        this.smoothingFactor = smoothingFactor;
    }
    /**
     * Tells the viewport to focus on a point. Overidden by "following".
     * @param focus The point the  viewport should focus on
     */
    setFocus(focus) {
        this.focus.copy(focus);
    }
    /**
     * Returns true if the CanvasNode is inside of the viewport
     * @param node The node to check
     * @returns True if the node is currently visible in the viewport, false if not
     */
    includes(node) {
        let parallax = node.getLayer() instanceof ParallaxLayer_1.default || node.getLayer() instanceof UILayer_1.default ? node.getLayer().parallax : new Vec2_1.default(1, 1);
        let center = this.view.center.clone();
        this.view.center.mult(parallax);
        let overlaps = this.view.overlaps(node.boundary);
        this.view.center = center;
        return overlaps;
    }
    // TODO: Put some error handling on this for trying to make the bounds too small for the viewport
    // TODO: This should probably be done automatically, or should consider the aspect ratio or something
    /**
     * Sets the bounds of the viewport
     * @param lowerX The left edge of the viewport
     * @param lowerY The top edge of the viewport
     * @param upperX The right edge of the viewport
     * @param upperY The bottom edge of the viewport
     */
    setBounds(lowerX, lowerY, upperX, upperY) {
        let hwidth = (upperX - lowerX) / 2;
        let hheight = (upperY - lowerY) / 2;
        let x = lowerX + hwidth;
        let y = lowerY + hheight;
        this.boundary.center.set(x, y);
        this.boundary.halfSize.set(hwidth, hheight);
    }
    /**
     * Make the viewport follow the specified GameNode
     * @param node The GameNode to follow
     */
    follow(node) {
        this.following = node;
    }
    updateView() {
        if (this.lastPositions.getSize() > this.smoothingFactor) {
            this.lastPositions.dequeue();
        }
        // Get the average of the last 10 positions
        let pos = Vec2_1.default.ZERO;
        this.lastPositions.forEach(position => pos.add(position));
        pos.scale(1 / this.lastPositions.getSize());
        // Set this position either to the object or to its bounds
        pos.x = MathUtils_1.default.clamp(pos.x, this.boundary.left + this.view.hw, this.boundary.right - this.view.hw);
        pos.y = MathUtils_1.default.clamp(pos.y, this.boundary.top + this.view.hh, this.boundary.bottom - this.view.hh);
        // Assure there are no lines in the tilemap
        pos.x = Math.floor(pos.x);
        pos.y = Math.floor(pos.y);
        this.view.center.copy(pos);
    }
    update(deltaT) {
        // If zoom is enabled
        if (this.scrollZoomEnabled) {
            if (Input_1.default.didJustScroll()) {
                let currentSize = this.view.getHalfSize().clone();
                if (Input_1.default.getScrollDirection() < 0) {
                    // Zoom in
                    currentSize.scale(1 / this.ZOOM_FACTOR);
                }
                else {
                    // Zoom out
                    currentSize.scale(this.ZOOM_FACTOR);
                }
                if (currentSize.x > this.boundary.hw) {
                    let factor = this.boundary.hw / currentSize.x;
                    currentSize.x = this.boundary.hw;
                    currentSize.y *= factor;
                }
                if (currentSize.y > this.boundary.hh) {
                    let factor = this.boundary.hh / currentSize.y;
                    currentSize.y = this.boundary.hh;
                    currentSize.x *= factor;
                }
                this.view.setHalfSize(currentSize);
            }
        }
        // If viewport is following an object
        if (this.following) {
            // Update our list of previous positions
            this.lastPositions.enqueue(this.following.position.clone());
        }
        else {
            this.lastPositions.enqueue(this.focus);
        }
        this.updateView();
    }
}
exports.default = Viewport;

},{"../DataTypes/Queue":14,"../DataTypes/Shapes/AABB":16,"../DataTypes/Vec2":24,"../Input/Input":32,"../Scene/Layers/ParallaxLayer":88,"../Scene/Layers/UILayer":89,"../Utils/MathUtils":102}],96:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_AUDIO_CHANNELS = exports.AudioChannelType = void 0;
const Map_1 = require("../DataTypes/Map");
const Receiver_1 = require("../Events/Receiver");
const ResourceManager_1 = require("../ResourceManager/ResourceManager");
const GameEventType_1 = require("../Events/GameEventType");
/**
 * Manages any sounds or music needed for the game.
 * Through the EventQueue, exposes interface to play sounds so GameNodes can activate sounds without
 * needing direct references to the audio system
 */
class AudioManager {
    constructor() {
        this.initAudio();
        this.receiver = new Receiver_1.default();
        this.receiver.subscribe([
            GameEventType_1.GameEventType.PLAY_SOUND,
            GameEventType_1.GameEventType.STOP_SOUND,
            GameEventType_1.GameEventType.PLAY_MUSIC,
            GameEventType_1.GameEventType.PLAY_SFX,
            GameEventType_1.GameEventType.MUTE_CHANNEL,
            GameEventType_1.GameEventType.UNMUTE_CHANNEL
        ]);
        this.currentSounds = new Map_1.default();
        this.gainNodes = new Array(exports.MAX_AUDIO_CHANNELS);
        this.initGainNodes();
    }
    /**
     * Get the instance of the AudioManager class or create a new one if none exists
     * @returns The AudioManager
     */
    static getInstance() {
        if (!this.instance) {
            this.instance = new AudioManager();
        }
        return this.instance;
    }
    /**
     * Initializes the webAudio context
     */
    initAudio() {
        try {
            window.AudioContext = window.AudioContext; // || window.webkitAudioContext; 
            this.audioCtx = new AudioContext();
            console.log('Web Audio API successfully loaded');
        }
        catch (e) {
            console.warn('Web Audio API is not supported in this browser');
        }
    }
    initGainNodes() {
        for (let i = 0; i < exports.MAX_AUDIO_CHANNELS; i++) {
            this.gainNodes[i] = this.audioCtx.createGain();
        }
    }
    /**
     * Returns the current audio context
     * @returns The AudioContext
     */
    getAudioContext() {
        return this.audioCtx;
    }
    /*
        According to the MDN, create a new sound for every call:

        An AudioBufferSourceNode can only be played once; after each call to start(), you have to create a new node
        if you want to play the same sound again. Fortunately, these nodes are very inexpensive to create, and the
        actual AudioBuffers can be reused for multiple plays of the sound. Indeed, you can use these nodes in a
        "fire and forget" manner: create the node, call start() to begin playing the sound, and don't even bother to
        hold a reference to it. It will automatically be garbage-collected at an appropriate time, which won't be
        until sometime after the sound has finished playing.
    */
    /**
     * Creates a new sound from the key of a loaded audio file
     * @param key The key of the loaded audio file to create a new sound for
     * @returns The newly created AudioBuffer
     */
    createSound(key, holdReference, channel, options) {
        // Get audio buffer
        let buffer = ResourceManager_1.default.getInstance().getAudio(key);
        // Create a sound source
        var source = this.audioCtx.createBufferSource();
        // Tell the source which sound to play
        source.buffer = buffer;
        // Add any additional nodes
        const nodes = [source];
        // Do any additional nodes here?
        // Of course, there aren't any supported yet...
        // Add the gain node for this channel
        nodes.push(this.gainNodes[channel]);
        // Connect any nodes along the path
        for (let i = 1; i < nodes.length; i++) {
            nodes[i - 1].connect(nodes[i]);
        }
        // Connect the source to the context's destination
        nodes[nodes.length - 1].connect(this.audioCtx.destination);
        return source;
    }
    /**
     * Play the sound specified by the key
     * @param key The key of the sound to play
     * @param loop A boolean for whether or not to loop the sound
     * @param holdReference A boolean for whether or not we want to hold on to a reference of the audio node. This is good for playing music on a loop that will eventually need to be stopped.
     */
    playSound(key, loop, holdReference, channel, options) {
        let sound = this.createSound(key, holdReference, channel, options);
        if (loop) {
            sound.loop = true;
        }
        // Add a reference of the new sound to a map. This will allow us to stop a looping or long sound at a later time
        if (holdReference) {
            this.currentSounds.add(key, sound);
        }
        sound.start();
    }
    /**
     * Stop the sound specified by the key
     */
    stopSound(key) {
        let sound = this.currentSounds.get(key);
        if (sound) {
            sound.stop();
            this.currentSounds.delete(key);
        }
    }
    muteChannel(channel) {
        this.gainNodes[channel].gain.setValueAtTime(0, this.audioCtx.currentTime);
    }
    unmuteChannel(channel) {
        this.gainNodes[channel].gain.setValueAtTime(1, this.audioCtx.currentTime);
    }
    /**
     * Sets the volume of a channel using the GainNode for that channel. For more
     * information on GainNodes, see https://developer.mozilla.org/en-US/docs/Web/API/GainNode
     * @param channel The audio channel to set the volume for
     * @param volume The volume of the channel. 0 is muted. Values below zero will be set to zero.
     */
    static setVolume(channel, volume) {
        if (volume < 0) {
            volume = 0;
        }
        const am = AudioManager.getInstance();
        am.gainNodes[channel].gain.setValueAtTime(volume, am.audioCtx.currentTime);
    }
    /**
     * Returns the GainNode for this channel.
     * Learn more about GainNodes here https://developer.mozilla.org/en-US/docs/Web/API/GainNode
     * DON'T USE THIS UNLESS YOU KNOW WHAT YOU'RE DOING
     * @param channel The channel
     * @returns The GainNode for the specified channel
     */
    getChannelGainNode(channel) {
        return this.gainNodes[channel];
    }
    update(deltaT) {
        // Play each audio clip requested
        // TODO - Add logic to merge sounds if there are multiple of the same key
        while (this.receiver.hasNextEvent()) {
            let event = this.receiver.getNextEvent();
            if (event.type === GameEventType_1.GameEventType.PLAY_SOUND || event.type === GameEventType_1.GameEventType.PLAY_MUSIC || event.type === GameEventType_1.GameEventType.PLAY_SFX) {
                let soundKey = event.data.get("key");
                let loop = event.data.get("loop");
                let holdReference = event.data.get("holdReference");
                let channel = AudioChannelType.DEFAULT;
                if (event.type === GameEventType_1.GameEventType.PLAY_MUSIC) {
                    channel = AudioChannelType.MUSIC;
                }
                else if (GameEventType_1.GameEventType.PLAY_SFX) {
                    channel = AudioChannelType.SFX;
                }
                else if (event.data.has("channel")) {
                    channel = event.data.get("channel");
                }
                this.playSound(soundKey, loop, holdReference, channel, event.data);
            }
            if (event.type === GameEventType_1.GameEventType.STOP_SOUND) {
                let soundKey = event.data.get("key");
                this.stopSound(soundKey);
            }
            if (event.type === GameEventType_1.GameEventType.MUTE_CHANNEL) {
                this.muteChannel(event.data.get("channel"));
            }
            if (event.type === GameEventType_1.GameEventType.UNMUTE_CHANNEL) {
                this.unmuteChannel(event.data.get("channel"));
            }
        }
    }
}
exports.default = AudioManager;
var AudioChannelType;
(function (AudioChannelType) {
    AudioChannelType[AudioChannelType["DEFAULT"] = 0] = "DEFAULT";
    AudioChannelType[AudioChannelType["SFX"] = 1] = "SFX";
    AudioChannelType[AudioChannelType["MUSIC"] = 2] = "MUSIC";
    AudioChannelType[AudioChannelType["CUSTOM_1"] = 3] = "CUSTOM_1";
    AudioChannelType[AudioChannelType["CUSTOM_2"] = 4] = "CUSTOM_2";
    AudioChannelType[AudioChannelType["CUSTOM_3"] = 5] = "CUSTOM_3";
    AudioChannelType[AudioChannelType["CUSTOM_4"] = 6] = "CUSTOM_4";
    AudioChannelType[AudioChannelType["CUSTOM_5"] = 7] = "CUSTOM_5";
    AudioChannelType[AudioChannelType["CUSTOM_6"] = 8] = "CUSTOM_6";
    AudioChannelType[AudioChannelType["CUSTOM_7"] = 9] = "CUSTOM_7";
    AudioChannelType[AudioChannelType["CUSTOM_8"] = 10] = "CUSTOM_8";
    AudioChannelType[AudioChannelType["CUSTOM_9"] = 11] = "CUSTOM_9";
})(AudioChannelType = exports.AudioChannelType || (exports.AudioChannelType = {}));
exports.MAX_AUDIO_CHANNELS = 12;

},{"../DataTypes/Map":10,"../Events/GameEventType":30,"../Events/Receiver":31,"../ResourceManager/ResourceManager":83}],97:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimerState = void 0;
const sword_enums_1 = require("../../shattered_sword/sword_enums");
const InputWrapper_1 = require("../../shattered_sword/Tools/InputWrapper");
const MathUtils_1 = require("../Utils/MathUtils");
const TimerManager_1 = require("./TimerManager");
/** */
class Timer {
    constructor(time, onEnd, loop = false) {
        // Register this timer
        TimerManager_1.default.getInstance().addTimer(this);
        this.totalTime = time;
        this.timeLeft = 0;
        this.onEnd = onEnd;
        this.loop = loop;
        this.state = TimerState.STOPPED;
        this.numRuns = 0;
    }
    isStopped() {
        return this.state === TimerState.STOPPED;
    }
    isPaused() {
        return this.state === TimerState.PAUSED;
    }
    /**
     * Returns whether or not this timer has been run before
     * @returns true if it has been run at least once (after the latest reset), and false otherwise
     */
    hasRun() {
        return this.numRuns > 0;
    }
    start(time) {
        if (time !== undefined) {
            this.totalTime = time;
        }
        this.state = TimerState.ACTIVE;
        this.timeLeft = this.totalTime;
    }
    /** Resets this timer. Sets the progress back to zero, and sets the number of runs back to zero */
    reset() {
        this.timeLeft = this.totalTime;
        this.numRuns = 0;
    }
    pause() {
        this.state = TimerState.PAUSED;
    }
    update(deltaT) {
        if (this.state === TimerState.ACTIVE && InputWrapper_1.default.getState() === sword_enums_1.GameState.GAMING) {
            this.timeLeft -= deltaT * 1000;
            if (this.timeLeft <= 0) {
                this.timeLeft = MathUtils_1.default.clampLow0(this.timeLeft);
                this.end();
            }
        }
    }
    end() {
        // Update the state
        this.state = TimerState.STOPPED;
        this.numRuns += 1;
        // Call the end function if there is one
        if (this.onEnd) {
            this.onEnd();
        }
        // Loop if we want to
        if (this.loop) {
            this.state = TimerState.ACTIVE;
            this.timeLeft = this.totalTime;
        }
    }
    toString() {
        return "Timer: " + this.state + " - Time Left: " + this.timeLeft + "ms of " + this.totalTime + "ms";
    }
}
exports.default = Timer;
var TimerState;
(function (TimerState) {
    TimerState["ACTIVE"] = "ACTIVE";
    TimerState["PAUSED"] = "PAUSED";
    TimerState["STOPPED"] = "STOPPED";
})(TimerState = exports.TimerState || (exports.TimerState = {}));

},{"../../shattered_sword/Tools/InputWrapper":157,"../../shattered_sword/sword_enums":161,"../Utils/MathUtils":102,"./TimerManager":98}],98:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TimerManager {
    constructor() {
        this.timers = new Array();
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new TimerManager();
        }
        return this.instance;
    }
    addTimer(timer) {
        this.timers.push(timer);
    }
    clearTimers() {
        this.timers = new Array();
    }
    update(deltaT) {
        this.timers.forEach(timer => timer.update(deltaT));
    }
}
exports.default = TimerManager;

},{}],99:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MathUtils_1 = require("./MathUtils");
// TODO: This should be moved to the datatypes folder
/**
 * A Color util class that keeps track of colors like a vector, but can be converted into a string format
 */
class Color {
    /**
     * Creates a new color
     * @param r Red
     * @param g Green
     * @param b Blue
     * @param a Alpha
     */
    constructor(r = 0, g = 0, b = 0, a = 1) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    /**
     * Transparent color
     * @returns rgba(0, 0, 0, 0)
     */
    static get TRANSPARENT() {
        return new Color(0, 0, 0, 0);
    }
    /**
     * Red color
     * @returns rgb(255, 0, 0)
     */
    static get RED() {
        return new Color(255, 0, 0, 1);
    }
    /**
     * Green color
     * @returns rgb(0, 255, 0)
     */
    static get GREEN() {
        return new Color(0, 255, 0, 1);
    }
    /**
     * Blue color
     * @returns rgb(0, 0, 255)
     */
    static get BLUE() {
        return new Color(0, 0, 255, 1);
    }
    /**
     * Yellow color
     * @returns rgb(255, 255, 0)
     */
    static get YELLOW() {
        return new Color(255, 255, 0, 1);
    }
    /**
     * Magenta color
     * @returns rgb(255, 0, 255)
     */
    static get MAGENTA() {
        return new Color(255, 0, 255, 1);
    }
    /**
     * Cyan color
     * @returns rgb(0, 255, 255)
     */
    static get CYAN() {
        return new Color(0, 255, 255, 1);
    }
    /**
     * White color
     * @returns rgb(255, 255, 255)
     */
    static get WHITE() {
        return new Color(255, 255, 255, 1);
    }
    /**
     * Black color
     * @returns rgb(0, 0, 0)
     */
    static get BLACK() {
        return new Color(0, 0, 0, 1);
    }
    /**
     * Orange color
     * @returns rgb(255, 100, 0)
     */
    static get ORANGE() {
        return new Color(255, 100, 0, 1);
    }
    /**
     * Sets the color to the values provided
     * @param r Red
     * @param g Green
     * @param b Blue
     * @param a Alpha
     */
    set(r, g, b, a = 1) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    /**
     * Returns a new color slightly lighter than the current color
     * @returns A new lighter Color
     */
    lighten() {
        return new Color(MathUtils_1.default.clamp(this.r + 40, 0, 255), MathUtils_1.default.clamp(this.g + 40, 0, 255), MathUtils_1.default.clamp(this.b + 40, 0, 255), MathUtils_1.default.clamp(this.a + 10, 0, 255));
    }
    /**
     * Returns a new color slightly darker than the current color
     * @returns A new darker Color
     */
    darken() {
        return new Color(MathUtils_1.default.clamp(this.r - 40, 0, 255), MathUtils_1.default.clamp(this.g - 40, 0, 255), MathUtils_1.default.clamp(this.b - 40, 0, 255), MathUtils_1.default.clamp(this.a + 10, 0, 255));
    }
    /**
     * Returns this color as an array
     * @returns [r, g, b, a]
     */
    toArray() {
        return [this.r, this.g, this.b, this.a];
    }
    /**
     * Returns the color as a string of the form #RRGGBB
     * @returns #RRGGBB
     */
    toString() {
        return "#" + MathUtils_1.default.toHex(this.r, 2) + MathUtils_1.default.toHex(this.g, 2) + MathUtils_1.default.toHex(this.b, 2);
    }
    /**
     * Returns the color as a string of the form rgb(r, g, b)
     * @returns rgb(r, g, b)
     */
    toStringRGB() {
        return "rgb(" + this.r.toString() + ", " + this.g.toString() + ", " + this.b.toString() + ")";
    }
    /**
     * Returns the color as a string of the form rgba(r, g, b, a)
     * @returns rgba(r, g, b, a)
     */
    toStringRGBA() {
        if (this.a === 0) {
            return this.toStringRGB();
        }
        return "rgba(" + this.r.toString() + ", " + this.g.toString() + ", " + this.b.toString() + ", " + this.a.toString() + ")";
    }
    /**
     * Turns this color into a float32Array and changes color range to [0.0, 1.0]
     * @returns a Float32Array containing the color
     */
    toWebGL() {
        return new Float32Array([
            this.r / 255,
            this.g / 255,
            this.b / 255,
            this.a
        ]);
    }
    static fromStringHex(str) {
        let i = 0;
        if (str.charAt(0) == "#")
            i += 1;
        let r = MathUtils_1.default.fromHex(str.substring(i, i + 2));
        let g = MathUtils_1.default.fromHex(str.substring(i + 2, i + 4));
        let b = MathUtils_1.default.fromHex(str.substring(i + 4, i + 6));
        return new Color(r, g, b);
    }
}
exports.default = Color;

},{"./MathUtils":102}],100:[function(require,module,exports){
"use strict";
// @ignorePage
Object.defineProperty(exports, "__esModule", { value: true });
exports.EaseFunctionType = void 0;
class EaseFunctions {
    static easeInOutSine(x) {
        return -(Math.cos(Math.PI * x) - 1) / 2;
    }
    static easeOutInSine(x) {
        return x < 0.5 ? -Math.cos(Math.PI * (x + 0.5)) / 2 : -Math.cos(Math.PI * (x - 0.5)) / 2 + 1;
    }
    static easeOutSine(x) {
        return Math.sin((x * Math.PI) / 2);
    }
    static easeInSine(x) {
        return 1 - Math.cos((x * Math.PI) / 2);
    }
    static easeInOutQuint(x) {
        return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
    }
    static easeInOutQuad(x) {
        return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    }
    static easeOutInQuad(x) {
        return x < 0.5 ? this.easeOutIn_OutPow(x, 2) : this.easeOutIn_InPow(x, 2);
    }
    static easeOutIn_OutPow(x, pow) {
        return 0.5 - Math.pow(-2 * x + 1, pow) / 2;
    }
    static easeOutIn_InPow(x, pow) {
        return 0.5 + Math.pow(2 * x - 1, pow) / 2;
    }
}
exports.default = EaseFunctions;
var EaseFunctionType;
(function (EaseFunctionType) {
    // SINE
    EaseFunctionType["IN_OUT_SINE"] = "easeInOutSine";
    EaseFunctionType["OUT_IN_SINE"] = "easeOutInSine";
    EaseFunctionType["IN_SINE"] = "easeInSine";
    EaseFunctionType["OUT_SINE"] = "easeOutSine";
    // QUAD
    EaseFunctionType["IN_OUT_QUAD"] = "easeInOutQuad";
    EaseFunctionType["OUT_IN_QUAD"] = "easeOutInQuad";
    // QUINT
    EaseFunctionType["IN_OUT_QUINT"] = "easeInOutQuint";
})(EaseFunctionType = exports.EaseFunctionType || (exports.EaseFunctionType = {}));

},{}],101:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** A class to provides some utility functions for graphs */
class GraphUtils {
    /**
     * An implementation of Djikstra's shortest path algorithm based on the one described in The Algorithm Design Manual.
     * @param g The graph
     * @param start The number to start the shortest path from
     * @returns An array containing the parent of each node of the Graph in the shortest path.
     */
    static djikstra(g, start) {
        let i; // Counter
        let p; // Pointer to edgenode
        let inTree = new Array(g.numVertices);
        let distance = new Array(g.numVertices);
        let parent = new Array(g.numVertices);
        let v; // Current vertex to process
        let w; // Candidate for next vertex
        let weight; // Edge weight
        let dist; // Best current distance from start
        for (i = 0; i < g.numVertices; i++) {
            inTree[i] = false;
            distance[i] = Infinity;
            parent[i] = -1;
        }
        distance[start] = 0;
        v = start;
        while (!inTree[v]) {
            inTree[v] = true;
            p = g.edges[v];
            while (p !== null) {
                w = p.y;
                weight = p.weight;
                if (distance[w] > distance[v] + weight) {
                    distance[w] = distance[v] + weight;
                    parent[w] = v;
                }
                p = p.next;
            }
            v = 0;
            dist = Infinity;
            for (i = 0; i <= g.numVertices; i++) {
                if (!inTree[i] && dist > distance[i]) {
                    dist = distance;
                    v = i;
                }
            }
        }
        return parent;
    }
}
exports.default = GraphUtils;

},{}],102:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** A class containing some utility functions for math operations */
class MathUtils {
    /**
     * Returns the sign of the value provided
     * @param x The value to extract the sign from
     * @returns -1 if the number is less than 0, 1 otherwise
     */
    static sign(x) {
        return x < 0 ? -1 : 1;
    }
    /**
     * Returns whether or not x is between a and b
     * @param a The min bound
     * @param b The max bound
     * @param x The value to check
     * @param exclusive Whether or not a and b are exclusive bounds
     * @returns True if x is between a and b, false otherwise
     */
    static between(a, b, x, exclusive) {
        if (exclusive) {
            return (a < x) && (x < b);
        }
        else {
            return (a <= x) && (x <= b);
        }
    }
    /**
     * Clamps the value x to the range [min, max], rounding up or down if needed
     * @param x The value to be clamped
     * @param min The min of the range
     * @param max The max of the range
     * @returns x, if it is between min and max, or min/max if it exceeds their bounds
     */
    static clamp(x, min, max) {
        if (x < min)
            return min;
        if (x > max)
            return max;
        return x;
    }
    /**
     * Clamps the value x to the range between 0 and 1
     * @param x The value to be clamped
     * @returns x, if it is between 0 and 1, or 0/1 if it exceeds their bounds
     */
    static clamp01(x) {
        return MathUtils.clamp(x, 0, 1);
    }
    /**
     * Clamps the lower end of the value of x to the range to min
     * @param x The value to be clamped
     * @param min The minimum allowed value of x
     * @returns x, if it is greater than min, otherwise min
     */
    static clampLow(x, min) {
        return x < min ? min : x;
    }
    /**
     * Clamps the lower end of the value of x to zero
     * @param x The value to be clamped
     * @returns x, if it is greater than 0, otherwise 0
     */
    static clampLow0(x) {
        return MathUtils.clampLow(x, 0);
    }
    static clampMagnitude(v, m) {
        if (v.magSq() > m * m) {
            return v.scaleTo(m);
        }
        else {
            return v;
        }
    }
    static changeRange(x, min, max, newMin, newMax) {
        return this.lerp(newMin, newMax, this.invLerp(min, max, x));
    }
    /**
     * Linear Interpolation
     * @param a The first value for the interpolation bound
     * @param b The second value for the interpolation bound
     * @param t The time we are interpolating to
     * @returns The value between a and b at time t
     */
    static lerp(a, b, t) {
        return a + t * (b - a);
    }
    /**
     * Inverse Linear Interpolation. Finds the time at which a value between a and b would occur
     * @param a The first value for the interpolation bound
     * @param b The second value for the interpolation bound
     * @param value The current value
     * @returns The time at which the current value occurs between a and b
     */
    static invLerp(a, b, value) {
        return (value - a) / (b - a);
    }
    /**
     * Cuts off decimal points of a number after a specified place
     * @param num The number to floor
     * @param place The last decimal place of the new number
     * @returns The floored number
     */
    static floorToPlace(num, place) {
        if (place === 0) {
            return Math.floor(num);
        }
        let factor = 10;
        while (place > 1) {
            factor != 10;
            place--;
        }
        return Math.floor(num * factor) / factor;
    }
    /**
     * Returns a number from a hex string
     * @param str the string containing the hex number
     * @returns the number in decimal represented by the hex string
     */
    static fromHex(str) {
        return parseInt(str, 16);
    }
    /**
     * Returns the number as a hexadecimal
     * @param num The number to convert to hex
     * @param minLength The length of the returned hex string (adds zero padding if needed)
     * @returns The hex representation of the number as a string
     */
    static toHex(num, minLength = null) {
        let factor = 1;
        while (factor * 16 < num) {
            factor *= 16;
        }
        let hexStr = "";
        while (factor >= 1) {
            let digit = Math.floor(num / factor);
            hexStr += MathUtils.toHexDigit(digit);
            num -= digit * factor;
            factor /= 16;
        }
        if (minLength !== null) {
            while (hexStr.length < minLength) {
                hexStr = "0" + hexStr;
            }
        }
        return hexStr;
    }
    /**
     * Converts a digit to hexadecimal. In this case, a digit is between 0 and 15 inclusive
     * @param num The digit to convert to hexadecimal
     * @returns The hex representation of the digit as a string
     */
    static toHexDigit(num) {
        if (num < 10) {
            return "" + num;
        }
        else {
            return String.fromCharCode(65 + num - 10);
        }
    }
}
exports.default = MathUtils;

},{}],103:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MathUtils_1 = require("./MathUtils");
class RenderingUtils {
    static toWebGLCoords(point, origin, worldSize) {
        return new Float32Array([
            MathUtils_1.default.changeRange(point.x, origin.x, origin.x + worldSize.x, -1, 1),
            MathUtils_1.default.changeRange(point.y, origin.y, origin.y + worldSize.y, 1, -1)
        ]);
    }
    static toWebGLScale(size, worldSize) {
        return new Float32Array([
            2 * size.x / worldSize.x,
            2 * size.y / worldSize.y,
        ]);
    }
    static toWebGLColor(color) {
        return new Float32Array([
            MathUtils_1.default.changeRange(color.r, 0, 255, 0, 1),
            MathUtils_1.default.changeRange(color.g, 0, 255, 0, 1),
            MathUtils_1.default.changeRange(color.b, 0, 255, 0, 1),
            color.a
        ]);
    }
}
exports.default = RenderingUtils;

},{"./MathUtils":102}],104:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Some utility functions for dealing with strings */
class StringUtils {
    /**
     * Extracts the path from a filepath that includes the file
     * @param filePath the filepath to extract the path from
     * @returns The path portion of the filepath provided
     */
    static getPathFromFilePath(filePath) {
        let splitPath = filePath.split("/");
        splitPath.pop();
        splitPath.push("");
        return splitPath.join("/");
    }
}
exports.default = StringUtils;

},{}],105:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Game_1 = require("./Wolfie2D/Loop/Game");
const RegistryManager_1 = require("./Wolfie2D/Registry/RegistryManager");
const WeaponRegistry_1 = require("./shattered_sword/Registry/WeaponRegistry");
const WeaponTypeRegistry_1 = require("./shattered_sword/Registry/WeaponTypeRegistry");
const SplashScreen_1 = require("./shattered_sword/Scenes/SplashScreen");
// The main function is your entrypoint into Wolfie2D. Specify your first scene and any options here.
(function main() {
    // Run any tests
    runTests();
    // Set up options for our game
    let options = {
        canvasSize: { x: 1280, y: 720 },
        //canvasSize: {x: window.innerWidth, y: window.innerHeight},          // The size of the game
        clearColor: { r: 0, g: 0, b: 0 },
        inputs: [
            { name: "left", keys: ["a", "arrowleft"] },
            { name: "right", keys: ["d", "arrowright"] },
            { name: "up", keys: ["w", "arrowup"] },
            { name: "down", keys: ["s", "arrowdown"] },
            { name: "jump", keys: ["z", "space"] },
            { name: "attack", keys: ["j", "x", "enter"] },
            { name: "dash", keys: ["k", "c"] },
            { name: "skill", keys: ["l", "v"] },
            { name: "inventory", keys: ["i", "b"] },
            { name: "pause", keys: ["escape"] },
            { name: "tab", keys: ["tab"] },
            { name: "buff1", keys: ["1"] },
            { name: "buff2", keys: ["2"] },
            { name: "buff3", keys: ["3"] }
        ],
        useWebGL: false,
        showDebug: false // Whether to show debug messages. You can change this to true if you want
    };
    // Set up custom registries
    let weaponTemplateRegistry = new WeaponRegistry_1.default();
    RegistryManager_1.default.addCustomRegistry("weaponTemplates", weaponTemplateRegistry);
    let weaponTypeRegistry = new WeaponTypeRegistry_1.default();
    RegistryManager_1.default.addCustomRegistry("weaponTypes", weaponTypeRegistry);
    // Create a game with the options specified
    const game = new Game_1.default(options);
    // Start our game
    game.start(SplashScreen_1.default, {});
    //TODO - change to splash screen once available
    //game.start(SplashScreen,{});
})();
function runTests() { }
;

},{"./Wolfie2D/Loop/Game":36,"./Wolfie2D/Registry/RegistryManager":65,"./shattered_sword/Registry/WeaponRegistry":141,"./shattered_sword/Registry/WeaponTypeRegistry":142,"./shattered_sword/Scenes/SplashScreen":154}],106:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnemyAI_1 = require("./EnemyAI");
const ArcherAttack_1 = require("./EnemyStates/ArcherAttack");
class ArcherAI extends EnemyAI_1.default {
    initializeAI(owner, options) {
        super.initializeAI(owner, options);
        this.addState(EnemyAI_1.EnemyStates.ATTACK, new ArcherAttack_1.default(this, owner));
        this.weapon = options.weapon;
    }
    canAttack(position) {
        return this.attackTimer.isStopped() && this.owner.position.distanceTo(position) <= 128;
    }
}
exports.default = ArcherAI;

},{"./EnemyAI":110,"./EnemyStates/ArcherAttack":112}],107:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnemyAI_1 = require("./EnemyAI");
const AssassinAttack_1 = require("./EnemyStates/AssassinAttack");
class AssassinAI extends EnemyAI_1.default {
    initializeAI(owner, options) {
        super.initializeAI(owner, options);
        this.addState(EnemyAI_1.EnemyStates.ATTACK, new AssassinAttack_1.default(this, owner));
    }
    canAttack(position) {
        return this.attackTimer.isStopped() && this.owner.position.distanceTo(position) <= 150;
    }
}
exports.default = AssassinAI;

},{"./EnemyAI":110,"./EnemyStates/AssassinAttack":113}],108:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnemyAI_1 = require("./EnemyAI");
const BossAttack_1 = require("./EnemyStates/BossAttack");
class BossAI extends EnemyAI_1.default {
    initializeAI(owner, options) {
        super.initializeAI(owner, options);
        this.addState(EnemyAI_1.EnemyStates.ATTACK, new BossAttack_1.default(this, owner));
        this.weapon = options.weapon;
    }
    canAttack(position) {
        return this.attackTimer.isStopped() && this.owner.position.distanceTo(position) <= 225;
    }
    damage(damage) {
        // enemy already dead, do not send new event
        if (this.CURRENT_HP <= 0) {
            return;
        }
        //console.log(damage +" damage taken, "+this.CURRENT_HP+" hp left");
        this.CURRENT_HP -= damage;
        //TODO -
        if (!this.isAttacking && !this.isCharging) {
            this.owner.animation.play("HURT", false);
        }
        //console.log(damage +" damage taken, "+this.CURRENT_HP+" hp left");
        // If health goes below 0, disable AI and fire enemyDied event
        if (this.CURRENT_HP <= 0) {
            this.owner.setAIActive(false, {});
            this.owner.isCollidable = false;
            this.owner.visible = false;
            if (this.healthBar) {
                this.healthBar.destroy();
                this.healthBar = undefined;
            }
            if (this.poisonStat) {
                this.poisonStat.destroy();
                this.poisonStat = undefined;
            }
            if (this.burnStat) {
                this.burnStat.destroy();
                this.burnStat = undefined;
            }
            if (this.bleedStat) {
                this.bleedStat.destroy();
                this.bleedStat = undefined;
            }
            this.emitter.fireEvent("nextLevel", { owner: this.owner.id, ai: this });
        }
        this.damageTimer.start();
    }
}
exports.default = BossAI;

},{"./EnemyAI":110,"./EnemyStates/BossAttack":115}],109:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Timer_1 = require("../../Wolfie2D/Timing/Timer");
const EnemyAI_1 = require("./EnemyAI");
const BullAttack_1 = require("./EnemyStates/BullAttack");
class BullAI extends EnemyAI_1.default {
    initializeAI(owner, options) {
        super.initializeAI(owner, options);
        this.addState(EnemyAI_1.EnemyStates.ATTACK, new BullAttack_1.default(this, owner));
        this.attackTimer = new Timer_1.default(4000);
    }
    canAttack(position) {
        return this.attackTimer.isStopped();
    }
    collideWithPlayer(player) {
        if (this.isAttacking) {
            player.bleedCounter += 3;
        }
        player.damage(10);
    }
}
exports.default = BullAI;

},{"../../Wolfie2D/Timing/Timer":97,"./EnemyAI":110,"./EnemyStates/BullAttack":116}],110:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnemyStates = void 0;
const StateMachineAI_1 = require("../../Wolfie2D/AI/StateMachineAI");
const AABB_1 = require("../../Wolfie2D/DataTypes/Shapes/AABB");
const Vec2_1 = require("../../Wolfie2D/DataTypes/Vec2");
const Patrol_1 = require("./EnemyStates/Patrol");
const Alert_1 = require("./EnemyStates/Alert");
const SlimeAttack_1 = require("./EnemyStates/SlimeAttack");
const sword_enums_1 = require("../sword_enums");
const sword_enums_2 = require("../sword_enums");
const InputWrapper_1 = require("../Tools/InputWrapper");
const Timer_1 = require("../../Wolfie2D/Timing/Timer");
const Color_1 = require("../../Wolfie2D/Utils/Color");
class EnemyAI extends StateMachineAI_1.default {
    constructor() {
        super(...arguments);
        /** The default movement speed of this AI */
        this.speed = 20;
        this.maxSpeed = 40;
        this.velocity = Vec2_1.default.ZERO;
        this.exp_val = 100; //exp value to give player when this dies
        this.poisonCounter = 0;
        this.burnCounter = 0;
        this.bleedCounter = 0;
        this.isCharging = false;
        this.isAttacking = false;
    }
    initializeAI(owner, options) {
        this.owner = owner;
        //add states
        // Patrol mode
        this.addState(EnemyStates.PATROL, new Patrol_1.default(this, owner));
        this.addState(EnemyStates.ALERT, new Alert_1.default(this, owner));
        this.addState(EnemyStates.ATTACK, new SlimeAttack_1.default(this, owner));
        this.maxHealth = options.health;
        this.CURRENT_HP = options.health;
        this.player = options.player;
        this.exp_val = options.exp;
        //TODO - get correct tilemap
        this.tilemap = this.owner.getScene().getLayer("Wall").getItems()[0];
        // Initialize to the default state
        this.initialize(EnemyStates.PATROL);
        this.direction = 1; //default moving to the right
        //TODO - dots every 1 sec? can change
        this.burnTimer = new Timer_1.default(1000);
        this.bleedTimer = new Timer_1.default(1000);
        this.poisonTimer = new Timer_1.default(1000);
        this.attackTimer = new Timer_1.default(2500);
        this.damageTimer = new Timer_1.default(400);
    }
    damage(damage) {
        // enemy already dead, do not send new event
        if (this.CURRENT_HP <= 0) {
            return;
        }
        //console.log(damage +" damage taken, "+this.CURRENT_HP+" hp left");
        this.CURRENT_HP -= damage;
        //TODO -
        if (!this.isAttacking && !this.isCharging) {
            this.owner.animation.play("HURT", false);
        }
        //console.log(damage +" damage taken, "+this.CURRENT_HP+" hp left");
        // If health goes below 0, disable AI and fire enemyDied event
        if (this.CURRENT_HP <= 0) {
            this.owner.setAIActive(false, {});
            this.owner.isCollidable = false;
            this.owner.visible = false;
            if (this.healthBar) {
                this.healthBar.destroy();
                this.healthBar = undefined;
            }
            if (this.poisonStat) {
                this.poisonStat.destroy();
                this.poisonStat = undefined;
            }
            if (this.burnStat) {
                this.burnStat.destroy();
                this.burnStat = undefined;
            }
            if (this.bleedStat) {
                this.bleedStat.destroy();
                this.bleedStat = undefined;
            }
            this.emitter.fireEvent(sword_enums_2.Player_Events.ENEMY_KILLED, { owner: this.owner.id, ai: this });
        }
        this.damageTimer.start();
    }
    collideWithPlayer(player) {
        player.damage(10);
    }
    canAttack(position) {
        return this.attackTimer.isStopped() && this.owner.position.distanceTo(position) <= 32;
    }
    //TODO - need to modify for side view
    isPlayerVisible(pos) {
        //Check ifplayer is visible, taking into account walls
        // Get the new player location
        let start = this.owner.position.clone();
        let delta = pos.clone().sub(start);
        if (delta.mag() >= 640) {
            return null;
        }
        // Iterate through the tilemap region until we find a collision
        let minX = Math.min(start.x, pos.x);
        let maxX = Math.max(start.x, pos.x);
        let minY = Math.min(start.y, pos.y);
        let maxY = Math.max(start.y, pos.y);
        // Get the wall tilemap
        let walls = this.tilemap;
        let minIndex = walls.getColRowAt(new Vec2_1.default(minX, minY));
        let maxIndex = walls.getColRowAt(new Vec2_1.default(maxX, maxY));
        let tileSize = walls.getTileSize();
        for (let col = minIndex.x; col <= maxIndex.x; col++) {
            for (let row = minIndex.y; row <= maxIndex.y; row++) {
                if (walls.isTileCollidable(col, row)) {
                    // Get the position of this tile
                    let tilePos = new Vec2_1.default(col * tileSize.x + tileSize.x / 2, row * tileSize.y + tileSize.y / 2);
                    // Create a collider for this tile
                    let collider = new AABB_1.default(tilePos, tileSize.scaled(1 / 2));
                    let hit = collider.intersectSegment(start, delta, Vec2_1.default.ZERO);
                    if (hit !== null && start.distanceSqTo(hit.pos) < start.distanceSqTo(pos)) {
                        // We hit a wall, we can't see the player
                        //console.log("player not visible")
                        return null;
                    }
                }
            }
        }
        this.lastPlayerPosition = pos;
        return pos;
    }
    /**
     * gets the position of the player
     * @returns position of the player if visible, else null
     */
    getPlayerPosition() {
        if (this.isPlayerVisible(this.player.position) == null) {
            return this.lastPlayerPosition;
        }
        return this.isPlayerVisible(this.player.position);
    }
    update(deltaT) {
        if (InputWrapper_1.default.getState() != sword_enums_1.GameState.GAMING) {
            this.owner.animation.pause();
            return;
        }
        this.owner.animation.resume();
        super.update(deltaT);
        if (this.burnTimer.isStopped() && this.burnCounter > 0) {
            this.burnCounter--;
            this.burnTimer.start();
            this.damage(12 + this.player._ai.extraDotDmg);
        }
        if (this.poisonTimer.isStopped() && this.poisonCounter > 0) {
            this.poisonCounter--;
            this.poisonTimer.start();
            this.damage(2 + Math.round(this.CURRENT_HP / 20) + this.player._ai.extraDotDmg);
        }
        if (this.bleedTimer.isStopped() && this.bleedCounter > 0) {
            this.bleedCounter--;
            this.bleedTimer.start();
            this.damage(3 + Math.round(this.maxHealth / 33) + this.player._ai.extraDotDmg);
        }
        if (this.healthBar) {
            this.healthBar.position = this.owner.collisionShape.center.clone().add(new Vec2_1.default(0, -(this.physicHeight + 5)));
            this.healthBar.fillWidth = this.CURRENT_HP / this.maxHealth * this.physicWidth * 3;
            if (this.CURRENT_HP / this.maxHealth >= 2 / 3) {
                this.healthBar.color = Color_1.default.GREEN;
            }
            else if (this.CURRENT_HP / this.maxHealth >= 1 / 3) {
                this.healthBar.color = Color_1.default.YELLOW;
            }
            else {
                this.healthBar.color = Color_1.default.RED;
            }
        }
        if (this.poisonStat) {
            this.poisonStat.position = this.owner.collisionShape.center.clone().add(new Vec2_1.default(-(this.physicWidth) * 1.5 + 10, -(this.physicHeight + 15)));
            this.poisonStat.visible = this.poisonCounter > 0;
        }
        if (this.burnStat) {
            this.burnStat.position = this.poisonStat.position.clone().add(new Vec2_1.default(15, 0));
            this.burnStat.visible = this.burnCounter > 0;
        }
        if (this.bleedStat) {
            this.bleedStat.position = this.poisonStat.position.clone().add(new Vec2_1.default(30, 0));
            this.bleedStat.visible = this.bleedCounter > 0;
        }
        if (this.owner.position.y > this.tilemap.getDimensions().y * this.tilemap.getTileSize().y) {
            this.CURRENT_HP = -1;
            this.emitter.fireEvent(sword_enums_2.Player_Events.ENEMY_KILLED, { owner: this.owner.id, ai: this });
        }
    }
}
exports.default = EnemyAI;
var EnemyStates;
(function (EnemyStates) {
    EnemyStates["PATROL"] = "patrol";
    EnemyStates["ALERT"] = "alert";
    EnemyStates["ATTACK"] = "attack";
})(EnemyStates = exports.EnemyStates || (exports.EnemyStates = {}));

},{"../../Wolfie2D/AI/StateMachineAI":4,"../../Wolfie2D/DataTypes/Shapes/AABB":16,"../../Wolfie2D/DataTypes/Vec2":24,"../../Wolfie2D/Timing/Timer":97,"../../Wolfie2D/Utils/Color":99,"../Tools/InputWrapper":157,"../sword_enums":161,"./EnemyStates/Alert":111,"./EnemyStates/Patrol":118,"./EnemyStates/SlimeAttack":119}],111:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnemyAI_1 = require("../EnemyAI");
const EnemyState_1 = require("./EnemyState");
class Alert extends EnemyState_1.default {
    onEnter(options) {
        this.owner.animation.playIfNotAlready("WALK", true);
    }
    update(deltaT) {
        let position = this.parent.getPlayerPosition();
        if (position) {
            this.parent.velocity.x = this.parent.maxSpeed * Math.sign(position.x - this.owner.position.x);
            this.parent.direction = this.parent.velocity.x >= 0 ? 1 : -1;
            if (this.parent.canAttack(position)) {
                this.finished(EnemyAI_1.EnemyStates.ATTACK);
            }
        }
        else {
            this.parent.velocity.x = 0;
            this.finished(EnemyAI_1.EnemyStates.PATROL);
        }
        if (!this.canWalk()) {
            this.parent.velocity.x = 0;
        }
        this.owner.invertX = this.parent.direction === 1 ? true : false;
        super.update(deltaT);
    }
    onExit() {
        this.owner.animation.stop();
        return null;
    }
}
exports.default = Alert;

},{"../EnemyAI":110,"./EnemyState":117}],112:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnemyAI_1 = require("../EnemyAI");
const Attack_1 = require("./Attack");
const Timer_1 = require("../../../Wolfie2D/Timing/Timer");
//TODO - unfinished 
class ArcherAttack extends Attack_1.default {
    onEnter(options) {
        super.onEnter(options);
        this.pauseTimer = new Timer_1.default(1000);
        this.pauseTimer.start();
        this.dir = this.parent.getPlayerPosition().clone().sub(this.owner.position).normalize();
        this.parent.direction = this.parent.getPlayerPosition().x - this.owner.position.x >= 0 ? 1 : -1;
    }
    update(deltaT) {
        if (this.pauseTimer.isStopped()) {
            this.parent.weapon.use(this.owner, "enemy", this.dir.scale(1, 0));
            this.owner.invertX = this.parent.direction === 1 ? true : false;
            this.finished(EnemyAI_1.EnemyStates.ALERT);
        }
        super.update(deltaT);
    }
    onExit() {
        return null;
    }
}
exports.default = ArcherAttack;

},{"../../../Wolfie2D/Timing/Timer":97,"../EnemyAI":110,"./Attack":114}],113:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnemyAI_1 = require("../EnemyAI");
const Attack_1 = require("./Attack");
const Timer_1 = require("../../../Wolfie2D/Timing/Timer");
const Vec2_1 = require("../../../Wolfie2D/DataTypes/Vec2");
//TODO - unfinished 
class AssassinAttack extends Attack_1.default {
    onEnter(options) {
        super.onEnter(options);
        this.runTimer = new Timer_1.default(500);
        this.pauseTimer = new Timer_1.default(1500);
        this.owner.alpha = 1; //unstealth to attack
        this.startPosition = this.owner.position;
        //look around
        this.owner.invertX != this.owner.invertX;
        this.owner.invertX != this.owner.invertX;
        this.owner.invertX != this.owner.invertX;
        this.owner.invertX != this.owner.invertX;
        if (this.parent.getPlayerPosition() !== null)
            this.owner.position = this.parent.getPlayerPosition().clone().add(new Vec2_1.default(this.parent.player.invertX ? 56 : -56, 0));
        this.pauseTimer.start();
    }
    update(deltaT) {
        if (this.pauseTimer.isStopped()) {
            if (this.runTimer.isStopped() && this.parent.isAttacking || !this.canWalk()) {
                this.emitter.fireEvent(this.attacked);
            }
            while (this.receiver.hasNextEvent()) {
                let event = this.receiver.getNextEvent().type;
                switch (event) {
                    case this.charged:
                        this.parent.isCharging = false;
                        this.parent.isAttacking = true;
                        this.runTimer.start();
                        this.owner.animation.play("ATTACK", true);
                        if (this.parent.getPlayerPosition() !== null)
                            this.parent.direction = this.parent.getPlayerPosition().x - this.owner.position.x >= 0 ? 1 : -1;
                        break;
                    case this.attacked:
                        this.parent.isAttacking = false;
                        this.finished(EnemyAI_1.EnemyStates.ALERT);
                        break;
                }
            }
            this.parent.velocity.x = this.parent.direction * 500;
            this.owner.invertX = this.parent.direction === 1 ? true : false;
            //no gravity for assassin
            if (!this.parent.damageTimer.isStopped() && !this.parent.isAttacking && !this.parent.isCharging) {
                this.parent.velocity.x = 0;
            }
            this.parent.velocity.y = 0;
            this.owner.move(this.parent.velocity.scaled(deltaT));
        }
    }
    onExit() {
        this.owner.alpha = .2; //stealth again
        //this.owner.position = this.startPosition;
        return null;
    }
}
exports.default = AssassinAttack;

},{"../../../Wolfie2D/DataTypes/Vec2":24,"../../../Wolfie2D/Timing/Timer":97,"../EnemyAI":110,"./Attack":114}],114:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnemyState_1 = require("./EnemyState");
class Attack extends EnemyState_1.default {
    onEnter(options) {
        this.parent.attackTimer.start();
        this.parent.velocity.x = 0;
        this.parent.isCharging = true;
        this.charged = this.owner.id + "charged";
        this.attacked = this.owner.id + "attacked";
        this.hasCharged = false;
        // TODO replace DYING with CHARGING
        this.owner.animation.play("CHARGE", false, this.charged);
        this.receiver.subscribe(this.charged);
        this.receiver.subscribe(this.attacked);
    }
    onExit() {
        this.parent.isCharging = false;
        this.owner.animation.stop();
        return null;
    }
}
exports.default = Attack;

},{"./EnemyState":117}],115:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnemyAI_1 = require("../EnemyAI");
const Attack_1 = require("./Attack");
const Timer_1 = require("../../../Wolfie2D/Timing/Timer");
const Vec2_1 = require("../../../Wolfie2D/DataTypes/Vec2");
//TODO - unfinished 
class BossAttack extends Attack_1.default {
    onEnter(options) {
        super.onEnter(options);
        this.pauseTimer = new Timer_1.default(1000);
        this.pauseTimer.start();
        this.atknum = Math.floor(Math.random() * 4);
        this.owner.alpha = 1; //unstealth to attack
        switch (this.atknum) {
            case 0: //archer atk
                console.log("archer atk");
                this.pauseTimer = new Timer_1.default(1000);
                this.pauseTimer.start();
                break;
            case 1: //assassin atk
                console.log("assassin atk");
                this.runTimer = new Timer_1.default(500);
                this.pauseTimer = new Timer_1.default(100);
                this.startPosition = this.owner.position;
                if (this.parent.getPlayerPosition() !== null)
                    this.owner.position = this.parent.getPlayerPosition().clone().add(new Vec2_1.default(this.parent.player.invertX ? 64 : -64, -128));
                this.pauseTimer.start();
                break;
            case 2: //bull atk
                console.log("bull atk");
                this.runTimer = new Timer_1.default(2000);
                break;
            case 3: //tiger atk
                console.log("tiger atk");
                this.velocity = 0;
                break;
            case 4: //snake atk
                console.log("snake atk");
                break;
            default:
                break;
        }
    }
    update(deltaT) {
        //get random atk 
        switch (this.atknum) {
            case 0: //archer atk
                if (this.pauseTimer.isStopped()) {
                    this.parent.direction = this.parent.getPlayerPosition().x - this.owner.position.x >= 0 ? 1 : -1;
                    let dir = this.parent.getPlayerPosition().clone().sub(this.owner.position).normalize();
                    this.parent.weapon.use(this.owner, "enemy", dir.scale(1, 0));
                    this.owner.invertX = this.parent.direction === 1 ? true : false;
                    this.finished(EnemyAI_1.EnemyStates.ALERT);
                }
                super.update(deltaT);
                break;
            case 1: //assassin atk
                if (this.pauseTimer.isStopped()) {
                    if (this.runTimer.isStopped() && this.parent.isAttacking || !this.canWalk()) {
                        this.emitter.fireEvent(this.attacked);
                    }
                    while (this.receiver.hasNextEvent()) {
                        let event = this.receiver.getNextEvent().type;
                        switch (event) {
                            case this.charged:
                                this.parent.isCharging = false;
                                this.parent.isAttacking = true;
                                this.runTimer.start();
                                this.owner.animation.play("ATTACK", true);
                                if (this.parent.getPlayerPosition() !== null)
                                    this.parent.direction = this.parent.getPlayerPosition().x - this.owner.position.x >= 0 ? 1 : -1;
                                break;
                            case this.attacked:
                                this.parent.isAttacking = false;
                                this.finished(EnemyAI_1.EnemyStates.ALERT);
                                break;
                        }
                    }
                    this.parent.velocity.x = this.parent.direction * 500;
                    this.owner.invertX = this.parent.direction === 1 ? true : false;
                    this.owner.alpha = .1;
                    super.update(deltaT);
                }
                break;
            case 2: //bull atk
                if (this.runTimer.isStopped() && this.parent.isAttacking || !this.canWalk()) {
                    this.emitter.fireEvent(this.attacked);
                }
                while (this.receiver.hasNextEvent()) {
                    let event = this.receiver.getNextEvent().type;
                    switch (event) {
                        case this.charged:
                            this.parent.isCharging = false;
                            this.parent.isAttacking = true;
                            this.runTimer.start();
                            this.owner.animation.play("ATTACK", true);
                            this.parent.direction = this.parent.getPlayerPosition().x - this.owner.position.x >= 0 ? 1 : -1;
                            break;
                        case this.attacked:
                            this.parent.isAttacking = false;
                            this.finished(EnemyAI_1.EnemyStates.ALERT);
                            break;
                    }
                }
                this.parent.velocity.x = this.parent.direction * 1000;
                this.owner.invertX = this.parent.direction === 1 ? true : false;
                super.update(deltaT);
                break;
            case 3: //tiger atk
                if (this.parent.isAttacking && this.owner.onGround) {
                    this.emitter.fireEvent(this.attacked);
                }
                while (this.receiver.hasNextEvent()) {
                    let event = this.receiver.getNextEvent().type;
                    switch (event) {
                        case this.charged:
                            this.parent.isCharging = false;
                            this.parent.isAttacking = true;
                            this.owner.animation.play("ATTACK", true);
                            this.velocity = (this.parent.getPlayerPosition().x - this.owner.position.x) / 1.5;
                            this.parent.direction = this.velocity >= 0 ? 1 : -1;
                            this.parent.velocity.y = -800;
                            break;
                        case this.attacked:
                            this.parent.isAttacking = false;
                            this.finished(EnemyAI_1.EnemyStates.ALERT);
                            break;
                    }
                }
                this.parent.velocity.x = this.velocity;
                this.owner.invertX = this.parent.direction === 1 ? true : false;
                super.update(deltaT);
                break;
            case 4: //snake atk
                while (this.receiver.hasNextEvent()) {
                    let event = this.receiver.getNextEvent().type;
                    switch (event) {
                        case this.charged:
                            this.parent.isCharging = false;
                            this.parent.isAttacking = true;
                            this.owner.animation.play("ATTACK", false, this.attacked);
                            this.owner.collisionShape.halfSize.x += 3.5;
                            break;
                        case this.attacked:
                            this.parent.isAttacking = false;
                            this.owner.collisionShape.halfSize.x -= 3.5;
                            this.finished(EnemyAI_1.EnemyStates.ALERT);
                            break;
                    }
                }
                this.owner.invertX = this.parent.direction === 1 ? true : false;
                break;
            default:
                while (this.receiver.hasNextEvent()) {
                    let event = this.receiver.getNextEvent().type;
                    switch (event) {
                        case this.charged:
                            this.parent.isCharging = false;
                            this.parent.isAttacking = true;
                            this.owner.animation.play("ATTACK", false, this.attacked);
                            this.owner.collisionShape.halfSize.x += 3.5;
                            break;
                        case this.attacked:
                            this.parent.isAttacking = false;
                            this.owner.collisionShape.halfSize.x -= 3.5;
                            this.finished(EnemyAI_1.EnemyStates.ALERT);
                            break;
                    }
                }
                this.owner.invertX = this.parent.direction === 1 ? true : false;
                break;
        }
    }
    onExit() {
        return null;
    }
}
exports.default = BossAttack;

},{"../../../Wolfie2D/DataTypes/Vec2":24,"../../../Wolfie2D/Timing/Timer":97,"../EnemyAI":110,"./Attack":114}],116:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnemyAI_1 = require("../EnemyAI");
const Attack_1 = require("./Attack");
const Timer_1 = require("../../../Wolfie2D/Timing/Timer");
class BullAttack extends Attack_1.default {
    onEnter(options) {
        super.onEnter(options);
        this.runTimer = new Timer_1.default(2000);
    }
    update(deltaT) {
        if ((this.runTimer.isStopped() && this.parent.isAttacking) || !this.canWalk()) {
            this.parent.velocity.x = 0;
            this.emitter.fireEvent(this.attacked);
        }
        while (this.receiver.hasNextEvent()) {
            let event = this.receiver.getNextEvent().type;
            switch (event) {
                case this.charged:
                    if (this.hasCharged) {
                        break;
                    }
                    this.hasCharged = true;
                    console.log("charged");
                    this.parent.isCharging = false;
                    this.parent.isAttacking = true;
                    this.runTimer.start();
                    this.owner.animation.play("ATTACK", true);
                    this.parent.direction = this.parent.getPlayerPosition().x - this.owner.position.x >= 0 ? 1 : -1;
                    break;
                case this.attacked:
                    this.parent.isAttacking = false;
                    this.finished(EnemyAI_1.EnemyStates.ALERT);
                    break;
            }
        }
        if (this.parent.isAttacking) {
            this.parent.velocity.x = this.parent.direction * 600;
            this.owner.invertX = this.parent.direction === 1 ? true : false;
        }
        super.update(deltaT);
    }
}
exports.default = BullAttack;

},{"../../../Wolfie2D/Timing/Timer":97,"../EnemyAI":110,"./Attack":114}],117:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const State_1 = require("../../../Wolfie2D/DataTypes/State/State");
const Vec2_1 = require("../../../Wolfie2D/DataTypes/Vec2");
const Receiver_1 = require("../../../Wolfie2D/Events/Receiver");
class EnemyState extends State_1.default {
    constructor(parent, owner) {
        super(parent);
        this.gravity = 1500; //TODO - can change later
        this.owner = owner;
        this.receiver = new Receiver_1.default();
    }
    handleInput(event) { }
    canWalk() {
        let collision = this.owner.collisionShape;
        let colrow = this.parent.tilemap.getColRowAt(collision.center.clone().add(new Vec2_1.default(this.parent.direction * (collision.hw + 2), (collision.hh + 2 - 32))));
        return !this.parent.tilemap.isTileCollidable(colrow.x, colrow.y) && this.parent.tilemap.isTileCollidable(colrow.x, colrow.y + 1);
    }
    update(deltaT) {
        if (!this.parent.damageTimer.isStopped() && !this.parent.isAttacking && !this.parent.isCharging) {
            this.parent.velocity.x = 0;
        }
        // Do gravity
        if (this.owner.onGround) {
            this.parent.velocity.y = 0;
        }
        else if (this.owner.onCeiling) {
            this.parent.velocity.y += this.gravity * deltaT * 2;
        }
        else {
            this.parent.velocity.y += this.gravity * deltaT;
        }
        this.owner.move(this.parent.velocity.scaled(deltaT));
    }
}
exports.default = EnemyState;

},{"../../../Wolfie2D/DataTypes/State/State":20,"../../../Wolfie2D/DataTypes/Vec2":24,"../../../Wolfie2D/Events/Receiver":31}],118:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnemyAI_1 = require("../EnemyAI");
const EnemyState_1 = require("./EnemyState");
class Patrol extends EnemyState_1.default {
    onEnter(options) {
        this.owner.animation.playIfNotAlready("IDLE", true);
    }
    update(deltaT) {
        if (!this.canWalk()) {
            this.parent.direction *= -1;
        }
        //move
        this.parent.velocity.x = this.parent.direction * this.parent.speed;
        this.owner.invertX = this.parent.direction === 1 ? true : false;
        if (this.parent.getPlayerPosition()) {
            this.finished(EnemyAI_1.EnemyStates.ALERT);
        }
        super.update(deltaT);
    }
    onExit() {
        this.owner.animation.stop();
        return null;
    }
}
exports.default = Patrol;

},{"../EnemyAI":110,"./EnemyState":117}],119:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnemyAI_1 = require("../EnemyAI");
const Attack_1 = require("./Attack");
class SlimeAttack extends Attack_1.default {
    onEnter(options) {
    }
    update(deltaT) {
        this.finished(EnemyAI_1.EnemyStates.ALERT);
    }
    onExit() {
        return null;
    }
}
exports.default = SlimeAttack;

},{"../EnemyAI":110,"./Attack":114}],120:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnemyAI_1 = require("../EnemyAI");
const Attack_1 = require("./Attack");
class SnakeAttack extends Attack_1.default {
    update(deltaT) {
        while (this.receiver.hasNextEvent()) {
            let event = this.receiver.getNextEvent().type;
            switch (event) {
                case this.charged:
                    this.parent.isCharging = false;
                    this.parent.isAttacking = true;
                    this.owner.animation.play("ATTACK", false, this.attacked);
                    this.owner.collisionShape.halfSize.x += 3.5;
                    break;
                case this.attacked:
                    this.parent.isAttacking = false;
                    this.owner.collisionShape.halfSize.x -= 3.5;
                    this.finished(EnemyAI_1.EnemyStates.ALERT);
                    break;
            }
        }
        this.owner.invertX = this.parent.direction === 1 ? true : false;
    }
}
exports.default = SnakeAttack;

},{"../EnemyAI":110,"./Attack":114}],121:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnemyAI_1 = require("../EnemyAI");
const Attack_1 = require("./Attack");
class TigerAttack extends Attack_1.default {
    onEnter(options) {
        super.onEnter(options);
        this.velocity = 0;
    }
    update(deltaT) {
        if (this.parent.isAttacking && this.owner.onGround) {
            this.emitter.fireEvent(this.attacked);
        }
        while (this.receiver.hasNextEvent()) {
            let event = this.receiver.getNextEvent().type;
            switch (event) {
                case this.charged:
                    this.parent.isCharging = false;
                    this.parent.isAttacking = true;
                    this.owner.animation.play("ATTACK", true);
                    this.velocity = (this.parent.getPlayerPosition().x - this.owner.position.x);
                    this.parent.direction = this.velocity >= 0 ? 1 : -1;
                    this.parent.velocity.y = -800;
                    break;
                case this.attacked:
                    this.parent.isAttacking = false;
                    this.finished(EnemyAI_1.EnemyStates.ALERT);
                    break;
            }
        }
        this.parent.velocity.x = this.velocity;
        this.owner.invertX = this.parent.direction === 1 ? true : false;
        super.update(deltaT);
    }
}
exports.default = TigerAttack;

},{"../EnemyAI":110,"./Attack":114}],122:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnemyAI_1 = require("./EnemyAI");
const SlimeAttack_1 = require("./EnemyStates/SlimeAttack");
class SlimeAI extends EnemyAI_1.default {
    constructor() {
        super(...arguments);
        this.speed = 15;
    }
    initializeAI(owner, options) {
        super.initializeAI(owner, options);
        this.addState(EnemyAI_1.EnemyStates.ATTACK, new SlimeAttack_1.default(this, owner));
    }
}
exports.default = SlimeAI;

},{"./EnemyAI":110,"./EnemyStates/SlimeAttack":119}],123:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnemyAI_1 = require("./EnemyAI");
const SnakeAttack_1 = require("./EnemyStates/SnakeAttack");
class SnakeAI extends EnemyAI_1.default {
    initializeAI(owner, options) {
        super.initializeAI(owner, options);
        this.addState(EnemyAI_1.EnemyStates.ATTACK, new SnakeAttack_1.default(this, owner));
    }
    collideWithPlayer(player) {
        if (this.isAttacking) {
            player.poisonCounter = 5;
        }
        player.damage(10);
    }
}
exports.default = SnakeAI;

},{"./EnemyAI":110,"./EnemyStates/SnakeAttack":120}],124:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnemyAI_1 = require("./EnemyAI");
const TigerAttack_1 = require("./EnemyStates/TigerAttack");
class TigerAI extends EnemyAI_1.default {
    initializeAI(owner, options) {
        super.initializeAI(owner, options);
        this.addState(EnemyAI_1.EnemyStates.ATTACK, new TigerAttack_1.default(this, owner));
    }
    getPlayerPosition() {
        if (this.owner.position.distanceTo(this.player.position) <= 800) {
            return this.player.position;
        }
        return null;
    }
    canAttack(position) {
        return this.attackTimer.isStopped();
    }
    collideWithPlayer(player) {
        if (this.isAttacking) {
            player.bleedCounter += 3;
        }
        player.damage(10);
    }
}
exports.default = TigerAI;

},{"./EnemyAI":110,"./EnemyStates/TigerAttack":121}],125:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BattleManager {
    handleInteraction(attackerType, weapon, user) {
        //may be unneeded since we are controlling the player - 
        //we determine enemy collision there
        if (attackerType === "player") {
            // Check for collisions with enemies
            if (this.enemies.length != 0) {
                for (let enemy of this.enemies) {
                    if (weapon.hits(enemy.owner)) {
                        let player = this.players[0];
                        if (player.fullHpBonus) {
                            enemy.damage(Math.round(weapon.type.damage * this.players[0].CURRENT_ATK / 10));
                        }
                        else {
                            enemy.damage(Math.round(weapon.type.damage * this.players[0].CURRENT_ATK / 100));
                        }
                        //console.log("enemy took dmg");
                        //add checking for each onhit buff here
                        //DOTS
                        if (player.hasBleed) {
                            enemy.bleedCounter += 3;
                        }
                        if (player.hasPoison) {
                            enemy.poisonCounter = 5;
                        }
                        if (player.hasBurn) {
                            enemy.burnCounter = 5;
                        }
                        if (player.hasLifesteal) {
                            player.addHealth(Math.round(weapon.type.damage * player.CURRENT_ATK / 100 * player.lifestealratio));
                        }
                    }
                }
            }
        }
        else {
            // Check for collision with player
            for (let player of this.players) {
                if (weapon.hits(player.owner)) {
                    player.damage(weapon.type.damage, user);
                    if (player.hasShield) {
                        player.addShield(weapon.type.damage * .5); //half of dmg taken is converted to shield
                    }
                }
            }
        }
    }
    setPlayers(player) {
        this.players = player;
    }
    setEnemies(enemies) {
        this.enemies = enemies;
    }
    addEnemy(enemy) {
        this.enemies.push(enemy);
    }
    removeEnemy(enemy) {
        this.enemies = this.enemies.filter(item => item !== enemy);
        if (this.enemies.length == 0) {
            this.enemies = new Array();
        }
        return this.enemies;
    }
}
exports.default = BattleManager;

},{}],126:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("../../Wolfie2D/DataTypes/Vec2");
const GraphicTypes_1 = require("../../Wolfie2D/Nodes/Graphics/GraphicTypes");
const Color_1 = require("../../Wolfie2D/Utils/Color");
class InventoryManager {
    constructor(scene, size, inventorySlot, position, padding, slotLayer, itemLayer) {
        this.items = new Array(size);
        this.inventorySlots = new Array(size);
        this.padding = padding;
        this.position = position;
        this.currentSlot = 0;
        // Add layers
        this.slotLayer = slotLayer;
        let layer = scene.addUILayer(this.slotLayer);
        layer.setDepth(100);
        layer.setHidden(true);
        this.itemLayer = itemLayer;
        layer = scene.addUILayer(this.itemLayer);
        layer.setDepth(101);
        layer.setHidden(true);
        // Create the inventory slots
        for (let i = 0; i < size; i++) {
            this.inventorySlots[i] = scene.add.sprite(inventorySlot, this.slotLayer);
        }
        this.slotSize = this.inventorySlots[0].size.clone();
        // Position the inventory slots
        for (let i = 0; i < size; i++) {
            this.inventorySlots[i].position.set(position.x + i * (this.slotSize.x + this.padding), position.y);
        }
        // Add a rect for the selected slot
        this.selectedSlot = scene.add.graphic(GraphicTypes_1.GraphicType.RECT, slotLayer, { position: this.position.clone(), size: this.slotSize.clone().inc(-2) });
        this.selectedSlot.color = Color_1.default.WHITE;
        this.selectedSlot.color.a = 0.2;
    }
    getItem() {
        return this.items[this.currentSlot];
    }
    /**
     * Changes the currently selected slot
     */
    changeSlot(slot) {
        this.currentSlot = slot;
        this.selectedSlot.position.copy(this.inventorySlots[slot].position);
    }
    /**
     * Gets the currently selected slot
     */
    getSlot() {
        return this.currentSlot;
    }
    /**
     * Adds an item to the currently selected slot
     */
    addItem(item) {
        if (!this.items[this.currentSlot]) {
            // Add the item to the inventory
            this.items[this.currentSlot] = item;
            // Update the gui
            item.moveSprite(new Vec2_1.default(this.position.x + this.currentSlot * (this.slotSize.x + this.padding), this.position.y), this.itemLayer);
            return true;
        }
        // Failed to add item, something was already in the slot
        return false;
    }
    /**
     * Removes and returns an item from the the currently selected slot, if possible
     */
    removeItem() {
        let item = this.items[this.currentSlot];
        this.items[this.currentSlot] = null;
        if (item) {
            return item;
        }
        else {
            return null;
        }
    }
    setActive(active) {
        if (active) {
            this.inventorySlots.forEach(slot => slot.alpha = 1.0);
        }
        else {
            this.inventorySlots.forEach(slot => slot.alpha = 0.5);
        }
    }
}
exports.default = InventoryManager;

},{"../../Wolfie2D/DataTypes/Vec2":24,"../../Wolfie2D/Nodes/Graphics/GraphicTypes":42,"../../Wolfie2D/Utils/Color":99}],127:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Item {
    constructor(sprite) {
        this.sprite = sprite;
    }
    moveSprite(position, layer) {
        // Change the layer if needed
        if (layer) {
            let currentLayer = this.sprite.getLayer();
            currentLayer.removeNode(this.sprite);
            let newLayer = this.sprite.getScene().getLayer(layer);
            newLayer.addNode(this.sprite);
            this.sprite.setLayer(newLayer);
        }
        // Move the sprite
        this.sprite.position.copy(position);
    }
}
exports.default = Item;

},{}],128:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//TODO import Vec2 from "../../../Wolfie2D/DataTypes/Vec2";
const Emitter_1 = require("../../../Wolfie2D/Events/Emitter");
const Timer_1 = require("../../../Wolfie2D/Timing/Timer");
const Item_1 = require("./Item");
class Weapon extends Item_1.default {
    constructor(sprite, type, battleManager) {
        super(sprite);
        this.cooldown = 0;
        // Set the weapon type
        this.type = type.clone();
        // Keep a reference to the sprite of this weapon
        this.sprite = sprite;
        // Create an event emitter
        this.emitter = new Emitter_1.default();
        // Save a reference to the battler manager
        this.battleManager = battleManager;
        // Create the cooldown timer
        this.cooldownTimer = new Timer_1.default(type.cooldown);
        this.cooldown = type.cooldown;
        this.EXTRA_DAMAGE = 0;
        this.EXTRA_RANGE = 0;
    }
    // @override
    /**
     * Uses this weapon in the specified direction.
     * This only works if the cooldown timer has ended
     */
    use(user, userType, direction) {
        // If the cooldown timer is still running, we can't use the weapon
        if (!this.cooldownTimer.isStopped()) {
            return false;
        }
        // Rely on the weapon type to create any necessary assets
        this.assets = this.type.createRequiredAssets(this.sprite.getScene());
        // Do a type specific weapon animation
        this.type.doAnimation(user, direction, ...this.assets, this.EXTRA_RANGE);
        // Apply damage
        this.battleManager.handleInteraction(userType, this, user);
        // Reset the cooldown timer
        this.cooldownTimer.start();
        //TODO - may have to move elsewhere
        //this.emitter.fireEvent(GameEventType.PLAY_SOUND, {key: "sword", loop: false, holdReference: false});
        return true;
    }
    /**
     * A check for whether or not this weapon hit a node
     */
    hits(node) {
        return this.type.hits(node, ...this.assets);
    }
}
exports.default = Weapon;

},{"../../../Wolfie2D/Events/Emitter":27,"../../../Wolfie2D/Timing/Timer":97,"./Item":127}],129:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AABB_1 = require("../../../../Wolfie2D/DataTypes/Shapes/AABB");
const Vec2_1 = require("../../../../Wolfie2D/DataTypes/Vec2");
const GameNode_1 = require("../../../../Wolfie2D/Nodes/GameNode");
const GraphicTypes_1 = require("../../../../Wolfie2D/Nodes/Graphics/GraphicTypes");
const Color_1 = require("../../../../Wolfie2D/Utils/Color");
const EaseFunctions_1 = require("../../../../Wolfie2D/Utils/EaseFunctions");
const sword_enums_1 = require("../../../sword_enums");
const WeaponType_1 = require("./WeaponType");
class laserGun extends WeaponType_1.default {
    initialize(options) {
        this.damage = options.damage;
        this.cooldown = options.cooldown;
        this.hexColor = options.color;
        this.color = Color_1.default.fromStringHex(options.color);
        this.displayName = options.displayName;
        this.spriteKey = options.spriteKey;
        this.useVolume = options.useVolume;
    }
    doAnimation(shooter, direction, line) {
        let start = shooter.position.clone().add(shooter.colliderOffset);
        let end = shooter.position.clone().add(direction.scaled(900)).add(shooter.colliderOffset);
        let delta = end.clone().sub(start);
        // Iterate through the tilemap region until we find a collision
        let minX = Math.min(start.x, end.x);
        let maxX = Math.max(start.x, end.x);
        let minY = Math.min(start.y, end.y);
        let maxY = Math.max(start.y, end.y);
        // Get the wall tilemap
        let walls = shooter.getScene().getLayer("Wall").getItems()[0];
        let minIndex = walls.getColRowAt(new Vec2_1.default(minX, minY));
        let maxIndex = walls.getColRowAt(new Vec2_1.default(maxX, maxY));
        let tileSize = walls.getTileSize();
        for (let col = minIndex.x; col <= maxIndex.x; col++) {
            for (let row = minIndex.y; row <= maxIndex.y; row++) {
                if (walls.isTileCollidable(col, row)) {
                    // Get the position of this tile
                    let tilePos = new Vec2_1.default(col * tileSize.x + tileSize.x / 2, row * tileSize.y + tileSize.y / 2);
                    // Create a collider for this tile
                    let collider = new AABB_1.default(tilePos, tileSize.scaled(1 / 2));
                    let hit = collider.intersectSegment(start, delta, Vec2_1.default.ZERO);
                    if (hit !== null && start.distanceSqTo(hit.pos) < start.distanceSqTo(end)) {
                        console.log("Found hit");
                        end = hit.pos;
                    }
                }
            }
        }
        line.start = start;
        line.end = end;
        line.tweens.play("fade");
    }
    createRequiredAssets(scene) {
        let line = scene.add.graphic(GraphicTypes_1.GraphicType.LINE, "primary", { start: new Vec2_1.default(-1, 1), end: new Vec2_1.default(-1, -1) });
        line.color = this.color;
        line.thickness = 90;
        line.tweens.add("fade", {
            startDelay: 0,
            duration: 800,
            effects: [
                {
                    property: GameNode_1.TweenableProperties.alpha,
                    start: 1,
                    end: 0,
                    ease: EaseFunctions_1.EaseFunctionType.OUT_SINE
                }
            ],
            onEnd: sword_enums_1.Player_Events.UNLOAD_ASSET
        });
        return [line];
    }
    hits(node, line) {
        return node.collisionShape.getBoundingRect().intersectSegment(line.start, line.end.clone().sub(line.start)) !== null;
    }
    clone() {
        let newType = new laserGun();
        newType.initialize({ damage: this.damage, color: this.hexColor, cooldown: this.cooldown, displayName: this.displayName, spriteKey: this.spriteKey, useVolume: this.useVolume });
        return newType;
    }
}
exports.default = laserGun;

},{"../../../../Wolfie2D/DataTypes/Shapes/AABB":16,"../../../../Wolfie2D/DataTypes/Vec2":24,"../../../../Wolfie2D/Nodes/GameNode":40,"../../../../Wolfie2D/Nodes/Graphics/GraphicTypes":42,"../../../../Wolfie2D/Utils/Color":99,"../../../../Wolfie2D/Utils/EaseFunctions":100,"../../../sword_enums":161,"./WeaponType":132}],130:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AABB_1 = require("../../../../Wolfie2D/DataTypes/Shapes/AABB");
const Vec2_1 = require("../../../../Wolfie2D/DataTypes/Vec2");
const GameNode_1 = require("../../../../Wolfie2D/Nodes/GameNode");
const GraphicTypes_1 = require("../../../../Wolfie2D/Nodes/Graphics/GraphicTypes");
const Color_1 = require("../../../../Wolfie2D/Utils/Color");
const EaseFunctions_1 = require("../../../../Wolfie2D/Utils/EaseFunctions");
const sword_enums_1 = require("../../../sword_enums");
const WeaponType_1 = require("./WeaponType");
class SemiAutoGun extends WeaponType_1.default {
    initialize(options) {
        this.damage = options.damage;
        this.cooldown = options.cooldown;
        this.hexColor = options.color;
        this.color = Color_1.default.fromStringHex(options.color);
        this.displayName = options.displayName;
        this.spriteKey = options.spriteKey;
        this.useVolume = options.useVolume;
    }
    doAnimation(shooter, direction, line) {
        let start = shooter.position.clone().add(shooter.colliderOffset);
        let end = shooter.position.clone().add(direction.scaled(900)).add(shooter.colliderOffset);
        let delta = end.clone().sub(start);
        // Iterate through the tilemap region until we find a collision
        let minX = Math.min(start.x, end.x);
        let maxX = Math.max(start.x, end.x);
        let minY = Math.min(start.y, end.y);
        let maxY = Math.max(start.y, end.y);
        // Get the wall tilemap
        let walls = shooter.getScene().getLayer("Wall").getItems()[0];
        let minIndex = walls.getColRowAt(new Vec2_1.default(minX, minY));
        let maxIndex = walls.getColRowAt(new Vec2_1.default(maxX, maxY));
        let tileSize = walls.getTileSize();
        for (let col = minIndex.x; col <= maxIndex.x; col++) {
            for (let row = minIndex.y; row <= maxIndex.y; row++) {
                if (walls.isTileCollidable(col, row)) {
                    // Get the position of this tile
                    let tilePos = new Vec2_1.default(col * tileSize.x + tileSize.x / 2, row * tileSize.y + tileSize.y / 2);
                    // Create a collider for this tile
                    let collider = new AABB_1.default(tilePos, tileSize.scaled(1 / 2));
                    let hit = collider.intersectSegment(start, delta, Vec2_1.default.ZERO);
                    if (hit !== null && start.distanceSqTo(hit.pos) < start.distanceSqTo(end)) {
                        console.log("Found hit");
                        end = hit.pos;
                    }
                }
            }
        }
        line.start = start;
        line.end = end;
        line.tweens.play("fade");
    }
    createRequiredAssets(scene) {
        let line = scene.add.graphic(GraphicTypes_1.GraphicType.LINE, "primary", { start: new Vec2_1.default(-1, 1), end: new Vec2_1.default(-1, -1) });
        line.color = this.color;
        line.thickness = 5;
        line.tweens.add("fade", {
            startDelay: 0,
            duration: 600,
            effects: [
                {
                    property: GameNode_1.TweenableProperties.alpha,
                    start: 1,
                    end: 0,
                    ease: EaseFunctions_1.EaseFunctionType.OUT_SINE
                }
            ],
            onEnd: sword_enums_1.Player_Events.UNLOAD_ASSET
        });
        return [line];
    }
    hits(node, line) {
        return node.collisionShape.getBoundingRect().intersectSegment(line.start, line.end.clone().sub(line.start)) !== null;
    }
    clone() {
        let newType = new SemiAutoGun();
        newType.initialize({ color: this.hexColor, damage: this.damage, cooldown: this.cooldown, displayName: this.displayName, spriteKey: this.spriteKey, useVolume: this.useVolume });
        return newType;
    }
}
exports.default = SemiAutoGun;

},{"../../../../Wolfie2D/DataTypes/Shapes/AABB":16,"../../../../Wolfie2D/DataTypes/Vec2":24,"../../../../Wolfie2D/Nodes/GameNode":40,"../../../../Wolfie2D/Nodes/Graphics/GraphicTypes":42,"../../../../Wolfie2D/Utils/Color":99,"../../../../Wolfie2D/Utils/EaseFunctions":100,"../../../sword_enums":161,"./WeaponType":132}],131:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("../../../../Wolfie2D/DataTypes/Vec2");
const WeaponType_1 = require("./WeaponType");
class Slice extends WeaponType_1.default {
    initialize(options) {
        this.damage = options.damage;
        this.cooldown = options.cooldown;
        this.displayName = options.displayName;
        this.spriteKey = options.spriteKey;
        this.useVolume = options.useVolume;
    }
    doAnimation(attacker, direction, sliceSprite, extraRange) {
        // Rotate this with the game node
        // TODO - need to rotate the anim properly
        //sliceSprite.rotation = attacker.rotation;
        //sliceSprite.rotation = (<Sprite>attacker).invertX? .5* Math.PI : 1.5 * Math.PI;
        sliceSprite.invertX = attacker.invertX;
        //TODO- 
        //4 to scale up the default sprite - may be different later depending on atk anim
        sliceSprite.scaleX = 2 * (1 + extraRange); //might have to add extra range to y as well
        sliceSprite.scaleY = 2;
        // Move the slice out from the player
        //scale = num of pixels between center of sprite and atk anim
        sliceSprite.position = attacker.position.clone().add(direction.scaled(32));
        sliceSprite.position = sliceSprite.position.add(new Vec2_1.default(0, 16)); //make it go down a bit
        // Play the slice animation w/o loop, but queue the normal animation
        sliceSprite.animation.play("SLICE");
        sliceSprite.animation.queue("NORMAL", true);
    }
    createRequiredAssets(scene) {
        let slice = scene.add.animatedSprite("slice", "primary");
        slice.animation.play("NORMAL", true);
        return [slice];
    }
    hits(node, sliceSprite) {
        return sliceSprite.boundary.overlaps(node.collisionShape);
    }
    clone() {
        let newType = new Slice();
        newType.initialize({ damage: this.damage, cooldown: this.cooldown, displayName: this.displayName, spriteKey: this.spriteKey, useVolume: this.useVolume });
        return newType;
    }
}
exports.default = Slice;

},{"../../../../Wolfie2D/DataTypes/Vec2":24,"./WeaponType":132}],132:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class WeaponType {
}
exports.default = WeaponType;

},{}],133:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuffCategory = exports.Buff = exports.BuffType = exports.PlayerStates = exports.PlayerType = void 0;
const StateMachineAI_1 = require("../../Wolfie2D/AI/StateMachineAI");
const Vec2_1 = require("../../Wolfie2D/DataTypes/Vec2");
const sword_enums_1 = require("../sword_enums");
const Fall_1 = require("./PlayerStates/Fall");
const Idle_1 = require("./PlayerStates/Idle");
const InAir_1 = require("./PlayerStates/InAir");
const Jump_1 = require("./PlayerStates/Jump");
const Walk_1 = require("./PlayerStates/Walk");
const Debug_1 = require("../../Wolfie2D/Debug/Debug");
const InputWrapper_1 = require("../Tools/InputWrapper");
const Timer_1 = require("../../Wolfie2D/Timing/Timer");
const PlayerState_1 = require("./PlayerStates/PlayerState");
const GameEventType_1 = require("../../Wolfie2D/Events/GameEventType");
var PlayerType;
(function (PlayerType) {
    PlayerType["PLATFORMER"] = "platformer";
    PlayerType["TOPDOWN"] = "topdown";
})(PlayerType = exports.PlayerType || (exports.PlayerType = {}));
var PlayerStates;
(function (PlayerStates) {
    PlayerStates["IDLE"] = "idle";
    PlayerStates["WALK"] = "walk";
    PlayerStates["JUMP"] = "jump";
    PlayerStates["FALL"] = "fall";
    PlayerStates["PREVIOUS"] = "previous";
})(PlayerStates = exports.PlayerStates || (exports.PlayerStates = {}));
var BuffType;
(function (BuffType) {
    BuffType["FLAT_ATK"] = "attack";
    BuffType["PERCENT_ATK"] = "percent_attack";
    BuffType["DEF"] = "defence";
    BuffType["FLAT_HEALTH"] = "health";
    BuffType["PERCENT_HEALTH"] = "percent_health";
    BuffType["SPEED"] = "speed";
    BuffType["RANGE"] = "range";
    BuffType["ATKSPEED"] = "attackspeed";
    BuffType["POISON"] = "poison";
    BuffType["BLEED"] = "bleed";
    BuffType["BURN"] = "burn";
    BuffType["EXTRA_DOT"] = "extradot";
    BuffType["SHIELD"] = "shield";
    BuffType["SHIELD_DMG"] = "shielddmg";
    BuffType["LIFESTEAL"] = "lifesteal";
    BuffType["LIFESTEALBUFF"] = "lifestealbuff";
    BuffType["EXTRALIFE"] = "extralife";
    BuffType["ONESHOT"] = "oneshot";
    BuffType["FULLHPBONUSDMG"] = "fullhpbonusdmg";
})(BuffType = exports.BuffType || (exports.BuffType = {}));
class Buff {
}
exports.Buff = Buff;
//TODO - need better names 
var BuffCategory;
(function (BuffCategory) {
    BuffCategory["ATTACK"] = "ATTACK";
    BuffCategory["DOT"] = "DOT";
    BuffCategory["SHIELD"] = "SHIELD";
    BuffCategory["HEALTH"] = "HEALTH";
    BuffCategory["EXTRA"] = "EXTRA";
})(BuffCategory = exports.BuffCategory || (exports.BuffCategory = {}));
//TODO - discuss max stats during refinement, unused for now
class PlayerController extends StateMachineAI_1.default {
    constructor() {
        super(...arguments);
        this.velocity = Vec2_1.default.ZERO;
        //will need to discuss redundant stats
        this.speed = 200;
        this.MIN_SPEED = 200;
        this.MAX_SPEED = 300;
        this.BASE_HP = 100;
        this.MAX_HP = 100;
        this.CURRENT_HP = 100;
        this.BASE_ATK = 100;
        this.CURRENT_ATK = 100;
        this.damage_multiplier = .75; // percent of damage taken
        this.CURRENT_EXP = 0;
        this.MAX_EXP = 100;
        this.CURRENT_SHIELD = 0;
        this.MAX_SHIELD = 20;
        this.invincible = false;
        //for doublejumps maybe = # of jumps in air allowed
        this.MAX_airjumps = 1;
        this.airjumps = 0;
        //add to current_buffs later
        this.hasBleed = false;
        this.hasPoison = false;
        this.hasBurn = false;
        this.hasShield = false;
        this.shieldDamage = 1;
        this.hasLifesteal = false;
        this.lifestealratio = 0; //percent of damage to steal
        this.hasOneShot = false;
        this.extraDotDmg = 0;
        this.lives = 2;
        this.cooldownMultiplier = 1;
        this.fullHpBonus = false;
        this.poisonCounter = 0;
        this.burnCounter = 0;
        this.bleedCounter = 0;
    }
    //TODO - get the correct tilemap
    initializeAI(owner, options) {
        this.owner = owner;
        this.initializePlatformer();
        this.tilemap = this.owner.getScene().getTilemap(options.tilemap);
        this.inventory = options.inventory;
        this.lookDirection = new Vec2_1.default();
        //i frame timer
        PlayerController.invincibilityTimer = new Timer_1.default(2000);
        //initialize the buff pool - each has weight of 2 at first 
        PlayerController.buffPool = new Array();
        for (let i = 0; i < 2; i++) {
            PlayerController.buffPool.push(BuffCategory.ATTACK);
            PlayerController.buffPool.push(BuffCategory.DOT);
            PlayerController.buffPool.push(BuffCategory.SHIELD);
            PlayerController.buffPool.push(BuffCategory.HEALTH);
        }
        PlayerController.buffPool.push(BuffCategory.EXTRA); //only give EXTRA category a weight of 1
        //initialize dot timers
        this.burnTimer = new Timer_1.default(1000);
        this.bleedTimer = new Timer_1.default(1000);
        this.poisonTimer = new Timer_1.default(1000);
        if (PlayerController.appliedBuffs.length != 0) {
            PlayerController.appliedBuffs.forEach(buff => this.addBuff(buff, true));
        }
        //to test the buffs
        //this.addBuff( {type:BuffType.HEALTH, value:1} );
        //this.addBuff({type:BuffType.BURN, value:1, category:BuffCategory.DOT});
        //this.addBuff({type:BuffType.BLEED, value:1, category:BuffCategory.DOT});
        //this.addBuff({type:BuffType.POISON, value:1, category:BuffCategory.DOT});
    }
    static reset() {
        PlayerController.appliedBuffs = new Array();
        PlayerController.buffPool = new Array();
        PlayerController.enemiesKilled = 0;
        PlayerController.level = 1;
        PlayerController.godMode = false;
    }
    initializePlatformer() {
        this.speed = 400;
        let idle = new Idle_1.default(this, this.owner);
        this.addState(PlayerStates.IDLE, idle);
        let walk = new Walk_1.default(this, this.owner);
        this.addState(PlayerStates.WALK, walk);
        let jump = new Jump_1.default(this, this.owner);
        this.addState(PlayerStates.JUMP, jump);
        let fall = new Fall_1.default(this, this.owner);
        this.addState(PlayerStates.FALL, fall);
        this.initialize(PlayerStates.IDLE);
    }
    changeState(stateName) {
        // If we jump or fall, push the state so we can go back to our current state later
        // unless we're going from jump to fall or something
        if ((stateName === PlayerStates.JUMP || stateName === PlayerStates.FALL) && !(this.stack.peek() instanceof InAir_1.default)) {
            this.stack.push(this.stateMap.get(stateName));
        }
        super.changeState(stateName);
    }
    update(deltaT) {
        super.update(deltaT);
        if (PlayerController.invincibilityTimer.isStopped()) {
            this.invincible = false;
        }
        if (this.currentState instanceof Jump_1.default) {
            Debug_1.default.log("playerstate", "Player State: Jump");
        }
        else if (this.currentState instanceof Walk_1.default) {
            Debug_1.default.log("playerstate", "Player State: Walk");
        }
        else if (this.currentState instanceof Idle_1.default) {
            Debug_1.default.log("playerstate", "Player State: Idle");
        }
        else if (this.currentState instanceof Fall_1.default) {
            Debug_1.default.log("playerstate", "Player State: Fall");
        }
        Debug_1.default.log("player speed", "player speed: x: " + this.velocity.x + ", y:" + this.velocity.y);
        Debug_1.default.log("player Coords:", "Player Coords:" + this.owner.position);
        //testing the attacks here, may be moved to another place later
        if (InputWrapper_1.default.isAttackJustPressed()) {
            let item = this.inventory.getItem();
            this.owner.animation.play("ATTACK", true);
            //TODO - get proper look direction 
            this.lookDirection.x = this.owner.invertX ? -1 : 1;
            // If there is an item in the current slot, use it
            if (item) {
                if (item.use(this.owner, "player", this.lookDirection))
                    this.emitter.fireEvent(GameEventType_1.GameEventType.PLAY_SOUND, { key: "sword", loop: false, holdReference: false });
            }
        }
        //check dot effects
        if (this.burnTimer.isStopped() && this.burnCounter > 0) {
            console.log("player is burnt");
            this.burnCounter--;
            this.burnTimer.start();
            this.dotDamage(5);
        }
        if (this.poisonTimer.isStopped() && this.poisonCounter > 0) {
            console.log("player is poisoned");
            this.poisonCounter--;
            this.poisonTimer.start();
            this.dotDamage(Math.round(this.CURRENT_HP / 33));
        }
        if (this.bleedTimer.isStopped() && this.bleedCounter > 0) {
            console.log("player is bleeding");
            this.bleedCounter--;
            this.bleedTimer.start();
            this.dotDamage(2 + Math.round(this.MAX_HP / 50));
        }
    }
    // TODO - figure out attacker 
    damage(damage, attacker) {
        if (PlayerController.godMode) {
            //console.log("godmode");
            return;
        }
        if (!this.invincible && PlayerState_1.default.dashTimer.isStopped()) {
            //console.log("take damage");
            //i frame here
            PlayerController.invincibilityTimer.start();
            this.invincible = true;
            //shield absorbs the damage and sends dmg back to attacker
            if (this.CURRENT_SHIELD > 0) {
                let newshield = Math.max(0, this.CURRENT_SHIELD - damage); //calculate the new shield value
                if (attacker !== undefined) {
                    attacker._ai.damage((this.CURRENT_SHIELD - newshield) * this.shieldDamage); //damage the attacker the dmg taken to shield
                }
                this.CURRENT_SHIELD = newshield; //update shield value
            }
            else {
                //console.log("hurt anim");
                this.owner.animation.play("HURT");
                damage *= this.damage_multiplier;
                damage = Math.round(damage);
                this.CURRENT_HP -= damage;
                this.emitter.fireEvent(GameEventType_1.GameEventType.PLAY_SOUND, { key: "hurt", loop: false, holdReference: false });
                //if player has shield buff give them shield when damaged
                if (this.hasShield) {
                    this.CURRENT_SHIELD += damage * .5;
                }
            }
        }
        else {
            //console.log("player is invincible");
        }
        if (this.CURRENT_HP <= 0) {
            this.lives--;
            this.owner.animation.play("DYING");
            this.owner.animation.queue("DEAD", true, sword_enums_1.Player_Events.PLAYER_KILLED);
            this.emitter.fireEvent(sword_enums_1.Player_Events.PLAYER_KILLED);
        }
    }
    dotDamage(damage) {
        if (PlayerController.godMode) {
            //console.log("godmode");
            return;
        }
        this.owner.animation.play("HURT");
        damage *= this.damage_multiplier;
        damage = Math.round(damage);
        this.CURRENT_HP -= damage;
        this.emitter.fireEvent(GameEventType_1.GameEventType.PLAY_SOUND, { key: "hurt", loop: false, holdReference: false });
        if (this.CURRENT_HP <= 0) {
            this.lives--;
            this.owner.animation.play("DYING");
            this.owner.animation.queue("DEAD", true, sword_enums_1.Player_Events.PLAYER_KILLED);
            this.emitter.fireEvent(sword_enums_1.Player_Events.PLAYER_KILLED);
        }
    }
    /**
     * gives the player a certain amount of shield
     * @param shield amount of shield to add to player
     */
    addShield(shield) {
        this.CURRENT_SHIELD += shield;
    }
    /**
     * gives health to the player
     * @param health health to give player
     */
    addHealth(health) {
        this.CURRENT_HP += health;
        if (this.CURRENT_HP > this.MAX_HP) {
            this.CURRENT_HP = this.MAX_HP;
        }
    }
    /**
     * gives the player exp
     * @param exp amount of exp to give the player
     */
    giveExp(exp) {
        this.CURRENT_EXP += exp;
        //if > than max exp level up (give buff)
        if (this.CURRENT_EXP >= this.MAX_EXP) {
            this.CURRENT_EXP -= this.MAX_EXP;
            this.MAX_EXP += 50; //increase max exp needed for level up
            PlayerController.level++;
            this.emitter.fireEvent(GameEventType_1.GameEventType.PLAY_SOUND, { key: "level_up", loop: false, holdReference: false });
            this.emitter.fireEvent(sword_enums_1.Player_Events.GIVE_REGULAR_BUFF);
        }
    }
    /**
     * generates an array of regular buffs
     * @param val optional value to give buff
     * @returns array of three buffs
     */
    generateRegularBuffs(val) {
        //random number from 5 to 15 if no value given
        let num = Math.floor(Math.random() * 10) + 5;
        num = Math.round(num);
        if (typeof val !== 'undefined') {
            num = val;
        }
        let buffs = new Array();
        buffs.push({ type: BuffType.FLAT_ATK, value: num, category: BuffCategory.EXTRA }, { type: BuffType.SPEED, value: num * 2, category: BuffCategory.EXTRA }, { type: BuffType.FLAT_HEALTH, value: num, category: BuffCategory.SHIELD }, { type: BuffType.RANGE, value: num / 100, category: BuffCategory.ATTACK, string: "\n\nIncrease range \nby " + num + "%" }, { type: BuffType.ATKSPEED, value: num, category: BuffCategory.ATTACK });
        //shuffle pool of buffs
        buffs.sort(() => 0.5 - Math.random());
        // Get sub-array of first 3 elements after shuffled
        let selected = buffs.slice(0, 3); //3 buff categories
        return selected;
    }
    /**
     * generates an array of special buffs
     * @param val optional value to give the buff
     * @returns array of 3 Buffs
     */
    generateSpecialBuffs(val) {
        //shuffle pool of buff categories 
        PlayerController.buffPool.sort(() => 0.5 - Math.random());
        // Get sub-array of first 3 elements after shuffled
        //let shuffled = PlayerController.buffPool.slice(0, 3); //3 buff categories
        let shuffled = new Set();
        while (shuffled.size < 3) {
            shuffled.add(PlayerController.buffPool.slice(0, 1)[0]);
            PlayerController.buffPool.sort(() => 0.5 - Math.random());
        }
        //random number from 5 to 15 if no value given
        let num = Math.floor(Math.random() * 10) + 5;
        num = Math.round(num);
        if (typeof val !== 'undefined') {
            num = val;
        }
        //TODO - implement better buff genertion - some buffs dont want multiple of
        let attackBuffs = [
            { type: BuffType.PERCENT_ATK, value: num / 100, category: BuffCategory.ATTACK, string: "\n\nIncrease Attack \nby " + num + "%" }
        ];
        let dotBuffs = [];
        if (!this.hasBleed) {
            dotBuffs.push({ type: BuffType.BLEED, value: 1, category: BuffCategory.DOT, string: "\n\nYour hits \napply Bleed" });
        }
        if (!this.hasBurn) {
            dotBuffs.push({ type: BuffType.BURN, value: 1, category: BuffCategory.DOT, string: "\n\nYour hits \napply Burn" });
        }
        if (!this.hasPoison) {
            dotBuffs.push({ type: BuffType.POISON, value: 1, category: BuffCategory.DOT, string: "\n\nYour hits \napply poison" });
        }
        //only add extra dot if at least one dot is acquired
        for (let i = dotBuffs.length; i < 3; i++) {
            dotBuffs.push({ type: BuffType.EXTRA_DOT, value: num, category: BuffCategory.DOT, string: "\n\nIncrease your \nDOT damage" });
        }
        let shieldBuffs = [
            { type: BuffType.PERCENT_HEALTH, value: num / 100, category: BuffCategory.SHIELD, string: "\n\nIncrease max hp \nby " + num + "%" },
        ];
        //if player doesnt have shield buff, give them the option, otherwise give buff shield option
        if (!this.hasShield) {
            shieldBuffs.push({ type: BuffType.SHIELD, value: 1, category: BuffCategory.SHIELD, string: "\n\nGain Shield \nWhen Damaged \n Shields return \nthe damage taken \nto attacker" });
        }
        else {
            shieldBuffs.push({ type: BuffType.SHIELD_DMG, value: num, category: BuffCategory.SHIELD, string: "\n\nIncrease damage \nreturned by shield" });
        }
        let healthBuffs = [
            { type: BuffType.DEF, value: num / 100, category: BuffCategory.HEALTH, string: "\n\nDecrease damage \ntaken by " + num + "%" }
        ];
        if (!this.fullHpBonus) {
            healthBuffs.push({ type: BuffType.FULLHPBONUSDMG, value: 1, category: BuffCategory.HEALTH, string: "\n\nDeal 10x damage \n when at full HP" });
        }
        if (!this.hasLifesteal) {
            healthBuffs.push({ type: BuffType.LIFESTEAL, value: 1, category: BuffCategory.HEALTH, string: "\n\nGain lifesteal" });
        }
        else {
            healthBuffs.push({ type: BuffType.LIFESTEALBUFF, value: num / 100, category: BuffCategory.HEALTH, string: "\n\nIncrease Lifesteal \nstrength by " + num + "%" });
        }
        let extraBuffs = [
            { type: BuffType.EXTRALIFE, value: 1, category: BuffCategory.EXTRA, string: "\n\nGain an \nExtra Life" },
        ];
        if (!this.hasOneShot) { //only add oneshot buff if it isnt already included 
            extraBuffs.push({ type: BuffType.ONESHOT, value: 1, category: BuffCategory.EXTRA, string: "\n\nYour hits hurt \n100x more but \nyour max health \nis set to 1 " });
        }
        ;
        let selected = new Array();
        for (let cat of shuffled) {
            switch (cat) {
                case BuffCategory.ATTACK:
                    attackBuffs.sort(() => 0.5 - Math.random());
                    if (attackBuffs.length == 0) {
                        selected.push({ type: BuffType.PERCENT_ATK, value: num / 100, category: BuffCategory.ATTACK, string: "\n\nIncrease Attack \nby " + num + "%" });
                    }
                    else {
                        selected.push(attackBuffs.pop());
                    }
                    break;
                case BuffCategory.DOT:
                    dotBuffs.sort(() => 0.5 - Math.random());
                    if (dotBuffs.length == 0) {
                        selected.push({ type: BuffType.EXTRA_DOT, value: num, category: BuffCategory.DOT, string: "\n\nIncrease your \nDOT damage" });
                    }
                    else {
                        selected.push(dotBuffs.pop());
                    }
                    break;
                case BuffCategory.EXTRA:
                    extraBuffs.sort(() => 0.5 - Math.random());
                    if (extraBuffs.length == 0) {
                        selected.push({ type: BuffType.EXTRALIFE, value: 2, category: BuffCategory.EXTRA, string: "\n\nGain 2 \nExtra Lives" });
                    }
                    else {
                        selected.push(extraBuffs.pop());
                    }
                    break;
                case BuffCategory.HEALTH:
                    healthBuffs.sort(() => 0.5 - Math.random());
                    if (healthBuffs.length == 0) {
                        selected.push({ type: BuffType.DEF, value: num / 100, category: BuffCategory.HEALTH, string: "\n\nDecrease damage\n taken by " + num + "%" });
                    }
                    else {
                        selected.push(healthBuffs.pop());
                    }
                    break;
                case BuffCategory.SHIELD:
                    shieldBuffs.sort(() => 0.5 - Math.random());
                    if (shieldBuffs.length == 0) {
                        selected.push({ type: BuffType.FLAT_HEALTH, value: num, category: BuffCategory.SHIELD });
                    }
                    else {
                        selected.push(shieldBuffs.pop());
                    }
                    break;
            }
        }
        return selected;
    }
    /**
     * Add given buff to the player
     * @param buff Given buff
     * @param init whether or not this is being used during the initialization of the player
     */
    addBuff(buff, init) {
        //add buff to array of applied buffs if not being used to init
        if (init === undefined) {
            //increase weight of selected buff category
            PlayerController.buffPool.push(buff.category);
            PlayerController.appliedBuffs.push(buff);
        }
        else if (!init) {
            //increase weight of selected buff category
            if (buff.category != BuffCategory.EXTRA) {
                PlayerController.buffPool.push(buff.category);
            }
            PlayerController.appliedBuffs.push(buff);
        }
        // TODO
        let item = this.inventory.getItem();
        switch (buff.type) {
            case BuffType.FLAT_HEALTH:
                //this.CURRENT_BUFFS.hp += buff.value;
                this.CURRENT_HP += buff.value;
                this.MAX_HP += buff.value;
                break;
            case BuffType.PERCENT_HEALTH:
                this.CURRENT_HP *= (1 + buff.value);
                this.MAX_HP *= (1 + buff.value);
                this.CURRENT_HP = Math.round(this.CURRENT_HP);
                this.MAX_HP = Math.round(this.MAX_HP);
                break;
            case BuffType.FLAT_ATK:
                this.CURRENT_ATK += buff.value;
                break;
            case BuffType.PERCENT_ATK:
                this.CURRENT_ATK *= (1 + buff.value);
                this.CURRENT_ATK = Math.round(this.CURRENT_ATK);
                break;
            case BuffType.SPEED:
                this.speed += buff.value;
                this.MIN_SPEED += buff.value;
                break;
            case BuffType.DEF:
                this.damage_multiplier *= (1 - buff.value);
                break;
            case BuffType.RANGE:
                if (item) {
                    item.EXTRA_RANGE += buff.value;
                }
                break;
            case BuffType.BLEED:
                this.hasBleed = true;
                break;
            case BuffType.BURN:
                this.hasBurn = true;
                break;
            case BuffType.POISON:
                this.hasPoison = true;
                break;
            case BuffType.EXTRA_DOT:
                this.extraDotDmg += buff.value;
                break;
            case BuffType.SHIELD:
                this.hasShield = true;
                break;
            case BuffType.ATKSPEED:
                if (item) {
                    this.cooldownMultiplier -= buff.value;
                    //reduce cooldowntimer 
                    item.cooldownTimer = new Timer_1.default(item.cooldown * this.cooldownMultiplier);
                }
                break;
            case BuffType.SHIELD_DMG:
                this.shieldDamage += buff.value;
                break;
            case BuffType.EXTRALIFE:
                this.lives += buff.value;
                PlayerController.appliedBuffs.pop(); //pop- dont want to give extra life in next lvl
                break;
            case BuffType.LIFESTEAL:
                this.hasLifesteal = true;
                this.lifestealratio = .2; //20% lifesteal
                break;
            case BuffType.LIFESTEALBUFF:
                this.lifestealratio += buff.value;
                break;
            case BuffType.ONESHOT:
                this.MAX_HP = 1;
                this.CURRENT_HP = 1;
                this.CURRENT_ATK *= 100;
                break;
            case BuffType.FULLHPBONUSDMG:
                this.fullHpBonus = true;
                break;
        }
    }
    /**
     *
     * @returns record of the player stats
     */
    getStats() {
        let stats = {};
        stats.CURRENT_HP = this.CURRENT_HP;
        stats.CURRENT_ATK = this.CURRENT_ATK;
        stats.CURRENT_SHIELD = this.CURRENT_SHIELD;
        stats.CURRENT_EXP = this.CURRENT_EXP;
        return;
    }
    toString() {
        let s = "HP: " + this.CURRENT_HP + "/" + this.MAX_HP +
            "\nATK: " + this.CURRENT_ATK +
            "\nSpeed: " + this.speed +
            "\nDamage Ratio: " + this.damage_multiplier +
            "\nEnemies Killed: " + PlayerController.enemiesKilled +
            "\nSword Effects:" +
            (this.hasBleed ? "\n  Bleed," : "  ") +
            (this.hasBurn ? " Burn," : "") +
            (this.hasPoison ? " Poison," : "") +
            (this.hasShield ? " Shield," : "") +
            (this.fullHpBonus ? " FullHealth deal x10 Dmg" : "") +
            (this.hasLifesteal ? " Lifesteal," : "") +
            (this.hasOneShot ? " Atk x 100, maxhp set to 1" : "");
        return s;
    }
}
exports.default = PlayerController;
PlayerController.level = 1;
PlayerController.godMode = false;
PlayerController.buffPool = new Array();
PlayerController.appliedBuffs = new Array();
PlayerController.enemiesKilled = 0;

},{"../../Wolfie2D/AI/StateMachineAI":4,"../../Wolfie2D/DataTypes/Vec2":24,"../../Wolfie2D/Debug/Debug":25,"../../Wolfie2D/Events/GameEventType":30,"../../Wolfie2D/Timing/Timer":97,"../Tools/InputWrapper":157,"../sword_enums":161,"./PlayerStates/Fall":134,"./PlayerStates/Idle":135,"./PlayerStates/InAir":136,"./PlayerStates/Jump":137,"./PlayerStates/PlayerState":139,"./PlayerStates/Walk":140}],134:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const InAir_1 = require("./InAir");
const InputWrapper_1 = require("../../Tools/InputWrapper");
const PlayerState_1 = require("./PlayerState");
const GameEventType_1 = require("../../../Wolfie2D/Events/GameEventType");
const sword_enums_1 = require("../../sword_enums");
class Fall extends InAir_1.default {
    onEnter(options) {
        // this.owner.animation.play("FALL", true);
    }
    update(deltaT) {
        if (!PlayerState_1.default.dashTimer.isStopped()) {
            if (InputWrapper_1.default.getState() === sword_enums_1.GameState.GAMING) {
                this.emitter.fireEvent(GameEventType_1.GameEventType.PLAY_SOUND, { key: "dash", loop: false, holdReference: false });
            }
            this.owner.animation.playIfNotAlready("DASH");
        }
        else {
            if (this.parent.invincible) {
                this.owner.animation.playIfNotAlready("HURT");
            }
            else {
                this.owner.animation.playIfNotAlready("FALL", true);
            }
        }
        if (this.parent.airjumps > 0 && InputWrapper_1.default.isJumpJustPressed()) {
            this.parent.airjumps--;
            this.finished("jump");
            this.parent.velocity.y = -600; // basically jump height
        }
        super.update(deltaT);
    }
    onExit() {
        this.owner.animation.stop();
        return {};
    }
}
exports.default = Fall;

},{"../../../Wolfie2D/Events/GameEventType":30,"../../Tools/InputWrapper":157,"../../sword_enums":161,"./InAir":136,"./PlayerState":139}],135:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GameLevel_1 = require("../../Scenes/GameLevel");
const PlayerController_1 = require("../PlayerController");
const OnGround_1 = require("./OnGround");
const PlayerState_1 = require("./PlayerState");
class Idle extends OnGround_1.default {
    onEnter(options) {
        this.parent.speed = this.parent.MIN_SPEED;
    }
    update(deltaT) {
        //("idle anim");
        if (!PlayerState_1.default.dashTimer.isStopped()) {
            //console.log("Playing dash");
            this.owner.animation.playIfNotAlready("DASH");
        }
        else {
            this.owner.animation.playIfNotAlready("IDLE", true);
        }
        let dir = this.getInputDirection();
        if (!dir.isZero() && dir.y === 0) {
            this.finished(PlayerController_1.PlayerStates.WALK);
        }
        if (GameLevel_1.default.currentLevel === "snow") {
            this.parent.velocity.x = Math.sign(this.parent.velocity.x) * (Math.abs(this.parent.velocity.x) - 5 < 0 ? 0 : Math.abs(this.parent.velocity.x) - 5);
        }
        else {
            this.parent.velocity.x = 0;
        }
        super.update(deltaT);
    }
    onExit() {
        this.owner.animation.stop();
        return {};
    }
}
exports.default = Idle;

},{"../../Scenes/GameLevel":146,"../PlayerController":133,"./OnGround":138,"./PlayerState":139}],136:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MathUtils_1 = require("../../../Wolfie2D/Utils/MathUtils");
const PlayerController_1 = require("../PlayerController");
const PlayerState_1 = require("./PlayerState");
class InAir extends PlayerState_1.default {
    update(deltaT) {
        super.update(deltaT);
        let dir = this.getInputDirection();
        if (dir.x !== 0) {
            this.owner.invertX = MathUtils_1.default.sign(dir.x) < 0;
        }
        this.parent.velocity.x += dir.x * (this.parent.speed) / 3.5 - 0.3 * this.parent.velocity.x;
        if (this.owner.onGround) {
            this.finished(PlayerController_1.PlayerStates.PREVIOUS);
        }
    }
}
exports.default = InAir;

},{"../../../Wolfie2D/Utils/MathUtils":102,"../PlayerController":133,"./PlayerState":139}],137:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GameEventType_1 = require("../../../Wolfie2D/Events/GameEventType");
const InputWrapper_1 = require("../../Tools/InputWrapper");
const PlayerController_1 = require("../PlayerController");
const InAir_1 = require("./InAir");
const PlayerState_1 = require("./PlayerState");
const sword_enums_1 = require("../../sword_enums");
class Jump extends InAir_1.default {
    onEnter(options) {
        this.emitter.fireEvent(GameEventType_1.GameEventType.PLAY_SOUND, { key: "jump", loop: false, holdReference: false });
    }
    update(deltaT) {
        if (!PlayerState_1.default.dashTimer.isStopped()) {
            if (InputWrapper_1.default.getState() === sword_enums_1.GameState.GAMING) {
                this.emitter.fireEvent(GameEventType_1.GameEventType.PLAY_SOUND, { key: "dash", loop: false, holdReference: false });
            }
            this.owner.animation.playIfNotAlready("DASH");
        }
        else {
            if (this.parent.invincible) {
                this.owner.animation.playIfNotAlready("HURT");
            }
            else {
                this.owner.animation.playIfNotAlready("JUMP", true);
            }
        }
        if (this.owner.onCeiling) {
            this.parent.velocity.y = 0;
            this.finished(PlayerController_1.PlayerStates.FALL);
        }
        if (this.parent.airjumps > 0 && InputWrapper_1.default.isJumpJustPressed()) {
            this.parent.airjumps--;
            this.finished("jump");
            this.parent.velocity.y = -600; // basically jump height
        }
        // If we're falling, go to the fall state
        if (this.parent.velocity.y >= 0) {
            this.finished(PlayerController_1.PlayerStates.FALL);
        }
        super.update(deltaT);
    }
    onExit() {
        this.owner.animation.stop();
        return {};
    }
}
exports.default = Jump;

},{"../../../Wolfie2D/Events/GameEventType":30,"../../Tools/InputWrapper":157,"../../sword_enums":161,"../PlayerController":133,"./InAir":136,"./PlayerState":139}],138:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MathUtils_1 = require("../../../Wolfie2D/Utils/MathUtils");
const sword_enums_1 = require("../../sword_enums");
const InputWrapper_1 = require("../../Tools/InputWrapper");
const PlayerState_1 = require("./PlayerState");
class OnGround extends PlayerState_1.default {
    onEnter(options) { }
    update(deltaT) {
        //reset airjumps
        this.parent.airjumps = this.parent.MAX_airjumps;
        if (this.parent.velocity.y > 0) {
            this.parent.velocity.y = 0;
        }
        let direction = this.getInputDirection();
        if (direction.x !== 0) {
            this.owner.invertX = MathUtils_1.default.sign(direction.x) < 0;
        }
        // If we jump, move to the Jump state, give a burst of upwards velocity
        if (InputWrapper_1.default.isJumpJustPressed()) {
            this.finished("jump");
            this.parent.velocity.y = -600; // basically jump height
        }
        else if (!this.owner.onGround && InputWrapper_1.default.getState() === sword_enums_1.GameState.GAMING) {
            this.finished("fall");
        }
        super.update(deltaT);
    }
    onExit() {
        return {};
    }
}
exports.default = OnGround;

},{"../../../Wolfie2D/Utils/MathUtils":102,"../../Tools/InputWrapper":157,"../../sword_enums":161,"./PlayerState":139}],139:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const State_1 = require("../../../Wolfie2D/DataTypes/State/State");
const Vec2_1 = require("../../../Wolfie2D/DataTypes/Vec2");
const Timer_1 = require("../../../Wolfie2D/Timing/Timer");
const sword_enums_1 = require("../../sword_enums");
const InputWrapper_1 = require("../../Tools/InputWrapper");
class PlayerState extends State_1.default {
    constructor(parent, owner) {
        super(parent);
        this.gravity = 1500; //TODO - can change later
        this.owner = owner;
        this.positionTimer = new Timer_1.default(250);
        this.positionTimer.start();
        PlayerState.dashTimer = new Timer_1.default(100);
        PlayerState.dashCoolDownTimer = new Timer_1.default(600);
    }
    handleInput(event) {
    }
    doDash() {
        if (PlayerState.dashCoolDownTimer.isStopped()) {
            //TODO - decide how to implement dash - could be a flash - maybe allow in air as well
            //play dash anim maybe
            //TODO - might give buffed speed stat to dash speed
            //TODO - give player i frame
            PlayerState.dashCoolDownTimer.start();
            PlayerState.dashTimer.start();
        }
    }
    /**
     * Get the inputs from the keyboard, or Vec2.Zero if nothing is being pressed
     */
    getInputDirection() {
        let direction = Vec2_1.default.ZERO;
        direction.x = (InputWrapper_1.default.isLeftPressed() ? -1 : 0) + (InputWrapper_1.default.isRightPressed() ? 1 : 0);
        direction.y = (InputWrapper_1.default.isJumpJustPressed() ? -1 : 0);
        return direction;
    }
    update(deltaT) {
        if (this.positionTimer.isStopped()) {
            this.emitter.fireEvent(sword_enums_1.Player_Events.PLAYER_MOVE, { position: this.owner.position.clone() });
            this.positionTimer.start();
        }
        if (InputWrapper_1.default.getState() === sword_enums_1.GameState.GAMING) {
            // Do gravity
            this.parent.owner.animation.resume();
            this.parent.velocity.y += this.gravity * deltaT;
            // Do dash
            if (InputWrapper_1.default.isDashJustPressed()) {
                this.doDash();
            }
            if (!PlayerState.dashTimer.isStopped()) {
                this.parent.velocity.x = this.owner.invertX ? -800 : 800;
                this.parent.velocity.y = 0;
            }
            this.owner.move(this.parent.velocity.scaled(deltaT));
        }
        else {
            this.parent.owner.animation.pause();
        }
    }
}
exports.default = PlayerState;

},{"../../../Wolfie2D/DataTypes/State/State":20,"../../../Wolfie2D/DataTypes/Vec2":24,"../../../Wolfie2D/Timing/Timer":97,"../../Tools/InputWrapper":157,"../../sword_enums":161}],140:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const InputWrapper_1 = require("../../Tools/InputWrapper");
const PlayerController_1 = require("../PlayerController");
const OnGround_1 = require("./OnGround");
const PlayerState_1 = require("./PlayerState");
const GameEventType_1 = require("../../../Wolfie2D/Events/GameEventType");
const sword_enums_1 = require("../../sword_enums");
const GameLevel_1 = require("../../Scenes/GameLevel");
class Walk extends OnGround_1.default {
    onEnter(options) {
        this.parent.speed = this.parent.MIN_SPEED;
    }
    update(deltaT) {
        if (!PlayerState_1.default.dashTimer.isStopped()) {
            if (InputWrapper_1.default.getState() === sword_enums_1.GameState.GAMING) {
                this.emitter.fireEvent(GameEventType_1.GameEventType.PLAY_SOUND, { key: "dash", loop: false, holdReference: false });
            }
            this.owner.animation.playIfNotAlready("DASH");
        }
        else {
            if (this.parent.invincible) {
                this.owner.animation.playIfNotAlready("HURT");
            }
            else {
                this.owner.animation.playIfNotAlready("WALK", true);
            }
        }
        let dir = this.getInputDirection();
        if (dir.isZero()) {
            this.finished(PlayerController_1.PlayerStates.IDLE);
        }
        if (GameLevel_1.default.currentLevel === "snow") {
            this.parent.velocity.x += dir.x * 5;
            if (this.parent.velocity.x > this.parent.speed)
                this.parent.velocity.x = this.parent.speed;
            if (this.parent.velocity.x < -1 * this.parent.speed)
                this.parent.velocity.x = -1 * this.parent.speed;
        }
        else {
            this.parent.velocity.x = dir.x * (this.parent.speed);
        }
        super.update(deltaT);
    }
    onExit() {
        this.owner.animation.stop();
        return {};
    }
}
exports.default = Walk;

},{"../../../Wolfie2D/Events/GameEventType":30,"../../Scenes/GameLevel":146,"../../Tools/InputWrapper":157,"../../sword_enums":161,"../PlayerController":133,"./OnGround":138,"./PlayerState":139}],141:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Registry_1 = require("../../Wolfie2D/Registry/Registries/Registry");
const ResourceManager_1 = require("../../Wolfie2D/ResourceManager/ResourceManager");
const Slice_1 = require("../GameSystems/items/WeaponTypes/Slice");
const SemiAutoGun_1 = require("../GameSystems/items/WeaponTypes/SemiAutoGun");
const LaserGun_1 = require("../GameSystems/items/WeaponTypes/LaserGun");
class WeaponTemplateRegistry extends Registry_1.default {
    preload() {
        const rm = ResourceManager_1.default.getInstance();
        //TODO - 
        // Load sprites for each weapon 
        //rm.image("something", "shattered_sword_assets/sprites/something.png");
        rm.image("knife", "shattered_sword_assets/sprites/knife.png");
        rm.image("pistol", "shattered_sword_assets/sprites/pistol.png");
        rm.image("laserGun", "shattered_sword_assets/sprites/laserGun.png");
        // Load spritesheets
        //rm.spritesheet("weapon anim", "shattered_sword_assets/spritesheets/weapon anim.json");
        rm.spritesheet("slice", "shattered_sword_assets/spritesheets/slice.json");
        // Register default types
        //this.registerItem("itemtype", itemTypefile);
        this.registerItem("slice", Slice_1.default);
        this.registerItem("semiAutoGun", SemiAutoGun_1.default);
        this.registerItem("laserGun", LaserGun_1.default);
    }
    registerAndPreloadItem(key) { }
    registerItem(key, constr) {
        this.add(key, constr);
    }
}
exports.default = WeaponTemplateRegistry;

},{"../../Wolfie2D/Registry/Registries/Registry":63,"../../Wolfie2D/ResourceManager/ResourceManager":83,"../GameSystems/items/WeaponTypes/LaserGun":129,"../GameSystems/items/WeaponTypes/SemiAutoGun":130,"../GameSystems/items/WeaponTypes/Slice":131}],142:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Registry_1 = require("../../Wolfie2D/Registry/Registries/Registry");
class WeaponTypeRegistry extends Registry_1.default {
    preload() { }
    // We don't need this for this assignment
    registerAndPreloadItem(key) { }
    registerItem(key, type) {
        this.add(key, type);
    }
}
exports.default = WeaponTypeRegistry;

},{"../../Wolfie2D/Registry/Registries/Registry":63}],143:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("../../Wolfie2D/DataTypes/Vec2");
const RandomMapGenerator_1 = require("../Tools/RandomMapGenerator");
const GameLevel_1 = require("./GameLevel");
const InputWrapper_1 = require("../Tools/InputWrapper");
const GameFinish_1 = require("./GameFinish");
class End extends GameLevel_1.default {
    loadScene() {
        super.loadScene();
        this.rmg = new RandomMapGenerator_1.default("shattered_sword_assets/jsons/castle_template.json", InputWrapper_1.default.randomSeed);
        this.map = this.rmg.getMap();
        this.load.tilemapFromObject("map", this.map);
        //load enemies
        this.load.spritesheet("Snake", "shattered_sword_assets/spritesheets/Snake.json");
        this.load.spritesheet("black_pudding", "shattered_sword_assets/spritesheets/black_pudding.json");
        this.load.spritesheet("FinalBoss", "shattered_sword_assets/spritesheets/FinalBoss.json");
    }
    startScene() {
        super.startScene();
        this.addCheckPoint(new Vec2_1.default(3, 13), new Vec2_1.default(10, 10), "startStory", "nextLevel");
    }
    goToNextLevel() {
        this.viewport.setZoomLevel(1);
        this.sceneManager.changeToScene(GameFinish_1.default);
    }
    playStartStory() {
        if (!this.touchedStartCheckPoint) {
            this.touchedStartCheckPoint = true;
            this.storyLoader("shattered_sword_assets/jsons/endstory.json");
            this.startTimer();
        }
    }
}
exports.default = End;

},{"../../Wolfie2D/DataTypes/Vec2":24,"../Tools/InputWrapper":157,"../Tools/RandomMapGenerator":159,"./GameFinish":145,"./GameLevel":146}],144:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("../../Wolfie2D/DataTypes/Vec2");
const RandomMapGenerator_1 = require("../Tools/RandomMapGenerator");
const GameLevel_1 = require("./GameLevel");
const SnakeAI_1 = require("../AI/SnakeAI");
const Porcelain_1 = require("./Porcelain");
const InputWrapper_1 = require("../Tools/InputWrapper");
class Forest extends GameLevel_1.default {
    loadScene() {
        super.loadScene();
        this.rmg = new RandomMapGenerator_1.default("shattered_sword_assets/jsons/forest_template.json", InputWrapper_1.default.randomSeed);
        this.map = this.rmg.getMap();
        this.load.tilemapFromObject("map", this.map);
        //load enemies
        this.load.spritesheet("Snake", "shattered_sword_assets/spritesheets/Snake.json");
        this.load.spritesheet("black_pudding", "shattered_sword_assets/spritesheets/black_pudding.json");
    }
    updateScene(deltaT) {
        super.updateScene(deltaT);
        //spawn snake()
        if (Math.random() < .0001 && this.gameStarted) {
            console.log("RANDOM SNAKE!");
            this.addEnemy("Snake", this.player.position.clone().add(new Vec2_1.default(0, -320)), SnakeAI_1.default, {
                player: this.player,
                health: 50,
                tilemap: "Main",
                size: new Vec2_1.default(14, 10),
                offset: new Vec2_1.default(0, 22),
                exp: 50,
            });
        }
    }
    goToNextLevel() {
        this.viewport.setZoomLevel(1);
        let sceneOptions = {
            physics: {
                groupNames: ["ground", "player", "enemies"],
                collisions: [
                    [0, 1, 1],
                    [1, 0, 0],
                    [1, 0, 0]
                ]
            }
        };
        this.sceneManager.changeToScene(Porcelain_1.default, {}, sceneOptions);
    }
    playStartStory() {
        if (!this.touchedStartCheckPoint) {
            this.touchedStartCheckPoint = true;
            this.storyLoader("shattered_sword_assets/jsons/level1story.json");
            this.startTimer();
        }
    }
    playEndStory() {
        if (!this.touchedEndCheckPoint) {
            this.touchedEndCheckPoint = true;
            this.storyLoader("shattered_sword_assets/jsons/level1endstory.json");
            this.endTimer();
            this.levelEnded = true;
        }
    }
}
exports.default = Forest;

},{"../../Wolfie2D/DataTypes/Vec2":24,"../AI/SnakeAI":123,"../Tools/InputWrapper":157,"../Tools/RandomMapGenerator":159,"./GameLevel":146,"./Porcelain":152}],145:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("../../Wolfie2D/DataTypes/Vec2");
const UIElementTypes_1 = require("../../Wolfie2D/Nodes/UIElements/UIElementTypes");
const Scene_1 = require("../../Wolfie2D/Scene/Scene");
const Color_1 = require("../../Wolfie2D/Utils/Color");
const sword_enums_1 = require("../sword_enums");
const InputWrapper_1 = require("../Tools/InputWrapper");
const GameLevel_1 = require("./GameLevel");
const MainMenu_1 = require("./MainMenu");
class GameFinish extends Scene_1.default {
    startScene() {
        InputWrapper_1.default.setState(sword_enums_1.GameState.PAUSE);
        InputWrapper_1.default.randomSeed = undefined;
        const center = this.viewport.getCenter();
        this.addUILayer("primary");
        const congra = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "primary", { position: new Vec2_1.default(center.x, center.y), text: "CONGRATULATIONS!" });
        congra.textColor = Color_1.default.GREEN;
        congra.fontSize = 100;
        const time = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "primary", { position: new Vec2_1.default(center.x, center.y + 100), text: ("You finished the game in " + GameLevel_1.default.gameTimeToString()) });
        time.textColor = Color_1.default.WHITE;
        const hint = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "primary", { position: new Vec2_1.default(center.x, center.y + 200), text: "Click to go back to Main Menu" });
        hint.textColor = Color_1.default.WHITE;
    }
    updateScene() {
        if (InputWrapper_1.default.isLeftMouseJustPressed()) {
            this.sceneManager.changeToScene(MainMenu_1.default);
        }
    }
}
exports.default = GameFinish;

},{"../../Wolfie2D/DataTypes/Vec2":24,"../../Wolfie2D/Nodes/UIElements/UIElementTypes":56,"../../Wolfie2D/Scene/Scene":90,"../../Wolfie2D/Utils/Color":99,"../Tools/InputWrapper":157,"../sword_enums":161,"./GameLevel":146,"./MainMenu":150}],146:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const AABB_1 = require("../../Wolfie2D/DataTypes/Shapes/AABB");
const Vec2_1 = require("../../Wolfie2D/DataTypes/Vec2");
const GameEventType_1 = require("../../Wolfie2D/Events/GameEventType");
const GraphicTypes_1 = require("../../Wolfie2D/Nodes/Graphics/GraphicTypes");
const Label_1 = require("../../Wolfie2D/Nodes/UIElements/Label");
const UIElementTypes_1 = require("../../Wolfie2D/Nodes/UIElements/UIElementTypes");
const Scene_1 = require("../../Wolfie2D/Scene/Scene");
const Color_1 = require("../../Wolfie2D/Utils/Color");
const PlayerController_1 = require("../Player/PlayerController");
const sword_enums_1 = require("../sword_enums");
const RegistryManager_1 = require("../../Wolfie2D/Registry/RegistryManager");
const Weapon_1 = require("../GameSystems/items/Weapon");
const BattleManager_1 = require("../GameSystems/BattleManager");
const SnakeAI_1 = require("../AI/SnakeAI");
const SlimeAI_1 = require("../AI/SlimeAI");
const TigerAI_1 = require("../AI/TigerAI");
const BullAI_1 = require("../AI/BullAI");
const ArcherAI_1 = require("../AI/ArcherAI");
const AssassinAI_1 = require("../AI/AssassinAI");
const InventoryManager_1 = require("../GameSystems/InventoryManager");
const Stack_1 = require("../../Wolfie2D/DataTypes/Stack");
const InputWrapper_1 = require("../Tools/InputWrapper");
const GameOver_1 = require("./GameOver");
const MainMenu_1 = require("./MainMenu");
const BossAI_1 = require("../AI/BossAI");
//  TODO
/**
 * Add in some level music.
 * This can be done here in the base GameLevel class or individual level files
 */
class GameLevel extends Scene_1.default {
    constructor() {
        super(...arguments);
        this.touchedStartCheckPoint = false;
        this.touchedEndCheckPoint = false;
        this.gameStarted = false;
        this.levelEnded = false;
    }
    loadScene() {
        //can load player sprite here
        this.load.spritesheet("player", "shattered_sword_assets/spritesheets/Hiro.json");
        // TODO - change when done testing
        this.load.spritesheet("slice", "shattered_sword_assets/spritesheets/slice.json");
        // Load the scene info
        this.load.object("weaponData", "shattered_sword_assets/data/weaponData.json");
        // Load in the enemy info
        //this.load.object("enemyData", "shattered_sword_assets/data/enemy.json");
        // Load in item info
        //this.load.object("itemData", "shattered_sword_assets/data/items.json");
        this.load.audio("jump", "shattered_sword_assets/sounds/jump2.wav");
        this.load.audio("hurt", "shattered_sword_assets/sounds/hurt.wav");
        this.load.audio("die", "shattered_sword_assets/sounds/die.wav");
        this.load.audio("dash", "shattered_sword_assets/sounds/dash.wav");
        this.load.audio("level_up", "shattered_sword_assets/sounds/level_up.wav");
        //神社（じんじゃ）祭（まつり）　by Second Dimension Imagination Group
        this.load.audio("level_music", "shattered_sword_assets/sounds/bgm1.mp3");
        this.load.audio("sword", "shattered_sword_assets/sounds/sword_ding1.m4a");
        this.load.image("knife", "shattered_sword_assets/sprites/knife.png");
        this.load.image("pistol", "shattered_sword_assets/sprites/pistol.png");
        this.load.image("laserGun", "shattered_sword_assets/sprites/laserGun.png");
        this.load.image("inventorySlot", "shattered_sword_assets/sprites/inventory.png");
        this.load.image("black", "shattered_sword_assets/images/black.png");
        this.load.image("poisoning", "shattered_sword_assets/images/poisoning.png");
        this.load.image("burning", "shattered_sword_assets/images/burning.png");
        this.load.image("bleeding", "shattered_sword_assets/images/bleeding.png");
        //TODO - choose spritesheet for slice - modify the slice.json
        this.load.spritesheet("slice", "shattered_sword_assets/spritesheets/slice.json");
        this.load.spritesheet("test_dummy", "shattered_sword_assets/spritesheets/test_dummy.json");
        this.enemies = new Array();
        this.battleManager = new BattleManager_1.default();
        GameLevel.currentLevel = "";
    }
    unloadScene() {
        this.emitter.fireEvent(GameEventType_1.GameEventType.STOP_SOUND, { key: "level_music" });
    }
    startScene() {
        this.add.tilemap("map", new Vec2_1.default(2, 2));
        console.log("width,height:" + this.map.width, this.map.height);
        this.viewport.setBounds(0, 0, this.map.width * 32, this.map.height * 32);
        this.viewport.follow(this.player);
        this.playerSpawn = this.rmg.getPlayer().scale(32);
        console.log(this.playerSpawn);
        this.startpos = this.rmg.getPlayer().scale(32);
        // Do the game level standard initializations
        this.initViewport();
        this.initLayers();
        // Create the battle manager
        // TODO
        this.initializeWeapons();
        // Initialize the items array - this represents items that are in the game world
        this.items = new Array();
        this.initPlayer();
        //subscribe to relevant events
        this.subscribeToEvents();
        this.addUI();
        let startCheckPoint = this.rmg.getStartCheckPoint();
        this.startCheckPoint = this.addCheckPoint(new Vec2_1.default(startCheckPoint[0], startCheckPoint[1]), new Vec2_1.default(startCheckPoint[2], startCheckPoint[3]), "startStory", "startTimer");
        let endCheckPoint = this.rmg.getEndCheckPoint();
        this.endCheckPoint = this.addCheckPoint(new Vec2_1.default(endCheckPoint[0], endCheckPoint[1]), new Vec2_1.default(endCheckPoint[2], endCheckPoint[3]), "endStory", "nextLevel");
        // Create an enemies array
        // Send the player and enemies to the battle manager
        this.battleManager.setPlayers([this.player._ai]);
        // Initialize all enemies
        //this.initializeEnemies();
        this.battleManager.setEnemies(this.enemies.map(enemy => enemy._ai));
        let enemies = this.rmg.getEnemies();
        //may have to move this to start scene in gameLevel
        this.initializeEnemies(enemies);
        this.gameStateStack = new Stack_1.default();
        this.setGameState(sword_enums_1.GameState.GAMING);
        InputWrapper_1.default.enableInput();
        this.emitter.fireEvent(GameEventType_1.GameEventType.PLAY_SOUND, { key: "level_music", loop: true, holdReference: true });
    }
    static gameTimeToString() {
        let tmp = "";
        let minutes = Math.floor(GameLevel.gameTimer / 60);
        if (minutes >= 10) {
            tmp = minutes.toString();
        }
        else {
            tmp = "0" + minutes.toString();
        }
        let seconds = Math.floor(GameLevel.gameTimer % 60);
        if (seconds >= 10) {
            tmp += ":" + seconds.toString();
        }
        else {
            tmp += ":0" + seconds.toString();
        }
        return tmp;
    }
    updateScene(deltaT) {
        if (this.gameStateStack.peek() === sword_enums_1.GameState.GAMING) {
            if (this.gameStarted) {
                GameLevel.gameTimer += deltaT;
                this.timerLable.textColor = Color_1.default.BLACK;
            }
            else {
                this.timerLable.textColor = Color_1.default.RED;
            }
            this.timerLable.text = GameLevel.gameTimeToString();
        }
        // Handle events and update the UI if needed
        while (this.receiver.hasNextEvent()) {
            let event = this.receiver.getNextEvent();
            if (event.isType(sword_enums_1.Player_Events.UNLOAD_ASSET)) {
                console.log(event.data);
                let asset = this.sceneGraph.getNode(event.data.get("node"));
                asset.destroy();
            }
            if (this.gameStateStack.peek() === sword_enums_1.GameState.GAMING) {
                switch (event.type) {
                    case sword_enums_1.Player_Events.PLAYER_COLLIDE:
                        let n = this.sceneGraph.getNode(event.data.get("node"));
                        let other = this.sceneGraph.getNode(event.data.get("other"));
                        if (n === this.player) {
                            // Node is player, other is enemy
                            this.handlePlayerEnemyCollision(n, other);
                        }
                        else {
                            // Other is player, node is balloon
                            this.handlePlayerEnemyCollision(other, n);
                        }
                        break;
                    case sword_enums_1.Player_Events.ENEMY_KILLED:
                        let node = this.sceneGraph.getNode(event.data.get("owner")); //get enemy id 
                        //remove enemy from enemies
                        //console.log(node);
                        //console.log("enemy killed at",node.position);
                        this.enemies = this.enemies.filter(item => item !== event.data.get("ai"));
                        this.battleManager.removeEnemy(event.data.get("ai"));
                        //give the player the exp value of the enemy killed
                        if (event.data.get("ai").exp_val !== undefined) {
                            this.player._ai.giveExp(event.data.get("ai").exp_val);
                        }
                        node.destroy(); //destroy enemy node
                        PlayerController_1.default.enemiesKilled++;
                        break;
                    case sword_enums_1.Player_Events.GIVE_REGULAR_BUFF:
                        this.buffs = this.player._ai.generateRegularBuffs();
                        if (this.buffs[0].string === undefined) {
                            this.buffLabel1.text = "\n\nIncrease " + this.buffs[0].type + "\n by " + this.buffs[0].value;
                        }
                        else {
                            this.buffLabel1.text = this.buffs[0].string;
                        }
                        if (this.buffs[1].string === undefined) {
                            this.buffLabel2.text = "\n\nIncrease " + this.buffs[1].type + "\n by " + this.buffs[1].value;
                        }
                        else {
                            this.buffLabel2.text = this.buffs[1].string;
                        }
                        if (this.buffs[2].string === undefined) {
                            this.buffLabel3.text = "\n\nIncrease " + this.buffs[2].type + "\n by " + this.buffs[2].value;
                        }
                        else {
                            this.buffLabel3.text = this.buffs[2].string;
                        }
                        //pause game here 
                        this.setGameState(sword_enums_1.GameState.BUFF);
                        this.buffLayer.enable();
                        break;
                    case sword_enums_1.Player_Events.GIVE_SPECIAL_BUFF:
                        this.buffs = this.player._ai.generateSpecialBuffs();
                        if (this.buffs[0].string === undefined) {
                            this.buffLabel1.text = "\n\nIncrease " + this.buffs[0].type + "\n by " + this.buffs[0].value;
                        }
                        else {
                            this.buffLabel1.text = this.buffs[0].string;
                        }
                        if (this.buffs[1].string === undefined) {
                            this.buffLabel2.text = "\n\nIncrease " + this.buffs[1].type + "\n by " + this.buffs[1].value;
                        }
                        else {
                            this.buffLabel2.text = this.buffs[1].string;
                        }
                        if (this.buffs[2].string === undefined) {
                            this.buffLabel3.text = "\n\nIncrease " + this.buffs[2].type + "\n by " + this.buffs[2].value;
                        }
                        else {
                            this.buffLabel3.text = this.buffs[2].string;
                        }
                        //pause game here 
                        this.setGameState(sword_enums_1.GameState.BUFF);
                        this.buffLayer.enable();
                        break;
                    case sword_enums_1.Player_Events.PLAYER_KILLED:
                        //respawn player if he has lives, otherwise end game
                        console.log("player Died");
                        this.player.animation.play("DEAD", false);
                        InputWrapper_1.default.disableInput();
                        if (this.player._ai.lives > 0) {
                            this.respawnPlayer();
                        }
                        else { //no more lives
                            this.viewport.setZoomLevel(1);
                            this.sceneManager.changeToScene(GameOver_1.default, {});
                            InputWrapper_1.default.enableInput();
                        }
                        break;
                    case "startStory":
                        this.playStartStory();
                        break;
                    case "endStory":
                        this.playEndStory();
                        break;
                    case "startTimer":
                        this.startTimer();
                        break;
                    case "nextLevel":
                        this.endTimer();
                        this.goToNextLevel();
                        break;
                }
            }
            else if (this.gameStateStack.peek() === sword_enums_1.GameState.BUFF) {
                switch (event.type) {
                    case "buff1":
                        this.player._ai.addBuff(this.buffs[0]);
                        this.buffLayer.disable();
                        this.setGameState();
                        if (this.levelEnded) {
                            this.goToNextLevel();
                        }
                        break;
                    case "buff2":
                        this.player._ai.addBuff(this.buffs[1]);
                        this.buffLayer.disable();
                        this.setGameState();
                        if (this.levelEnded) {
                            this.goToNextLevel();
                        }
                        break;
                    case "buff3":
                        this.player._ai.addBuff(this.buffs[2]);
                        this.buffLayer.disable();
                        this.setGameState();
                        if (this.levelEnded) {
                            this.goToNextLevel();
                        }
                        break;
                }
            }
            if (event.type === "cheat") {
                this.enableCheat();
            }
            if (event.type === "MainMenu") {
                this.viewport.setZoomLevel(1);
                this.sceneManager.changeToScene(MainMenu_1.default, {});
                InputWrapper_1.default.enableInput();
            }
        }
        if (this.gameStateStack.peek() === sword_enums_1.GameState.STORY) {
            if (InputWrapper_1.default.isNextJustPressed() && this.gameStateStack.peek() === sword_enums_1.GameState.STORY) {
                this.updateStory();
            }
        }
        if (InputWrapper_1.default.isPauseJustPressed()) {
            this.pauseText.text = this.player._ai.toString();
            if (this.gameStateStack.peek() === sword_enums_1.GameState.GAMING) {
                this.setGameState(sword_enums_1.GameState.PAUSE);
                this.pauseLayer.enable();
            }
            else if (this.gameStateStack.peek() === sword_enums_1.GameState.PAUSE) {
                this.setGameState();
                this.pauseLayer.disable();
            }
        }
        if (InputWrapper_1.default.isBuff1JustPresed()) {
            this.emitter.fireEvent("buff1");
        }
        if (InputWrapper_1.default.isBuff2JustPresed()) {
            this.emitter.fireEvent("buff2");
        }
        if (InputWrapper_1.default.isBuff3JustPresed()) {
            this.emitter.fireEvent("buff3");
        }
        //update health UI 
        let playerAI = this.player.ai;
        this.healthLabel.text = "Health: " + Math.round(playerAI.CURRENT_HP) + '/' + Math.round(playerAI.MAX_HP);
        this.healthBar.size.set(playerAI.MAX_HP * 1.5, 10);
        this.healthBar.position.set(playerAI.MAX_HP * 0.75 + 20, 20);
        this.healthBar.fillWidth = playerAI.CURRENT_HP * 1.5;
        if (playerAI.CURRENT_HP / playerAI.MAX_HP >= 2 / 3) {
            this.healthBar.color = Color_1.default.GREEN;
            this.healthLabel.textColor = Color_1.default.GREEN;
        }
        else if (playerAI.CURRENT_HP / playerAI.MAX_HP >= 1 / 3) {
            this.healthBar.color = Color_1.default.YELLOW;
            this.healthLabel.textColor = Color_1.default.YELLOW;
        }
        else {
            this.healthBar.color = Color_1.default.RED;
            this.healthLabel.textColor = Color_1.default.RED;
        }
        this.poisonStat.visible = playerAI.poisonCounter > 0 ? true : false;
        this.burnStat.visible = playerAI.burnCounter > 0 ? true : false;
        this.bleedStat.visible = playerAI.bleedCounter > 0 ? true : false;
        // this.healthLabel.sizeToText();
        //update shield ui
        this.shieldLabel.text = "Shield: " + Math.round(playerAI.CURRENT_SHIELD);
        this.shieldBar.size.set(playerAI.CURRENT_SHIELD * 1.5, 10);
        this.shieldBar.position.set(playerAI.CURRENT_SHIELD * 0.75 + 20, 50);
        // this.shieldLabel.sizeToText();
        //update exp ui
        this.expLabel.text = "EXP: " + Math.round(playerAI.CURRENT_EXP) + '/' + Math.round(playerAI.MAX_EXP);
        this.expBar.fillWidth = (playerAI.CURRENT_EXP / playerAI.MAX_EXP) * 150;
        // this.expLabel.sizeToText();
        //update level ui
        this.playerLevelLabel.text = "Lv." + PlayerController_1.default.level;
        //update lives ui
        this.livesCountLabel.text = "Lives: " + playerAI.lives;
        //move background
        // Get the viewport center and padded size
        const viewportCenter = this.viewport.getCenter().clone();
        const baseViewportSize = this.viewport.getHalfSize().scaled(2);
        //check position of player
        this.playerFalloff(viewportCenter, baseViewportSize);
    }
    // TODO put UI changes in here
    setGameState(gameState) {
        if (gameState) {
            this.gameStateStack.push(gameState);
            InputWrapper_1.default.setState(gameState);
        }
        else {
            this.gameStateStack.pop();
            InputWrapper_1.default.setState(this.gameStateStack.peek());
        }
    }
    /**
     * Initialzes the layers
     */
    initLayers() {
        // Add a layer for UI
        this.addUILayer("UI");
        // Add a layer for players and enemies
        this.addLayer("primary", 1);
        this.buffLayer = this.addUILayer("buffLayer");
        this.storyLayer = this.addUILayer("story");
        this.storyLayer.disable();
        this.pauseLayer = this.addUILayer("pause");
        this.pauseLayer.disable();
        this.receiver.subscribe("loadStory");
    }
    /**
     * Initializes the viewport
     */
    initViewport() {
        this.viewport.setZoomLevel(2);
    }
    /**
     * Handles all subscriptions to events
     */
    subscribeToEvents() {
        this.receiver.subscribe([
            sword_enums_1.Player_Events.PLAYER_COLLIDE,
            sword_enums_1.Player_Events.PLAYER_HIT_ENEMY,
            sword_enums_1.Player_Events.ENEMY_KILLED,
            sword_enums_1.Player_Events.LEVEL_START,
            sword_enums_1.Player_Events.LEVEL_END,
            sword_enums_1.Player_Events.PLAYER_KILLED,
            sword_enums_1.Player_Events.GIVE_REGULAR_BUFF,
            sword_enums_1.Player_Events.GIVE_SPECIAL_BUFF,
            sword_enums_1.Player_Events.UNLOAD_ASSET
        ]);
        this.receiver.subscribe("buff1");
        this.receiver.subscribe("buff2");
        this.receiver.subscribe("buff3");
        this.receiver.subscribe("cheat");
        this.receiver.subscribe("startStory");
        this.receiver.subscribe("startTimer");
        this.receiver.subscribe("endStory");
        this.receiver.subscribe("nextLevel");
        this.receiver.subscribe("MainMenu");
    }
    // TODO - 
    /**
     * Adds in any necessary UI to the game
     */
    addUI() {
        // In-game labels
        this.healthLabel = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "UI", { position: new Vec2_1.default(70, 35), text: "Player Health: " + this.player.ai.CURRENT_HP });
        this.healthLabel.size.set(200, 50);
        this.healthLabel.setHAlign(Label_1.HAlign.LEFT);
        this.healthLabel.textColor = Color_1.default.GREEN;
        this.healthLabel.font = "PixelSimple";
        this.healthLabel.fontSize = 25;
        this.healthBar = this.add.graphic(GraphicTypes_1.GraphicType.RECT, "UI", { position: new Vec2_1.default(0, 0), size: new Vec2_1.default(0, 0) });
        this.healthBar.borderColor = Color_1.default.BLACK;
        this.healthBar.borderWidth = 3;
        this.healthBar.color = Color_1.default.GREEN;
        this.poisonStat = this.add.sprite("poisoning", "UI");
        this.poisonStat.position.set(25, 8);
        this.poisonStat.scale.set(1, 1);
        this.burnStat = this.add.sprite("burning", "UI");
        this.burnStat.position.set(40, 8);
        this.burnStat.scale.set(1, 1);
        this.bleedStat = this.add.sprite("bleeding", "UI");
        this.bleedStat.position.set(55, 8);
        this.bleedStat.scale.set(1, 1);
        this.shieldLabel = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "UI", { position: new Vec2_1.default(70, 65), text: "shield: " + this.player.ai.CURRENT_SHIELD });
        this.shieldLabel.size.set(200, 50);
        this.shieldLabel.setHAlign(Label_1.HAlign.LEFT);
        this.shieldLabel.textColor = Color_1.default.ORANGE;
        this.shieldLabel.font = "PixelSimple";
        this.shieldLabel.fontSize = 25;
        this.shieldBar = this.add.graphic(GraphicTypes_1.GraphicType.RECT, "UI", { position: new Vec2_1.default(0, 0), size: new Vec2_1.default(0, 0) });
        this.shieldBar.borderColor = Color_1.default.BLACK;
        this.shieldBar.borderWidth = 3;
        this.shieldBar.color = Color_1.default.ORANGE;
        this.playerLevelLabel = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "UI", { position: new Vec2_1.default(20, 95), text: "Lv. " + PlayerController_1.default.level });
        this.playerLevelLabel.size.set(0, 50);
        this.playerLevelLabel.setHAlign(Label_1.HAlign.LEFT);
        this.playerLevelLabel.textColor = Color_1.default.BLUE;
        this.playerLevelLabel.font = "PixelSimple";
        this.playerLevelLabel.fontSize = 25;
        this.expLabel = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "UI", { position: new Vec2_1.default(100, 95), text: "EXP: " + this.player.ai.CURRENT_EXP });
        this.expLabel.size.set(200, 50);
        this.expLabel.setHAlign(Label_1.HAlign.LEFT);
        this.expLabel.textColor = Color_1.default.BLUE;
        this.expLabel.font = "PixelSimple";
        this.expLabel.fontSize = 25;
        this.expBar = this.add.graphic(GraphicTypes_1.GraphicType.RECT, "UI", { position: new Vec2_1.default(95, 80), size: new Vec2_1.default(150, 10) });
        this.expBar.borderColor = Color_1.default.BLACK;
        this.expBar.borderWidth = 3;
        this.expBar.color = Color_1.default.BLUE;
        //seed label
        //worldsize.x doesnt work how i want it to
        this.seedLabel = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "UI", { position: new Vec2_1.default(70, Math.floor(this.viewport.getHalfSize().y * 2 - 30)), text: "Seed: " + InputWrapper_1.default.randomSeed });
        this.seedLabel.size.set(200, 50);
        this.seedLabel.setHAlign(Label_1.HAlign.LEFT);
        this.seedLabel.textColor = Color_1.default.BLACK;
        this.seedLabel.font = "PixelSimple";
        this.add.sprite("black", "pause");
        this.add.sprite("black", "story");
        this.add.sprite("black", "buffLayer");
        //TODO - 
        //determine button location 
        this.buffButton1 = this.add.uiElement(UIElementTypes_1.UIElementType.BUTTON, "buffLayer", { position: new Vec2_1.default(Math.floor(this.viewport.getHalfSize().x * 2 / 3 - 180 / 2), Math.floor(this.viewport.getHalfSize().y)), text: "" });
        this.buffButton1.size.set(180, 200);
        this.buffButton1.borderWidth = 5;
        this.buffButton1.borderColor = Color_1.default.RED;
        this.buffButton1.backgroundColor = Color_1.default.WHITE;
        this.buffButton1.textColor = Color_1.default.BLACK;
        this.buffButton1.onClickEventId = "buff1";
        this.buffButton1.fontSize = 20;
        this.buffLabel1 = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "buffLayer", { position: new Vec2_1.default(this.buffButton1.position.x, this.buffButton1.position.y - 40), text: "buffLabel1" });
        this.buffLabel1.fontSize = 20;
        this.buffButton2 = this.add.uiElement(UIElementTypes_1.UIElementType.BUTTON, "buffLayer", { position: new Vec2_1.default(Math.floor(this.viewport.getHalfSize().x), Math.floor(this.viewport.getHalfSize().y)), text: "" });
        this.buffButton2.size.set(180, 200);
        this.buffButton2.borderWidth = 5;
        this.buffButton2.borderColor = Color_1.default.RED;
        this.buffButton2.backgroundColor = Color_1.default.WHITE;
        this.buffButton2.textColor = Color_1.default.BLACK;
        this.buffButton2.onClickEventId = "buff2";
        this.buffButton2.fontSize = 20;
        this.buffLabel2 = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "buffLayer", { position: new Vec2_1.default(this.buffButton2.position.x, this.buffButton2.position.y - 40), text: "buffLabel2" });
        this.buffLabel2.fontSize = 20;
        this.buffButton3 = this.add.uiElement(UIElementTypes_1.UIElementType.BUTTON, "buffLayer", { position: new Vec2_1.default(Math.floor(this.viewport.getHalfSize().x * 4 / 3 + 180 / 2), Math.floor(this.viewport.getHalfSize().y)), text: "" });
        this.buffButton3.size.set(180, 200);
        this.buffButton3.borderWidth = 5;
        this.buffButton3.borderColor = Color_1.default.RED;
        this.buffButton3.backgroundColor = Color_1.default.WHITE;
        this.buffButton3.textColor = Color_1.default.BLACK;
        this.buffButton3.onClickEventId = "buff3";
        this.buffButton3.fontSize = 20;
        this.buffLabel3 = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "buffLayer", { position: new Vec2_1.default(this.buffButton3.position.x, this.buffButton3.position.y - 40), text: "buffLabel3" });
        this.buffLabel3.fontSize = 20;
        this.buffs = this.player._ai.generateRegularBuffs();
        this.buffLayer.disable();
        this.pauseText = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "pause", { position: new Vec2_1.default(Math.floor(this.viewport.getHalfSize().x - 120), Math.floor(this.viewport.getHalfSize().y - 100)), text: "" });
        this.pauseInput = this.add.uiElement(UIElementTypes_1.UIElementType.TEXT_INPUT, "pause", { position: new Vec2_1.default(Math.floor(this.viewport.getHalfSize().x - 20), Math.floor(this.viewport.getHalfSize().y + 100)), text: "" });
        this.pauseCheatText = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "pause", { position: new Vec2_1.default(Math.floor(this.viewport.getHalfSize().x - 120), Math.floor(this.viewport.getHalfSize().y + 80)), text: "⬇️⬇️⬇️Cheat Code⬇️⬇️⬇️" });
        this.pauseSubmit = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "pause", { position: new Vec2_1.default(Math.floor(this.viewport.getHalfSize().x + 120), Math.floor(this.viewport.getHalfSize().y + 100)), text: "Submit" });
        this.pauseLayer.setAlpha(0.5);
        this.pauseText.textColor = Color_1.default.WHITE;
        this.pauseText.setHAlign(Label_1.HAlign.LEFT);
        this.pauseText.size = new Vec2_1.default(0, 40);
        this.pauseText.text = "HP:\nATK:\nDamage Ratio:\nBuff1:\nBuff2:\nBuff3:\nBuff4:\nBuff5:\nBuff6:\nEnemy Killed:\n";
        this.pauseCheatText.textColor = Color_1.default.WHITE;
        this.pauseCheatText.size = new Vec2_1.default(0, 40);
        this.pauseCheatText.setHAlign(Label_1.HAlign.LEFT);
        this.pauseInput.size.set(400, 30);
        this.pauseSubmit.textColor = Color_1.default.BLACK;
        this.pauseSubmit.borderColor = Color_1.default.BLACK;
        this.pauseSubmit.backgroundColor = Color_1.default.WHITE;
        this.pauseSubmit.onClickEventId = "cheat";
        this.pauseSubmit.borderWidth = 3;
        this.mainMenuButton = this.add.uiElement(UIElementTypes_1.UIElementType.BUTTON, "pause", { position: new Vec2_1.default(Math.floor(this.viewport.getHalfSize().x), Math.floor(this.viewport.getHalfSize().y + 150)), text: "Main Menu" });
        this.mainMenuButton.size.set(180, 50);
        this.mainMenuButton.borderWidth = 5;
        this.mainMenuButton.borderColor = Color_1.default.BLACK;
        this.mainMenuButton.backgroundColor = Color_1.default.WHITE;
        this.mainMenuButton.textColor = Color_1.default.BLACK;
        this.mainMenuButton.onClickEventId = "MainMenu";
        this.mainMenuButton.fontSize = 20;
        this.livesCountLabel = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "UI", { position: new Vec2_1.default(this.viewport.getHalfSize().x * 2 - 100, 30), text: "Lives: " });
        this.livesCountLabel.textColor = Color_1.default.YELLOW;
        this.livesCountLabel.fontSize = 25;
        this.timerLable = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "UI", { position: new Vec2_1.default(Math.floor(this.viewport.getHalfSize().x), 30), text: "00:00" });
        this.timerLable.fontSize = 60;
    }
    //TODO - determine whether we will have weapon datatype
    /**
     *
     * Creates and returns a new weapon
     * @param type The weaponType of the weapon, as a string
     */
    createWeapon(type) {
        let weaponType = RegistryManager_1.default.getRegistry("weaponTypes").get(type);
        let sprite = this.add.sprite(weaponType.spriteKey, "primary");
        return new Weapon_1.default(sprite, weaponType, this.battleManager);
    }
    /**
     * Initalizes all weapon types based of data from weaponData.json
     */
    initializeWeapons() {
        let weaponData = this.load.getObject("weaponData");
        for (let i = 0; i < weaponData.numWeapons; i++) {
            let weapon = weaponData.weapons[i];
            // Get the constructor of the prototype
            let constr = RegistryManager_1.default.getRegistry("weaponTemplates").get(weapon.weaponType);
            // Create a weapon type
            let weaponType = new constr();
            // Initialize the weapon type
            weaponType.initialize(weapon);
            // Register the weapon type
            RegistryManager_1.default.getRegistry("weaponTypes").registerItem(weapon.name, weaponType);
        }
    }
    /**
     * Initializes the player
     */
    initPlayer() {
        //create the inventory
        let inventory = new InventoryManager_1.default(this, 1, "inventorySlot", new Vec2_1.default(16, 16), 4, "slots1", "items1");
        //add starting weapon to inventory
        let startingWeapon = this.createWeapon("knife");
        inventory.addItem(startingWeapon); //using slice to test right now
        // Add the player
        this.player = this.add.animatedSprite("player", "primary");
        this.player.scale.set(1, 1);
        if (!this.playerSpawn) {
            console.warn("Player spawn was never set - setting spawn to (0, 0)");
            this.playerSpawn = Vec2_1.default.ZERO;
        }
        this.startpos = this.playerSpawn;
        this.player.position.copy(this.playerSpawn);
        this.player.addPhysics(new AABB_1.default(Vec2_1.default.ZERO, new Vec2_1.default(14, 16))); //sets the collision shape
        this.player.colliderOffset.set(0, 16);
        this.player.addAI(PlayerController_1.default, {
            playerType: "platformer",
            tilemap: "Main",
            speed: 100,
            health: 10,
            inventory: inventory,
            items: this.items,
            inputEnabled: false,
            range: 100
        });
        this.player.setGroup("player");
        this.viewport.follow(this.player);
    }
    //TODO - 
    /**
     * Adds an Enemy into the game
     * @param spriteKey The key of the Enemy sprite
     * @param tilePos The tilemap position to add the Enemy to
     * @param aiOptions The options for the Enemy AI
     */
    addEnemy(spriteKey, tilePos, ai, aiOptions) {
        let enemy = this.add.animatedSprite(spriteKey, "primary");
        //enemy.position.set(tilePos.x*32, tilePos.y*32);
        enemy.position.copy(tilePos);
        if ("scale" in aiOptions) {
            enemy.scale.set(aiOptions.scale, aiOptions.scale);
        }
        else {
            enemy.scale.set(2, 2);
        }
        //TODO - add custom collision shape for each enemy in an option variable 
        if ("size" in aiOptions) {
            enemy.addPhysics(new AABB_1.default(Vec2_1.default.ZERO, aiOptions.size.clone()));
        }
        else {
            enemy.addPhysics(new AABB_1.default(Vec2_1.default.ZERO, new Vec2_1.default(16, 25)));
        }
        if ("offset" in aiOptions) {
            enemy.colliderOffset.set(aiOptions.offset.x, aiOptions.offset.y);
        }
        else {
            enemy.colliderOffset.set(0, 6);
        }
        enemy.addAI(ai, aiOptions); //TODO - add individual enemy AI
        enemy._ai.healthBar = this.add.graphic(GraphicTypes_1.GraphicType.RECT, "primary", { position: enemy.collisionShape.center.clone().add(new Vec2_1.default(0, -(enemy.collisionShape.hh + 5))), size: new Vec2_1.default(enemy.collisionShape.hw * 3, 5) });
        enemy._ai.healthBar.borderColor = Color_1.default.BLACK;
        enemy._ai.healthBar.borderWidth = 1;
        enemy._ai.healthBar.color = Color_1.default.GREEN;
        enemy._ai.poisonStat = this.add.sprite("poisoning", "primary");
        enemy._ai.poisonStat.position = enemy.collisionShape.center.clone().add(new Vec2_1.default(((enemy.collisionShape.hw) * -1, -(enemy.collisionShape.hh + 5))));
        enemy._ai.poisonStat.scale.set(1, 1);
        enemy._ai.burnStat = this.add.sprite("burning", "primary");
        enemy._ai.burnStat.position = enemy._ai.poisonStat.position.clone().add(new Vec2_1.default(15, 0));
        enemy._ai.burnStat.scale.set(1, 1);
        enemy._ai.bleedStat = this.add.sprite("bleeding", "primary");
        enemy._ai.bleedStat.position = enemy._ai.poisonStat.position.clone().add(new Vec2_1.default(30, 0));
        enemy._ai.bleedStat.scale.set(1, 1);
        enemy._ai.physicWidth = enemy.collisionShape.hw;
        enemy._ai.physicHeight = enemy.collisionShape.hh;
        enemy.setGroup("Enemy");
        enemy.setTrigger("player", sword_enums_1.Player_Events.PLAYER_COLLIDE, null);
        //add enemy to the enemy array
        this.enemies.push(enemy);
        //this.battleManager.setEnemies(this.enemies.map(enemy => <BattlerAI>enemy._ai));
        this.battleManager.addEnemy(enemy._ai);
    }
    //TODO - give each enemy unique weapon
    initializeEnemies(enemies) {
        for (let enemy of enemies) {
            switch (enemy.type) {
                /*
                case "Snake":
                    this.addEnemy("Snake", enemy.position.scale(32), BossAI, {
                        player: this.player,
                        health: 50,
                        tilemap: "Main",
                        size: new Vec2(14,10),
                        offset : new Vec2(0, 22),
                        exp: 50,
                        weapon: this.createWeapon("laserGun")
                    })
                    break;
                */
                case "Snake": //Snake enemies drop from sky("trees")? or could just be very abundant
                    this.addEnemy("Snake", enemy.position.scale(32), SnakeAI_1.default, {
                        player: this.player,
                        health: 65,
                        tilemap: "Main",
                        size: new Vec2_1.default(14, 10),
                        offset: new Vec2_1.default(0, 22),
                        exp: 50,
                    });
                    break;
                case "Tiger": //Tiger can be miniboss for now? 
                    this.addEnemy("Tiger", enemy.position.scale(32), TigerAI_1.default, {
                        player: this.player,
                        health: 200,
                        tilemap: "Main",
                        scale: 1.5,
                        size: new Vec2_1.default(30, 18),
                        offset: new Vec2_1.default(0, 27),
                        exp: 100,
                    });
                    break;
                case "Bull":
                    this.addEnemy("Bull", enemy.position.scale(32), BullAI_1.default, {
                        player: this.player,
                        health: 200,
                        tilemap: "Main",
                        scale: 1.5,
                        size: new Vec2_1.default(30, 18),
                        offset: new Vec2_1.default(0, 27),
                        exp: 50,
                    });
                    break;
                case "black_pudding":
                    this.addEnemy("black_pudding", enemy.position.scale(32), SlimeAI_1.default, {
                        player: this.player,
                        health: 140 + PlayerController_1.default.level * 3,
                        tilemap: "Main",
                        //actions:actions,
                        scale: .25,
                        size: new Vec2_1.default(16, 10),
                        offset: new Vec2_1.default(0, 6),
                        exp: 50,
                        weapon: this.createWeapon("knife"),
                    });
                    break;
                case "Bull":
                    this.addEnemy("Bull", enemy.position.scale(32), BullAI_1.default, {
                        player: this.player,
                        health: 300,
                        tilemap: "Main",
                        //actions:actions,
                        scale: 1.5,
                        size: new Vec2_1.default(48, 24),
                        offset: new Vec2_1.default(0, 24),
                        exp: 75,
                    });
                    break;
                case "Archer":
                    this.addEnemy("Archer", enemy.position.scale(32), ArcherAI_1.default, {
                        player: this.player,
                        health: 100,
                        tilemap: "Main",
                        scale: 1,
                        size: new Vec2_1.default(20, 16),
                        offset: new Vec2_1.default(0, 16),
                        exp: 75,
                        weapon: this.createWeapon("pistol")
                    });
                    break;
                case "Assassin":
                    this.addEnemy("Assassin", enemy.position.scale(32), AssassinAI_1.default, {
                        player: this.player,
                        health: 100,
                        tilemap: "Main",
                        scale: 1,
                        size: new Vec2_1.default(20, 16),
                        offset: new Vec2_1.default(0, 16),
                        exp: 75,
                    });
                    break;
                case "FinalBoss":
                    console.log("spawning boss");
                    this.addEnemy("FinalBoss", enemy.position.scale(32), BossAI_1.default, {
                        player: this.player,
                        health: 5000,
                        tilemap: "Main",
                        scale: 2,
                        size: new Vec2_1.default(60, 50),
                        offset: new Vec2_1.default(0, 30),
                        exp: 75,
                        weapon: this.createWeapon("laserGun")
                    });
                    break;
                default:
                    break;
            }
        }
    }
    addCheckPoint(startingTile, size, enter, exit) {
        let checkPoint = this.add.graphic(GraphicTypes_1.GraphicType.RECT, "primary", { position: startingTile.scale(32), size: size.scale(32) });
        checkPoint.addPhysics(undefined, undefined, false, true);
        checkPoint.setTrigger("player", enter, null);
        checkPoint.color = new Color_1.default(0, 0, 0, 0);
        return checkPoint;
    }
    /**
     * damages the player if they collide with an enemy
     * @param player player sprite
     * @param enemy enemy sprite
     */
    handlePlayerEnemyCollision(player, enemy) {
        if (enemy === undefined) {
            console.log("undefined enemy");
            return;
        }
        if (player === undefined) {
            console.log("undefined player");
            return;
        }
        if (typeof enemy != undefined && typeof player != undefined) {
            //damage the player 
            enemy._ai.collideWithPlayer(this.player._ai);
        }
    }
    /**
     * Returns the player to spawn
     */
    respawnPlayer() {
        InputWrapper_1.default.enableInput();
        this.player.position.copy(this.startpos);
        this.player._ai.CURRENT_HP = this.player._ai.MAX_HP;
        //(<PlayerController>this.player._ai).lives --;
    }
    /**
     *
     * handles the player falling off the map
     *
     * @param viewportCenter The center of the viewport
     * @param viewportSize The size of the viewport
     */
    playerFalloff(viewportCenter, viewportSize) {
        if (this.player.position.y >= viewportCenter.y + viewportSize.y / 2.0) {
            this.player.position.set(this.playerSpawn.x, this.playerSpawn.y);
        }
    }
    playStartStory() {
        if (!this.touchedStartCheckPoint) {
            this.touchedStartCheckPoint = true;
            this.storyLoader("shattered_sword_assets/jsons/story.json");
            this.startTimer();
        }
    }
    playEndStory() {
        if (!this.touchedEndCheckPoint) {
            this.touchedEndCheckPoint = true;
            this.storyLoader("shattered_sword_assets/jsons/story.json");
            this.endTimer();
            this.levelEnded = true;
        }
    }
    startTimer() {
        this.gameStarted = true;
    }
    endTimer() {
        this.gameStarted = false;
    }
    goToNextLevel() {
        // this.sceneManager.changeToScene(Porcelain);
    }
    storyLoader(storyPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.gameStateStack.peek() === sword_enums_1.GameState.STORY) {
                return;
            }
            this.setGameState(sword_enums_1.GameState.STORY);
            const response = yield (yield fetch(storyPath)).json();
            this.story = response;
            console.log("story:", this.story);
            if (this.story.bgm) {
                this.storyBGMs = new Array;
                this.story.bgm.forEach((bgm) => {
                    if (this.load.getAudio(bgm.key)) {
                        this.emitter.fireEvent(GameEventType_1.GameEventType.PLAY_SOUND, { key: bgm.key, loop: false, holdReference: true });
                    }
                    else {
                        this.load.singleAudio(bgm.key, bgm.path, () => {
                            this.emitter.fireEvent(GameEventType_1.GameEventType.PLAY_SOUND, { key: bgm.key, loop: false, holdReference: true });
                        });
                    }
                    this.storyBGMs.push(bgm.key);
                });
            }
            this.currentSpeaker = this.story.texts[0].speaker;
            this.currentContent = this.story.texts[0].content;
            this.storyLayer.enable();
            this.storytextLabel = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "story", { position: new Vec2_1.default(50, this.viewport.getHalfSize().y + 80), text: "" });
            this.storytextLabel.size = new Vec2_1.default(0, 25);
            this.storytextLabel.textColor = Color_1.default.WHITE;
            this.storytextLabel.font = "PixelSimple";
            this.storytextLabel.fontSize = 25;
            this.storytextLabel.setHAlign(Label_1.HAlign.LEFT);
            this.storyProgress = -1;
            this.storySprites = new Array;
            this.updateStory();
        });
    }
    hasNextStory() {
        return this.gameStateStack.peek() === sword_enums_1.GameState.STORY && this.storyProgress + 1 < this.story.texts.length;
    }
    updateStory() {
        if (this.hasNextStory()) {
            this.storyProgress++;
            let tmp = undefined;
            if (this.story.texts[this.storyProgress].actions) {
                this.story.texts[this.storyProgress].actions.forEach(action => {
                    switch (action.type) {
                        case "loadSprite":
                            if (this.load.getImage(action.key)) {
                                tmp = this.add.sprite(action.key, "story");
                                tmp.position.set(action.positon[0], action.positon[1]);
                                tmp.scale.set(action.scale[0], action.scale[1]);
                                this.storySprites.push(tmp);
                            }
                            else {
                                this.load.singleImage(action.key, action.path, () => {
                                    tmp = this.add.sprite(action.key, "story");
                                    tmp.position.set(action.positon[0], action.positon[1]);
                                    tmp.scale.set(action.scale[0], action.scale[1]);
                                    this.storySprites.push(tmp);
                                });
                            }
                            break;
                        case "moveSprite":
                            tmp = this.storySprites.find(function (sprite) {
                                return sprite.imageId === action.key;
                            });
                            tmp.position.set(action.positon[0], action.positon[1]);
                            tmp.scale.set(action.scale[0], action.scale[1]);
                            break;
                        case "showSprite":
                            tmp = this.storySprites.find(function (sprite) {
                                return sprite.imageId === action.key;
                            });
                            tmp.visible = true;
                            break;
                        case "hideSprite":
                            tmp = this.storySprites.find(function (sprite) {
                                return sprite.imageId === action.key;
                            });
                            tmp.visible = false;
                            break;
                        default:
                            break;
                    }
                });
            }
            this.currentSpeaker = this.story.texts[this.storyProgress].speaker;
            this.currentContent = this.story.texts[this.storyProgress].content;
            this.storytextLabel.text = (this.currentSpeaker ? (this.currentSpeaker + ":") : ("")) + '\n' + this.currentContent;
        }
        else {
            this.setGameState();
            this.storyProgress = Infinity;
            this.storytextLabel.destroy();
            if (this.storySprites) {
                this.storySprites.forEach((sprite) => {
                    sprite.visible = false;
                    sprite.destroy();
                });
            }
            if (this.storyBGMs) {
                this.storyBGMs.forEach((bgm) => {
                    this.emitter.fireEvent(GameEventType_1.GameEventType.STOP_SOUND, { key: bgm });
                    console.log("sound stopped:", bgm);
                });
            }
            this.storyLayer.disable();
            this.storyBGMs = undefined;
            this.storySprites = undefined;
            this.story = undefined;
            this.storytextLabel = undefined;
            // this.storyLayer = undefined;
            if (this.levelEnded) {
                this.emitter.fireEvent(sword_enums_1.Player_Events.GIVE_SPECIAL_BUFF, {});
            }
        }
    }
    // Cheat
    enableCheat() {
        if (this.pauseInput.text.toUpperCase() === "UUDDLRLRBABA") {
            PlayerController_1.default.godMode = true;
        }
        else {
            let commands = this.pauseInput.text.split(' ');
            console.log(commands);
            if (commands.length === 3) {
                if (commands[0].toUpperCase() === "SET") {
                    switch (commands[1].toUpperCase()) {
                        case "ATK":
                            this.player._ai.CURRENT_ATK = parseInt(commands[2]);
                            break;
                        case "HP":
                            this.player._ai.CURRENT_HP = parseInt(commands[2]);
                            break;
                        case "EXP":
                            this.player._ai.CURRENT_EXP = parseInt(commands[2]);
                            break;
                        case "SLD":
                            this.player._ai.CURRENT_SHIELD = parseInt(commands[2]);
                            break;
                        case "SPD":
                            this.player._ai.speed = parseInt(commands[2]);
                            this.player._ai.MIN_SPEED = parseInt(commands[2]);
                            break;
                        default:
                            break;
                    }
                }
            }
            PlayerController_1.default.godMode = false;
        }
        this.pauseInput.text = "";
    }
}
exports.default = GameLevel;
// Labels for the UI
//TODO - lives here or in playercontroller
GameLevel.livesCount = 3;
GameLevel.gameTimer = 0;
GameLevel.currentLevel = "";

},{"../../Wolfie2D/DataTypes/Shapes/AABB":16,"../../Wolfie2D/DataTypes/Stack":19,"../../Wolfie2D/DataTypes/Vec2":24,"../../Wolfie2D/Events/GameEventType":30,"../../Wolfie2D/Nodes/Graphics/GraphicTypes":42,"../../Wolfie2D/Nodes/UIElements/Label":53,"../../Wolfie2D/Nodes/UIElements/UIElementTypes":56,"../../Wolfie2D/Registry/RegistryManager":65,"../../Wolfie2D/Scene/Scene":90,"../../Wolfie2D/Utils/Color":99,"../AI/ArcherAI":106,"../AI/AssassinAI":107,"../AI/BossAI":108,"../AI/BullAI":109,"../AI/SlimeAI":122,"../AI/SnakeAI":123,"../AI/TigerAI":124,"../GameSystems/BattleManager":125,"../GameSystems/InventoryManager":126,"../GameSystems/items/Weapon":128,"../Player/PlayerController":133,"../Tools/InputWrapper":157,"../sword_enums":161,"./GameOver":147,"./MainMenu":150}],147:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("../../Wolfie2D/DataTypes/Vec2");
const UIElementTypes_1 = require("../../Wolfie2D/Nodes/UIElements/UIElementTypes");
const Scene_1 = require("../../Wolfie2D/Scene/Scene");
const Color_1 = require("../../Wolfie2D/Utils/Color");
const sword_enums_1 = require("../sword_enums");
const InputWrapper_1 = require("../Tools/InputWrapper");
const MainMenu_1 = require("./MainMenu");
class GameOver extends Scene_1.default {
    startScene() {
        InputWrapper_1.default.setState(sword_enums_1.GameState.PAUSE);
        InputWrapper_1.default.randomSeed = undefined;
        const center = this.viewport.getCenter();
        this.addUILayer("primary");
        const gameOver = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "primary", { position: new Vec2_1.default(center.x, center.y), text: "YOU DIED" });
        gameOver.textColor = Color_1.default.RED;
        gameOver.fontSize = 100;
        const hint = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "primary", { position: new Vec2_1.default(center.x, center.y + 100), text: "Click to go back to Main Menu" });
        hint.textColor = Color_1.default.WHITE;
    }
    updateScene() {
        if (InputWrapper_1.default.isLeftMouseJustPressed()) {
            this.sceneManager.changeToScene(MainMenu_1.default);
        }
    }
}
exports.default = GameOver;

},{"../../Wolfie2D/DataTypes/Vec2":24,"../../Wolfie2D/Nodes/UIElements/UIElementTypes":56,"../../Wolfie2D/Scene/Scene":90,"../../Wolfie2D/Utils/Color":99,"../Tools/InputWrapper":157,"../sword_enums":161,"./MainMenu":150}],148:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RandomMapGenerator_1 = require("../Tools/RandomMapGenerator");
const GameLevel_1 = require("./GameLevel");
const InputWrapper_1 = require("../Tools/InputWrapper");
const Snow_1 = require("./Snow");
class Greatwall extends GameLevel_1.default {
    loadScene() {
        super.loadScene();
        this.rmg = new RandomMapGenerator_1.default("shattered_sword_assets/jsons/greatwall_template.json", InputWrapper_1.default.randomSeed);
        this.map = this.rmg.getMap();
        console.log(this.map);
        this.load.tilemapFromObject("map", this.map);
        //load enemies
        //can load enemy sprite here
        //sprites obtained from cse380 sprite wesbite
        this.load.spritesheet("black_pudding", "shattered_sword_assets/spritesheets/black_pudding.json");
        this.load.spritesheet("Bull", "shattered_sword_assets/spritesheets/Bull.json");
        //load music here
    }
    goToNextLevel() {
        this.viewport.setZoomLevel(1);
        let sceneOptions = {
            physics: {
                groupNames: ["ground", "player", "enemies"],
                collisions: [
                    [0, 1, 1],
                    [1, 0, 0],
                    [1, 0, 0]
                ]
            }
        };
        this.sceneManager.changeToScene(Snow_1.default, {}, sceneOptions);
    }
    playStartStory() {
        if (!this.touchedStartCheckPoint) {
            this.touchedStartCheckPoint = true;
            this.storyLoader("shattered_sword_assets/jsons/level3story.json");
            this.startTimer();
        }
    }
    playEndStory() {
        if (!this.touchedEndCheckPoint) {
            this.touchedEndCheckPoint = true;
            this.storyLoader("shattered_sword_assets/jsons/level3endstory.json");
            this.endTimer();
            this.levelEnded = true;
        }
    }
}
exports.default = Greatwall;

},{"../Tools/InputWrapper":157,"../Tools/RandomMapGenerator":159,"./GameLevel":146,"./Snow":153}],149:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Scene_1 = require("../../Wolfie2D/Scene/Scene");
const Vec2_1 = require("../../Wolfie2D/DataTypes/Vec2");
const UIElementTypes_1 = require("../../Wolfie2D/Nodes/UIElements/UIElementTypes");
const Color_1 = require("../../Wolfie2D/Utils/Color");
const MainMenu_1 = require("./MainMenu");
const Forest_1 = require("./Forest");
const Start_1 = require("./Start");
const Porcelain_1 = require("./Porcelain");
const Greatwall_1 = require("./Greatwall");
const Snow_1 = require("./Snow");
const Market_1 = require("./Market");
const End_1 = require("./End");
const InputWrapper_1 = require("../Tools/InputWrapper");
class Levels extends Scene_1.default {
    // TODO
    loadScene() { }
    startScene() {
        const center = this.viewport.getCenter();
        // The main menu
        this.primary = this.addUILayer("primary");
        const seedHint = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "primary", { position: new Vec2_1.default(center.x, center.y - 400), text: "Enter seed or leave it blank to randomly generate one" });
        seedHint.textColor = Color_1.default.WHITE;
        this.seedInput = this.add.uiElement(UIElementTypes_1.UIElementType.TEXT_INPUT, "primary", { position: new Vec2_1.default(center.x, center.y - 350), text: "" });
        this.seedInput.size.set(200, 50);
        const start = this.add.uiElement(UIElementTypes_1.UIElementType.BUTTON, "primary", { position: new Vec2_1.default(center.x, center.y - 300), text: "start(Test)" });
        start.size.set(200, 50);
        start.borderWidth = 2;
        start.borderColor = Color_1.default.WHITE;
        start.backgroundColor = Color_1.default.TRANSPARENT;
        start.onClickEventId = "start";
        const forest = this.add.uiElement(UIElementTypes_1.UIElementType.BUTTON, "primary", { position: new Vec2_1.default(center.x, center.y - 200), text: "forest(Test)" });
        forest.size.set(200, 50);
        forest.borderWidth = 2;
        forest.borderColor = Color_1.default.WHITE;
        forest.backgroundColor = Color_1.default.TRANSPARENT;
        forest.onClickEventId = "forest";
        const porcelain = this.add.uiElement(UIElementTypes_1.UIElementType.BUTTON, "primary", { position: new Vec2_1.default(center.x, center.y - 100), text: "porcelain(Test)" });
        porcelain.size.set(200, 50);
        porcelain.borderWidth = 2;
        porcelain.borderColor = Color_1.default.WHITE;
        porcelain.backgroundColor = Color_1.default.TRANSPARENT;
        porcelain.onClickEventId = "porcelain";
        const greatwall = this.add.uiElement(UIElementTypes_1.UIElementType.BUTTON, "primary", { position: new Vec2_1.default(center.x, center.y), text: "greatwall(Test)" });
        greatwall.size.set(200, 50);
        greatwall.borderWidth = 2;
        greatwall.borderColor = Color_1.default.WHITE;
        greatwall.backgroundColor = Color_1.default.TRANSPARENT;
        greatwall.onClickEventId = "greatwall";
        const snow = this.add.uiElement(UIElementTypes_1.UIElementType.BUTTON, "primary", { position: new Vec2_1.default(center.x, center.y + 100), text: "snow(Test)" });
        snow.size.set(200, 50);
        snow.borderWidth = 2;
        snow.borderColor = Color_1.default.WHITE;
        snow.backgroundColor = Color_1.default.TRANSPARENT;
        snow.onClickEventId = "snow";
        const market = this.add.uiElement(UIElementTypes_1.UIElementType.BUTTON, "primary", { position: new Vec2_1.default(center.x, center.y + 200), text: "market(Test)" });
        market.size.set(200, 50);
        market.borderWidth = 2;
        market.borderColor = Color_1.default.WHITE;
        market.backgroundColor = Color_1.default.TRANSPARENT;
        market.onClickEventId = "market";
        const end = this.add.uiElement(UIElementTypes_1.UIElementType.BUTTON, "primary", { position: new Vec2_1.default(center.x, center.y + 300), text: "end(Test)" });
        end.size.set(200, 50);
        end.borderWidth = 2;
        end.borderColor = Color_1.default.WHITE;
        end.backgroundColor = Color_1.default.TRANSPARENT;
        end.onClickEventId = "end";
        const back = this.add.uiElement(UIElementTypes_1.UIElementType.BUTTON, "primary", { position: new Vec2_1.default(center.x, center.y + 400), text: "Back" });
        back.size.set(200, 50);
        back.borderWidth = 2;
        back.borderColor = Color_1.default.WHITE;
        back.backgroundColor = Color_1.default.TRANSPARENT;
        back.onClickEventId = "back";
        this.receiver.subscribe("start");
        this.receiver.subscribe("forest");
        this.receiver.subscribe("porcelain");
        this.receiver.subscribe("greatwall");
        this.receiver.subscribe("snow");
        this.receiver.subscribe("market");
        this.receiver.subscribe("end");
        this.receiver.subscribe("back");
    }
    updateScene() {
        while (this.receiver.hasNextEvent()) {
            let event = this.receiver.getNextEvent();
            console.log(event);
            if (event.type === "start") {
                if (this.seedInput.text) {
                    InputWrapper_1.default.randomSeed = this.seedInput.text;
                    this.seedInput.text = "";
                }
                else {
                    InputWrapper_1.default.randomSeed = Math.floor(Math.random() * 10000000000).toString();
                }
                let sceneOptions = {
                    physics: {
                        groupNames: ["ground", "player", "enemies"],
                        collisions: [
                            [0, 1, 1],
                            [1, 0, 0],
                            [1, 0, 0]
                        ]
                    }
                };
                this.sceneManager.changeToScene(Start_1.default, {}, sceneOptions);
            }
            if (event.type === "forest") {
                if (this.seedInput.text) {
                    InputWrapper_1.default.randomSeed = this.seedInput.text;
                    this.seedInput.text = "";
                }
                else {
                    InputWrapper_1.default.randomSeed = Math.floor(Math.random() * 10000000000).toString();
                }
                let sceneOptions = {
                    physics: {
                        groupNames: ["ground", "player", "enemies"],
                        collisions: [
                            [0, 1, 1],
                            [1, 0, 0],
                            [1, 0, 0]
                        ]
                    }
                };
                this.sceneManager.changeToScene(Forest_1.default, {}, sceneOptions);
            }
            if (event.type === "porcelain") {
                if (this.seedInput.text) {
                    InputWrapper_1.default.randomSeed = this.seedInput.text;
                    this.seedInput.text = "";
                }
                else {
                    InputWrapper_1.default.randomSeed = Math.floor(Math.random() * 10000000000).toString();
                }
                let sceneOptions = {
                    physics: {
                        groupNames: ["ground", "player", "enemies"],
                        collisions: [
                            [0, 1, 1],
                            [1, 0, 0],
                            [1, 0, 0]
                        ]
                    }
                };
                this.sceneManager.changeToScene(Porcelain_1.default, {}, sceneOptions);
            }
            if (event.type === "greatwall") {
                if (this.seedInput.text) {
                    InputWrapper_1.default.randomSeed = this.seedInput.text;
                    this.seedInput.text = "";
                }
                else {
                    InputWrapper_1.default.randomSeed = Math.floor(Math.random() * 10000000000).toString();
                }
                let sceneOptions = {
                    physics: {
                        groupNames: ["ground", "player", "enemies"],
                        collisions: [
                            [0, 1, 1],
                            [1, 0, 0],
                            [1, 0, 0]
                        ]
                    }
                };
                this.sceneManager.changeToScene(Greatwall_1.default, {}, sceneOptions);
            }
            if (event.type === "snow") {
                if (this.seedInput.text) {
                    InputWrapper_1.default.randomSeed = this.seedInput.text;
                    this.seedInput.text = "";
                }
                else {
                    InputWrapper_1.default.randomSeed = Math.floor(Math.random() * 10000000000).toString();
                }
                let sceneOptions = {
                    physics: {
                        groupNames: ["ground", "player", "enemies"],
                        collisions: [
                            [0, 1, 1],
                            [1, 0, 0],
                            [1, 0, 0]
                        ]
                    }
                };
                this.sceneManager.changeToScene(Snow_1.default, {}, sceneOptions);
            }
            if (event.type === "market") {
                if (this.seedInput.text) {
                    InputWrapper_1.default.randomSeed = this.seedInput.text;
                    this.seedInput.text = "";
                }
                else {
                    InputWrapper_1.default.randomSeed = Math.floor(Math.random() * 10000000000).toString();
                }
                let sceneOptions = {
                    physics: {
                        groupNames: ["ground", "player", "enemies"],
                        collisions: [
                            [0, 1, 1],
                            [1, 0, 0],
                            [1, 0, 0]
                        ]
                    }
                };
                this.sceneManager.changeToScene(Market_1.default, {}, sceneOptions);
            }
            if (event.type === "end") {
                if (this.seedInput.text) {
                    InputWrapper_1.default.randomSeed = this.seedInput.text;
                    this.seedInput.text = "";
                }
                else {
                    InputWrapper_1.default.randomSeed = Math.floor(Math.random() * 10000000000).toString();
                }
                let sceneOptions = {
                    physics: {
                        groupNames: ["ground", "player", "enemies"],
                        collisions: [
                            [0, 1, 1],
                            [1, 0, 0],
                            [1, 0, 0]
                        ]
                    }
                };
                this.sceneManager.changeToScene(End_1.default, {}, sceneOptions);
            }
            if (event.type === "back") {
                this.sceneManager.changeToScene(MainMenu_1.default, {});
            }
        }
    }
}
exports.default = Levels;

},{"../../Wolfie2D/DataTypes/Vec2":24,"../../Wolfie2D/Nodes/UIElements/UIElementTypes":56,"../../Wolfie2D/Scene/Scene":90,"../../Wolfie2D/Utils/Color":99,"../Tools/InputWrapper":157,"./End":143,"./Forest":144,"./Greatwall":148,"./MainMenu":150,"./Market":151,"./Porcelain":152,"./Snow":153,"./Start":155}],150:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Scene_1 = require("../../Wolfie2D/Scene/Scene");
const Vec2_1 = require("../../Wolfie2D/DataTypes/Vec2");
const UIElementTypes_1 = require("../../Wolfie2D/Nodes/UIElements/UIElementTypes");
const Color_1 = require("../../Wolfie2D/Utils/Color");
const Levels_1 = require("./Levels");
const GameLevel_1 = require("./GameLevel");
const InputWrapper_1 = require("../Tools/InputWrapper");
const Forest_1 = require("./Forest");
const PlayerController_1 = require("../Player/PlayerController");
class MainMenu extends Scene_1.default {
    // private rmg: RandomMapGenerator;
    loadScene() {
        // Load the menu song
        this.load.image("background", "shattered_sword_assets/images/mainmenu.png");
    }
    //TODO 
    startScene() {
        GameLevel_1.default.gameTimer = 0;
        InputWrapper_1.default.randomSeed = undefined;
        const center = this.viewport.getCenter();
        PlayerController_1.default.reset();
        // The main menu
        this.mainMenu = this.addUILayer("mainMenu");
        let background = this.add.sprite("background", "mainMenu");
        background.position.set(this.viewport.getCenter().x, this.viewport.getCenter().y);
        background.scale = new Vec2_1.default(1280 / 352, 720 / 240);
        const seedHint = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "mainMenu", { position: new Vec2_1.default(center.x, center.y - 200), text: "Enter seed or leave it blank to randomly generate one" });
        seedHint.textColor = Color_1.default.WHITE;
        this.seedInput = this.add.uiElement(UIElementTypes_1.UIElementType.TEXT_INPUT, "mainMenu", { position: new Vec2_1.default(center.x, center.y - 150), text: "" });
        this.seedInput.size.set(200, 50);
        // Add map button, and give it an event to emit on press
        const map = this.add.uiElement(UIElementTypes_1.UIElementType.BUTTON, "mainMenu", { position: new Vec2_1.default(center.x, center.y - 80), text: "Start Game" });
        map.size.set(200, 50);
        map.borderWidth = 2;
        map.borderColor = Color_1.default.WHITE;
        map.backgroundColor = Color_1.default.TRANSPARENT;
        map.onClickEventId = "map";
        // Add about button
        const about = this.add.uiElement(UIElementTypes_1.UIElementType.BUTTON, "mainMenu", { position: new Vec2_1.default(center.x, center.y + 100), text: "About" });
        about.size.set(200, 50);
        about.borderWidth = 2;
        about.borderColor = Color_1.default.WHITE;
        about.backgroundColor = Color_1.default.TRANSPARENT;
        about.onClickEventId = "about";
        // Add about button
        const form = this.add.uiElement(UIElementTypes_1.UIElementType.BUTTON, "mainMenu", { position: new Vec2_1.default(center.x, center.y + 200), text: "Google Form" });
        form.size.set(200, 50);
        form.borderWidth = 2;
        form.borderColor = Color_1.default.WHITE;
        form.backgroundColor = Color_1.default.TRANSPARENT;
        form.onClick = function () {
            window.open("https://forms.gle/Ku7RmUdNn7b9m5ch6");
        };
        // Add control button, and give it an event to emit on press
        const control = this.add.uiElement(UIElementTypes_1.UIElementType.BUTTON, "mainMenu", { position: new Vec2_1.default(center.x, center.y), text: "Controls" });
        control.size.set(200, 50);
        control.borderWidth = 2;
        control.borderColor = Color_1.default.WHITE;
        control.backgroundColor = Color_1.default.TRANSPARENT;
        control.onClickEventId = "control";
        /* ########## ABOUT SCREEN ########## */
        this.about = this.addUILayer("about");
        this.about.setHidden(true);
        const aboutHeader = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "about", { position: new Vec2_1.default(center.x, center.y - 250), text: "About" });
        aboutHeader.textColor = Color_1.default.WHITE;
        const text1 = "This game was created by Henry Chen, Kelly Peng, and Renge";
        const text2 = "using the Wolfie2D game engine, a TypeScript game engine created by";
        const text3 = "Joe Weaver and Richard McKenna.";
        const line1 = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "about", { position: new Vec2_1.default(center.x, center.y - 50), text: text1 });
        const line2 = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "about", { position: new Vec2_1.default(center.x, center.y), text: text2 });
        const line3 = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "about", { position: new Vec2_1.default(center.x, center.y + 50), text: text3 });
        line1.textColor = Color_1.default.WHITE;
        line2.textColor = Color_1.default.WHITE;
        line3.textColor = Color_1.default.WHITE;
        const aboutBack = this.add.uiElement(UIElementTypes_1.UIElementType.BUTTON, "about", { position: new Vec2_1.default(center.x, center.y + 250), text: "Back" });
        aboutBack.size.set(200, 50);
        aboutBack.borderWidth = 2;
        aboutBack.borderColor = Color_1.default.WHITE;
        aboutBack.backgroundColor = Color_1.default.TRANSPARENT;
        aboutBack.onClickEventId = "menu";
        // Subscribe to the button events
        this.receiver.subscribe("map");
        this.receiver.subscribe("about");
        this.receiver.subscribe("menu");
        this.receiver.subscribe("control");
        //Control screen
        this.control = this.addUILayer("control");
        this.control.setHidden(true);
        const header = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "control", { position: new Vec2_1.default(center.x, center.y - 250), text: "Controls" });
        header.textColor = Color_1.default.WHITE;
        const lc = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "control", { position: new Vec2_1.default(center.x, center.y - 150), text: "A/D - Move Left/Right" });
        lc.textColor = Color_1.default.WHITE;
        const rc = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "control", { position: new Vec2_1.default(center.x, center.y - 100), text: "W/S - Look Up/Down" });
        rc.textColor = Color_1.default.WHITE;
        const wasd = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "control", { position: new Vec2_1.default(center.x, center.y - 50), text: "J/Z/Enter - Attack" });
        wasd.textColor = Color_1.default.WHITE;
        const e = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "control", { position: new Vec2_1.default(center.x, center.y), text: "SPACE/X - Jump" });
        e.textColor = Color_1.default.WHITE;
        const q = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "control", { position: new Vec2_1.default(center.x, center.y + 50), text: "K/C - Dash" });
        q.textColor = Color_1.default.WHITE;
        //const oneTwo = <Label>this.add.uiElement(UIElementType.LABEL, "control", {position: new Vec2(center.x, center.y + 100), text: "L/V - Use Skill"});
        const oneTwo = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "control", { position: new Vec2_1.default(center.x, center.y + 100), text: "" });
        oneTwo.textColor = Color_1.default.WHITE;
        //const zx = <Label>this.add.uiElement(UIElementType.LABEL, "control", {position: new Vec2(center.x, center.y + 150), text: "I/B - open Backpack"});
        const zx = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "control", { position: new Vec2_1.default(center.x, center.y + 150), text: "" });
        zx.textColor = Color_1.default.WHITE;
        const tb = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "control", { position: new Vec2_1.default(center.x, center.y + 200), text: "ESC - Pause" });
        tb.textColor = Color_1.default.WHITE;
        const back = this.add.uiElement(UIElementTypes_1.UIElementType.BUTTON, "control", { position: new Vec2_1.default(center.x, center.y + 300), text: "Back" });
        back.size.set(200, 50);
        back.borderWidth = 2;
        back.borderColor = Color_1.default.WHITE;
        back.backgroundColor = Color_1.default.TRANSPARENT;
        back.onClickEventId = "menu";
    }
    unloadScene() {
        // The scene is being destroyed, so we can stop playing the song
        //this.emitter.fireEvent(GameEventType.STOP_SOUND, {key: "menu"});
    }
    updateScene() {
        while (this.receiver.hasNextEvent()) {
            let event = this.receiver.getNextEvent();
            console.log(event);
            // if(event.type === "map"){
            //     this.sceneManager.changeToScene(Levels, {});
            // }
            if (event.type === "map") {
                if (this.seedInput.text) {
                    InputWrapper_1.default.randomSeed = this.seedInput.text;
                    this.seedInput.text = "";
                }
                else {
                    InputWrapper_1.default.randomSeed = Math.floor(Math.random() * 10000000000).toString();
                }
                console.log(InputWrapper_1.default.randomSeed);
                if (InputWrapper_1.default.randomSeed.toLowerCase() === "levels") {
                    this.sceneManager.changeToScene(Levels_1.default, {});
                }
                else {
                    let sceneOptions = {
                        physics: {
                            groupNames: ["ground", "player", "enemies"],
                            collisions: [
                                [0, 1, 1],
                                [1, 0, 0],
                                [1, 0, 0]
                            ]
                        }
                    };
                    this.sceneManager.changeToScene(Forest_1.default, {}, sceneOptions);
                }
            }
            if (event.type === "about") {
                this.about.setHidden(false);
                this.mainMenu.setHidden(true);
            }
            if (event.type === "menu") {
                this.mainMenu.setHidden(false);
                this.about.setHidden(true);
                this.control.setHidden(true);
            }
            if (event.type === "control") {
                this.mainMenu.setHidden(true);
                this.control.setHidden(false);
            }
        }
    }
}
exports.default = MainMenu;

},{"../../Wolfie2D/DataTypes/Vec2":24,"../../Wolfie2D/Nodes/UIElements/UIElementTypes":56,"../../Wolfie2D/Scene/Scene":90,"../../Wolfie2D/Utils/Color":99,"../Player/PlayerController":133,"../Tools/InputWrapper":157,"./Forest":144,"./GameLevel":146,"./Levels":149}],151:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RandomMapGenerator_1 = require("../Tools/RandomMapGenerator");
const GameLevel_1 = require("./GameLevel");
const InputWrapper_1 = require("../Tools/InputWrapper");
const End_1 = require("./End");
class Market extends GameLevel_1.default {
    loadScene() {
        super.loadScene();
        this.rmg = new RandomMapGenerator_1.default("shattered_sword_assets/jsons/market_template.json", InputWrapper_1.default.randomSeed);
        this.map = this.rmg.getMap();
        console.log(this.map);
        this.load.tilemapFromObject("map", this.map);
        //load enemies
        //can load enemy sprite here
        //sprites obtained from cse380 sprite wesbite
        // this.load.spritesheet("black_pudding","shattered_sword_assets/spritesheets/black_pudding.json");
        this.load.spritesheet("Assassin", "shattered_sword_assets/spritesheets/Assassin.json");
        //load music here
    }
    goToNextLevel() {
        this.viewport.setZoomLevel(1);
        let sceneOptions = {
            physics: {
                groupNames: ["ground", "player", "enemies"],
                collisions: [
                    [0, 1, 1],
                    [1, 0, 0],
                    [1, 0, 0]
                ]
            }
        };
        this.sceneManager.changeToScene(End_1.default, {}, sceneOptions);
    }
    playStartStory() {
        if (!this.touchedStartCheckPoint) {
            this.touchedStartCheckPoint = true;
            this.storyLoader("shattered_sword_assets/jsons/level5story.json");
            this.startTimer();
        }
    }
    playEndStory() {
        if (!this.touchedEndCheckPoint) {
            this.touchedEndCheckPoint = true;
            this.storyLoader("shattered_sword_assets/jsons/level5endstory.json");
            this.endTimer();
            this.levelEnded = true;
        }
    }
}
exports.default = Market;

},{"../Tools/InputWrapper":157,"../Tools/RandomMapGenerator":159,"./End":143,"./GameLevel":146}],152:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RandomMapGenerator_1 = require("../Tools/RandomMapGenerator");
const GameLevel_1 = require("./GameLevel");
const InputWrapper_1 = require("../Tools/InputWrapper");
const Greatwall_1 = require("./Greatwall");
class Porcelain extends GameLevel_1.default {
    loadScene() {
        super.loadScene();
        this.rmg = new RandomMapGenerator_1.default("shattered_sword_assets/jsons/porcelain_template.json", InputWrapper_1.default.randomSeed);
        this.map = this.rmg.getMap();
        console.log(this.map);
        this.load.tilemapFromObject("map", this.map);
        this.load.spritesheet("Tiger", "shattered_sword_assets/spritesheets/Tiger.json");
        this.load.spritesheet("black_pudding", "shattered_sword_assets/spritesheets/black_pudding.json");
        //load music here
    }
    goToNextLevel() {
        this.viewport.setZoomLevel(1);
        let sceneOptions = {
            physics: {
                groupNames: ["ground", "player", "enemies"],
                collisions: [
                    [0, 1, 1],
                    [1, 0, 0],
                    [1, 0, 0]
                ]
            }
        };
        this.sceneManager.changeToScene(Greatwall_1.default, {}, sceneOptions);
    }
    playStartStory() {
        if (!this.touchedStartCheckPoint) {
            this.touchedStartCheckPoint = true;
            this.storyLoader("shattered_sword_assets/jsons/level2story.json");
            this.startTimer();
        }
    }
    playEndStory() {
        if (!this.touchedEndCheckPoint) {
            this.touchedEndCheckPoint = true;
            this.storyLoader("shattered_sword_assets/jsons/level2endstory.json");
            this.endTimer();
            this.levelEnded = true;
        }
    }
}
exports.default = Porcelain;

},{"../Tools/InputWrapper":157,"../Tools/RandomMapGenerator":159,"./GameLevel":146,"./Greatwall":148}],153:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RandomMapGenerator_1 = require("../Tools/RandomMapGenerator");
const GameLevel_1 = require("./GameLevel");
const InputWrapper_1 = require("../Tools/InputWrapper");
const Market_1 = require("./Market");
class Snow extends GameLevel_1.default {
    loadScene() {
        super.loadScene();
        this.rmg = new RandomMapGenerator_1.default("shattered_sword_assets/jsons/snow_template.json", InputWrapper_1.default.randomSeed);
        this.map = this.rmg.getMap();
        console.log(this.map);
        this.load.tilemapFromObject("map", this.map);
        GameLevel_1.default.currentLevel = "snow";
        //load enemies
        //can load enemy sprite here
        //sprites obtained from cse380 sprite wesbite
        this.load.spritesheet("black_pudding", "shattered_sword_assets/spritesheets/black_pudding.json");
        this.load.spritesheet("Archer", "shattered_sword_assets/spritesheets/Archer.json");
        //load music here
    }
    goToNextLevel() {
        this.viewport.setZoomLevel(1);
        let sceneOptions = {
            physics: {
                groupNames: ["ground", "player", "enemies"],
                collisions: [
                    [0, 1, 1],
                    [1, 0, 0],
                    [1, 0, 0]
                ]
            }
        };
        this.sceneManager.changeToScene(Market_1.default, {}, sceneOptions);
    }
    playStartStory() {
        if (!this.touchedStartCheckPoint) {
            this.touchedStartCheckPoint = true;
            this.storyLoader("shattered_sword_assets/jsons/level4story.json");
            this.startTimer();
        }
    }
    playEndStory() {
        if (!this.touchedEndCheckPoint) {
            this.touchedEndCheckPoint = true;
            this.storyLoader("shattered_sword_assets/jsons/level4endstory.json");
            this.endTimer();
            this.levelEnded = true;
        }
    }
}
exports.default = Snow;

},{"../Tools/InputWrapper":157,"../Tools/RandomMapGenerator":159,"./GameLevel":146,"./Market":151}],154:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Scene_1 = require("../../Wolfie2D/Scene/Scene");
const ConfigManager_1 = require("../Tools/ConfigManager");
const SaveManager_1 = require("../Tools/SaveManager");
const Vec2_1 = require("../../Wolfie2D/DataTypes/Vec2");
const UIElementTypes_1 = require("../../Wolfie2D/Nodes/UIElements/UIElementTypes");
const Color_1 = require("../../Wolfie2D/Utils/Color");
const InputWrapper_1 = require("../Tools/InputWrapper");
const MainMenu_1 = require("./MainMenu");
class SplashScreen extends Scene_1.default {
    loadScene() {
        //load images
        this.load.image("backgroundImage", "shattered_sword_assets/images/logo.png");
        this.load.image("logo", "shattered_sword_assets/images/brown.png");
        // Load the menu song
        //this.load.audio("menu", "assets/music/menu.mp3");
    }
    //TODO 
    startScene() {
        this.config = new ConfigManager_1.default();
        this.save = new SaveManager_1.default();
        // Scene has started, so start playing music
        //this.emitter.fireEvent(GameEventType.PLAY_SOUND, {key: "menu", loop: true, holdReference: true});
        const center = this.viewport.getCenter();
        let size = this.viewport.getHalfSize();
        this.viewport.setFocus(size);
        this.viewport.setZoomLevel(1);
        let backgroundLayer = this.addUILayer("background");
        backgroundLayer.setDepth(0);
        let frontLayer = this.addUILayer("frontground");
        frontLayer.setDepth(1);
        this.clickLabel = this.add.uiElement(UIElementTypes_1.UIElementType.LABEL, "frontground", { position: new Vec2_1.default(size.x, size.y + 300), text: "\"Click anywhere to start\"" });
        this.clickLabel.textColor = new Color_1.default(0, 0, 0, 1);
        this.clickLabel.font = "Arial";
        this.clickLabel.fontSize = 70;
        let background = this.add.sprite("backgroundImage", "background");
        background.position.set(size.x, size.y);
        let logo = this.add.sprite("logo", "frontground");
        logo.position.set(size.x, size.y + 20);
        logo.scale.set(4, 4);
    }
    unloadScene() {
        // The scene is being destroyed, so we can stop playing the song
        //this.emitter.fireEvent(GameEventType.STOP_SOUND, {key: "menu"});
    }
    updateScene() {
        if (InputWrapper_1.default.isLeftMouseJustPressed()) { //if left click
            this.sceneManager.changeToScene(MainMenu_1.default, {}, {});
        }
        while (this.receiver.hasNextEvent()) {
            let event = this.receiver.getNextEvent();
            console.log(event);
            if (InputWrapper_1.default.isLeftMouseJustPressed()) { //if left click
                this.sceneManager.changeToScene(MainMenu_1.default, {}, {});
            }
        }
    }
}
exports.default = SplashScreen;

},{"../../Wolfie2D/DataTypes/Vec2":24,"../../Wolfie2D/Nodes/UIElements/UIElementTypes":56,"../../Wolfie2D/Scene/Scene":90,"../../Wolfie2D/Utils/Color":99,"../Tools/ConfigManager":156,"../Tools/InputWrapper":157,"../Tools/SaveManager":160,"./MainMenu":150}],155:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vec2_1 = require("../../Wolfie2D/DataTypes/Vec2");
const RandomMapGenerator_1 = require("../Tools/RandomMapGenerator");
const GameLevel_1 = require("./GameLevel");
const InputWrapper_1 = require("../Tools/InputWrapper");
const Forest_1 = require("./Forest");
class Start extends GameLevel_1.default {
    loadScene() {
        super.loadScene();
        this.rmg = new RandomMapGenerator_1.default("shattered_sword_assets/jsons/castle_template.json", InputWrapper_1.default.randomSeed);
        this.map = this.rmg.getMap();
        this.load.tilemapFromObject("map", this.map);
        //load enemies
        this.load.spritesheet("Snake", "shattered_sword_assets/spritesheets/Snake.json");
        this.load.spritesheet("black_pudding", "shattered_sword_assets/spritesheets/black_pudding.json");
        this.load.spritesheet("FinalBoss", "shattered_sword_assets/spritesheets/FinalBoss.json");
    }
    startScene() {
        super.startScene();
        this.addCheckPoint(new Vec2_1.default(3, 13), new Vec2_1.default(10, 10), "endStory", "nextLevel");
    }
    goToNextLevel() {
        this.viewport.setZoomLevel(1);
        let sceneOptions = {
            physics: {
                groupNames: ["ground", "player", "enemies"],
                collisions: [
                    [0, 1, 1],
                    [1, 0, 0],
                    [1, 0, 0]
                ]
            }
        };
        this.sceneManager.changeToScene(Forest_1.default, {}, sceneOptions);
    }
    playEndStory() {
        if (!this.touchedEndCheckPoint) {
            this.touchedEndCheckPoint = true;
            this.storyLoader("shattered_sword_assets/jsons/story.json");
            this.endTimer();
            this.levelEnded = true;
        }
    }
}
exports.default = Start;

},{"../../Wolfie2D/DataTypes/Vec2":24,"../Tools/InputWrapper":157,"../Tools/RandomMapGenerator":159,"./Forest":144,"./GameLevel":146}],156:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LocalStorageDB_1 = require("./LocalStorageDB");
class ConfigManager {
    constructor() {
        this.db = new LocalStorageDB_1.default("config");
        this.loadConfig();
        if (!ConfigManager.config)
            this.initConfig();
    }
    getVolume() {
        return ConfigManager.config.volume;
    }
    setVolume(volume) {
        ConfigManager.config.volume = volume;
        this.saveConfig();
    }
    // TODOs
    // add more functions if needed
    resetConfig(callback) {
        this.initConfig();
        callback(ConfigManager.config);
    }
    loadConfig() {
        ConfigManager.config = this.db.loadJSON();
    }
    saveConfig() {
        this.db.saveJSON(ConfigManager.config);
    }
    initConfig() {
        this.db.readJSON("shattered_sword_assets/jsons/sampleconfig.json", (config) => {
            if (!config)
                throw new Error("Fail to load config file");
            ConfigManager.config = config;
            console.log("Initializing Local Storage(config): ", ConfigManager.config);
            this.saveConfig();
        });
    }
}
exports.default = ConfigManager;

},{"./LocalStorageDB":158}],157:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Input_1 = require("../../Wolfie2D/Input/Input");
const sword_enums_1 = require("../sword_enums");
class InputWrapper {
    static isUpPressed() {
        if (InputWrapper.gameState != sword_enums_1.GameState.GAMING) {
            return false;
        }
        if (Input_1.default.isPressed("up")) {
            return true;
        }
        return false;
    }
    static isDownPressed() {
        if (InputWrapper.gameState != sword_enums_1.GameState.GAMING) {
            return false;
        }
        if (Input_1.default.isPressed("down")) {
            return true;
        }
        return false;
    }
    static isLeftPressed() {
        if (InputWrapper.gameState != sword_enums_1.GameState.GAMING) {
            return false;
        }
        if (Input_1.default.isPressed("left")) {
            return true;
        }
        return false;
    }
    static isRightPressed() {
        if (InputWrapper.gameState != sword_enums_1.GameState.GAMING) {
            return false;
        }
        if (Input_1.default.isPressed("right")) {
            return true;
        }
        return false;
    }
    static isJumpJustPressed() {
        if (InputWrapper.gameState != sword_enums_1.GameState.GAMING) {
            return false;
        }
        if (Input_1.default.isJustPressed("jump")) {
            return true;
        }
        return false;
    }
    static isJumpPressed() {
        if (InputWrapper.gameState != sword_enums_1.GameState.GAMING) {
            return false;
        }
        if (Input_1.default.isPressed("jump")) {
            return true;
        }
        return false;
    }
    /**
     * Returns whether or not the attack key is currently pressed
     * @returns True if the attack key is pressed, false otherwise
     */
    static isAttackJustPressed() {
        if (InputWrapper.gameState != sword_enums_1.GameState.GAMING) {
            return false;
        }
        if (Input_1.default.isJustPressed("attack")) {
            return true;
        }
        return false;
    }
    static isDashJustPressed() {
        if (InputWrapper.gameState != sword_enums_1.GameState.GAMING) {
            return false;
        }
        if (Input_1.default.isJustPressed("dash")) {
            return true;
        }
        return false;
    }
    static isSkillJustPressed() {
        if (InputWrapper.gameState != sword_enums_1.GameState.GAMING) {
            return false;
        }
        if (Input_1.default.isJustPressed("skill")) {
            return true;
        }
        return false;
    }
    static isInventoryJustPressed() {
        if (InputWrapper.gameState != sword_enums_1.GameState.GAMING) {
            return false;
        }
        if (Input_1.default.isJustPressed("inventory")) {
            return true;
        }
        return false;
    }
    static isBuff1JustPresed() {
        if (InputWrapper.gameState != sword_enums_1.GameState.BUFF) {
            return false;
        }
        return Input_1.default.isJustPressed("buff1");
    }
    static isBuff2JustPresed() {
        if (InputWrapper.gameState != sword_enums_1.GameState.BUFF) {
            return false;
        }
        return Input_1.default.isJustPressed("buff2");
    }
    static isBuff3JustPresed() {
        if (InputWrapper.gameState != sword_enums_1.GameState.BUFF) {
            return false;
        }
        return Input_1.default.isJustPressed("buff3");
    }
    static isPauseJustPressed() {
        if (InputWrapper.gameState != sword_enums_1.GameState.GAMING && InputWrapper.gameState != sword_enums_1.GameState.PAUSE) {
            return false;
        }
        if (Input_1.default.isJustPressed("pause")) {
            return true;
        }
        return false;
    }
    static isNextJustPressed() {
        if (InputWrapper.gameState != sword_enums_1.GameState.STORY) {
            return false;
        }
        if (Input_1.default.isJustPressed("attack") || Input_1.default.isMouseJustPressed()) {
            return true;
        }
        return false;
    }
    static isLeftMouseJustPressed() {
        return Input_1.default.isMouseJustPressed(0);
    }
    static disableInput() {
        Input_1.default.disableInput();
    }
    static enableInput() {
        Input_1.default.enableInput();
    }
    // DO NOT call this function directly
    static setState(gameState) {
        InputWrapper.gameState = gameState;
    }
    static getState() {
        return InputWrapper.gameState;
    }
}
exports.default = InputWrapper;
InputWrapper.gameState = sword_enums_1.GameState.GAMING;

},{"../../Wolfie2D/Input/Input":32,"../sword_enums":161}],158:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class LocalStorageDB {
    constructor(key) {
        this.key = key;
    }
    /**
     * Read a json file from a path
     * @param JSONFilePath The path to the JSON file
     * @param callback Function to run after getting the JSON
     */
    readJSON(JSONFilePath, callback) {
        let xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', JSONFilePath, false);
        // xobj.onreadystatechange = function () {
        //     if ((xobj.readyState == 4) && (xobj.status == 200)) {
        //         callback(JSON.parse(xobj.responseText));
        //     }
        // };
        xobj.send(null);
        callback(JSON.parse(xobj.responseText));
    }
    loadJSON() {
        return JSON.parse(localStorage.getItem(this.key));
    }
    saveJSON(value) {
        localStorage.setItem(this.key, JSON.stringify(value));
    }
}
exports.default = LocalStorageDB;

},{}],159:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Enemy = void 0;
const TiledData_1 = require("../../Wolfie2D/DataTypes/Tilesets/TiledData");
const Vec2_1 = require("../../Wolfie2D/DataTypes/Vec2");
class RandomMapGenerator {
    constructor(JSONFilePath, seed) {
        let xhr = new XMLHttpRequest();
        xhr.overrideMimeType("application/json");
        xhr.open('GET', JSONFilePath, false);
        xhr.send(null);
        this.template = JSON.parse(xhr.responseText);
        this.roomWithLeftEntrance = new Array();
        this.roomWithRightEntrance = new Array();
        this.roomWithUpEntrance = new Array();
        this.roomWithDownEntrance = new Array();
        this.minX = this.minY = this.maxX = this.maxY =
            this.roomWithLeftEntranceWeight = this.roomWithRightEntranceWeight =
                this.roomWithUpEntranceWeight = this.roomWithDownEntranceWeight = 0;
        this.map = new TiledData_1.TiledTilemapData();
        this.rooms = new Array();
        this.enemies = new Array();
        this.player = new Vec2_1.default();
        this.startCheckPoint = [0, 0, 0, 0];
        this.endCheckPoint = [0, 0, 0, 0];
        let gen = require('random-seed');
        this.gen = new gen(seed);
        this.hasExit = false;
        this.minRoom = this.template.minroom;
        this.roomPlaced = 0;
        this.exitFacing = this.getEntranceFacing(this.template.exit.entrances[0], this.template.exit.width);
        for (let room of this.template.rooms) {
            let left = false, right = false, up = false, down = false;
            for (let entrance of room.entrances) {
                let facing = this.getEntranceFacing(entrance, room.width);
                switch (facing) {
                    case Facing.LEFT:
                        left = true;
                        break;
                    case Facing.RIGHT:
                        right = true;
                        break;
                    case Facing.UP:
                        up = true;
                        break;
                    case Facing.DOWN:
                        down = true;
                        break;
                    default:
                        break;
                }
            }
            if (left) {
                this.roomWithLeftEntrance.push(room);
                this.roomWithLeftEntranceWeight += room.weight;
            }
            if (right) {
                this.roomWithRightEntrance.push(room);
                this.roomWithRightEntranceWeight += room.weight;
            }
            if (up) {
                this.roomWithUpEntrance.push(room);
                this.roomWithUpEntranceWeight += room.weight;
            }
            if (down) {
                this.roomWithDownEntrance.push(room);
                this.roomWithDownEntranceWeight += room.weight;
            }
        }
    }
    getMap() {
        let room = this.copyRoom(this.template.entrance, 0, 0);
        let facing = this.getEntranceFacing(this.template.entrance.entrances[0], this.template.entrance.width);
        let position = new Vec2_1.default(this.template.entrance.entrances[0].x, this.template.entrance.entrances[0].y);
        // this.removeEntrance(room, this.template.entrance.entrances[0], facing);
        this.rooms.push(room);
        this.putNextRoom(position, this.getOppositeFacing(facing));
        if (!this.hasExit)
            throw new Error("Fail to generate a map with exit!");
        this.fillData();
        console.log("Generated map:", this.map);
        return this.map;
    }
    getPlayer() {
        return new Vec2_1.default(this.player.x - this.minX, this.player.y - this.minY);
    }
    getStartCheckPoint() {
        return [this.startCheckPoint[0] - this.minX, this.startCheckPoint[1] - this.minY, this.startCheckPoint[2], this.startCheckPoint[3]];
    }
    getEndCheckPoint() {
        return [this.endCheckPoint[0] - this.minX, this.endCheckPoint[1] - this.minY, this.endCheckPoint[2], this.endCheckPoint[3]];
    }
    getEnemies() {
        return this.enemies;
    }
    putNextRoom(position, facing) {
        switch (facing) {
            case Facing.LEFT:
                position.x += 1;
                break;
            case Facing.RIGHT:
                position.x -= 1;
                break;
            case Facing.UP:
                position.y += 1;
                break;
            case Facing.DOWN:
                position.y -= 1;
                break;
            default:
                break;
        }
        if (this.roomPlaced >= this.minRoom && facing == this.exitFacing && !this.hasExit) {
            this.putExitRoom(position);
            return true;
        }
        let nextRoom = this.getRandomRoom(facing);
        let nextPosition = undefined;
        let thisEntrance = undefined;
        for (let entrance of nextRoom.entrances) {
            if (this.getEntranceFacing(entrance, nextRoom.width) == facing) {
                let tmpPosition = new Vec2_1.default(position.x - entrance.x, position.y - entrance.y);
                if (this.isValidRoom(tmpPosition, new Vec2_1.default(tmpPosition.x + nextRoom.width - 1, tmpPosition.y + nextRoom.height - 1))) {
                    thisEntrance = entrance;
                    nextPosition = tmpPosition;
                }
            }
        }
        if (!thisEntrance) {
            if (!this.hasExit) {
                throw new Error("Wrong order in map template" + facing);
            }
            return false;
        }
        let room = this.copyRoom(nextRoom, nextPosition.x, nextPosition.y);
        this.removeEntrance(room, thisEntrance, facing);
        this.rooms.push(room);
        this.roomPlaced += 1;
        if (this.hasExit && this.gen.random() <= 0.3) {
            return true;
        }
        for (let entrance of nextRoom.entrances) {
            if (entrance != thisEntrance) {
                let facing = this.getEntranceFacing(entrance, nextRoom.width);
                let position = new Vec2_1.default(nextPosition.x + entrance.x, nextPosition.y + entrance.y);
                if (this.putNextRoom(position, this.getOppositeFacing(facing))) {
                    this.removeEntrance(room, entrance, facing);
                }
            }
        }
        return true;
    }
    putExitRoom(position) {
        position = new Vec2_1.default(position.x - this.template.exit.entrances[0].x, position.y - this.template.exit.entrances[0].y);
        if (!this.isValidRoom(position, new Vec2_1.default(position.x + this.template.exit.width - 1, position.y + this.template.exit.height - 1))) {
            throw new Error("Cannot put exit room!!! Position is invalid!!! Please check order of entrances in map template.");
        }
        let room = this.copyRoom(this.template.exit, position.x, position.y);
        this.rooms.push(room);
        this.hasExit = true;
    }
    removeEntrance(room, entrance, facing) {
        let width = room.bottomRight.x - room.topLeft.x + 1;
        if (facing == Facing.LEFT || facing == Facing.RIGHT) {
            for (let index = 0; index < entrance.width; index++)
                room.topLayer[(entrance.y + index) * width + entrance.x] = 0;
            if (entrance.y > 0)
                room.topLayer[(entrance.y - 1) * width + entrance.x] = entrance.alt_tile[0];
            if (entrance.y + entrance.width <= (room.bottomRight.y - room.topLeft.y))
                room.topLayer[(entrance.y + entrance.width) * width + entrance.x] = entrance.alt_tile[1];
        }
        else {
            for (let index = 0; index < entrance.width; index++)
                room.topLayer[(entrance.y) * width + entrance.x + index] = 0;
            if (entrance.x > 0)
                room.topLayer[(entrance.y) * width + entrance.x - 1] = entrance.alt_tile[0];
            if (entrance.x + entrance.width <= (room.bottomRight.x - room.topLeft.x))
                room.topLayer[(entrance.y) * width + entrance.x + entrance.width] = entrance.alt_tile[1];
        }
    }
    fillData() {
        let width = this.maxX - this.minX + 1;
        let height = this.maxY - this.minY + 1;
        this.map.layers = new Array(2);
        this.map.layers[0] = new TiledData_1.TiledLayerData;
        this.map.layers[1] = new TiledData_1.TiledLayerData;
        this.map.width = this.map.layers[0].width = this.map.layers[1].width = width;
        this.map.height = this.map.layers[0].height = this.map.layers[1].height = height;
        this.map.tileheight = this.template.tileheight;
        this.map.tilewidth = this.template.tilewidth;
        this.map.orientation = "orthogonal";
        this.map.layers[0].x = this.map.layers[0].y = this.map.layers[1].x = this.map.layers[1].y = 0;
        this.map.layers[0].opacity = this.map.layers[1].opacity = 1;
        this.map.layers[0].visible = this.map.layers[1].visible = true;
        this.map.layers[0].type = this.map.layers[1].type = "tilelayer";
        this.map.layers[0].name = "Floor";
        this.map.layers[1].name = "Wall";
        this.map.layers[0].properties = [{
                name: "Collidable",
                type: "bool",
                value: false
            }];
        this.map.layers[1].properties = [{
                name: "Collidable",
                type: "bool",
                value: true
            }];
        this.map.tilesets = [{
                columns: this.template.columns,
                tilewidth: this.template.tilewidth,
                tileheight: this.template.tileheight,
                tilecount: this.template.tilecount,
                firstgid: this.template.firstgid,
                imageheight: this.template.imageheight,
                imagewidth: this.template.imagewidth,
                margin: this.template.margin,
                spacing: this.template.spacing,
                name: this.template.name,
                image: this.template.image
            }];
        this.map.layers[0].data = new Array(width * height).fill(this.template.background);
        this.map.layers[1].data = new Array(width * height);
        for (let room of this.rooms) {
            let roomWidth = room.bottomRight.x - room.topLeft.x + 1;
            let roomHeight = room.bottomRight.y - room.topLeft.y + 1;
            room.topLeft.x -= this.minX;
            room.topLeft.y -= this.minY;
            for (let i = 0; i < roomHeight; i++)
                for (let j = 0; j < roomWidth; j++) {
                    this.map.layers[0].data[(room.topLeft.y + i) * width + room.topLeft.x + j] = room.bottomLayer[i * roomWidth + j];
                    this.map.layers[1].data[(room.topLeft.y + i) * width + room.topLeft.x + j] = room.topLayer[i * roomWidth + j];
                }
            if (room.enemies)
                for (let enemy of room.enemies) {
                    enemy.position.x += room.topLeft.x;
                    enemy.position.y += room.topLeft.y;
                    this.enemies.push(enemy);
                }
        }
    }
    isValidRoom(topLeft, bottomRight) {
        for (let room of this.rooms) {
            if (room.topLeft.x <= bottomRight.x &&
                room.bottomRight.x >= topLeft.x &&
                room.topLeft.y <= bottomRight.y &&
                room.bottomRight.y >= topLeft.y) {
                console.warn("Found an invalid room! TopLeft:", topLeft.toString(), "BottomRight:", bottomRight.toString());
                return false;
            }
        }
        return true;
    }
    getEntranceFacing(entrance, width) {
        if (entrance.x === 0)
            return Facing.LEFT;
        else if (entrance.x === width - 1)
            return Facing.RIGHT;
        else if (entrance.y === 0)
            return Facing.UP;
        return Facing.DOWN;
    }
    getOppositeFacing(facing) {
        switch (facing) {
            case Facing.LEFT:
                return Facing.RIGHT;
            case Facing.RIGHT:
                return Facing.LEFT;
            case Facing.UP:
                return Facing.DOWN;
            case Facing.DOWN:
                return Facing.UP;
        }
    }
    getRandomRoom(facing) {
        let array = this.getRoomArray(facing), weight = this.getRoomWeight(facing);
        let value = this.gen(weight);
        if (value >= weight)
            throw new Error("Random number " + value + " is larger than total weight " + weight);
        for (let room of array) {
            if (value < room.weight)
                return room;
            value -= room.weight;
        }
        throw new Error("Cannot find Room! \nValue: " + value + "\nRooms: " + JSON.stringify(array));
    }
    getRoomArray(facing) {
        switch (facing) {
            case Facing.LEFT:
                return this.roomWithLeftEntrance;
            case Facing.RIGHT:
                return this.roomWithRightEntrance;
            case Facing.UP:
                return this.roomWithUpEntrance;
            case Facing.DOWN:
                return this.roomWithDownEntrance;
        }
    }
    getRoomWeight(facing) {
        switch (facing) {
            case Facing.LEFT:
                return this.roomWithLeftEntranceWeight;
            case Facing.RIGHT:
                return this.roomWithRightEntranceWeight;
            case Facing.UP:
                return this.roomWithUpEntranceWeight;
            case Facing.DOWN:
                return this.roomWithDownEntranceWeight;
        }
    }
    copyRoom(old, posX, posY) {
        let room = new Room();
        room.topLeft = new Vec2_1.default(posX, posY);
        room.bottomRight = new Vec2_1.default(posX + old.width - 1, posY + old.height - 1);
        room.topLayer = [...old.topLayer];
        room.bottomLayer = [...old.bottomLayer];
        room.enemies = new Array();
        if (old.sprites) {
            for (let sprite of old.sprites) {
                if (sprite.type === 'player') {
                    this.player.x = sprite.x + posX;
                    this.player.y = sprite.y + posY;
                }
                else {
                    if (this.gen.random() <= sprite.possibility) {
                        let tmp = new Enemy();
                        tmp.type = sprite.type;
                        tmp.position = new Vec2_1.default(sprite.x, sprite.y);
                        room.enemies.push(tmp);
                    }
                }
            }
        }
        if (old.startCheckPoint) {
            this.startCheckPoint = [...old.startCheckPoint];
            this.startCheckPoint[0] += posX;
            this.startCheckPoint[1] += posY;
        }
        if (old.endCheckPoint) {
            this.endCheckPoint = [...old.endCheckPoint];
            this.endCheckPoint[0] += posX;
            this.endCheckPoint[1] += posY;
        }
        if (posX < this.minX)
            this.minX = posX;
        if (posY < this.minY)
            this.minY = posY;
        if (posX + old.width - 1 > this.maxX)
            this.maxX = posX + old.width - 1;
        if (posY + old.height - 1 > this.maxY)
            this.maxY = posY + old.height - 1;
        return room;
    }
}
exports.default = RandomMapGenerator;
class Room {
}
class Enemy {
}
exports.Enemy = Enemy;
var Facing;
(function (Facing) {
    Facing["LEFT"] = "left";
    Facing["RIGHT"] = "right";
    Facing["UP"] = "up";
    Facing["DOWN"] = "down";
})(Facing || (Facing = {}));

},{"../../Wolfie2D/DataTypes/Tilesets/TiledData":22,"../../Wolfie2D/DataTypes/Vec2":24,"random-seed":2}],160:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LocalStorageDB_1 = require("./LocalStorageDB");
class SaveManager {
    constructor() {
        this.db = new LocalStorageDB_1.default("save");
        this.loadSave();
        if (!SaveManager.save)
            this.initSave();
    }
    getLevel() {
        return SaveManager.save.level;
    }
    setLevel(level) {
        SaveManager.save.level = level;
        this.saveSave();
    }
    getName() {
        return SaveManager.save.name;
    }
    setName(name) {
        SaveManager.save.name = name;
        this.saveSave();
    }
    // TODOs
    // add more functions if needed
    resetSave(callback) {
        this.initSave();
        callback(SaveManager.save);
    }
    loadSave() {
        SaveManager.save = this.db.loadJSON();
    }
    saveSave() {
        this.db.saveJSON(SaveManager.save);
    }
    initSave() {
        this.db.readJSON("shattered_sword_assets/jsons/samplesave.json", (save) => {
            if (!save)
                throw new Error("Fail to load save file");
            SaveManager.save = save;
            console.log("Initializing Local Storage(save): ", SaveManager.save);
            this.saveSave();
        });
    }
}
exports.default = SaveManager;

},{"./LocalStorageDB":158}],161:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameState = exports.Statuses = exports.Damage_Type = exports.Player_Events = void 0;
var Player_Events;
(function (Player_Events) {
    Player_Events["PLAYER_MOVE"] = "PlayerMove";
    Player_Events["PLAYER_JUMP"] = "PlayerJump";
    Player_Events["PLAYER_ATTACK"] = "PlayerAttack";
    Player_Events["PLAYER_DASH"] = "PlayerDash";
    Player_Events["PLAYER_HEAL"] = "PlayerHeal";
    Player_Events["LEVEL_START"] = "LevelStart";
    Player_Events["LEVEL_END"] = "LevelEnd";
    Player_Events["PLAYER_KILLED"] = "PlayerKilled";
    Player_Events["ENEMY_KILLED"] = "EnemyKilled";
    Player_Events["PLAYER_HIT_ENEMY"] = "PlayerHitEnemy";
    Player_Events["BOSS_KILLED"] = "BossKilled";
    Player_Events["GIVE_REGULAR_BUFF"] = "GiveRegularBuff";
    Player_Events["GIVE_SPECIAL_BUFF"] = "GiveSpecialBuff";
    Player_Events["PLAYER_COLLIDE"] = "PlayerCollide";
    Player_Events["UNLOAD_ASSET"] = "UnloadAsset";
})(Player_Events = exports.Player_Events || (exports.Player_Events = {}));
var Damage_Type;
(function (Damage_Type) {
    Damage_Type["NORMAL_DAMAGE"] = "NormalDamage";
    Damage_Type["ENVIRONMENT_DAMAGE"] = "EnvironmentDamage";
    Damage_Type["DOT_DAMAGE"] = "DOTDamage";
})(Damage_Type = exports.Damage_Type || (exports.Damage_Type = {}));
var Statuses;
(function (Statuses) {
    Statuses["IN_RANGE"] = "IN_RANGE";
    Statuses["LOW_HEALTH"] = "LOW_HEALTH";
    Statuses["CAN_RETREAT"] = "CAN_RETREAT";
    Statuses["REACHED_GOAL"] = "GOAL";
    Statuses["CAN_BERSERK"] = "CAN_BERSERK";
})(Statuses = exports.Statuses || (exports.Statuses = {}));
var GameState;
(function (GameState) {
    GameState["GAMING"] = "gaming";
    GameState["STORY"] = "story";
    GameState["BUFF"] = "buff";
    GameState["PAUSE"] = "pause";
})(GameState = exports.GameState || (exports.GameState = {}));

},{}]},{},[105])