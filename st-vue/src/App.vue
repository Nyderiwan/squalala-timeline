<template>

	<Connection v-if="!logged" />

	<template v-else>
		<Lobby 
			v-if="state === 1"
			:pseudo="this.pseudo"
			:players="this.players"
		/>

		<Game 
			v-if="state === 2"
			:players="this.players"
			:currentPlayer="this.currentPlayer"
			:myCards="this.myCards"
			:boardCards="this.boardCards"
			:history="this.history"
		/>

		<Scoreboard 
			v-if="state === 3"
			:players="this.players"
			@backfnct="returnToLobby"
		/>
		
	</template>

</template>

<script>
	import Connection from './components/Connection.vue'
	import Lobby from './components/Lobby.vue'
	import Game from './components/Game.vue'
	import Scoreboard from './components/Scoreboard.vue'

	export default {
		/*
		props: {
			msg: String
		},
		*/
		data() {
			return {
				logged : false,
				state : 0,
				pseudo: null,
				players : {},
				currentPlayer: null,
				myCards: [],
				boardCards: [],
				history: []
			}
		},
		methods: {
			returnToLobby(){
				this.state = 1
			}
		},
		components: {
			Connection, Lobby, Game, Scoreboard
		},
		mounted() {
			this.$socket.on('connected', (pseudo) => {
				this.pseudo = pseudo
				this.logged = true
				this.state = 1
			})

			this.$socket.on('players_list', (players) => {
				this.players = players
			})
			
			this.$socket.on('startGame', (test) => {
				if(test) this.state = 2
			})

				// Receive BOARDCARDS + HISTORY + currentPlayer
				this.$socket.on('updateGame', (boardcards, history, currentPlayer, players) => {
					this.boardCards = boardcards
					this.history = history
					this.currentPlayer = currentPlayer
					this.players = players
				})

				// Receive Player's CARDS
				this.$socket.on('playerCards', (cards) => {
					this.myCards = cards
				});

			this.$socket.on('endGame', (players) => {
				this.players = players
				this.state = 3
			})	

		}
	}

</script>

<style lang="less">
	@import "assets/style.less";
</style>