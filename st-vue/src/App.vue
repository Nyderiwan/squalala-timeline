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

	let _this

	export default {
		data() {
			return {
				logged : false,
				reconnect: false,
				state : 0,
				pseudo: null,
				players : {},
				currentPlayer: null,
				myCards: [],
				boardCards: [],
				scoreboardData :{
					players: {},
					history: []
				},
				discard: [],
				history: []
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
						if(this.currentPlayer !== null && Object.keys(this.players).length > 0){
							let tmpPlyr = this.players[this.currentPlayer].pseudo
							tmpTitle = 'Tour de '+ tmpPlyr +' 🔥 Squalala Game'
						}
						break
					case 3:
						tmpTitle = 'Fin de la partie 🏆 Squalala Game'
						break
				}
				document.title = tmpTitle
			}
		},
		computed: {
			currentView: function(){
				if(this.logged){
					if(this.state === 1){
						return {
							component: 'Lobby',
							props: { players: this.players },
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
								discard: this.discard
							},
							events: {}
						}
					}
					if(this.state === 3){
						return {
							component: 'Scoreboard',
							props: {
								players: this.scoreboardData.players,
								history: this.scoreboardData.history
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
						tryreconnect: this.reconnect
					},
					events: {}
				}
			}
		},
		created(){
			_this = this
			let cookieUser = readCookie('playerid')
			if(cookieUser != null){
				this.reconnect = true
				this.$socket.emit('customReconnect', cookieUser)
			}
			this.setTitle()
		},
		mounted() {

			// Player connection
				this.$socket.on('connected', (realPlayer) => {
					if(realPlayer) createCookie('playerid', this.$socket.id, 1)
					this.logged = true
					if(this.state == 0) this.state = 1
				})

			// reconnection worked
				this.$socket.on('reconnect_player', (test) => {
					eraseCookie('playerid')
					if(test){
						createCookie('playerid', this.$socket.id, 1)
						this.logged = true
						this.state = 2
					}
					this.reconnect = false					
				})

			// Game is starting
				this.$socket.on('startGame', (test) => {
					if(test) this.state = 2
				})

			// Spectator join During a game - Update Data
				this.$socket.on('joinSpectator', (data) => {
					this.players = data.players
					this.currentPlayer = data.currentPlayer
					this.boardCards = data.boardcards
					this.history = data.history
					this.discard = data.discard
			
					this.logged = true
					this.state = 2
				})

			// Update Players list
				this.$socket.on('players_list', (players) => {
					this.players = players
				})

			// Receive BOARDCARDS + HISTORY + currentPlayer
				this.$socket.on('updateGame', (data) => {
					this.boardCards = data.boardcards
					this.history = data.history
					this.currentPlayer = data.currentPlayer
					this.players = data.players
					this.discard = data.discard
				})

			// Receive Player's CARDS
				this.$socket.on('playerCards', (cards) => {
					this.myCards = cards
				});

			// Game is finished	- display Scoreboard
				this.$socket.on('endGame', (players, history) => {
					this.scoreboardData.players = players
					this.scoreboardData.history = history
					this.state = 3
				})

			// Listen all socket event ot update Title
				this.$socket.onAny(() => {
					setTimeout(function(){ _this.setTitle() }, 150)
				})

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
