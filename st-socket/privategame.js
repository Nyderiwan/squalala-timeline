let fs = require("fs"),
	Timer = require('timer.js')

const UTILITIES = require('./utilities.js')

class Privategame{

	constructor(roomid, admin, io) {
		this.io = io.of(roomid)
		// base Room
		this.roomId = roomid
		this.admin = admin
		this.timerDisco = 20
		
		// Players
		this.PLAYERS = {
			list: {},
			listDisconnect: {},
			playersOrder: [],
			currentPlayer: null
		}

		// Game
		this.GAME = {
			state: 0, // 0 _ Off - 1 _ On
			history: [],
			lastTurn: false
		}

		// Cards
		this.CARDS = {
			lib: {}, 			// all Cards stock by ID - this.CARDS.lib[:id:]
			stackPile: [], 		// current Stack
			discardPile: [], 	// cards in Discard pile
			boardgame: [],
		}

		// Spectator
		this.spectatorNextList = {}

		// Settings
		this.SETTINGS = {
			isDate: true,
			dateFormat: null
		}

		// Timers
		this.disconnectTimer = new Timer( () => {
			onend : () => {
				console.log('timer disconnect is ended')
				this.nextRound()
			}
		})
	}

	addHistory(log, player, card, type){
		this.GAME.history.push({
			'log': log, 		// phrase 
			'player': player, 	// nom du joueur
			'card': card, 		// nom de la carte
			'type': type 		// 0 - neutre / 1 - good / 2 - wrong / 3 - LAST ROUND / 4 - Next ROUND
		})
	}

	// PLAYERS --------------

		// Connexion
		connection(pseudo, id, decks){
			if(this.GAME.state === 1){
				this.nextPlayer(pseudo, id)
			}else{
				this.newPlayer(pseudo, id, decks)
			}
		}

		// Add new Player in this ROOM
		async newPlayer(pseudo, id, decks){
			this.PLAYERS.list[id] = {
				id: id,
				pseudo: pseudo,
				cards: []
			};
			await this.updatePlayersList();

			this.io.to(id).emit('connected', true, decks);
		}

		// emit Updated list of Players
		async updatePlayersList(){
			return await new Promise(resolve => {
				this.io.to('players').emit('players_list', this.PLAYERS.list, this.admin);
				resolve()
			})
		}

		// Set order or players for game rounds
		setPlayerOrder(){
			let tmpPlayers = []
			for(let k in this.PLAYERS.list){
				tmpPlayers.push({
					'id': this.PLAYERS.list[k].id,
					'pseudo': this.PLAYERS.list[k].pseudo
				})
			}
			this.PLAYERS.playersOrder = UTILITIES.shuffle(tmpPlayers)
			this.PLAYERS.currentPlayer = this.PLAYERS.playersOrder[0].id
			this.addHistory('Le premier joueur est', this.PLAYERS.list[this.PLAYERS.currentPlayer].pseudo, null, 4)
		}

		// Set Next Player
		async next(){
			let max = this.PLAYERS.playersOrder.length - 1
			let current = this.PLAYERS.playersOrder.findIndex((el) => el.id === this.PLAYERS.currentPlayer)
			let nxt = current + 1
				if(this.GAME.lastTurn && current == max) return this.end()
				if(nxt > max) nxt = 0
			this.PLAYERS.currentPlayer = this.PLAYERS.playersOrder[nxt].id

			if(this.PLAYERS.currentPlayer in this.PLAYERS.list){
				this.addHistory('C\'est au tour de', this.PLAYERS.list[this.PLAYERS.currentPlayer].pseudo, null, 4)
				return true
			}else{
				this.next()
			}
		}

		// Set new Admin
		setNewAdmin(){
			if(Object.keys(this.PLAYERS.list).length > 0){
				let keys = Object.keys(this.PLAYERS.list);
				this.admin = this.PLAYERS.list[keys[0]].id
			}
		}

		// Disconnection
		async disconnect(id){
			if(id in this.PLAYERS.list){
				// Add history entry if game is running
				if(this.GAME.state === 1){
					this.addHistory('s\'est deconnecté', this.PLAYERS.list[id].pseudo , null, 0)
					// test si c'est à lui de jouer - run timer
					if(this.PLAYERS.currentPlayer === id){
						this.addHistory('Son tour passera dans '+ this.timerDisco +' secondes', null , null, 3)
						this.disconnectTimer.start(this.timerDisco)
					}
					await this.updateGame()
				}

				this.PLAYERS.listDisconnect[id] = this.PLAYERS.list[id]
				delete this.PLAYERS.list[id]

				// test if admin
				if(this.admin === id) this.setNewAdmin()

				// Update info
				await this.updatePlayersList()
			}
		}

