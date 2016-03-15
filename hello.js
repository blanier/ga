importScripts("bf.js", "mutator.js");

var children=[]

var target = "";
var mutation_threshold = .5;
var generation_size = 100;
var check_for_dups = true;

var generation_count = 1; // set to 1 to account for the magic "seed" generation
var entity_count = 0;



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

	setTimeout(doGeneration, 1);
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
				// calculation_interval = setInterval(doGeneration, 100);
				doGeneration();
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
