var express = require('express');
var app = express();
var http = require('http').Server(app);
var path = require('path');
var socket = require('socket.io')(http);
var favicon = require('serve-favicon');
var escape = require('escape-html');

app.set('view engine', 'jade');
app.set('views', __dirname + "/views");
app.use(express.static(path.join(__dirname, 'public')));
//app.use(favicon(path.join(__dirname,'public','favicon.ico')));
app.enable('trust proxy');

var clients = {};
var questions = {};
var answers = {};
var questionDuration = 41;
var secondsLeft = 0;
var currentQuestion = {question: 'no questions, why don\'t you start us off and create a new one?', id: 'n/a'};
var maxAnswers = 3;
var maxTextLength = 400;
var answersInSecond = {};
var mutedIps = {};
var maxAnswersPerSecond = 3;
var muteLength = 60;

app.get('/', function(req, res){
  res.render('index', {ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress});
});

socket.on('connection', function(client) {
  
  client.on('join', function() {
    console.log('User ' + client.id + " connected")
    clients[client.id] = {upvoted: [], ip: client.request.connection.remoteAddress, muted: false};
    console.log(client); //http://stackoverflow.com/questions/10849687/express-js-how-to-get-remote-client-address
    client.emit('join', {id: client.id, answers: answers, question: currentQuestion});
    socket.emit('clients online', Object.keys(clients).length);
  });
  
  client.on('disconnect', function() {
    console.log('User ' + client.id + " disconnected")
    
    //deletes: questions, answers, upvotes
    try {
      delete questions[client.id];
      var upvotedId;
      var upvotedNumber;
      for (i in clients[client.id].upvoted) {
        upvotedId = clients[client.id].upvoted[i].id;
        upvotedNumber = clients[client.id].upvoted[i].number;
        
        answers[upvotedId][upvotedNumber].score--;
        socket.emit('upvote', answers[upvotedId][upvotedNumber]);
      }
    
      delete answers[client.id];
      socket.emit('client disconnect', client.id);

    } catch (err) {
      console.log('error on disconnect (delete question/answers): ' + err);
    }
    
    //remove client
    try {
      delete clients[client.id];
      socket.emit('clients online', Object.keys(clients).length);
    } catch (err) {
      console.log('error on disconnect (remove client): ' + err);
    }
  });
  
  client.on('submit question', function(data) {
    try {
      data = escape(data);
      if (data.length > maxTextLength) {
        data = data.substring(0, maxTextLength);
      }
      console.log('question received: ' + data);
      if (client.id in questions) {
        console.log('smartass bypassed the frontend to try to add multiple questions');
      } else if (/\S/.test(data)) { //checks for empty/whitespace
        questions[client.id] = {question: data, id: client.id};
        socket.emit('new question entered', Object.keys(questions).length);
        if (Object.keys(questions).length == 1 && currentQuestion.id == 'n/a') {
          newQuestion();
        }
      }
    } catch (err) {
      console.log('error on submit question: ' + err);
    }
  });
  
  client.on('clear question', function() {
    delete questions[client.id];
  });
  
  client.on('submit answer', function(data) {
    try {
      data = escape(data);
      if (data.length > maxTextLength) {
        data = data.substring(0, maxTextLength);
      }
      console.log('answer received: ' + data);
      if (typeof answers[client.id] == "undefined") {
        answers[client.id] = [];
      } 
      if (typeof mutedIps[clients[client.id].ip] == 'undefined') { //is the ip not muted?  
        if (answers[client.id].length < maxAnswers && /\S/.test(data)) { //checks for empty/whitespace

          //adds answer to hash that lasts 1 second
          if (typeof answersInSecond[clients[client.id].ip] == "undefined") {
            answersInSecond[clients[client.id].ip] = 1;
          } else {
            answersInSecond[clients[client.id].ip] ++;
          }

          if (answersInSecond[clients[client.id].ip] > maxAnswersPerSecond) { //if more than x answers per second...
            mutedIps[clients[client.id].ip] = muteLength;
            console.log('ip ' + clients[client.id].ip + ' muted for ' + muteLength + ' seconds');

            //delete muted IP after mutelength
            unmute(clients[client.id].ip);
          }


          answers[client.id].push({answer: data, id: client.id, score: 0, number:answers[client.id].length});
          socket.emit('new answer', answers[client.id][answers[client.id].length - 1]);
          if (answers[client.id].length == maxAnswers) {
            client.emit('max answers');
          }


        }
      } else {
        console.log('ip ' + mutedIps[clients[client.id].ip] + ' is muted, no answer sent');
      }
    } catch (err) {
      console.log('error on submit answer: ' + err);
    }
    
  });
  
  client.on('get queue', function() {
    var place = 0;
    for (var key in questions) {
      place++;
      if (key == client.id) {
        client.emit('get queue', {place: place, total: Object.keys(questions).length});
        return;
      }
    }
    //client has no questions, only return length of queue
    client.emit('get queue', {place: 'n/a', total: Object.keys(questions).length});
  });
  
  client.on('upvote', function(data) {
    try {
      for (i in clients[client.id].upvoted) {
        //checks to see if it's already upvoted
        if (clients[client.id].upvoted[i].id == data.id && clients[client.id].upvoted[i].number == data.number) {
          clients[client.id].upvoted.splice(i, 1);
          answers[data.id][data.number].score--;
          socket.emit('upvote', answers[data.id][data.number]);
          //makes sure it doesn't upvote it back
          return;
        }
      }
      //otherwise increment it
      answers[data.id][data.number].score++;
      socket.emit('upvote', answers[data.id][data.number]);
      clients[client.id].upvoted.push({id:data.id, number:data.number});
      
    } catch (err) {
      console.log('error on upvote: ' + err);
    }
  });
  
});

var port = process.env.PORT || 3000;
http.listen(port, function(){
  console.log('listening on port: ' + port);
});

function newQuestion() {
  answers = {};
  for (key in clients) { 
    clients[key].upvoted = []; 
  }
  if (Object.keys(questions).length != 0) {
    socket.emit('new question sent', questions[Object.keys(questions)[0]]);
    currentQuestion = questions[Object.keys(questions)[0]]; //transfers from queue
    delete questions[Object.keys(questions)[0]]; //deletes first in queue
    
    //start timer
    secondsLeft = questionDuration;
    socket.emit('timer', {secondsLeft: secondsLeft, questionDuration: questionDuration});
    timer();
  } else { //no questions
    console.log('No questions in queue...');
    currentQuestion = {question: 'no questions, why don\'t you start us off and create a new one?', id: 'n/a'};
    socket.emit('new question sent', {question: 'no questions, why don\'t you start us off and create a new one?', id:'n/a'})
  }
}

function unmute(ip) { //unmutes ip after mutelength seconds
  setTimeout(function() {
    try {
      delete mutedIps[ip];
      console.log('ip ' + ip + ' unmuted');
    } catch (err) {
      console.log('error in unmuting IP: ' + err);
    }
  }, muteLength*1000);
}

//loops every second and emits timer data to client
function timer() {
  setTimeout(function() {
    secondsLeft -= 1;
    answersInSecond = {}; //makes sure this is empty every second
    
    if (secondsLeft >= 0) {
      socket.emit('timer', {secondsLeft: secondsLeft, questionDuration: questionDuration});
      timer();
    } else {
      newQuestion();
    }
  }, 1000)
}

