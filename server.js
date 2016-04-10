var express = require('express');
var app = express();
var http = require('http').Server(app);
var path = require('path');
var socket = require('socket.io')(http);
var favicon = require('serve-favicon');
var escapeHtml = require('escape-html');

app.set('view engine', 'jade');
app.set('views', __dirname + "/views");
app.use(express.static(path.join(__dirname, 'public')));
//app.use(favicon(path.join(__dirname,'public','favicon.ico')));

// Constants
var defaultQuestion = {question: 'no questions, why don\'t you start us off and create a new one?', id: 'n/a'};
var questionDuration = 120;
var maxAnswers = 3;
var maxQuestionsPerIP = 3; // Includes current question
var maxAnswersPerIP = 6;

// Defaults
var clients = {};
var questions = {};
var questionsInQueuePerIP = {};
var answers = {};
var answersInQueuePerIP = {};
var currentQuestion = {question: defaultQuestion.question, id: defaultQuestion.id};
var secondsLeft = 0;

app.get('/', function(req, res){
  res.render('index');
});

function runClient(client) {
  var ipAddress = client.request.connection.remoteAddress;

  function log() {
    console.log.apply(console, ['[' + client.id +  ']'].concat(Array.prototype.slice.call(arguments)));
  }

  client.on('join', function() {
    log('User with IP ' + ipAddress + ' connected');
    clients[client.id] = {upvoted: []};
    client.emit('join', {id: client.id, answers: answers, question: currentQuestion});
    // log(clients);
    socket.emit('clients online', Object.keys(clients).length);

    questionsInQueuePerIP[ipAddress] = questionsInQueuePerIP[ipAddress] || 0;
    answersInQueuePerIP[ipAddress] = answersInQueuePerIP[ipAddress] || 0;

    if (questionsInQueuePerIP[ipAddress] >= maxQuestionsPerIP) {
      client.emit('max questions');
    }
    if (answersInQueuePerIP[ipAddress] >= maxAnswersPerIP) {
      client.emit('max answers');
    }
  });

  client.on('disconnect', function() {
    log('User with IP ' + ipAddress + ' disconnected');

    // clearing upvotes
    var upvotedId;
    var upvotedNumber;
    if (clients[client.id]) {
      for (var i in clients[client.id].upvoted) {
        upvotedId = clients[client.id].upvoted[i].id;
        upvotedNumber = clients[client.id].upvoted[i].number;

        answers[upvotedId][upvotedNumber].score--;
        socket.emit('upvote', answers[upvotedId][upvotedNumber]);
      }
    }

    // clearing answers
    if (answersInQueuePerIP[ipAddress]) {
      answersInQueuePerIP[ipAddress] -= answers[client.id] ? answers[client.id].length : 0;
    }
    delete answers[client.id];
    socket.emit('remove answers', client.id);

    // clearing questions
    if (questions[client.id] && questionsInQueuePerIP[ipAddress]) {
      questionsInQueuePerIP[ipAddress]--;
    }
    if (currentQuestion.id === client.id && questionsInQueuePerIP[ipAddress]) {
      questionsInQueuePerIP[ipAddress]--;
    }
    delete questions[client.id];

    // clearing user
    delete clients[client.id];
    socket.emit('clients online', Object.keys(clients).length);

    // clearing ip-wide data
    if (answersInQueuePerIP[ipAddress] === 0) {
      delete answersInQueuePerIP[ipAddress];
    }
    if (questionsInQueuePerIP[ipAddress] === 0) {
      delete questionsInQueuePerIP[ipAddress];
    }

    log('clearing on disconnect');
  });

  client.on('submit question', function(data) {
    data = escapeHtml(data);
    questionsInQueuePerIP[ipAddress] = questionsInQueuePerIP[ipAddress] || 0;
    // log('question received: ' + data);
    if (client.id in questions) {
      log('client already has question in queue');
      client.emit('max questions');
    } else if (questionsInQueuePerIP[ipAddress] >= maxQuestionsPerIP) {
      client.emit('max questions');
      log('client with IP ' + ipAddress + ' already has max questions in queue');
    } else if (/\S/.test(data)) {
      questionsInQueuePerIP[ipAddress]++;
      questions[client.id] = {question: data, id: client.id};
      // log(questions);
      socket.emit('new question entered', Object.keys(questions).length);
    } else {
      log('blank question');
    }
  });

  client.on('clear question', function() {
    delete questions[client.id];
    if (questionsInQueuePerIP[ipAddress]) {
      questionsInQueuePerIP[ipAddress]--;
    }
    // log('cleared question, ' + questions);
  });

  client.on('submit answer', function(data) {
    data = escapeHtml(data);
    if (!answers[client.id]) {
      answers[client.id] = [];
      log('clearing on submit answer');
    }

    answersInQueuePerIP[ipAddress] = answersInQueuePerIP[ipAddress] || 0;
    if (!/\S/.test(data)) {
      return;
    } else if (answers[client.id].length < maxAnswers && answersInQueuePerIP[ipAddress] < maxAnswersPerIP) {
      answers[client.id].push({answer: data, id: client.id, score: 0, number:answers[client.id].length});
      socket.emit('new answer', answers[client.id][answers[client.id].length - 1]);
      answersInQueuePerIP[ipAddress]++;
      if (answers[client.id].length === maxAnswers || answersInQueuePerIP[ipAddress] >= maxAnswersPerIP) {
        client.emit('max answers');
      }
    } else {
      client.emit('max answers');
      log('too many answers');
    }
  });

  client.on('get queue', function() {
    var place = 0;
    for(var key in questions) {
      place++;
      if (key === client.id) {
        client.emit('get queue', {place: place, total: Object.keys(questions).length});
        return;
      }
    }
    client.emit('get queue', {place: 'n/a', total: Object.keys(questions).length});
  });

  client.on('upvote', function(data) {
    if (!clients[client.id]) {
      return;
    }
    for (var x in clients[client.id].upvoted) {
      var hasAlreadyVoted = clients[client.id].upvoted[x].id === data.id && clients[client.id].upvoted[x].number === data.number;
      if (hasAlreadyVoted) {
        log('removing their vote, downvote inc');
        clients[client.id].upvoted.splice(x, 1);
        answers[data.id][data.number].score--;
        // log(answers[data.id].score);
        for (var y in answers[data.id]) {
          if (answers[data.id][y].number === data.number) {
            socket.emit('upvote', answers[data.id][y]);
            break;
          }
        }

        return;
      }
    }

    answers[data.id][data.number].score++;
    log('we upvoting this shit: ' + answers[data.id][data.number].score);
    for (var z in answers[data.id]) {
      if (answers[data.id][z].number === data.number) {
        socket.emit('upvote', answers[data.id][z]);
        break;
      }
    }
    clients[client.id].upvoted.push({id:data.id, number:data.number});
  });

  client.on('error', function(data) {
    log('Socket Error: ', data);
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
  console.log('listening on *:' + port);
});

newQuestion();

function newQuestion() {
  answers = {};
  answersInQueuePerIP = {};
  // console.log('answers cleared per q');
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
    // console.log('No questions in queue...');
    currentQuestion = {question: defaultQuestion.question, id: defaultQuestion.id};
    socket.emit('new question sent', currentQuestion);

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