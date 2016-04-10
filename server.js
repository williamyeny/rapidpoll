var express = require('express');
var app = express();
var http = require('http').Server(app);
var path = require('path');
var socket = require('socket.io')(http);
var favicon = require('serve-favicon');

app.set('view engine', 'jade');
app.set('views', __dirname + "/views");
app.use(express.static(path.join(__dirname, 'public')));
//app.use(favicon(path.join(__dirname,'public','favicon.ico')));

var clients = {};
var questions = {};
var answers = {};
var questionDuration = 41;
var secondsLeft = 0;
var currentQuestion = {question: '', id: ''};
var maxAnswers = 3;

app.get('/', function(req, res){
  res.render('index');
});

function runClient(client) {
  client.on('join', function() {
    console.log('User with id ' + client.id + " connected");
    clients[client.id] = {upvoted: []};
    client.emit('join', {id: client.id, answers: answers, question: currentQuestion});
    console.log(clients);
    socket.emit('clients online', Object.keys(clients).length);
  });

  client.on('disconnect', function() {
    console.log('User ' + client.id + " disconnected");
    delete questions[client.id];
    var upvotedId;
    var upvotedNumber;
    if (typeof clients[client.id] != 'undefined') {
      for (var i in clients[client.id].upvoted) {
        upvotedId = clients[client.id].upvoted[i].id;
        upvotedNumber = clients[client.id].upvoted[i].number;

        answers[upvotedId][upvotedNumber].score--;
        socket.emit('upvote', answers[upvotedId][upvotedNumber]);
      }
    }
    delete answers[client.id];
    socket.emit('remove answers', client.id);
    delete clients[client.id];
    socket.emit('clients online', Object.keys(clients).length);
  });

  client.on('submit question', function(data) {
    data = data.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    console.log('question received: ' + data);
    if (client.id in questions) {
      console.log('client already has question in queue');
    } else if (/\S/.test(data)) {
      questions[client.id] = {question: data, id: client.id};
      console.log(questions);
      socket.emit('new question entered', Object.keys(questions).length);
    } else {
      console.log('blank question');
    }
  });

  client.on('clear question', function() {
    delete questions[client.id];
    console.log('cleared question, ' + questions);
  });

  client.on('submit answer', function(data) {
    data = data.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (typeof answers[client.id] == "undefined") {
      answers[client.id] = [];
    }
    if (answers[client.id].length < maxAnswers && /\S/.test(data)) {
      answers[client.id].push({answer: data, id: client.id, score: 0, number:answers[client.id].length});
      socket.emit('new answer', answers[client.id][answers[client.id].length - 1]);
      if (answers[client.id].length == maxAnswers) {
        client.emit('max answers');
      }
    } else {
      console.log('too many answers');
    }

  });

  client.on('get queue', function() {
    var place = 0;
    for(var key in questions) {
      place++;
      if (key == client.id) {
        client.emit('get queue', {place: place, total: Object.keys(questions).length});
        return;
      }
    }
    client.emit('get queue', {place: 'n/a', total: Object.keys(questions).length});
  });

  client.on('upvote', function(data) {
    for (var i in clients[client.id].upvoted) {
      var hasAlreadyVoted = clients[client.id].upvoted[i].id == data.id && clients[client.id].upvoted[i].number == data.Number;
      if (hasAlreadyVoted) {
        console.log('removing their vote, downvote inc');
        clients[client.id].upvoted.splice(i, 1);
        answers[data.id][data.number].score--;
        console.log(answers[data.id].score);
        for (var i2 in answers[data.id]) {
          if (answers[data.id][i2].number == data.number) {
            socket.emit('upvote', answers[data.id][i2]);
            break;
          }
        }

        return;
      }
    }

    answers[data.id][data.number].score++;
    console.log('we upvoting this shit: ' + answers[data.id][data.number].score);
    for (var i3 in answers[data.id]) {
      if (answers[data.id][i3].number == data.number) {
        socket.emit('upvote', answers[data.id][i3]);
        break;
      }
    }
    clients[client.id].upvoted.push({id:data.id, number:data.number});
  });
}

socket.on('connection', function(client) {
  try {
    runClient(client);
  } catch (e) {
    console.error('Client crashed with error: ', e);
  }
});

var port = process.env.PORT || 3000;
http.listen(port, function(){
  console.log('listening on *:', port);
});

newQuestion();

function newQuestion() {
  answers = {};
  for (var key in clients) {
    clients[key].upvoted = [];
  }
  if (Object.keys(questions).length !== 0) {
    socket.emit('new question sent', questions[Object.keys(questions)[0]]);
    currentQuestion = questions[Object.keys(questions)[0]];
    console.log('id of question to be deleted: ' + Object.keys(questions)[0]);
    delete questions[Object.keys(questions)[0]];
//    console.log('deleted ' + questions);
    secondsLeft = questionDuration;
    socket.emit('timer', {secondsLeft: secondsLeft, questionDuration: questionDuration});

    timer();
  } else {
    console.log('No questions in queue...');
    currentQuestion = {question: '', id: ''};
    socket.emit('new question sent', {question: 'no questions, why don\'t you start us off and create a new one?', id:'n/a'});

    setTimeout(function(){
      newQuestion();
    }, 2000);
  }
}

function timer() {
  setTimeout(function() {
    secondsLeft -= 1;
    if (secondsLeft >= 0) {
      socket.emit('timer', {secondsLeft: secondsLeft, questionDuration: questionDuration});
      timer();
    } else {
      newQuestion();
    }
  }, 1000);
}
