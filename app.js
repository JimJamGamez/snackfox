
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

var rooms = {};
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
    questions = [];
    var questionsPerPlayer = 3;
    while (questions.length < numPlayers * questionsPerPlayer){
      var qNumber = Math.floor(Math.random () * (allQuestions.length));
      var question = allQuestions[qNumber].toString();
      if(!(questions.includes(question))){
        questions.push(question);
      }
    }
    var allocatedQuestions = 0;
    var choices = [];
    for (var i = 0; i < questionsPerPlayer; i++){
      for (var ii=0; ii < numPlayers;ii++){
        choices.push(ii);
      }
    }
    var allocation = [];
    for (var i =0; i <choices.length/2; i++){
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
    }

    console.log(allocation);
	  io.emit('start game');
  });
});

http.listen(port, () => {
  console.log('listening on *:3000');
});