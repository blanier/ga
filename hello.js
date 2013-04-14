var children=[]

var target = "hello world";
var mutation_threshold = .8;
var generation_size = 50;
var sexual_reproduction = true;
var check_for_dups = true;

var generation_count = 0;
var entity_count = 0;
var matched_generation = -1;

function generate_splits(s) {
	do {
		var length = s.length;
		var splits = [ Math.floor(Math.random()*length), Math.floor(Math.random()*length) ];
	} while (splits[0] == splits[1]);
	splits.sort(numberSorter);
	return splits;
}

function mutate_replace(s) {
	var splits = generate_splits(s);
	s=s.substring(0, splits[0]) + generateRandomCode(splits[1]-splits[0]) + s.substring(splits[1])
	return s;
}

function mutate_insert(s) {
	var splits = generate_splits(s);
	s=s.substring(0, splits[0]) + generateRandomCode(splits[1]-splits[0]) + generateRandomCode(splits[1]-splits[0]) + s.substring(splits[1]).substring(0,s.length);
	return s;
}

function mutate_grow(s) {
	var splits = generate_splits(s);
	s=s.substring(0, splits[0]) + generateRandomCode(splits[1]-splits[0]) + generateRandomCode(splits[1]-splits[0]) + s.substring(splits[1])
	return s;
}

function mutate_shrink(s) {
	var splits = generate_splits(s);
	s=s.substring(0, splits[0])  + s.substring(splits[1])
	return s;
}

function mutate_grow_or_shrink(s) {
	var splits = generate_splits(s);
	var splits2 = generate_splits(s);
	s=s.substring(0, splits[0]) + generateRandomCode(splits2[1]-splits2[0]) + s.substring(splits[1])
	return s;
}

var mutations = [ mutate_replace, mutate_insert, mutate_grow, mutate_shrink, mutate_grow_or_shrink ];
var mutations_size = mutations.length;


