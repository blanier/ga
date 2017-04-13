var parameters = {
  interpreter: {
    memory_size: 1000,
    instruction_count: 5000
  },

  randomness: {
    seed: ""
  },

  generation: {
    size: 100,
    age_threshold: 10,
    mutation_threshold: .5,
    check_for_dups: true
  },

  goal: {
    target: "hello world",
    input: ""
  }
};

var worker = undefined;
var chart;

window.onload = function() {

    // handle randomness initialization
    // if (parameters.randomness.seed && paramaters.randomnedd.seed != "") {
    //  randmom.seed(paramaters.randomness.seed)
    // }

    chart = c3.generate({
        bindto: "#chart",
        size: { height: 500 },
        data: {
            x: 'x',
            columns: columns,
            axes: {
                fitness: 'y',
                gps: 'y2'
            }
        },
        axis: {
            x: {
                type: 'timeseries',
                tick: {
                    format: '%Y-%m-%d %H:%M:%S '
                }
            },
             y2: {
                show: true
            }
        },
        tooltip: {
          contents: function (d, defaultTitleFormat, defaultValueFormat, color) {
              let original_HTML = this.getTooltipContent(d, defaultTitleFormat, defaultValueFormat, color);
              let rv =`<div> ${original_HTML} </div>
                       <div> ${fittest_objects[d[0].x].code.slice(0,35)}<br>
                             ${fittest_objects[d[0].x].output.slice(0,35)}
                       </div>`
              return rv;
          },
          format: {
              value: function (value, ratio, id) {
                let format = d3.format(".3f");
                switch (id) {
                  case 'fittest_now':
                  case 'fittest_ever':
                    return format(value);
                  default:
                    return value;
                }
              }
          }
        }
    });
    toggleWorker();
    document.getElementById("config").innerHTML = `<pre> ${JSON.stringify(parameters,null,4)}</pre>`;
};

function displayEntities(e) {
    var t = "<table class='generation'><tr><td class='count'>Count</td><td class='fitness'>Fitness</td><td class='outputheader'>Output</td><td class='code'>Code</td></tr>";

    if (e.length > 40) {
        e.length = 40;
    }

    e.length = 1;

    for (var i=0; i<e.length; i++) {
        var c = (i%2==0) ? "even_row" : "odd_row";
        t += "<tr class='" + c + "'><td>"+ i +"</td><td>" + roundedDisplay(e[i].fitness) +
             "</td><td class='output'>" + safeDisplay(e[i].output) + "</td><td class='code'>"
             + e[i].code + "</td></tr>";
    }

    t += "</table>";

    document.getElementById("Generation").innerHTML = t;
}

var columns = [ ['x'], ['fittest_ever'], ['fittest_now'], ['gps'], ['age']];
var fittest_objects = {}

function safeDisplay(s) {
    var rv = encodeURI(s);
    rv = rv.replace(/%20/g," ");
    return rv;
}

function roundedDisplay(f) {
    f = Math.round(f * 1000)/1000;
    return f;
}

var fittest = Number.MAX_VALUE;
var fittest_now;
var fittest_ever;

function displayStats(s) {
    let gps = Math.round(s.entity_count/s.elapsed*1000);
    document.getElementById("entity_count").innerHTML = s.entity_count;
    document.getElementById("generation_count").innerHTML = s.generation_count;
    document.getElementById("generations_per_second").innerHTML = gps ;
    var seconds = Math.floor(s.elapsed/1000);
    document.getElementById("elapsed_time").innerHTML = `${Math.floor(seconds/60)}:${"00".concat(seconds%60).slice(-2)}`

    var now = new Date(s.now);

    fittest_objects[now] = fittest_ever;
    columns[0].push(now);

    let log_scale = true
    if (log_scale) {
      columns[1].push(Math.log(fittest_ever.fitness) / Math.LN10);
      columns[2].push(Math.log(fittest_now.fitness) / Math.LN10);
    } else {
      columns[1].push(fittest_ever.fitness);
      columns[2].push(fittest_now.fitness);
    }
    columns[3].push(gps);
    columns[4].push(fittest_now.age);
    chart.load({columns:columns});
}

function updateFittest(e) {
    fittest_now = JSON.parse(JSON.stringify(e[0]));
    if (e[0].fitness < fittest) {
        fittest_ever = fittest_now;
        fittest = e[0].fitness;
        document.title = parameters.goal.target + " : " + fittest;
    }

    // stop if we match
    if (true && e[0].output == parameters.goal.target) {
        worker.postMessage({cmd: "stats and die" });
        // toggleWorker();
    }
}

function toggleWorker() {
  if (worker) {
    worker.terminate();
    worker = undefined;
  } else {
    worker = new Worker("hello.js");
    worker.addEventListener('message', function(e) {
      if (e.data.type === "generation") {
          updateFittest(e.data.data);
          displayEntities(e.data.data);
      } else if ( e.data.type === "stats" ) {
          displayStats(e.data.data);
      } else {
          console.log(e.data);
      }
    }, false);
    worker.postMessage({cmd: "start", parameters: JSON.stringify(parameters)});
  }
}