		// Reconnection
		async reconnection(socketId, previousId){
			this.PLAYERS.list[socketId] = this.PLAYERS.listDisconnect[previousId]
			this.PLAYERS.list[socketId].id = socketId

			// remove in disconnect players list
			delete this.PLAYERS.listDisconnect[previousId];
			await this.updatePlayersList()

			// add in Logs
			this.addHistory('s\'est reconnecté', this.PLAYERS.list[socketId].pseudo , null, 0)

			// If it's his turn - change ID
			if(this.PLAYERS.currentPlayer === previousId){
				this.disconnectTimer.stop()
				this.PLAYERS.currentPlayer = socketId
			}
			// change ID in playerOrder
			for(let x in this.PLAYERS.playersOrder){
				if(this.PLAYERS.playersOrder[x].id === previousId){
					this.PLAYERS.playersOrder[x].id = socketId
				}
			}

			// Update Data
			await this.updateGame()
			// Give Cards to player
			await this.io.to(socketId).emit('playerCards', this.PLAYERS.list[socketId].cards)
			// Start game and settings
			await this.io.to(socketId).emit('startGame', this.SETTINGS)
		}

	// GAME --------------

		play(socketId, orderCards){
			if(socketId in this.PLAYERS.list){
				if(socketId === this.PLAYERS.currentPlayer) 
					this.testCards(orderCards, socketId)
			}else{
				console.log('player doesn\'t exist !')
			}
		}
	
		startGame(socketId, settings){
			if(socketId != this.admin) return false

			// set State
			this.GAME.state = 1
			// ~ Log
			this.addHistory('La partie commence !', null, null, 0)

			// init CARDS Libs & Stacks
			this.initStacks(settings.deck)
			// set order players
			this.setPlayerOrder()
			// Deal all player's cards
			this.distribAllCards(settings.cardsNmb)
			// send Data
			this.updateGame()
			
			// Emit START GAME (change component) to ALL Players				
			this.io.to('players').emit('startGame', this.SETTINGS);
		}

		async nextRound(){
			const test = await this.next()
			return this.updateGame()
		}

		async updateGame(){
			return await new Promise(resolve => {
				this.io.to('players').emit('updateGame', {
					boardcards: this.CARDS.boardgame, 
					history: this.GAME.history, 
					currentPlayer: this.PLAYERS.currentPlayer, 
					players: this.PLAYERS.list,
					discard: this.CARDS.discardPile
				})
				resolve()
			})
		}

		end(){
			this.addHistory('La partie est finie', null, null, 1)
			this.io.to('players').emit('endGame', this.PLAYERS.list, this.GAME.history, this.CARDS.discardPile, this.CARDS.boardgame )
			this.reset(false);
			this.addToPlayers()
		}

		reset(){
			this.GAME.state = 0
			this.GAME.history = []
			this.GAME.lastTurn = false

			this.PLAYERS.playersOrder = []
			this.PLAYERS.currentPlayer = null

			this.CARDS.lib = {}
			this.CARDS.stackPile = []
			this.CARDS.discardPile = []
			this.CARDS.boardgame = []
		}

		testDestroy(){
			if(Object.keys(this.PLAYERS.list).length === 0 && this.PLAYERS.list.constructor === Object){
				this.disconnectTimer.stop()
				return true
			}else{
				return false
			}
		}

	// CARDS --------------
		
		// cards on Board
		initStacks(deck){

			// Get cards in JSON + randomize it + get cards QUANTITY
			let tmp = JSON.parse(fs.readFileSync(__dirname+'/cards/'+deck+'/cards.json'));
			this.CARDS.stackPile = UTILITIES.shuffle(tmp.cards)

			// Get Settings
			this.SETTINGS.isDate = tmp.isDate
			this.SETTINGS.dateFormat = tmp.dateFormat

			// Add unique ID + remove POSITION + add Position in StackPOSITION
			this.CARDS.stackPile.forEach((c) => {
				let tmpID = UTILITIES.generateID()
				c['id'] = tmpID
				c['image'] = deck+'/img/'+c['image']
				c['thumbnail'] = deck+'/img/'+c['thumbnail']

				this.CARDS.lib[tmpID] = c

				if(this.SETTINGS.isDate)
					// this.CARDS.lib[tmpID].date = Date.parse(c.date)
					this.CARDS.lib[tmpID].date = new Date(c.date)
			})

			// set board START Card
			let startCard = this.drawOne()
			this.CARDS.boardgame.push(this.CARDS.lib[startCard.id])
			
			// ~ Log
			this.addHistory('La première carte est', null, startCard.name, 0)
		}

		// draw a card
		drawOne(){
			if(this.CARDS.stackPile.length < 1 ){
				this.GAME.lastTurn = true
				this.addHistory('Il n\'y a plus de carte dans la pioche,', null, null, 3)
				this.addHistory('c\'est donc le dernier tour !', null, null, 3)
				return null
			}
			let getIdx = UTILITIES.random(this.CARDS.stackPile.length)
			let tmpCard = this.CARDS.stackPile[getIdx]
			this.CARDS.stackPile.splice(getIdx, 1)
			return tmpCard
		}

