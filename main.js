
        var worker = undefined;
        var target = "Hello World"
        var cmd = {cmd: "start", target: target };
        var chart;

        window.onload = function() {
            toggleWorker();

            chart = c3.generate({
                        bindto: "#chart",
                        size: { height: 500},

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
                        }
                    });
        };

        function displayEntities(e) {
            var t = "<table class='generation'><tr><td class='count'>Count</td><td class='fitness'>Fitness</td><td class='outputheader'>Output</td><td class='code'>Code</td></tr>";

            if (e.length > 40) {
                e.length = 40;
            }

            e.length = 1;

            for (i=0; i<e.length; i++) {
                var c = (i%2==0) ? "even_row" : "odd_row";
                t += "<tr class='" + c + "'><td>"+ i +"</td><td>" + roundedDisplay(e[i].fitness) +
                     "</td><td class='output'>" + safeDisplay(e[i].output) + "</td><td class='code'>"
                     + e[i].code + "</td></tr>";
            }

            t += "</table>";

            document.getElementById("Generation").innerHTML = t;
        }

        var columns = [ ['x'], ['fitness'], ['gps'] ];
        var fittest_objects = {}

        function displayStats(s) {
            let gps = Math.round(s.entity_count/s.elapsed*1000);
            document.getElementById("entity_count").innerHTML = s.entity_count;
            document.getElementById("generation_count").innerHTML = s.generation_count;
            document.getElementById("generations_per_second").innerHTML = gps ;

            var now = new Date(s.now);
            columns[0].push();
            columns[1].push(Math.log(fittest) / Math.LN10);
            columns[2].push(gps);
            chart.load({columns:columns})

            fittest_objects[now] = fittest_object;
        }

        function safeDisplay(s) {
            rv = encodeURI(s);
            rv = rv.replace(/%20/g," ");
            if (false && rv.length>20) {
                rv = rv.substring(0,20) + "...";
            }
            return rv;
        }

        function roundedDisplay(f) {
            f = Math.round(f * 1000)/1000;
            return f;
        }

        var fittest = Number.MAX_VALUE;
        var fittest_object;

        function updateFittest(e) {
            if (e[0].fitness < fittest) {
                fittest_object = JSON.parse(JSON.stringify(e[0]));
                fittest = e[0].fitness;
                document.title = target + " : " + fittest;
            }

            // stop if we match
            if (true && e[0].output == target) {
                toggleWorker();
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
                  displayEntities(e.data.data);
                  updateFittest(e.data.data);
              } else if ( e.data.type === "stats" ) {
                  displayStats(e.data.data);
              } else {
                  console.log(e.data);
              }
            }, false);
            worker.postMessage(cmd);
          }
        }
