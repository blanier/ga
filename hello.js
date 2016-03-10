var children=[]

var target = "";
var mutation_threshold = .5;
var generation_size = 100;
var check_for_dups = true;

var generation_count = 1; // set to 1 to account for the magic "seed" generation
var entity_count = 0;

String.prototype.reverse=function(){
	return this.split("").reverse().join("");
}

/*
 * generate 2 numbers that are non-equal points in a string
 */
function generate_splits(s) {
  var length = s.length;
  if (length<5) {
    return [0, length];
  }
  var splits = [];
	do {
		splits = [ Math.floor(Math.random()*length), Math.floor(Math.random()*length) ];
	} while (splits[0] == splits[1] && s.length != 0);
	splits.sort(numberSorter);
	return splits;
}

/*
 * replace a section of the string with randomly generated code of the same length as the originally selected section
 */
function mutate_replace(s) {
	var splits = generate_splits(s);
	s=s.substring(0, splits[0]) + generateRandomCode(splits[1]-splits[0]) + s.substring(splits[1])
	return s;
}

/*
 * insert a sequence randomly generated code and then truncate the string to its original length
 */
function mutate_insert(s) {
	var splits = generate_splits(s);
	s=s.substring(0, splits[0]) + generateRandomCode(splits[1]-splits[0]) + s.substring(splits[0]).substring(0,s.length);
	return s;
}

/*
 * insert a sequence of randomly generated code, allowing the string to grow
 */
function mutate_grow(s) {
	var splits = generate_splits(s);
	s=s.substring(0, splits[0]) + generateRandomCode(splits[1]-splits[0]) + s.substring(splits[0]);
	return s;
}

/*
 * remove a sequence of characters from the string
 */
function mutate_shrink(s) {
	var splits = generate_splits(s);
	s=s.substring(0, splits[0])  + s.substring(splits[1])
	return s;
}

/*
 * remove a sequence of characters from the string and replace them with a randomly generated sequence of a likely different length
 */
function mutate_grow_or_shrink(s) {
	var splits = generate_splits(s);
	var splits2 = generate_splits(s);
	s=s.substring(0, splits[0]) + generateRandomCode(splits2[1]-splits2[0]) + s.substring(splits[1])
	return s;
}

/*
 * replace a sequence of characters with their reversal
 */
function mutate_reverse(s) {
	var splits = generate_splits(s);
	s=s.substring(0, splits[0]) + s.substring(splits[0],splits[1]).reverse() + s.substring(splits[1]);
	return s;
}

//var mutations = [ mutate_replace, mutate_insert, mutate_grow, mutate_shrink, mutate_grow_or_shrink, mutate_reverse ];
var mutations = [ mutate_grow, mutate_shrink, mutate_grow_or_shrink ];
var mutations_size = mutations.length;


function mutate(s) {
	if (Math.random() < mutation_threshold) {
		return mutations[Math.floor(Math.random() * mutations_size)](s);
	}
	return s;
}

function addChild(child) {
	if (check_for_dups) {
		for (var i=0; i<children.length; i++) {
			if (children[i].code == child.code) {
				return;
			}
		}
	}
	children.push(child);
}

function entitySorter(e1, e2) {
	if (e1.age != e2.age) {
		return e1.age - e2.age;
	}
	return e1.fitness - e2.fitness;
}

function numberSorter(e1, e2) {
	return e1 - e2;
}

function evaluate(_code) {
	entity_count++;
	var _output = bf_interpret(_code, "");
	var _fitness = stringDistance(_output, target) + (Math.sqrt(_code.length));
	return {code:_code, output:_output, fitness:_fitness, age:0 };
}

function stringDistancePositionWeight(pos, targetlen) {
	var root = 9; //5 // 1.5
	return (pos < targetlen) ? Math.pow(root, targetlen - pos) : root + Math.sqrt(pos - targetlen);
}

function stringDistance(s1, s2) {
	var rv = 0;
	var n = Math.min(s1.length, s2.length);
	var x = Math.max(s1.length, s2.length) + 1;
	var delta;
	var i;

	for (i=0; i<n; i++) {
		delta = s1.charCodeAt(i) - s2.charCodeAt(i);
		delta = delta * delta;
		rv += delta * stringDistancePositionWeight(i, s2.length);
	}

	for (; i<x-1; i++) {
		delta = 256; // maximum excursion
		delta = delta * delta;
		rv += delta * stringDistancePositionWeight(i, s2.length);
	}
	return rv;
}

