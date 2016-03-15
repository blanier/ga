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