function mutate(s) {
	var iterations = 1.0;
	while (Math.random() < (mutation_threshold/iterations)) {
		return mutations[Math.floor(Math.random() * mutations_size)](s);
		iterations /= 2.0
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
	return e1.fitness - e2.fitness;
}

function numberSorter(e1, e2) {
	return e1 - e2;
}

function offspring(s1, s2) {

	if (sexual_reproduction) {
		var length = Math.max(s1.length, s2.length);

		do {
			var splits = [ Math.floor(Math.random()*length), Math.floor(Math.random()*length) ];
		} while (splits[0] == splits[1]);

		splits.sort(numberSorter);

		var rv = [ mutate(s1.substring(0, splits[0]) + s2.substring(splits[0],splits[1]) + s1.substring(splits[1])),
		mutate(s2.substring(0, splits[0]) + s1.substring(splits[0],splits[1]) + s2.substring(splits[1])) ];
		return rv;
	} 
	return [ mutate(s1), mutate(s2) ];
}

function doGeneration() {
	children.sort(entitySorter);
	if (children.length > generation_size) {
		children.length = generation_size;
	}

	postMessage({type:"generation",data:children});

	var size = children.length;

	for (var i=0; i<size/2; i++) {
		do {
			var index = [ Math.random() * children.length,
			Math.random() * children.length,
			Math.random() * children.length,
			Math.random() * children.length
			];
			var i1 = Math.floor(index[0]<=index[1]?index[0]:index[1]);
			var i2 = Math.floor(index[2]<=index[3]?index[2]:index[3]);

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

	if (matched_generation <= 0)
	if (children[0].output == target) {
		matched_generation = generation_count;
		reportStats();
		postMessage({type:"match",data:{target: target, generation_count: matched_generation}});
	}
}

function evaluate(_code) {
	entity_count++;
	var _output = bf_interpret(_code, "");
	// var _fitness = stringDistance(_output, target) + codeAnalysisWeight(_code) + frequencyAnalysisWeight(_output);
	var _fitness = stringDistance(_output, target) + (1-(1/codeAnalysisWeight(_code))); 
	return {code:_code, output:_output, fitness:_fitness};
}

var maxsoukoreff_frequency = 0.186550;

var soukoreff_frequency = { 
	" ":    0.186550,
	"e":    0.108321,
	"t":    0.079711,
	"a":    0.066101,
	"h":    0.062808,
	"o":    0.053881,
	"s":    0.049366,
	"n":    0.048965,
	"r":    0.047798,
	"i":    0.041987,
	"l":    0.036380,
	"d":    0.035168,
	"u":    0.024981,
	"w":    0.023349,
	"m":    0.020149,
	"c":    0.019151,
	"g":    0.017733,
	"y":    0.017043,
	"f":    0.014561,
	"b":    0.013218,
	"p":    0.012472,
	"k":    0.008703,
	"v":    0.008059,
	"j":    0.001296,
	"x":    0.001119,
	"q":    0.000615,
	"z":    0.000503
};

function frequencyAnalysisWeight(output) {
	// higher means less desirable...

	var score = 0;
	for (var i=0; i<output.length; ++i) {
		var thisscore = soukoreff_frequency[output[i].toLowerCase()];
		if (thisscore != null)
		score += thisscore;
	}

	return (output.length - score / maxsoukoreff_frequency);
}

function codeAnalysisWeight(code) {
	// higher means less desirable...
	return Math.sqrt(code.length);
}

function stringDistancePositionWeight(pos, targetlen) {
	// higher means more important...

	// this converges to 'hello world' ...
	var root = 5; return (pos < targetlen) ? Math.pow(root, targetlen - pos) : root;

	// 7 gets stuck at "hello vszz%7D"
	//var root = 6; return (pos < targetlen) ? Math.pow(root, targetlen - pos) : root;
}

function stringDistance(s1, s2) {
	var rv = 0;
	var n = Math.min(s1.length, s2.length);
	var x = Math.max(s1.length, s2.length);
	var delta;
	var i;

	for (i=0; i<n; i++) {
		delta = s1.charCodeAt(i) - s2.charCodeAt(i);
		delta = delta * delta;
		rv += delta * stringDistancePositionWeight(i, s2.length);
	}

	delta = 256; // maximum excursion
	delta = delta * delta;
	for (; i<x; i++) {
		rv += delta * stringDistancePositionWeight(i, s2.length);
	}

	return rv;
}

var legal=".,+-<>[]";
var legallength = legal.length;
var a2 = new Array();

function generateRandomCode(l) {
	/*
var rv = "";
for (var i=0; i<l; i++) {
rv += legal.charAt(Math.random()*legallength);
}
return rv;
*/
	for (var i=0; i<l; ++i) {
		a2[i] = legal.charAt(Math.random()*legallength);
	}
	a2.length = l;
	return a2.join("");
}



var mem_size = 30000;
var max_val = 255;
var a = new Array(mem_size);

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

	//postMessage({type:"INFO",data:prog});

	for (i = 0; i < prog.length && instructionCount > 0; i++, instructionCount--) {
		//console.log(i+":"+prog.charAt(i)+":"+result);
		switch (prog.charAt(i)) {
		case ">":
			p++; p %= mem_size;
			break;
		case "<":
			p--; p %= mem_size;
			break;
		case "+":
			a[p]++; a[p] %= max_val;
			break;
		case "-":
			a[p]--; a[p] %= max_val;
			break;
		case ".":
			result += String.fromCharCode(a[p]); 
			break;
		case ",":
			a[p] = params.charCodeAt(argi); 
			argi++;
			break;
		case "[":
			if (a[p] === 0) {
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
	if (e.data === "stop" || (e.data === "start" && (calculation_interval != null))) {
		clearInterval(calculation_interval);
		calculation_interval = null;
		clearInterval(stats_interval);
		stats_interval = null;
	}
	else
	if ( e.data === "start" ) {
		if (calculation_interval == null) {
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