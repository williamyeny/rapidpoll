$(document).ready(function() {
  var socket = io();
  var id = "";
  socket.emit('join');
  
  socket.on('join', function(data) {
    id = data;
  });
  
  function getAnswerSec(data) {
    return "<li><div class='answer-sec'><div class='vote-div'><a class='upvote' id='" + data.id + "'><i class='material-icons'>arrow_upward</i></a></div><div class='answer-div'><p>" + data.answer + "</p></div></div></li>";
  }
  
      
  socket.on('new question sent', function(data) {
    $('#question').html(data.question);
    socket.emit('get queue');
    console.log('got new question: ' + data.question);
    $('li').remove();
    if (id == data.id) {
      $("#question-input").prop('disabled', false);
      $('#question-input').attr('placeholder', 'ask a question');
    }
    
  });
  
  socket.on('new question entered', function(data) {
    socket.emit('get queue');
    console.log('total questions: ' + data);
  })
  
  socket.on('get queue', function(data) {
    console.log('get queue')
    $('#question-input').attr('placeholder', 'your question is in queue: ' + data);
  });
  
  socket.on('new answer', function(data) {
    $('#new-div ul').append(getAnswerSec(data));
  });
  
  $("#question-input").keyup(function(event){
    if(event.keyCode == 13){
        $("#question-submit").click();
    }
  });
  
  $("#answer-input").keyup(function(event){
      if(event.keyCode == 13){
          $("#answer-submit").click();
      }
  });
  
  $('#question-submit').click(function() {
    socket.emit('submit question', $('#question-input').val());
    $('#question-input').val('');
    $("#question-input").prop('disabled', true);
  });
  $('#answer-submit').click(function() {
    socket.emit('submit answer', $('#answer-input').val());
    $('#answer-input').val('');
  });
  $('.upvote').click(function() {
    socket.emit('upvote', $(this).attr('id'));
  });
  
});