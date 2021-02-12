<template>

	<div id="scoreboard">
		<div class="scoreboard_inner">

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

				<div class="right">
					<div id="history">
						<header class="history_head">Historique</header>
						<div id="history_inner">
							<div v-for="log in history" class="log_item" :class="'log_'+log.type" :key="log">
								<span class="player" v-show="log.player !== null">{{ log.player }}</span>
								<span class="log">{{ log.log }}</span>
								<span class="card" v-show="log.card !== null">{{ log.card }}</span>
							</div>
						</div>
					</div>
				</div>
			</div>				
			<button class="btn_backLobby" @click="backtoLobby">Retourner au lobby</button>
			<div class="bg_icon"><Svg name="polaroid"></Svg></div>
		</div>
	</div>

</template>

<script>
	import _ from 'lodash'

	let winSound = new Audio('https://www.zapsplat.com/wp-content/uploads/2015/sound-effects-55112/zapsplat_multimedia_alert_notification_bold_strong_musical_positive_success_001_61629.mp3')
		winSound.volume = 0.5;

	export default {
		props: {
			players: Object,
			history: Array
		},
		methods: {
			backtoLobby(){
				this.$emit('backfnct');
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
		}
	}
</script>

<style lang="less" scoped>
	@import "../assets/css/style-scoreboard.less";
</style>