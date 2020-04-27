
var app = require('express')();

var http = require('http').createServer(app);

var io = require('socket.io')(http);
const port = process.env.PORT || 3000

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/demofile1.html');
});

var rooms = {};
io.on('connection', (socket) => {
  console.log('a user connected id: ' + socket.id + ", " + Object.keys(rooms).length + " players online");
  
  socket.on('disconnect', () => {
    console.log('user disconnected');
    if (Object.keys(rooms).length != 0){  
    for(var room in rooms){
      if(socket.id in rooms[room]){
        delete rooms[room][socket.id]
        if(Object.keys(rooms[room]).length == 0){
          delete rooms[room]
        }
      }
    }
    io.emit('update players', JSON.stringify(rooms));
  }
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
});

http.listen(port, () => {
  console.log('listening on *:3000');
});