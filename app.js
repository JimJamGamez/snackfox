
var app = require('express')();

var http = require('http').createServer(app);

var io = require('socket.io')(http);
const port = process.env.PORT || 3000

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/demofile1.html');
});
app.get('/background.js', (req, res) => {
  res.sendFile(__dirname + '/background.js');
});
app.get('/questions.csv', (req, res) => {
  res.sendFile(__dirname + '/questions.csv');
});

function shuffle(array){
  var currentIndex = array.length;
  var temporaryValue;
  var randomIndex;
  while(0!== currentIndex){
    randomIndex = Math.floor(Math.random () * currentIndex);
    currentIndex -=1

    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}

function startVoting(room){
  votes[room] = [[],[]];
  var qs = Object.keys(answers[room]);
  if (qs.length > 0){
    var q = qs[0];
    io.emit('show answers', q,answers[room][q][0][0],answers[room][q][1][0],answers[room][q][0][1],answers[room][q][1][1]);
    countdownVotes(15,room);
  }
} 
function countdownVotes(secondsLeft,room)
{
 
  var votesLeft = Object.keys(rooms[room]).length - votes[room][0].length - votes[room][1].length
  io.emit("countdown",secondsLeft + " waiting for " + votesLeft,room);
  console.log(secondsLeft + " " + votesLeft);
  if(secondsLeft == 0 || votesLeft == 0)
    io.emit("display votes",JSON.stringify(votes[room][0]),JSON.stringify(votes[room][1]));
  else{
    setTimeout(countdownVotes, 1000,secondsLeft - 1,room);
  }
}
function countdownAnswers(secondsLeft,room)
{
  io.emit("countdown",secondsLeft,room);
  if(secondsLeft == 0 || answers[room]["answersLeft"] == 0){
    delete answers[room]["answersLeft"];
    startVoting(room);
  }else{
    setTimeout(countdownAnswers, 1000,secondsLeft - 1,room);
  }
}
var votes = {};
var rooms = {};
var answers = {};
io.on('connection', (socket) => {
  console.log('a user connected id: ' + socket.id + ", " + Object.keys(rooms).length + " players online");
  function removePlayer(id){
    console.log("remove player " + id)
    if (Object.keys(rooms).length != 0){  
      for(var room in rooms){
        console.log("remove player " + rooms[room])
        if(id in rooms[room]){
          var reallocateHost = false;
          if (rooms[room][id].isHost){
            reallocateHost = true
          }
          delete rooms[room][id]
          if(Object.keys(rooms[room]).length == 0){
            delete rooms[room]
          }else if(reallocateHost){
            rooms[room][Object.keys(rooms[room])[0]].isHost = true;
          }
        }
      }
      io.emit('update players', JSON.stringify(rooms));
  }
}
  socket.on("vote", (room, vote) => {
    votes[room][vote].push(socket.id);
  });
  socket.on('disconnect', () => {
    console.log('user disconnected');
    removePlayer(socket.id);
	//delete rooms[socket.id];
  });
  socket.on("request update",() => {
    io.emit('update players', JSON.stringify(rooms));
  });
  socket.on('update player',(p) => {
    var player = JSON.parse(p);
    if (!(player.room in rooms)){
      rooms[player.room] = {};
    }
    rooms[player.room][socket.id] = player;
    console.log("Updated player - " + p);
    console.log("Updated player - " + JSON.stringify(rooms));
	  //console.log('update players: ' + JSON.stringify(players));
	  io.emit('update players', JSON.stringify(rooms));
  });
  socket.on('submit answer',(p,answer,question) => {
    var player = JSON.parse(p);
    answers[player.room][question].push([answer,socket.id]);
    answers[player.room]["answersLeft"] = answers[player.room]["answersLeft"] - 1;
    console.log("Waiting for " + answers[player.room]["answersLeft"] + " answers");
  });
  socket.on('create room', (roomName) => {
    console.log('createRoom: ' + roomName);
	io.emit('create room', roomName);
  });
  socket.on('kick player', (p) => {
    //player = JSON.parse(p);
    console.log('kickplayer: ' + p);
    removePlayer(p);
	io.emit('kick player', JSON.stringify(p));
  });
  socket.on('start game', (game)=> {
    var fs = require("fs");
    var text = fs.readFileSync("questions.csv");
    //Pheobe text is massive, ability to display any image, extra points for bulling harry
    var allQuestions = text.toString('utf-8').split("\n");
    var numPlayers = Object.keys(rooms[game]).length;
    if(numPlayers<2){
      return;
    }
  
    questions = [];
    var questionsPerPlayer = 1;
    answers[game] = {};
    answers[game]["answersLeft"] = questionsPerPlayer * numPlayers * 2;
    while (questions.length < numPlayers * questionsPerPlayer){
      var qNumber = Math.floor(Math.random () * (allQuestions.length));
      var question = allQuestions[qNumber].toString();
      if(!(questions.includes(question))){
        questions.push(question);
        answers[game][question] = [];
      }
    }
    var allocatedQuestions = 0;
    var choices = [];
    for (var i = 0; i < questionsPerPlayer; i++){
      for (var ii=0; ii < numPlayers;ii++){
        choices.push(ii);
      }
    }
    var ps = Object.keys(rooms[game]);
    var finalQuestions = {};
    for(var p in ps){
      finalQuestions[ps[p]] = [];
    }
    while(true){
      var allocation = shuffle(choices.slice());
      var allocation2 = shuffle(choices.slice());;
      var repeat = false;
      for (var i=0; i< allocation.length;i++){
        if(allocation[i] == allocation2[i]){
          repeat = true;
        }
      }
      if(!repeat){
        console.log(allocation);
        console.log(allocation2);
        for (var i=0; i< allocation.length;i++){
          finalQuestions[ps[allocation[i]]].push(questions[i]);
          finalQuestions[ps[allocation2[i]]].push(questions[i]);
        }
        countdownAnswers(45,game);
        io.emit('start game', game, finalQuestions);
        return;
      }
    }
    /*for (var i =0; i <choices.length/2; i++){
        var c1 = undefined;
        while (c1 == undefined){
          var num = Math.floor(Math.random () * (choices.length));
          c1 = choices[num];
        }
        delete choices[choices.indexOf(c1)];
        var c2 = undefined;
        while (c2 == undefined || c2 == c1){
          var num = Math.floor(Math.random () * (choices.length));
          c2 = choices[num];
        }
        delete choices[choices.indexOf(c2)];
        allocation[i] = [c1,c2];
    }*/

    
  });
});

http.listen(port, () => {
  console.log('listening on *:3000');
});