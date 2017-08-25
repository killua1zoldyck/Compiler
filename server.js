const express = require('express');
const path = require('path');
const publicPath = path.join(__dirname,'./Public');
const http = require('http');
const app = express();
const server = http.createServer(app);
const fs = require('fs-extra');
const formidable = require('formidable');
const socketIO = require('socket.io');
const io = socketIO(server);
const maxJob = 2;
const {spawn} = require("child_process");

var jobQueue = [];
var port = 3000;
var clientOutput;

var javaScript = false;
var python = false;


app.use(express.static(publicPath));

app.get("/", function( req, res) {
  res.sendFile(path.join(__dirname,'./Public/fileUpload.html'))
});

app.post("/", function(req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
    var oldPath = files.file.path;
    console.log("Fields", fields);
    var language = fields.Language;
    var nameOfFile = path.basename(oldPath);
    jobQueue.push(nameOfFile);
    console.log("JOBQUEUELENGTH", jobQueue.length);
    var newPath = path.join(__dirname, './' + nameOfFile + "." + language);
    fs.move(oldPath, newPath, { overwrite: true }, (err) => {
      if(err) return console.log("Error", err)
      console.log("SUCCESS FILE MOVED");
      function indexOfThis1(fileName) {
        for(var i = 0; i < jobQueue.length; i++) {
          if(jobQueue[i] == fileName) {
            console.log(i);
            return i+1;
          }
        }
      }
      indexOfThis1(nameOfFile);
      function indexOfThis(fileName) {
        for(var i = 0; i < jobQueue.length; i++) {
          if(jobQueue[i] == fileName) {
            return i+1;
          }
        }
      }

      function wait() {
        if(indexOfThis(nameOfFile) <= maxJob){
          console.log("redirecting");
          res.redirect("http://localhost:3000/compile/" +language + "/" +nameOfFile);
        }
        else {
          setTimeout(wait, 50);
        }
      }
      wait();
    });
  });
});


app.get("/compile/:lang/:name", function( req, res) {

  var language = req.params.lang;

  console.log(req.params.lang);

  var commandRun;

  if(language == "PY") {
    commandRun = "python";
    python = true;
  }

  if(language == "C") {
    commandRun = "gcc";
  }

  else if( language == "CPP") {
    commandRun = "g++";
  }


  else if( language == "JS") {
    commandRun = "node";
    javaScript = true;
  }

  function indexOfThis(fileName) {
    for(var i = 0; i < jobQueue.length; i++) {
      if(jobQueue[i] == fileName) {
        return i+1;
      }
    }
  }

  if(javaScript == false && python == false) {
    if(indexOfThis(req.params.name) <= maxJob) {
      var flag = true;
      console.log("Compiling");
      console.log("command Run", commandRun);
      var compile = spawn(commandRun, ["-o"+ req.params.name +".exe" ,req.params.name + "." + language ]);
      compile.stdout.on('data', function (data) {
          console.log('stdout: ' + data);
      });
      compile.stderr.on('data', function (data) {
          flag = false;
          clientOutput = String(data);
          res.sendFile(path.join(__dirname,'./Public/output.html'))
          console.log("Here",String(data));
      });
      compile.on('close', function (data) {
        console.log("done compiling", req.params.name);
          if (data === 0) {
              var run = spawn(req.params.name + '.exe', []);
              run.stdout.on('data', function (output) {

                  clientOutput = String(output);
                  res.sendFile(path.join(__dirname,'./Public/output.html'))
                  console.log("Output:" ,String(output));
                  for(var i = 0; i < maxJob; i++) {
                    if(jobQueue[i] == req.params.name) {
                      jobQueue.splice(i,1);
                    }
                  }
                  console.log(jobQueue);
              });
              run.stderr.on('data', function (output) {
                clientOutput = String(output);
                res.sendFile(path.join(__dirname,'./Public/output.html'));
                console.log(String(output));
              });
              run.on('close', function (output) {
                  console.log('stdout: ' + output);
              })
          }
      });
    }
  }


  if(javaScript == true) {
    if(indexOfThis(req.params.name) <= maxJob) {
      var flag = true;
      console.log("Compiling");
      console.log("command Run", commandRun);
      var compile = spawn(commandRun, [req.params.name + ".js"]);
      compile.stdout.on('data', function (data) {
          console.log('stdout: ' + data);
          clientOutput = String(data);
          for(var i = 0; i < maxJob; i++) {
            if(jobQueue[i] == req.params.name) {
              jobQueue.splice(i,1);
            }
          }
          javaScript = false;
          res.sendFile(path.join(__dirname,'./Public/output.html'));
      });

      // Error thing doesnt work for javaScript
    }
  }

  if(javaScript == false && python == true) {
    if(indexOfThis(req.params.name) <= maxJob) {
      var flag = true;
      console.log("Compiling");
      console.log("command Run", commandRun);
      var compile = spawn(commandRun, [req.params.name + "." + language ]);
      compile.stdout.on('data', function (data) {
          console.log('stdout: ' + data);
          clientOutput = String(data);
          for(var i = 0; i < maxJob; i++) {
            if(jobQueue[i] == req.params.name) {
              jobQueue.splice(i,1);
              console.log(jobQueue);
            }
          }
          python = false;
           res.sendFile(path.join(__dirname,'./Public/output.html'));
      });
      // compile.stderr.on('data', function (data) {
      //     flag = false;
      //     clientOutput = String(data);
      //     res.sendFile(path.join(__dirname,'./Public/output.html'))
      //     console.log("Here",String(data));
      // });
      compile.on('close', function (data) {
        console.log("done compiling", req.params.name);
          // if (data === 0) {
          //     var run = spawn(req.params.name + '.'+ language, []);
          //     run.stdout.on('data', function (output) {
          //
          //         clientOutput = String(output);
          //         res.sendFile(path.join(__dirname,'./Public/output.html'))
          //         console.log("Output:" ,String(output));
          //         for(var i = 0; i < maxJob; i++) {
          //           if(jobQueue[i] == req.params.name) {
          //             jobQueue.splice(i,1);
          //           }
          //         }
          //         console.log(jobQueue);
          //     });
          //
          //     run.stderr.on('data', function (output) {
          //       clientOutput = String(output);
          //       res.sendFile(path.join(__dirname,'./Public/output.html'));
          //       console.log(String(output));
          //     });
          //
          //     run.on('close', function (output) {
          //         console.log('stdout: ' + output);
          //     })
          //   }
          });
        }
      }


});


io.on("connection", function(socket) {
  console.log("a new user connected");

  socket.emit("sendOutput",{output: clientOutput});
})

server.listen(port);

console.log("Server is running on port", port);
