var mutation_threshold = .5;

String.prototype.reverse=function(){
	return this.split("").reverse().join("");
}

function numberSorter(e1, e2) {
	return e1 - e2;
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

// var mutations = [ mutate_replace, mutate_insert, mutate_grow, mutate_shrink, mutate_grow_or_shrink, mutate_reverse ];
var mutations = [ mutate_grow, mutate_shrink, mutate_grow_or_shrink ];
var mutations_size = mutations.length;


function mutate(s) {
	if (Math.random() < mutation_threshold) {
		return mutations[Math.floor(Math.random() * mutations_size)](s);
	}
	return s;
}
