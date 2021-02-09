<template>
	
	<transition name="sql-slide">
		<component 
			:is="currentView.component"
			v-bind="currentView.props" 
			v-on="currentView.events" 
			:key="currentView.component" 
		></component>
	</transition>

</template>

<script>
	import Login from './components/Login.vue'
	import Lobby from './components/Lobby.vue'
	import Game from './components/Game.vue'
	import Scoreboard from './components/Scoreboard.vue'

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
				discard: [],
				history: []
			}
		},
		methods: {
			returnToLobby(){
				this.state = 1
			}
		},
		computed: {
			currentView: function(){
				if(this.logged){
					if(this.state === 1){
						return {
							component: 'Lobby',
							props: {
								pseudo: this.pseudo,
								players: this.players
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
								discard: this.discard
							},
							events: {}
						}
					}
					if(this.state === 3){
						return {
							component: 'Scoreboard',
							props: {
								players: this.players,
								history: this.history
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
			let cookieUser = readCookie('playerid')
			if(cookieUser != null){
				this.reconnect = true
				this.$socket.emit('customReconnect', cookieUser)
			}
		},
		mounted() {
			this.$socket.on('connected', (pseudo) => {
				createCookie('playerid', this.$socket.id, 1)
				this.pseudo = pseudo
				this.logged = true
				this.state = 1
			})

			this.$socket.on('reconnect_player', (test) => {
				eraseCookie('playerid')
				if(test){
					createCookie('playerid', this.$socket.id, 1)

					this.pseudo = this.players[this.$socket.id].pseudo
					this.logged = true
					this.state = 2
				}
				this.reconnect = false
			})

			this.$socket.on('players_list', (players) => {
				this.players = players
			})
			
			this.$socket.on('startGame', (test) => {
				if(test) this.state = 2
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

			this.$socket.on('endGame', (players) => {
				this.players = players
				this.state = 3
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
