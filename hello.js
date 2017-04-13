importScripts("bf.js", "mutator.js");

var parameters = {};
var children=[]
var generation_count = 1; // set to 1 to account for the magic "seed" generation
var entity_count = 0;

function addChild(child) {
	if (parameters.generation.check_for_dups) {
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

function evaluate(_code) {
	entity_count++;
	var _output = bf_interpret(_code, parameters.goal.input, parameters.interpreter);
	var _fitness = stringDistance(_output, parameters.goal.target) + (Math.sqrt(_code.length));
	return {code:_code, output:_output, fitness:_fitness, age:0 };
}

function stringDistancePositionWeight(pos, targetlen) {
	var root = targetlen; //9; //5 // 1.5
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
		delta = 128; // maximum excursion
		delta = delta * delta;
		rv += delta * stringDistancePositionWeight(i, s2.length);
	}
	return rv;
}

function offspring(s1, s2) {
	if (Math.random() > 0.5) {
		var tmp=s1;
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
	children = children.filter(function(c) { return c.age <= parameters.generation.age_threshold; });
	children = children.map(function(c) { c.age++; return c; });

	// enforce generational size limit
	if (children.length > parameters.generation.size) {
		children.length = parameters.generation.size;
	}

	// let the UI know
	var slice = children.slice(0,10);
	postMessage({type:"generation",data:slice});

	var size = children.length;

	for (var i=0; i<size; i++) {
		do {
			var i1 = Math.floor(Math.random()*(size/35) );
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
var start_time = 0;

onmessage = function(e){
  if ( e.data.cmd === "start" ) {
		parameters = JSON.parse(e.data.parameters);
		start_time = new Date().getTime();
		if (calculation_interval == null) {
			if (!seeded) {
				seed();
				seeded = true;
			}
			doGeneration();
			reportStats();
			stats_interval = setInterval(reportStats,10000);
		} else {
			clearInterval(calculation_interval);
			calculation_interval = null;
			clearInterval(stats_interval);
			stats_interval = null;
		}
  } else if (e.data.cmd === "stats and die") {
		reportStats();
		close();
	}
};

function seed() {
	for (var i=0; i<parameters.generation.size; i++) {
		addChild(evaluate(generateRandomCode(250)));
	}
}

function reportStats() {
	var now = new Date().getTime();
	postMessage({type:"stats",data: { generation_count: generation_count, entity_count: entity_count, elapsed: now - start_time, now: now } });
}
