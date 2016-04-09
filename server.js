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
var questionDuration = 21;
var secondsLeft = 0;
var currentQuestion = {question: '', id: ''};


app.get('/', function(req, res){
  res.render('index');
});

socket.on('connection', function(client) {
  
  client.on('join', function() {
    console.log('User with id ' + client.id + " connected")
    clients[client.id] = {upvoted: []};
    client.emit('join', {id: client.id, answers: answers, question: currentQuestion});
    console.log(clients);
    socket.emit('clients online', Object.keys(clients).length);
  });
  
  client.on('disconnect', function() {
    console.log('User ' + client.id + " disconnected")
    delete questions[client.id];
    var upvotedId;
    var upvotedNumber;
    if (typeof clients[client.id] != 'undefined') {
      for (i in clients[client.id].upvoted) {
        upvotedId = clients[client.id].upvoted[i].id;
        upvotedNumber = clients[client.id].upvoted[i].number;
        
        answers[upvotedId][upvotedNumber].score--;
        socket.emit('upvote', answers[upvotedId][upvotedNumber]);
      }
    }
    delete clients[client.id];
    socket.emit('clients online', Object.keys(clients).length);
  });
  
  client.on('submit question', function(data) {
    console.log('question received: ' + data);
    
    if (client.id in questions) {
      console.log('client already has question in queue');
    } else {
      questions[client.id] = {question: data, id: client.id};
      console.log(questions);
      socket.emit('new question entered', Object.keys(questions).length);
    }
  });
  
  client.on('clear question', function() {
    delete questions[client.id];
    console.log('cleared question, ' + questions);
  });
  
  client.on('submit answer', function(data) {
    if (typeof answers[client.id] == "undefined") {
      answers[client.id] = [];
    } 
    if (answers[client.id].length < 3) {
      answers[client.id].push({answer: data, id: client.id, score: 0, number:answers[client.id].length});
      socket.emit('new answer', answers[client.id][answers[client.id].length - 1]);
      if (answers[client.id].length == 3) {
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
        break;
      }
    }
  });
  
  client.on('upvote', function(data) {
    for (i in clients[client.id].upvoted) {
      if (clients[client.id].upvoted[i].id == data.id && clients[client.id].upvoted[i].number == data.number) {
        console.log('downvote inc');
        clients[client.id].upvoted.splice(i, 1);
        answers[data.id][data.number].score--;
        console.log(answers[data.id].score);
        for (i in answers[data.id]) {
          if (answers[data.id][i].number == data.number) {
            socket.emit('upvote', answers[data.id][i]);
            break;
          }
        }
        
        return;
      }
    }
    
    answers[data.id][data.number].score++;
    console.log('we upvoting this shit: ' + answers[data.id][data.number].score);
    for (i in answers[data.id]) {
      if (answers[data.id][i].number == data.number) {
        socket.emit('upvote', answers[data.id][i]);
        break;
      }
    }
    clients[client.id].upvoted.push({id:data.id, number:data.number});
  })
});

http.listen(process.env.PORT || 3000, function(){
  console.log('listening on *:3000');
});

newQuestion();

function newQuestion() {
  answers = {};
  for (key in clients) {
    clients[key].upvoted = [];
  }
  if (Object.keys(questions).length != 0) {
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
    socket.emit('new question sent', {question: 'no questions, why don\'t you start us off and create a new one?', id:'n/a'})
    setTimeout(function(){
      
      newQuestion();
    }, 2000);
  }
}

function timer() {
  setTimeout(function() {
    secondsLeft -= 1;
    console.log(secondsLeft);
    if (secondsLeft >= 0) {
      socket.emit('timer', {secondsLeft: secondsLeft, questionDuration: questionDuration});
      timer();
    } else {
      newQuestion();
    }
  }, 1000)
}
