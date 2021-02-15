
// INIT LIBS

	const express = require('express')
	const app = express()
	const server = require('http').createServer(app)
	const io = require('socket.io')(server)
		
	let fs = require("fs"),
		Timer = require('timer.js'),
		bodyParser=require("body-parser")
		// path = require('path')

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
	});
	
	app.get('/admin/HARDreset', function(req, res){
		resetGame()
		res.sendFile(__dirname + '/dist/reset.html');
	});	

// Debug
	// console.time('startFunction')
	// console.timeEnd('startFunction')	

// TIMER - temps en seconde
	let lobbyTimer = new Timer({
		onend : function() {
			GAME.startGame()
		}
	})

	let disconnectTimer = new Timer({
		onend : function() {
			GAME.nextRound()
		}
	})

	function lobbyRunner(run){
		if(run){
			lobbyTimer.start(3)
			io.to('players').emit('startingsoon', true);
		}else{
			io.to('players').emit('startingsoon', false);
			lobbyTimer.stop()
		}
	}


// FUNCTIONS *******************************
	
	// GAME SETTINGS
		const cardsByPlayer = 4

	// UTILITIES
	// -----------------------------

		const UTILITIES = {
			shuffle : function(a) {
				for (let i = a.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[a[i], a[j]] = [a[j], a[i]];
				}
				return a;
			},
			random: function(max){
				return Math.floor(Math.random() * max);
			},
			generateID: function(){
				return '_sql_' + Math.random().toString(36).substr(2, 9);
			},
			addHistory: function(log, player, card, type){
				GAME.history.push({
					'log': log, 		// phrase 
					'player': player, 	// nom du joueur
					'card': card, 		// nom de la carte
					'type': type 		// 0 - neutre / 1 - good / 2 - wrong / 3 - LAST ROUND / 4 - Next ROUND
				})
			}
		}		
		// UTILITIES.addHistory(log, player, card, type)


	// PLAYERS
	// -----------------------------

		const PLAYERS = {
			list: {},
			listDisconnect: {},
			playersOrder: [],
			currentPlayer: null,
			// NEW Player
			connection: function(pseudo, id){
				lobbyRunner(false)
				this.list[id] = {
					id: id,
					pseudo: pseudo,
					cards: [],
					ready: false
				};
				this.updatePlayersList();

				io.to(id).emit('connected', true);
			},
			updatePlayersList: function(){
				io.to('players').emit('players_list', this.list);
			},
			// Set order or players for game rounds
			setPlayerOrder: function(){
				let tmpPlayers = []
				for(let k in this.list){
					tmpPlayers.push({
						'id': this.list[k].id,
						'pseudo': this.list[k].pseudo
					})
				}
				this.playersOrder = UTILITIES.shuffle(tmpPlayers)
				this.currentPlayer = this.playersOrder[0].id
				UTILITIES.addHistory('Le premier joueur est', this.list[this.currentPlayer].pseudo, null, 4)
			},
			// Set Next Player
			async next(){
				let max = this.playersOrder.length - 1
				let current = this.playersOrder.findIndex((el) => el.id === this.currentPlayer)
				let nxt = current + 1
					if(GAME.lastTurn && current == max) return GAME.end()
					if(nxt > max) nxt = 0
				this.currentPlayer = this.playersOrder[nxt].id

				if(this.currentPlayer in PLAYERS.list){
					UTILITIES.addHistory('C\'est au tour de', this.list[this.currentPlayer].pseudo, null, 4)
					return true
				}else{
					this.next()
				}
			}
		}


	// GAME
	// -----------------------------

		const GAME = {
			state: 0, // 0 _ Off - 1 _ On
			history: [],
			lastTurn: false,
			testLobby: function(){
				let test = Object.keys(PLAYERS.list).every((el) => PLAYERS.list[el].ready === true)
				if(test && Object.keys(PLAYERS.list).length > 1){
					lobbyRunner(true)
				}else{
					lobbyRunner(false)
				}
			},
			startGame: function(){
				// Clean timer
				lobbyTimer.stop()
				// set State
				this.state = 1
				// ~ Log
				UTILITIES.addHistory('La partie commence !', null, null, 0)
				// init CARDS Libs & Stacks
				CARDS.initStacks()
				// set order players
				PLAYERS.setPlayerOrder()
				// Deal all player's cards
				CARDS.distribAllCards()
				// send Data
				this.updateGame()
				// Emit START GAME (change component) to ALL Players				
				io.to('players').emit('startGame', true);
			},
			async nextRound(){
				const test = await PLAYERS.next()
				return this.updateGame()
			},
			updateGame: function(){
				io.to('players').emit('updateGame', {
					boardcards: CARDS.boardgame, 
					history: GAME.history, 
					currentPlayer: PLAYERS.currentPlayer, 
					players: PLAYERS.list,
					discard: CARDS.discardPile
				})
			},
			end: function(){
				UTILITIES.addHistory('La partie est finie', null, null, 1)
				io.to('players').emit('endGame', PLAYERS.list, this.history)
				this.reset(false);
				SPECTATOR.addToPlayers()
			},
			testReset: function(){
				if(Object.keys(PLAYERS.list).length === 0 && PLAYERS.list.constructor === Object){
					this.reset(true);
				}
			},
			reset: function(resetPlayer = false){
				this.state = 0
				this.history = []
				this.lastTurn = false

				if(resetPlayer){
					PLAYERS.list = {}
					PLAYERS.listDisconnect = {}
					SPECTATOR.nextList = {}
				}
				PLAYERS.playersOrder = []
				PLAYERS.currentPlayer = null

				CARDS.lib = {}
				CARDS.stackPile = []
				CARDS.discardPile = []
				CARDS.boardgame = []
			}
		}


	// CARDS
	// -----------------------------
	
		const CARDS = {
			lib: {}, 			// all Cards stock by ID - this.lib[:id:]
			stackPile: [], 		// current Stack
			discardPile: [], 	// cards in Discard pile
			boardgame: [], 		// cards on Board
			initStacks: function(){
				// Get cards in JSON + randomize it + get cards QUANTITY
				let tmp = JSON.parse(fs.readFileSync(__dirname+'/cards.json'));
				this.stackPile = UTILITIES.shuffle(tmp.cards)

				// Add unique ID + remove POSITION + add Position in StackPOSITION
				this.stackPile.forEach((c) => {

					let tmpID = UTILITIES.generateID()
					c['id'] = tmpID
					
					this.lib[tmpID] = c
					this.lib[tmpID].date = Date.parse(c.date)
					// this.libPosition[tmpID] = Date.parse(c.date)
					// c['date'] = undefined
				})

				// set board START Card
				let startCard = this.drawOne()
				this.boardgame.push(this.lib[startCard.id])
				// this.correctOrder.push(startCard.id)
				// ~ Log
				UTILITIES.addHistory('La première carte est', null, startCard.name, 0)
			},
			// draw a card
			drawOne: function(){
				if(this.stackPile.length < 1 ){
					GAME.lastTurn = true
					UTILITIES.addHistory('Il n\'y a plus de carte dans la pioche,', null, null, 3)
					UTILITIES.addHistory('c\'est donc le dernier tour !', null, null, 3)
					return null
				}
				let getIdx = UTILITIES.random(this.stackPile.length)
				let tmpCard = this.stackPile[getIdx]
				this.stackPile.splice(getIdx, 1)
				return tmpCard
			},
			// remove a Card from a player Hand - add to Discard pile if needed
			removeCard: function(cardID, playerID, isRight){
				let tmpCardStack = PLAYERS.list[playerID].cards
				for (let i = tmpCardStack.length - 1; i >= 0; --i) {
					if(tmpCardStack[i].id == cardID){
						tmpCardStack.splice(i,1)
					}
				}
				if(!isRight) this.discardPile.push(this.lib[cardID])
			},
			// deal cards to all players
			distribAllCards: function(){
				for(let y in PLAYERS.list){
					let tmpCards = [],
						n = cardsByPlayer
					while (n > 0) {
						n--;
						let tmp = this.drawOne()
						tmpCards.push(tmp)
					}
					PLAYERS.list[y].cards = tmpCards
					PLAYERS.list[y].ready = false
					io.to(y).emit('playerCards', tmpCards)
				}
			},
			// Test if card played is Good or not
			async testCards(testOrder, idPlayer){

				// comparer taille des array
				if((testOrder.length - this.boardgame.length) !== 1) return false


				// get new Card ID
				let newCard = testOrder.filter(x => this.boardgame.every(y => y.id !== x))
					if(Array.isArray(newCard)) newCard = newCard[0]

				// test if player had this card
				if(!PLAYERS.list[idPlayer].cards.some(e => e.id === newCard)) return false

				// Check Order of board Stack
				let prevPos = -1,
					resTest = true,
					tempBoard = []

					testOrder.forEach((el) => {
						if(this.lib[el].date < prevPos) resTest = false
						prevPos = this.lib[el].date
						// Build new Board if correct
						tempBoard.push(this.lib[el])
					})

				// remove Card from Player's stack - Add to Discard if Fail
				this.removeCard(newCard, idPlayer, resTest)

				let test = false;
				if(resTest){
					test = await this.playRight(idPlayer, testOrder, tempBoard, newCard)
				}else{
					test = await this.playWrong(idPlayer, newCard)
				}

				// Send new cards to player
				io.to(idPlayer).emit('playerCards', PLAYERS.list[idPlayer].cards)
				
				// Next Round (after async)
				if(test) GAME.nextRound()
			},
			// when player play RIGHT card
			async playRight(playerID, newOrder, newBoard, newCard){

				// this.correctOrder = newOrder
				this.boardgame = newBoard

				// ~ Log
				UTILITIES.addHistory('a bien placé', PLAYERS.list[playerID].pseudo, this.lib[newCard].name, 1)
					
				// Test if _END of GAME_
				if(PLAYERS.list[playerID].cards.length === 0){
					
					let max = PLAYERS.playersOrder.length - 1					
					let current = PLAYERS.playersOrder.findIndex((el) => el.id === PLAYERS.currentPlayer)
				
					if(current === max){
						// end Game now : GG
						GAME.end()
						return false
					}else{
						GAME.lastTurn = true
						// ~ Log • Alert Last Round
						UTILITIES.addHistory('C\'est le dernier tour !', null, null, 3)
					}
				}
				
				return true

			},
			// when player play WRONG card
			async playWrong(playerID, newCard){
				// ~ Log
				UTILITIES.addHistory('a mal placé', PLAYERS.list[playerID].pseudo, this.lib[newCard].name, 2)

				if(GAME.lastTurn) return true
					
				// Draw a new card
				let tmpCard = this.drawOne()
				if(tmpCard !== null){
					PLAYERS.list[playerID].cards.push(tmpCard)
					UTILITIES.addHistory('a donc pioché une nouveau souvenir', PLAYERS.list[playerID].pseudo, null, 0)
				}
				return true
			}
		}


	// SPECTATOR
	// -----------------------------

		const SPECTATOR = {
			nextList: {},
			nextPlayer: function(pseudo, id){
				this.nextList[id] = pseudo
				this.joinDuringGame(id)
			},
			addToPlayers: function(pseudo, id){
				for(let k in this.nextList){
					PLAYERS.connection(this.nextList[k], k)
				}
				this.nextList = {}
			},
			joinDuringGame(id){
				io.to(id).emit('joinSpectator', {
					boardcards: CARDS.boardgame, 
					history: GAME.history,
					currentPlayer: PLAYERS.currentPlayer, 
					players: PLAYERS.list,
					discard: CARDS.discardPile
				})
			}
		}	


