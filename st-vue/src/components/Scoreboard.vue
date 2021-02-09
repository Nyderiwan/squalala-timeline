<template>
	<div id="scoreboard">
		<h2>GG les boloss</h2>
		<div class="score_list">
			<div class="player_item" v-for="player in orderedPlayers">
				<span v-if="player.cards.length === 0">WINNER</span>
				• <strong>{{ player.pseudo }}</strong>
				<span v-if="player.cards.length > 0"><em>{{ player.cards.length }} carte(s)</em></span>
					<hr>
			</div>
		</div>
		<button @click="backtoLobby">Retourner au lobby</button>

		<div id="history">
			<header class="history_head">Historique</header>
			<div id="history_inner">
				<div v-for="log in history" class="log_item" :class="'log_'+log.type">
					<span class="player" v-show="log.player !== null">{{ log.player }}</span>
					<span class="log">{{ log.log }}</span>
					<span class="card" v-show="log.card !== null">{{ log.card }}</span>
				</div>
			</div>
		</div>
			
	</div>
</template>


<script>
	import _ from 'lodash'

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
			}
		}
	}
</script>

<style lang="less" scoped>
	@import "../assets/css/style-scoreboard.less";
</style>