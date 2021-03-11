<template>
	<div id="lobby">
		<div class="lobby_inner">
			<header>
				<Svg name="beer"></Svg>
				<h2>Lobby</h2>
			</header>
			<div class="container">
				
				<div class="logo_bg"><Svg name="logo"></Svg></div>
				
				<div class="players_list">					
					<div v-for="player in orderedPlayers" class="player_item" :key="player">
						<div class="pseudo">{{ player.pseudo }}</div>
					</div>
					<div class="no_players" v-show="noPlayer">Aucun joueur</div>
				</div>
				
				<div class="admin_settings" v-if="admin === socket.id">

					<div class="admin_bloc">
						<label for="cards_number">Nombre de cartes :</label>
						<select id="cards_number" v-model="settings.cardsNmb">
							<option value="3">3</option>
							<option value="4" selected>4</option>
							<option value="5">5</option>
							<option value="6">6</option>
						</select>
					</div>

					<div class="admin_bloc">
						<label for="cards_deck">Cartes :</label>
						<select id="cards_deck" v-model="settings.deck">
							<option v-for="deck in decksList" :value="deck">{{ formatDeckName(deck) }}</option>
						</select>
					</div>

					<div class="admin_bloc">
						<button @click.prevent="startgame" class="start_btn">Commencer la partie</button>
					</div>
				</div>
				
				<div class="copyUrl_btn">
					<button @click.prevent="copyLink">Inviter des Lulus</button>
					<span key="url_copy">Lien d'invitation copié !</span>
				</div>

			</div>
		</div>
	</div>
</template>

<script>
	import _ from 'lodash'
	import $ from "jquery"

	export default {
		props: {
			players: Object,
			roomId: String,
			admin: String,
			decksList: Array,
			socket: Object
		},
		data(){
			return {
				settings: {
					cardsNmb: 4,
					deck: null
				}
			}
		},
		computed: {
			orderedPlayers: function() {
				return _.orderBy(this.players, 'pseudo')
			},
			noPlayer: function(){
				return _.isEmpty(this.players)
			}
		},
		methods: {
			copyLink(){
				let url = window.location.origin + this.roomId
				navigator.clipboard.writeText(url)
				$('.copyUrl_btn').addClass('copied')
				setTimeout(() => { $('.copyUrl_btn').removeClass('copied') }, 2000)
			},
			startgame(){
				if(this.settings.deck != null 
				   && this.players.constructor === Object
				   && Object.keys(this.players).length > 1 )
					this.socket.emit('startgame', this.settings)
			},
			formatDeckName(name){
				let tmpName = name.replace('-', ' ')				
				return tmpName
			}
		}
	}
</script>

<style lang="less" scoped>
	@import "../assets/css/style-lobby.less";
</style>