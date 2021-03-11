<template>
	<div id="app-inner">

		<transition name="sql-fade">
			<component 
				:is="currentView.component"
				v-bind="currentView.props" 
				v-on="currentView.events" 
				:key="currentView.component" 
			></component>
		</transition>

	</div>
</template>

<script>
	import Login from './components/Login.vue'
	import Lobby from './components/Lobby.vue'
	import Game from './components/Game.vue'
	import Scoreboard from './components/Scoreboard.vue'
	import { io } from 'socket.io-client'

	let _this

	export default {
		data() {
			return {
				socket : null,
				logged : false,
				reconnect: false,
				state : 0,
				gameSettings : {},
				players : {},
				admin : null,
				decksList : [],
				currentPlayer: null,
				myCards: [],
				boardCards: [],
				scoreboardData :{
					players: {},
					history: [],
					board: [],
					discard: []
				},
				discard: [],
				history: [],
				isNewGame : false,
				roomId : null
			}
		},
		computed: {
			currentView: function(){
				if(this.logged){
					if(this.state === 1){
						return {
							component: 'Lobby',
							props: {
								players: this.players,
								roomId: this.roomId,
								admin: this.admin,
								decksList: this.decksList,
								socket: this.socket
							},
							events: {}
						}
					}
					if(this.state === 2){
						return {
							component: 'Game',
							props: {
								players: this.players,
								currentPlayer: this.currentPlayer,
								myCards: this.myCards,
								boardCards: this.boardCards,
								history: this.history,
								discard: this.discard,
								socket: this.socket,
								settings: this.gameSettings,
								itIsEnd: false
							},
							events: {}
						}
					}
					if(this.state === 3){
						return {
							component: 'Game',
							props: {
								players: this.scoreboardData.players,
								history: this.scoreboardData.history,
								boardCards: this.scoreboardData.board,
								discard: this.scoreboardData.discard,
								currentPlayer: null,
								myCards: this.myCards,
								socket: this.socket,
								settings: this.gameSettings,
								itIsEnd: true
							},
							events: {
								backfnct: this.returnToLobby
							}
						}
					}
				}

				return {
					component: 'Login',
					props: {
						tryreconnect: this.reconnect,
						socket: this.socket
					},
					events: {}
				}
			}			
		},
		methods: {
			returnToLobby(){
				this.state = 1
			},
			setTitle(){
				let tmpTitle = 'I ♥ Squalala 🐙'
				switch(this.state){
					case 0:
						tmpTitle = 'Play Squalala Timeline Now ⚡'
						break
					case 1:
						tmpTitle = 'Lobby 🍺 Squalala Game'
						break
					case 2:
						tmpTitle = 'Squalala ⏳ Timeline'
						if(this.currentPlayer !== null && this.currentPlayer in this.players){
							let tmpPlyr = this.players[this.currentPlayer].pseudo
							tmpTitle = 'Tour de '+ tmpPlyr +' 🔥 Squalala Game'
						}else{
							tmpTitle = 'En attente 🔥 Squalala Game'
						}
						break
					case 3:
						tmpTitle = 'Fin de la partie 🏆 Squalala Game'
						break
				}
				document.title = tmpTitle
			},
			async connectSocket(namespace){
				return await new Promise(resolve => {
					this.roomId = namespace
					// ~ DEV
					if(import.meta.env.MODE === "development" ){
						this.socket = io('localhost:8082'+namespace, {
							"force new connection" : true,
							"reconnectionAttempts": "Infinity",
							"timeout" : 10000,
							"transports" : ["websocket"]
						})
					}
					// ~ BUILD
					if(import.meta.env.MODE === "production" ){
						this.socket = io.connect(namespace, {
							forceNew:true,
							reconnection: true,
							reconnectionDelay: 500,
							reconnectionDelayMax : 5000,
							reconnectionAttempts: 99999
						});
					}
					this.socket.on('connect' , () => {
						resolve()
					})

				})
			},
			async setSockets(){
				return await new Promise(resolve => {

					if(this.isNewGame){ 
						// Create a new Room
							this.socket.on('roomCreated', (pseudo, nspc) => {
								this.connectSocket(nspc)
								this.roomCreated(pseudo)
							})

					}else{
						// Player connection
							this.socket.on('connected', (realPlayer, decks) => {

								if(realPlayer){
									let cookieV = this.socket.id + '___' + this.socket.nsp
									createCookie('gameInProgress', cookieV, 1)
								}
								this.decksList = decks
								this.logged = true
								if(this.state == 0) this.state = 1
							})

						// Game is starting
							this.socket.on('startGame', (settings) => {
								this.state = 2
								this.gameSettings = settings
							})

						// Spectator join During a game - Update Data
							this.socket.on('joinSpectator', (data) => {
								this.players = data.players
								this.currentPlayer = data.currentPlayer
								this.boardCards = data.boardcards
								this.history = data.history
								this.discard = data.discard
						
								this.logged = true
								this.state = 2
							})

						// Update Players list
							this.socket.on('players_list', (players, admin) => {
								this.players = players
								this.admin = admin
							})

						// Receive BOARDCARDS + HISTORY + currentPlayer
							this.socket.on('updateGame', (data) => {
								this.boardCards = data.boardcards
								this.history = data.history
								this.currentPlayer = data.currentPlayer
								this.players = data.players
								this.discard = data.discard
							})

						// Receive Player's CARDS
							this.socket.on('playerCards', (cards) => {
								this.myCards = cards
							});

						// Game is finished	- display Scoreboard
							this.socket.on('endGame', (players, history, discard, board) => {
								this.scoreboardData.players = players
								this.scoreboardData.history = history
								this.scoreboardData.board = board
								this.scoreboardData.discard = discard
								this.state = 3
							})

					}

					// custom RECONNECTION
						this.socket.on('reconnect_player', (test, namespace) => {
							let oldId = readCookie('gameInProgress')
								oldId = oldId.split('___')[0]

							eraseCookie('gameInProgress')
							if(test){
								if(namespace !== this.socket.nsp.name){
									return this.reconnectFromDefautlSocket(namespace, oldId)
								}	

								let cookieV = this.socket.id + '___' + this.socket.nsp.name
								createCookie('gameInProgress', cookieV, 1)
								this.logged = true
							}else{
								console.log('reconnection FAILED')
							}
							this.reconnect = false
						})

					// Listen all socket event ot update Title
						this.socket.onAny(() => {
							setTimeout(function(){ _this.setTitle() }, 150)
						})

					resolve()
				})	
			},
			async reconnectFromDefautlSocket(namespace, oldId){

				this.isNewGame = false
				await this.connectSocket(namespace)
				await this.setSockets()

				let newCookie = this.socket.id + '___' + namespace
				createCookie('gameInProgress', newCookie, 1)

				this.socket.emit('customReconnectFromDefault', oldId)

				this.logged = true
				this.reconnect = false
			},
			async roomCreated(pseudo){
				this.isNewGame = false
				await this.setSockets()
				await this.socket.emit('connection', pseudo)
			}
		},
		async created(){
			_this = this
			let namespace = window.location.pathname
			if(namespace === '/') this.isNewGame = true
			await this.connectSocket(namespace)
	
			// Check Cookie for Reconnection 			
			let cookieUser = readCookie('gameInProgress')
			if(cookieUser != null){
				this.reconnect = true
				this.socket.emit('customReconnect', cookieUser)
			}
			this.setTitle()
		},
		mounted() {
			this.setSockets()
		},
		components: {
			Login, Lobby, Game, Scoreboard
		}
	}

	// COOKIE functions

		function createCookie(name,value,days){
			if (days) {
				var date = new Date();
				date.setTime(date.getTime()+(days*24*60*60*1000));
				var expires = "; expires="+date.toGMTString();
			}
			else var expires = "";
			document.cookie = name+"="+value+expires+"; path=/";
		}
		function readCookie(name){
			var nameEQ = name + "=";
			var ca = document.cookie.split(';');
			for(var i=0;i < ca.length;i++) {
				var c = ca[i];
				while (c.charAt(0)==' ') c = c.substring(1,c.length);
				if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
			}
			return null;
		}
		function eraseCookie(name){
			createCookie(name,"",-1);
		}

</script>

<style lang="less">
	@import "assets/css/base.less";
</style>
