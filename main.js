/*global firebase firebaseConfig c3 d3:true*/
/*eslint no-alert:off*/
/*eslint no-console:off*/


var booleans = ["auto_run", "loop"];

// Initialze GA
function GA() {
  this.checkSetup();
  this.initFirebase();

  for (var i in booleans) {
    var key = booleans[i];
    var val = JSON.parse(localStorage.getItem(key));
    console.log(`${key} is ${val}`);

    var checkbox = document.getElementById(key);
    checkbox.checked = val;
    checkbox.addEventListener("change", this.handleCheckbox.bind(this));
  }

  this.startButton = document.getElementById("start_thread");
  this.startButton.addEventListener('click', this.startWorker.bind(this));
  this.stopButton = document.getElementById("stop_thread");
  this.stopButton.addEventListener('click', this.stopWorker.bind(this));
  this.stopWorker();

  this.configDisplay = document.getElementById("config");
  this.configsSelector = document.getElementById("config_selector");
  this.configKeyDisplay = document.getElementById("config_key");
  this.configsSelector.addEventListener('change', this.onConfigChange.bind(this));
  this.configsRef = this.database.ref("configs");
  this.loadConfigs();
}


// Loads chat messages history and listens for upcoming ones.
GA.prototype.loadConfigs = function() {
  // Make sure we remove all previous listeners.
  this.configsRef.off();

  // Loads the known configs and listen for new ones.
  var getConfig = function(data) {
    var first = this.configsSelector.selectedIndex == -1;
    var val = data.val();
    var o = this.configsSelector.options[data.key];
    if (!o) {
      o = document.createElement("option");
    }
    o.text = val.metadata.name;
    o.value = JSON.stringify(val);
    o.id = data.key;
    this.configsSelector.add(o);
    if (first) {
      this.onConfigChange();
      if (JSON.parse(localStorage.getItem("auto_run"))) {
        this.startWorker();
      }
    }
  }.bind(this);

  // Listen for changes
  this.configsRef.on('child_added', getConfig);
  this.configsRef.on('child_changed', getConfig);
};

GA.prototype.onConfigChange = function() {
  let key = this.configsSelector[this.configsSelector.selectedIndex].id;
  this.configKeyDisplay.innerHTML = key;
  var v = this.configsSelector[this.configsSelector.selectedIndex].value;
  parameters = JSON.parse(v);
  this.configDisplay.innerHTML = `<pre> ${JSON.stringify(parameters,null,4)}</pre>`;
  this.runsRef = this.database.ref(`runs/${key}`);
}

GA.prototype.handleCheckbox = function(e) {
  let checked = e.srcElement.checked;
  let key = e.srcElement.id;
  console.log(checked);
  window.GA[key] = checked;
  localStorage.setItem(key, checked);
}

GA.prototype.resetDisplayState = function() {
  columns = [ ['x'], ['fittest_ever'], ['fittest_now'], ['gps'], ['age']];
  fittest_objects = {}
  fittest_now = { fitness: Number.MAX_VALUE};
  fittest_ever = { fitness: Number.MAX_VALUE};
  chart.load({columns:columns});
}

GA.prototype.startWorker = function() {
  if (this.worker) { this.stopWorker() }

  this.resetDisplayState();
  this.startButton.style.display = "none";
  this.stopButton.style.display = "inline";

  this.worker = new Worker("hello.js");
  this.worker.addEventListener('message', function(e) {
    if (e.data.type === "generation") {
        updateFittest(e.data.data);
        displayEntities(e.data.data);
    } else if ( e.data.type === "stats" ) {
        displayStats(e.data.data);
    } else {
        console.log(e.data);
    }
  }, false);
  this.worker.postMessage({cmd: "start", parameters: JSON.stringify(parameters)});
}

GA.prototype.stopWorker = function() {
  if (this.worker) { this.worker.terminate(); }
  this.worker = undefined;
  this.startButton.style.display = "inline";
  this.stopButton.style.display = "none";
}

// Sets up shortcuts to Firebase features and initiate firebase auth.
GA.prototype.initFirebase = function() {
  // Shortcuts to Firebase SDK features.
  this.auth = firebase.auth();
  this.database = firebase.database();
  this.storage = firebase.storage();
  // Initiates Firebase auth and listen to auth state changes.
  // this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

// Checks that the Firebase SDK has been correctly setup and configured.
GA.prototype.checkSetup = function() {
  if (!window.firebase || !(firebase.app instanceof Function) || !window.config) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions.');
  } else if (firebaseConfig.storageBucket === '') {
    window.alert('Your Cloud Storage bucket has not been enabled. Sorry about that. This is ' +
        'actually a Firebase bug that occurs rarely. ' +
        'Please go and re-generate the Firebase initialisation snippet (step 4 of the codelab) ' +
        'and make sure the storageBucket attribute is not empty. ' +
        'You may also need to visit the Storage tab and paste the name of your bucket which is ' +
        'displayed there.');
  }
};

var parameters = {};
var columns = [ ['x'], ['fittest_ever'], ['fittest_now'], ['gps'], ['age']];
var chart;
var fittest_objects = {}
var fittest_now = { fitness: Number.MAX_VALUE };
var fittest_ever = { fitness: Number.MAX_VALUE };

window.onload = function() {
    window.GA = new GA();

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

function safeDisplay(s) {
    var rv = encodeURI(s);
    rv = rv.replace(/%20/g," ");
    return rv;
}

function roundedDisplay(f) {
    f = Math.round(f * 1000)/1000;
    return f;
}

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

    if (s.last_time) {
      window.GA.stopWorker();
      window.GA.runsRef.push(s);
      if (JSON.parse(localStorage.getItem("loop"))) {
        window.GA.startWorker();
      }
    }
}

function updateFittest(e) {
    fittest_now = JSON.parse(JSON.stringify(e[0]));
    if (fittest_now.fitness < fittest_ever.fitness) {
        fittest_ever = fittest_now;
        document.title = parameters.goal.target + " : " + fittest_ever.fitness;
    }

    // stop if we match
    if (true && e[0].output == parameters.goal.target) {
        window.GA.worker.postMessage({cmd: "stats and die" });
    }
}