		// remove a Card from a player Hand - add to Discard pile if needed
		removeCard(cardID, playerID, isRight){
			let tmpCardStack = this.PLAYERS.list[playerID].cards
			for (let i = tmpCardStack.length - 1; i >= 0; --i) {
				if(tmpCardStack[i].id == cardID){
					tmpCardStack.splice(i,1)
				}
			}
			if(!isRight) this.CARDS.discardPile.push(this.CARDS.lib[cardID])
		}

		// deal cards to all players
		distribAllCards(cardsNmb){
			for(let y in this.PLAYERS.list){
				let tmpCards = [],
					n = cardsNmb
				while (n > 0) {
					n--;
					let tmp = this.drawOne()
					tmpCards.push(tmp)
				}
				this.PLAYERS.list[y].cards = tmpCards
				this.io.to(y).emit('playerCards', tmpCards)
			}
		}

		// Test if card played is Good or not
		async testCards(testOrder, idPlayer){

			// comparer taille des array
			if((testOrder.length - this.CARDS.boardgame.length) !== 1) return false

			// get new Card ID
			let newCard = testOrder.filter(x => this.CARDS.boardgame.every(y => y.id !== x))
				if(Array.isArray(newCard)) newCard = newCard[0]

			// test if player had this card
			if(!this.PLAYERS.list[idPlayer].cards.some(e => e.id === newCard)) return false

			// Check Order of board Stack
			let prevPos = null,
				resTest = true,
				tempBoard = []

				testOrder.forEach((el) => {
					if(prevPos !== null && this.CARDS.lib[el].date < prevPos) resTest = false
					prevPos = this.CARDS.lib[el].date
					// Build new Board if correct
					tempBoard.push(this.CARDS.lib[el])
				})

			// remove Card from Player's stack - Add to Discard if Fail
			this.removeCard(newCard, idPlayer, resTest)

			let test = false;
			if(resTest){
				test = await this.playRight(idPlayer, testOrder, tempBoard, newCard)
			}else{
				test = await this.playWrong(idPlayer, newCard)
			}

			// sync Player's CARDS
			this.io.to(idPlayer).emit('playerCards', this.PLAYERS.list[idPlayer].cards)
			
			// Next Round (after async)
			if(test) this.nextRound()
		}

		// when player play RIGHT card
		async playRight(playerID, newOrder, newBoard, newCard){
			this.CARDS.boardgame = newBoard

			// ~ Log
			this.addHistory('a bien placé', this.PLAYERS.list[playerID].pseudo, this.CARDS.lib[newCard].name, 1)
				
			// Test if _END of GAME_
			if(this.PLAYERS.list[playerID].cards.length === 0){
				
				let max = this.PLAYERS.playersOrder.length - 1					
				let current = this.PLAYERS.playersOrder.findIndex((el) => el.id === this.PLAYERS.currentPlayer)
			
				if(current === max){
					// end Game now : GG
					this.end()
					return false
				}else{
					this.GAME.lastTurn = true
					// ~ Log • Alert Last Round
					this.addHistory('C\'est le dernier tour !', null, null, 3)
				}
			}
			
			return true

		}

		// when player play WRONG card
		async playWrong(playerID, newCard){
			// ~ Log
			this.addHistory('a mal placé', this.PLAYERS.list[playerID].pseudo, this.CARDS.lib[newCard].name, 2)

			if(this.GAME.lastTurn) return true

			this.io.to(playerID).emit('popUpWrong', this.CARDS.lib[newCard])
				
			// Draw a new card
			let tmpCard = this.drawOne()
			if(tmpCard !== null){
				this.PLAYERS.list[playerID].cards.push(tmpCard)
				this.addHistory('a donc pioché une nouveau souvenir', this.PLAYERS.list[playerID].pseudo, null, 0)
			}
			return true
		}

	// SPECTATOR --------------

		newSpectator(socketId){
			if(this.GAME.state === 1){
				this.joinDuringGame(socketId)
			}else{
				this.io.to(socketId).emit('connected', false, [])
				this.updatePlayersList()
			}
		}

		nextPlayer(pseudo, id){
			this.spectatorNextList[id] = pseudo
			this.joinDuringGame(id)
		}

		addToPlayers(pseudo, id){
			for(let k in this.spectatorNextList){
				this.newPlayer(this.spectatorNextList[k], k)
			}
			this.spectatorNextList = {}
		}

		joinDuringGame(id){
			this.io.to(id).emit('joinSpectator', {
				boardcards: this.CARDS.boardgame, 
				history: this.GAME.history,
				currentPlayer: this.PLAYERS.currentPlayer, 
				players: this.PLAYERS.list,
				discard: this.CARDS.discardPile
			})
		}

}

module.exports = Privategame