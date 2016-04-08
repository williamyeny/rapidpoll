var socket = io();
$(document).ready(function() {
  
  var id = "";
  socket.emit('join');
  var mSecondsLeft = 0;
  
  socket.on('join', function(data) {
    id = data.id;
    for (key in data.answers) {
      $('#answer-list ul').append(getAnswerSec(data.answers[key]));
      $('.score[answer-id="' + key + '"]').html(data.answers[key].score);
    }
    $('#question').html(data.question.question);
  });
  
  function getAnswerSec(data) {
    return "<li><div class='answer-sec'><div class='vote-div'><a onclick='upvote(\"" + data.id + "\", \"" + data.number + "\")' number='" + data.number + "' class='upvote' answer-id='" + data.id + "'><i class='material-icons'>arrow_upward</i></a><p class='score' answer-id='" + data.id + "' number='" + data.number + "'>0</p></div><div class='answer-div'><p>" + data.answer + "</p></div></div></li>"
  }
  
      
  socket.on('new question sent', function(data) {
    $('#question').html(data.question);
    socket.emit('get queue');
    console.log('got new question: ' + data.question);
    $('li').remove();
    if (id == data.id) {
      $("#question-input").prop('disabled', false);
      $('#question-input').attr('placeholder', 'ask a question');
      $('#question-submit i').html('send');
      $('#question-submit').attr('title', '');
    }
    
  });
  
  socket.on('new question entered', function(data) {
    socket.emit('get queue');
    console.log('total questions: ' + data);
  });
  
  socket.on('get queue', function(data) {
    $('#question-input').attr('placeholder', 'your question\'s position in queue: ' + data.place + '/' + data.total);
  });
  
  socket.on('new answer', function(data) {
    $('#answer-list ul').append(getAnswerSec(data));
  });
  
  socket.on('upvote', function(data) {
    console.log('upvote gotten: ' + data.id);
    $('.score[answer-id="' + data.id + '"][number = "' + data.number + '"]').html(data.score);
  });
  
  socket.on('timer', function(data) {
    console.log(data);
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
    if ($('#question-submit i').html() == 'send') {
      socket.emit('submit question', $('#question-input').val());
      $('#question-input').val('');
      $("#question-input").prop('disabled', true);
      $('#question-submit i').html('clear');
      $('#question-submit').attr('title', 'remove your question from queue');
    } else {
      console.log('clearing question');
      socket.emit('clear question');
      $("#question-input").prop('disabled', false);
      $('#question-input').attr('placeholder', 'ask a question');
      $('#question-submit i').html('send');
      $('#question-submit').attr('title', '');
    }
  });
  $('#answer-submit').click(function() {
    socket.emit('submit answer', $('#answer-input').val());
    $('#answer-input').val('');
  });
//  $('.upvote').click(function() {
//    console.log('upvote clicked');
//    socket.emit('upvote', $(this).attr('answer-id'));
//  });
  


  
});
function upvote(id, number) {
  console.log('upvote clicked');
  socket.emit('upvote', {id:id, number:number});
  $('.upvote[number="' + number + '"][answer-id="' + number + '"]').toggleClass('upvote-clicked');
}