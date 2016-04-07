var express = require('express');
var app = express();
var http = require('http').Server(app);
var path = require('path');
var socket = require('socket.io')(http);

app.set('view engine', 'jade');
app.set('views', __dirname + "/views");
app.use(express.static(path.join(__dirname, 'public')));

var clients = [];

app.get('/', function(req, res){
  res.render('index');
});

socket.on('connection', function(client) {
  
  client.on('join', function() {
    console.log('User with id ' + client.id + " connected")
    clients.push(client.id);
    client.emit('join', client.id);
  });
  
  client.on('disconnect', function() {
    for (i = 0; i < clients.length; i++) {
      if (client.id == clients[i]) {
        console.log('User ' + client.id + " disconnected")
        clients.splice(i, 1);
        break;
      }
    }
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

newQuestion();

function newQuestion() {
  if (clients.length != 0) {
    randomNumber = parseInt(Math.random() * clients.length);
    console.log('Player chosen: ' + clients[randomNumber]);
    socket.emit('new question', clients[randomNumber]);
    test();
  } else {
    console.log('No players...');
    setTimeout(function(){
        newQuestion();
    }, 2000);
  }
}

function test() {
  setTimeout(function() {
    newQuestion();
  }, 10000);
}