<template>
	<div id="lobby">
		<div class="lobby_inner">
			<header>
				<Svg name="beer"></Svg>
				<h2>Lobby</h2>
			</header>
			<div class="container">
				<div class="players_list">					
					<div v-for="player in orderedPlayers" class="player_item" :key="player">
						<div class="pseudo">{{ player.pseudo }}</div>
						<span class="ready" v-if="player.ready">Prêt</span>
					</div>
					<div class="no_players" v-show="noPlayer">Aucun joueur</div>
				</div>
				<div class="right">	
					<div class="logo_bg"><Svg name="logo"></Svg></div>
					<div class="starting_soon" v-show="starting" :class="{starting: starting}">
						<span>La partie va commencer</span>
					</div>
				</div>		
				<div class="bottom" v-if="isPlayer">
					<button @click.prevent="ready" :class="{ready : players[myId].ready}">{{ label_ready }}</button>
				</div>
			</div>
		</div>
	</div>

</template>

<script>
	import _ from 'lodash'

	export default {
		props: {
			players: Object
		},
		data(){
			return {
				starting: false,
				myId: this.$socket.id
			}
		},
		mounted() {
			this.$socket.on('startingsoon', (test) => {
				this.starting = test
			})
		},
		computed: {
			label_ready: function(){
				let tmp = 'Lulu prêt !'
				if(this.players[this.$socket.id].ready){
					tmp = 'Hum en fait non !'
				}
				return tmp 
			},
			orderedPlayers: function() {
				return _.orderBy(this.players, 'pseudo')
			},
			isPlayer: function(){
				if(this.myId in this.players){
					return true
				}
				return false
			},
			noPlayer: function(){
				return _.isEmpty(this.players)
			}
		},
		methods: {
			ready(){
				this.$socket.emit('ready')
			}
		}
	}

</script>

<style lang="less" scoped>
	@import "../assets/css/style-lobby.less";
</style>