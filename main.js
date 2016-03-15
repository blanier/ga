
        var worker = undefined;
        var target = "Hello World"
        var cmd = {cmd: "start", target: target };

        window.onload = function() {
            toggleWorker();
        };

        function displayEntities(e) {
            var t = "<table class='generation'><tr><td class='count'>Count</td><td class='fitness'>Fitness</td><td class='outputheader'>Output</td><td class='code'>Code</td></tr>";

            if (e.length > 40) {
                e.length = 40;
            }

            for (i=0; i<e.length; i++) {
                var c = (i%2==0) ? "even_row" : "odd_row";
                t += "<tr class='" + c + "'><td>"+ i +"</td><td>" + roundedDisplay(e[i].fitness) + "</td><td class='output'>" + safeDisplay(e[i].output) + "</td><td>" + e[i].code + "</td></tr>";
            }

            t += "</table>";

            document.getElementById("Generation").innerHTML = t;
        }

        function displayStats(s) {
            document.getElementById("entity_count").innerHTML = s.entity_count;
            document.getElementById("generation_count").innerHTML = s.generation_count;
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

        function updateFittest(e) {
            if (e[0].fitness < fittest) {
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