// SOCKET *******************************

	io.on('connection', function(socket) {

		// Connexion
			socket.on('connection', (pseudo) => {
				if(pseudo.length > 2 && pseudo.length < 15){
					socket.join('players')					
					if(GAME.state == 1){
						SPECTATOR.nextPlayer(pseudo, socket.id)
					}else{
						PLAYERS.connection(pseudo, socket.id)
					}
				}
			})

		// SPECTATOR 

			socket.on('spectator', () => {
				socket.join('players')
				if(GAME.state == 1){
					SPECTATOR.joinDuringGame(socket.id)
				}else{
					socket.emit('connected', false)
					PLAYERS.updatePlayersList()
				}
			})
			
		// Player RECONNECTION
			socket.on('customReconnect', function(previousId){
				if(GAME.state == 1 & previousId in PLAYERS.listDisconnect){

					PLAYERS.list[socket.id] = PLAYERS.listDisconnect[previousId]
					PLAYERS.list[socket.id].id = socket.id

					delete PLAYERS.listDisconnect[previousId];
					PLAYERS.updatePlayersList()

					socket.join('players')

					UTILITIES.addHistory('s\'est reconnecté', PLAYERS.list[socket.id].pseudo , null, 0)
	
					if(PLAYERS.currentPlayer === previousId){
						disconnectTimer.stop()
						PLAYERS.currentPlayer = socket.id
					}

					// change ID in playerOrder
					for(let x in PLAYERS.playersOrder){
						if(PLAYERS.playersOrder[x].id === previousId){
							PLAYERS.playersOrder[x].id = socket.id
						}
					}

					GAME.updateGame()

					socket.emit('reconnect_player', true)
				}else{
					socket.emit('reconnect_player', false)
				}
			})

		//  LOBBY		
			socket.on('ready', () => {
				let temp = PLAYERS.list[socket.id].ready
				PLAYERS.list[socket.id].ready = !temp
				GAME.testLobby()
				PLAYERS.updatePlayersList()				
			})

		// PLAYED
			socket.on('played', (orderCards) => {
				if(socket.id in PLAYERS.list){
					if(socket.id == PLAYERS.currentPlayer) 
						CARDS.testCards(orderCards, socket.id)
				}else{
					console.log('player doesn\'t exist !')
				}
			})

		// DECONNEXION
			socket.on('disconnect', () => {
				if(socket.id in PLAYERS.list){
					// Add history entry if game is running
					if(GAME.state == 1){
						UTILITIES.addHistory('s\'est deconnecté', PLAYERS.list[socket.id].pseudo , null, 0)
						
						// test si c'est à lui de jouer - run timer
						if(PLAYERS.currentPlayer === socket.id){
							UTILITIES.addHistory('Son tour passera dans 45 secondes', null , null, 3)
							disconnectTimer.start(45)
						}

						GAME.updateGame()
					}

					PLAYERS.listDisconnect[socket.id] = PLAYERS.list[socket.id]
					delete PLAYERS.list[socket.id]
					PLAYERS.updatePlayersList()
				}
				GAME.testReset();
			})

	});


// Listen the Server - port 3001
	server.listen(8082)
