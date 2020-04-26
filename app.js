const http = require('http');
const port = process.env.PORT || 3000
var url = require('url');
var fs = require('fs');
var uc = require('upper-case'); 
const server = http.createServer((req, res) => {  
  fs.readFile('demofile1.html', function(err, data) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(data);
	res.write(uc.upperCase("Hello World!"));
    return res.end();
  });
});

server.listen(port,() => {
  console.log(`Server running at port `+port);
});