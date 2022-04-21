var http = require('http')
var fs = require('fs')
var express = require('express')
var socketio = require('socket.io')
var ejs = require('ejs')
var mysql = require('mysql')
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');


var client = mysql.createConnection({
    host: '192.168.74.187',
    user: 'root',
    password: '1234',
    port: '9070',
    database: 'weblabel'
})

fs.readdir('./images', (err, files) => { // add to database except exist ones
    files.forEach(file => {
        client.query('INSERT INTO images (fname, label) SELECT ?, ? FROM DUAL WHERE NOT EXISTS (SELECT * FROM images WHERE fname=?)',[
        file, 'None', file
        ], function (error, result, fields) { })
    })
})

var app = express()
var server = http.createServer(app)
var io = socketio(server)

server.listen(55555, function () {
  console.log('Server Running at http://localhost:55555');
})

app.use(express.static('images'))
app.use(express.static('style'))
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));


app.get('/', (request, response) => {
    if(!request.cookies.auth) {
        response.redirect('/login'); 
        return;
    }
    response.cookie('views', 20)
    response.cookie('page', 1)
    response.cookie('sort', 'all')
    
    response.redirect('/list');
    
})

app.get('/list', function (request, response) {
    var views = parseInt(request.cookies.views)
    var page = parseInt(request.cookies.page)
    var start = (page - 1) * views
    var COND = '' 
    if (request.cookies.sort != 'all') COND += ' WHERE label="' + request.cookies.sort + '"'
    
    fs.readFile('./list.html', 'utf8', (error, data) => {
        client.query('SELECT * FROM labels' , (error, labels) => {
            client.query('SELECT * FROM images' + COND, (error, nResult) => {
                client.query('SELECT * FROM images' + COND + ' LIMIT ?, ?', [
                    start, views
                ], function (error, results) {
                    var endpage = parseInt(nResult.length/views)
                    if(nResult.length > endpage*views) endpage += 1
                    response.send(ejs.render(data, {
                        page: page,
                        data: results,
                        labels: labels,
                        views: views,
                        endpage: endpage
                    }))
                })
            })
        })
    })
})

app.get('/move/:to', (request, response) => {
    var moveTo = request.params.to
    var page = parseInt(request.cookies.page)
    if(moveTo != undefined){
        if(moveTo == "prev") 
            response.cookie('page', parseInt((page-1)/10)*10)
        else if(moveTo == "next") 
            response.cookie('page', (parseInt(page/10)+1)*10 + 1)
        else
            response.cookie('page', parseInt(moveTo))
        response.redirect('/list')
    }
})

app.get('/image/:id', function (request, response) {
    response.cookie('lastSeeId', request.params.id)
    fs.readFile('./image.html', 'utf8', function (error, data) {
        client.query('SELECT * FROM labels' , function (error, labels) {
            client.query('SELECT * FROM images WHERE id=?', [
                parseInt(request.params.id)
            ], function (error, results) {
                try{
                    response.send(ejs.render(data, {
                        data: results[0],
                        labels: labels
                    }))
                } catch (e) {
                    response.writeHead(200, {'Content-Type': 'text/html'})
                    response.end('<h1> Image Index Out of Range </h1>')
                }
            })
        })
    })
})

app.post('/set_label_:id/:label', function (request, response) {
    client.query('UPDATE images SET label=? WHERE id=?',[
        request.params.label, parseInt(request.params.id)
    ], function (error, result, fields) { })
    response.redirect('/image/' + request.cookies.lastSeeId)
})

app.get('/login', function (request, response) {
    fs.readFile('./login.html', function (error, data) {
        response.end(data);
    })
});

app.post('/login', function (request, response) {
    var login = request.body.login;
    var password = request.body.password;
    
    console.log(request.body);
    
    var ipAddress;
    if(!!request.hasOwnProperty('sessionID')){
        ipAddress = request.headers['x-forwarded-for'];
    } else{
        if(!ipAddress){
            var forwardedIpsStr = request.header('x-forwarded-for');

            if(forwardedIpsStr){
                var forwardedIps = forwardedIpsStr.split(',');
                ipAddress = forwardedIps[0];
            }
            if(!ipAddress){
                ipAddress = request.connection.remoteAddress;
            }
        }
    }
    if (login == 'user' && password == '1234'){
        response.cookie('auth', true);
        console.log('Login Success', ipAddress, Date())
        response.redirect('/');
        return;
    } else {
        console.log('Login failed', ipAddress, Date())
        response.redirect('/login');
        return;
    }
})

app.get('/logout', function (request, response) {
    response.clearCookie("auth")
    response.redirect('/')
})

app.get('/changeView', function (request, response) {
    response.cookie('views', request.query.selectpicker)
    response.cookie('page', 1)
    response.redirect('/list')
});

app.get('/sort', function (request, response) {
    response.cookie('sort', request.query.selectpicker)
    response.cookie('page', 1)
    response.redirect('/list')
});


io.sockets.on('connection', function (socket) {
    socket.on('message', function (data) {
        io.sockets.emit('message', data)
    })
})