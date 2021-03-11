
// INIT LIBS

	const express = require('express')
	const app = express()
	const server = require('http').createServer(app)
	const io = require('socket.io')(server)
		
	let fs = require("fs"),
		Timer = require('timer.js'),
		bodyParser=require("body-parser")
		// path = require('path')

	// prive Game class
	const Privategame = require('./privategame.js')

	// Utilities
	const UTILITIES = require('./utilities.js')

	app.use(function(req, res, next) {
		res.header('Access-Control-Allow-Credentials', 'true')
		res.header('Access-Control-Allow-Origin', req.get('origin'))
        next()
    });

	app.use(express.static('cards'))
	app.use(express.static('dist'))
	app.use(bodyParser.urlencoded({extended: true}))
	app.use(bodyParser.json())

	app.get('/', function(req, res){
		res.sendFile(__dirname + '/dist/index.html');
	})

	app.get('/:id', function(req, res){
		res.sendFile(__dirname + '/dist/reset.html');
		// res.send('Welcome in '+ req.params.id)
	})


// FUNCTIONS *******************************
	
	// Init Cards Decks

	function getDecksDirectories(){
		return fs.readdirSync('cards', { withFileTypes: true })
			.filter(dirent => (dirent.name != 'template' && dirent.isDirectory()))
			.map(dirent => dirent.name)
	}

	function initCardsStacks(){
		let tmpDir = getDecksDirectories()
		let tmpRes = {}
		return tmpDir
	}


 // { if return


	// GAME SETTINGS
		const cardsByPlayer = 4

	// PRIVATE GAMES	

		let gamesList = {}



// SOCKET *******************************

	function createRoom(){
		let test = false
		let tmp = null
		while(!test){
			tmp = '/' + UTILITIES.randomCode(8)
			if(!(tmp in gamesList)) test = true
		}
		return tmp
	}

	// Default namespace -> when create new game
	io.on("connection", (socket) => {
		socket.on('createRoom', (pseudo) => {
			let newNspc = createRoom()
			socket.emit('roomCreated', pseudo, newNspc)
		})

		socket.on('customReconnect', (cookie) => {
			let tmpCookie = cookie.split('___')
			let userSCKT = tmpCookie[0]
			let roomNSP = tmpCookie[1]

			if(roomNSP in gamesList 
				&& gamesList[roomNSP].GAME.state === 1 
				&& userSCKT in gamesList[roomNSP].PLAYERS.listDisconnect){

				socket.emit('reconnect_player', true, roomNSP)
			}else{
				socket.emit('reconnect_player', false)
			}
		})

	})


	// namespace is  /:6caracters -> digit+letters
	io.of(/^\/[0-9a-zA-Z]{6}/).on("connection", (socket) => {

		const namespace = socket.nsp.name

		// Connexion
			socket.on('connection', (pseudo) => {
				if(pseudo.length > 2 && pseudo.length < 15){
					socket.join('players')
					
					// if  room doesn't exist, init it
					if(!(namespace in gamesList)){
						gamesList[namespace] = new Privategame(namespace, socket.id, io)
						UTILITIES.logFile(pseudo +' créé la game - '+ namespace)
					}else{
						UTILITIES.logFile(pseudo +' a rejoint le salon '+ namespace)
					}
					gamesList[namespace].connection(pseudo, socket.id, initCardsStacks())
				}
			})

		// SPECTATOR 
			socket.on('spectator', () => {
				if(namespace in gamesList) gamesList[namespace].newSpectator(socket.id)
			})
			
		// Player RECONNECTION
			socket.on('customReconnect', function(cookie){
				let tmpCookie = cookie.split('___')
				let userSCKT = tmpCookie[0]
				let roomNSP = tmpCookie[1]
			
				if(roomNSP in gamesList 
				   && gamesList[roomNSP].GAME.state === 1 
				   && userSCKT in gamesList[roomNSP].PLAYERS.listDisconnect){

					socket.join('players')
					gamesList[roomNSP].reconnection(socket.id, userSCKT)
					socket.emit('reconnect_player', true, roomNSP)
				}else{
					socket.emit('reconnect_player', false)
				}
			})

			// from default Namespace 
			socket.on('customReconnectFromDefault', function(previousId){
				socket.join('players')
				gamesList[namespace].reconnection(socket.id, previousId)
			})

		// LOBBY
			socket.on('startgame', (settings) => {
				if(namespace in gamesList) gamesList[namespace].startGame(socket.id, settings)
			})

		// PLAYED
			socket.on('played', (orderCards) => {
				if(namespace in gamesList) gamesList[namespace].play(socket.id, orderCards)
			})

		// DECONNEXION
			socket.on('disconnect', () => {
				if(namespace in gamesList){
					// Remove player
					gamesList[namespace].disconnect(socket.id)
					// if no more player : delete this room
					if(gamesList[namespace].testDestroy()){
						delete gamesList[namespace]
						console.log('!!! Destroy Game -', namespace)
					}
				}
			})
	
	});


// Listen the Server - port 3001
	server.listen(8082)
