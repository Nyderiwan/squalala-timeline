<template>

	<transition name="score">
		<div id="scoreboard" v-show="scoreShow" key="scoreboard">
			<header>Fin de la partie</header>
			<div class="content">
				<div class="left">
					<div class="podium">
						<div class="cup"><Svg name="cup"></Svg></div>
						<div class="pod_list">
							<div class="player_item" v-for="player in podiumPlayers">{{ player.pseudo }}</div>
						</div>
					</div>

					<template v-for="player in orderedPlayers">
						<div class="player_item" v-if="player.cards.length > 0" :key="player">
							<span class="pseudo">{{ player.pseudo }}</span>
							<span class="score">{{ player.cards.length }} carte(s)</span>
						</div>
					</template>

				</div>
			</div>
			<button class="btn_backLobby" @click="backtoLobby">Retourner au lobby</button>
			<button class="btn_showgame" @click="scoreShow = !scoreShow">Voir les cartes</button>
		</div>
	</transition>

	<div class="scoreboard_btn" @click="scoreShow = !scoreShow" :class="{show: scoreShow}"><Svg name="cup"></Svg></div>
	
	<div class="overlay-scoreboard" :class="{show: scoreShow}" @click="scoreShow = !scoreShow"></div>

</template>

<script>
	import _ from 'lodash'

	import scoreboardSound from '../assets/sound/scoreboard_sound.mp3'

	let winSound = new Audio(scoreboardSound)
		winSound.volume = 0.5;

	export default {
		emits: ["goLobbyGame"],
		props: {
			players: Object
		},
		data(){
			return {
				scoreShow: false
			}
		},
		methods: {
			backtoLobby(){
				this.$emit('goLobbyGame');
			}
		},
		computed: {
			orderedPlayers: function() {
				return _.orderBy(this.players, function(player){
					return player.cards.length;
				}, ['asc']);
			},
			podiumPlayers: function() {
				let newArr = []
				for(let k in this.players){
					if(this.players[k].cards.length === 0){
						newArr.push(this.players[k])
					}
				}
				return newArr
			}
		},
		mounted(){
			// PLAY SOUND
			winSound.play()
			// Show Scores
			this.scoreShow = true
		}
	}
</script>
<style lang="less" scoped>
	@import "../assets/css/style-scoreboard.less";
</style>