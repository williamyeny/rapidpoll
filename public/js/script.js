$(document).ready(function() {
  var socket = io();
  var id = "";
  socket.emit('join');
  
  socket.on('join', function(data) {
    id = data;
  });
  
  
  socket.on('new question', function(data) {
    console.log(data);
  });
  
});