
// INIT LIBS

	const express = require('express')
	const app = express()
	const server = require('http').createServer(app)
	const io = require('socket.io')(server)
		
	let fs = require("fs"),
		Timer = require('timer.js'),
		bodyParser=require("body-parser")
		// path = require('path'),

	app.use(function(req, res, next) {
		res.header('Access-Control-Allow-Credentials', 'true')
		res.header('Access-Control-Allow-Origin', request.get('origin'))
        next()
    });

	// app.use(express.static('public'))
	app.use(bodyParser.urlencoded({extended: true}))
	app.use(bodyParser.json())
	
	/*
	app.get('/', function(req, res){
		res.sendFile(__dirname + '/public/player.html');
	});
	*/

// TIMER - temps en seconde
	let lobbyTimer = new Timer({
		ontick : function(ms) {
			io.to('players').emit('startGame', true);
		},
		onend : function() {
			GAME.startGame()
		}
	});


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
				this.list[id] = {
					id: id,
					pseudo: pseudo,
					cards: [],
					ready: false
				};
				this.updatePlayersList();

				io.to(id).emit('connected', pseudo);
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

				UTILITIES.addHistory('C\'est au tour de', this.list[this.currentPlayer].pseudo, null, 4)
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
					lobbyTimer.start(5)	
					io.to('players').emit('startingsoon', true);
				}else{
					io.to('players').emit('startingsoon', false);
					lobbyTimer.stop()
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
				io.to('players').emit('endGame', PLAYERS.list)
				this.reset(false);
			},
			testReset: function(){
				if(Object.keys(PLAYERS.list).length === 0 && PLAYERS.list.constructor === Object){
					this.reset(true);
				}
			},
			reset: function(resetPlayer = false){
				console.log('-- RESET GAME --')

				this.state = 0
				this.history = []
				this.lastTurn = false

				if(resetPlayer){
					PLAYERS.list = {}
					PLAYERS.listDisconnect = {}
				}
				PLAYERS.playersOrder = []
				PLAYERS.currentPlayer = null

				CARDS.lib = {}
				CARDS.libPosition = {}
				CARDS.stack = []
				CARDS.discardPile = []
				CARDS.boardgame = []
				CARDS.correctOrder = []
			}
		}


	// CARDS
	// -----------------------------
	
		const CARDS = {
			lib: {}, 			// all Cards stock by ID - this.lib[:id:]
			libPosition: {}, 	// all cards with position - this.libPosition[:id:]
			stack: [], 			// current Stack
			discardPile: [], 	// cards in Discard pile
			boardgame: [], 		// cards on Board
			correctOrder: [],	// init base stack of cards
			initStacks: function(){
				// Get cards in JSON + randomize it + get cards QUANTITY
				let tmpCards = JSON.parse(fs.readFileSync(__dirname+'/cards.json'));
				this.stack = UTILITIES.shuffle(tmpCards.cards)
				this.cardsQty = this.stack.length

				// Add unique ID + remove POSITION + add Position in StackPOSITION
				this.stack.forEach((c) => {
					let tmpID = UTILITIES.generateID()
					c['id'] = tmpID
					this.libPosition[tmpID] = c.position
					this.lib[tmpID] = c
				})

				// set board START Card
				let startCard = this.drawOne()
				this.boardgame.push(startCard)
				this.correctOrder.push(startCard.id)
				// ~ Log
				UTILITIES.addHistory('La première carte est', null, startCard.name, 0)
			},
			// draw a card
			drawOne: function(){
				if(this.stack.length < 1 ){
					UTILITIES.addHistory('Il n\'y a plus de carte dans la pioche', null, null, 3)
					console.log('OUPS - Plus de carte à piocher !')
					return false
				}
				let getIdx = UTILITIES.random(this.stack.length)
				let tmpCard = this.stack[getIdx]
				this.stack.splice(getIdx, 1)

				return tmpCard
			},
			// remove a Card from a player Hand - add to Discard pile if needed
			removeCard: function(cardID, playerID, isRight){
				let tmpCardStack = PLAYERS.list[playerID].cards
				for (let i = tmpCardStack.length - 1; i >= 0; --i) {
					if(tmpCardStack[i].id == cardID){					
						if(!isRight) this.discardPile.push(tmpCardStack[i])
						tmpCardStack.splice(i,1);
					}
				}
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

				let baseOrder = this.correctOrder

				// comparer taille des array
				if((testOrder.length - baseOrder.length) !== 1)	return false

				// get new Card ID
				let newCard = testOrder.filter(x => baseOrder.indexOf(x) === -1);
					if(Array.isArray(newCard)) newCard = newCard[0]
					let nameCard = this.lib[newCard].name

				// test if player had this card				
				if(!PLAYERS.list[idPlayer].cards.some(e => e.id === newCard)) return false

				// Check Order of board Stack
				let prevPos = -1,
					resTest = true,
					tempBoard = []

					testOrder.forEach((el) => {
						if(this.libPosition[el] < prevPos) resTest = false
						prevPos = this.libPosition[el]
						// Build new Board if correct
						tempBoard.push(this.lib[el])
					})

				// remove Card from Player's stack - Add to Discard if Fail
				this.removeCard(newCard, idPlayer, resTest)

				let test = false;
				if(resTest){
					test = await this.playRight(idPlayer, testOrder, tempBoard, nameCard)
				}else{
					test = await this.playWrong(idPlayer, nameCard)
				}

				// Send new cards to player
				io.to(idPlayer).emit('playerCards', PLAYERS.list[idPlayer].cards)
				
				if(test){
					GAME.nextRound()
				}
			},
			// when player play RIGHT card
			async playRight(playerID, newOrder, newBoard, nameCard){

				this.correctOrder = newOrder
				this.boardgame = newBoard

				// ~ Log
				UTILITIES.addHistory('a bien placé', PLAYERS.list[playerID].pseudo, nameCard, 1)
					
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
						UTILITIES.addHistory('C\'est le dernier tour !', PLAYERS.list[playerID].pseudo, null, 3)
					}
				}
				
				return true

			},
			// when player play WRONG card
			async playWrong(playerID, nameCard){
				// ~ Log
				UTILITIES.addHistory('a mal placé', PLAYERS.list[playerID].pseudo, nameCard, 2)
				let tmpCard = this.drawOne()
				if(tmpCard !== null){
					PLAYERS.list[playerID].cards.push(tmpCard)
					UTILITIES.addHistory('a donc pioché', PLAYERS.list[playerID].pseudo, tmpCard.name, 0)
				}
				return true
			}
		}


// SOCKET *******************************

	io.on('connection', function(socket) {

		// Connexion
			socket.on('connection', (pseudo) => {
				if(pseudo.length > 2 && pseudo.length < 15){
					socket.join('players')
					PLAYERS.connection(pseudo, socket.id)
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
				if(!temp){
					GAME.testLobby()
				}else{
					lobbyTimer.stop()
				}
				PLAYERS.updatePlayersList()				
			})

		// PLAYED
		
			socket.on('played', (orderCards) => {
				if(socket.id == PLAYERS.currentPlayer)
					CARDS.testCards(orderCards, socket.id)
			})

		// DECONNEXION

			socket.on('disconnect', () => {
				if(socket.id in PLAYERS.list){
					// Add history entry if game is running
					if(GAME.state == 1){
						UTILITIES.addHistory('s\'est deconnecté', PLAYERS.list[socket.id].pseudo , null, 0)
						GAME.updateGame()
					}

					PLAYERS.listDisconnect[socket.id] = PLAYERS.list[socket.id]
					delete PLAYERS.list[socket.id];
					PLAYERS.updatePlayersList();
				}
				GAME.testReset();
			})

	});


// Listen the Server - port 3001
	server.listen(3001)

