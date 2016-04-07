$(document).ready(function() {
  var socket = io();
  var id = "";
  socket.emit('join');
  
  socket.on('join', function(data) {
    id = data;
  });
  
  
  socket.on('new question', function(data) {
    $('#question').html(data.question);
    console.log('got new question: ' + data.question);
  });
  
  $('#question-submit').click(function() {
    socket.emit('submit question', $('#question-input').val());
  });
  $('#answer-submit').click(function() {
    socket.emit('submit answer', $('#answer-input').val());
  });
});