var express = require('express');
var app = express();
var http = require('http').Server(app);
var path = require('path');
var socket = require('socket.io')(http);

app.set('view engine', 'jade');
app.set('views', __dirname + "/views");
app.use(express.static(path.join(__dirname, 'public')));

var clients = {};
var questions = {};


app.get('/', function(req, res){
  res.render('index');
});

socket.on('connection', function(client) {
  
  client.on('join', function() {
    console.log('User with id ' + client.id + " connected")
    clients[client.id] = " ";
    client.emit('join', client.id);
    console.log(clients);
  });
  
  client.on('disconnect', function() {
    console.log('User ' + client.id + " disconnected")
    delete questions[client.id];
    delete clients[client.id];
  });
  
  client.on('submit question', function(data) {
    console.log('question received: ' + data);
    questions[client.id] = {question: data, id: client.id};
    console.log(questions);
  });
  
  client.on('submit answer', function(data) {
    console.log('answer received: ' + data);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

newQuestion();

function newQuestion() {
  if (Object.keys(questions).length != 0) {
    socket.emit('new question', questions[Object.keys(questions)[0]]);
    console.log('id of question to be deleted: ' + Object.keys(questions)[0]);
    delete questions[Object.keys(questions)[0]];
//    console.log('deleted ' + questions);
    setTimeout(function() {
      newQuestion();
    }, 5000); //question duration
  } else {
    console.log('No questions in queue...');
    setTimeout(function(){
      socket.emit('new question', {question: 'no questions in queue', id:'n/a'})
      newQuestion();
    }, 2000);
  }
}

function test() {
  setTimeout(function() {
    newQuestion();
  }, 10000);
}