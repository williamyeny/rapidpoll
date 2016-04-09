var socket = io();
$(document).ready(function() {
  
  var id = "";
  socket.emit('join');
  var mSecondsLeft = 0;
  
  socket.on('join', function(data) {
    id = data.id;
    for (key in data.answers) {
      for (key2 in data.answers[key]) {
        $('#answer-list ul').append(getAnswerSec(data.answers[key][key2]));
      }
    }
    
    $('#question').html(data.question.question);
  });
  
  function getAnswerSec(data) {
    return "<li score='" + data.score + "'><div class='answer-sec'><div class='vote-div'><a onclick='upvote(\"" + data.id + "\", \"" + data.number + "\")' number='" + data.number + "' class='upvote' answer-id='" + data.id + "'><i class='material-icons'>arrow_upward</i></a><p class='score' answer-id='" + data.id + "' number='" + data.number + "'>" + data.score + "</p></div><div class='answer-div'><p>" + data.answer + "</p></div></div></li>"
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
    $("#answer-input").prop('disabled', false);
    $('#answer-input').attr('placeholder', 'post an answer');
    
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
    $('.score[answer-id="' + data.id + '"][number = "' + data.number + '"]').parent().parent().parent().attr('score', data.score);
    //sortAnswers();
    
  });
  
  socket.on('timer', function(data) {
    if (data.secondsLeft == 0) {
      $('#timer').css('width', $('#question-div').width() + 30);
    } else {
      $('#timer').css('width', ($('#question-div').width() + 20) - ((data.secondsLeft - 1) / data.questionDuration * $('#question-div').width() + 20));
    }
  });
  
  socket.on('clients online', function(data) {
    console.log(data);
    $('#online').html('clients online: ' + data);
  });
  
  socket.on('max answers', function() {
    $("#answer-input").prop('disabled', true);
    $('#answer-input').val('');
    $('#answer-input').attr('placeholder', 'max number of answers reached');
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
  
  socket.on('remove answers', function(data) {
    $('p[answer-id="' + data + '"]').parent().parent().parent().remove();
  });


  
});
function upvote(id, number) {
  console.log('upvote clicked');
  socket.emit('upvote', {id:id, number:number});
  $('.upvote[number="' + number + '"][answer-id="' + id + '"]').toggleClass('upvote-clicked');
}

function sortAnswers() { //http://jsfiddle.net/MikeGrace/Vgavb/
  
// get array of elements
var myArray = $("#answer-list li");
var count = 0;

// sort based on timestamp attribute
myArray.sort(function (a, b) {
    
    // convert to integers from strings
    a = parseInt($(a).attr("score"), 10);
    b = parseInt($(b).attr("score"), 10);
    count += 2;
    // compare
    if(a > b) {
        return -1;
    } else if(a < b) {
        return 1;
    } else {
        return 0;
    }
});

console.log(myArray);
  
// put sorted results back on page
$("#answer-list ").append(myArray);
  
  
  
  
  
  
  
//  var answers = $('#answer-list ul'),
//	answersli = answers.children('li');
//  console.log(answers);
//  answers.sort(function(a,b){
////    console.log(a.getChildren('.answer-sec .vote-div .score') + ', ' + b);
//    var score = $(a).attr('class');
//    console.log(score);
//    console.log(a);
//    var an = a.getAttribute('data-name'),
//      bn = b.getAttribute('data-name');
//
//    if(an > bn) {
//      return 1;
//    }
//    if(an < bn) {
//      return -1;
//    }
//    return 0;
//  });

//$peopleli.detach().appendTo($people);
//  console.log('test');
//  var myArray = $("#answer-list div");
//  var count = 0;
//
//  // sort based on timestamp attribute
//  myArray.sort(function (a, b) {
//    console.log($(a).attr('class'));
//    // convert to integers from strings
//    a = parseInt($('.' + $(a).attr('class') + ' .answer-sec .vote-div .score').html(), 10);
//    b = parseInt($('.' + $(b).attr('class') + ' .answer-sec .vote-div .score').html(), 10);
//    count += 2;
//    // compare
//    if(a > b) {
//        return 1;
//    } else if(a < b) {
//        return -1;
//    } else {
//        return 0;
//    }
//  });
//  $("#answer-list").append(myArray);
}