function offspring(s1, s2) {
	if (Math.random() > 0.5) {
		tmp=s1;
		s1=s2;
		s2=tmp;
	}
	var split = Math.floor(Math.random()*Math.min(s1.length, s2.length));
	var rv = [ mutate(s1.substring(0, split) + s2.substring(split)) ];
	return rv;
}

function doGeneration() {
	// rank by fitness
	children.sort(entitySorter);

	// account for entity TTL
	// children = children.filter(function(c) { return c.age < age_threshold; });
	children = children.map(function(c) { c.age++; return c; });


	// enforce generational size limit
	if (children.length > generation_size) {
		children.length = generation_size;
	}


	// let the UI know
	var c = children.slice(0,10);
	postMessage({type:"generation",data:c});

	var size = children.length;

	for (var i=0; i<size; i++) {
		do {
			var i1 = Math.floor(Math.random()*(size/10) );
			var i2 = Math.floor(Math.random()*size);

			if (children.length == 2) {
				i1=0;
				i2=1;
			}
		} while (i1 == i2);

		var c = offspring(children[i1].code, children[i2].code);
		for (var j=0; j<c.length; j++) {
			addChild(evaluate(c[j]));
		}
	}
	generation_count++;
}

function safeCharCodeAt(s, i) {
	var rv = 0;
	if (i<s.length) {
		rv = s.charCodeAt(i);
	}
	return rv;
}

var legal=".,+-<>[]";
var legallength = legal.length;
var c = new Array();

function generateRandomCode(l) {
	for (var i=0; i<l; ++i) {
		c[i] = legal.charAt(Math.random()*legallength);
	}
	c.length = l;
	return c.join("");
}

var mem_size = 30000; // given that instructionCount clips us to 10000 cycles, 30000 seems a tad ridiculous
var max_val = 255;
var a = [];

function bf_interpret(prog, params) {

	var instructionCount = 10000;

    var i;
	for (i = 0; i < mem_size; i++) {
		a[i]=0;
	}

    var p = 0;
    var l = 0;
    var argi = 0;

    var result = '';

    for (i = 0; i < prog.length && instructionCount > 0; i++, instructionCount--) {
	switch (prog.charAt(i)) {
		case ">":
			p++; p %= mem_size;
			break;
		case "<":
			p--; p %= mem_size;
			if (p<0) p = mem_size + p;
			break;
		case "+":
			a[p]++; a[p] %= max_val;
			break;
		case "-":
			a[p]--; a[p] %= max_val;
			if (a[p]<0) a[p] = max_val + a[p];
			break;
		case ".":
			result += String.fromCharCode(a[p]);
			break;
		case ",":
			a[p] = params.charCodeAt(argi);
			argi++;
			break;
		case "[":
			if (a[p] == 0) {
				for (i++; l > 0 || prog.charAt(i) != ']'; i++) {
					if (i>=prog.length) {
						l=0;
						instructionCount = 0;
						break;
					} else {
						if (prog.charAt(i) == '[') {
							l++;
						}
						if (prog.charAt(i) == ']') {
							l--;
						}
					}
				}
			}
			break;
		case "]":
			if (a[p] != 0) {
				for (i--; l > 0 || prog.charAt(i) != '['; i--) {
					if (i<0) {
						l=0;
						instructionCount = 0;
						break;
					} else {
						if (prog.charAt(i) == ']') {
							l++;
						}
						if (prog.charAt(i) == '[') {
							l--;
						}
					}
				}
			}

			i--;
			break;
		}
    }

    return result;
}

var calculation_interval = null;
var stats_interval = null;
var seeded = false;
var step_mode = false;

onmessage = function(e){
  if ( e.data.cmd === "start" ) {
		if (calculation_interval == null) {
			target = e.data.target;
			if (!seeded) {
				seed();
				seeded = true;
			}
			if (step_mode) {
				setTimeout(doGeneration, 1);
			}  else {
				calculation_interval = setInterval(doGeneration, 100);
			}
			stats_interval = setInterval(reportStats,10000);
		} else {
			clearInterval(calculation_interval);
			calculation_interval = null;
			clearInterval(stats_interval);
			stats_interval = null;
		}
  }
};

function seed() {
	for (var i=0; i<generation_size; i++) {
		addChild(evaluate(generateRandomCode(250)));
	}
}

function reportStats() {
	postMessage({type:"stats",data: { generation_count: generation_count, entity_count: entity_count } });
}


function doTest() {
	var testCode = generateRandomCode(Math.floor(Math.random()*250));
	bf_interpret(testCode,"");
	console.log(Date());
}
