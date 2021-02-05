<template>
	<div>
		<h2>GG les boloss</h2>
		<div class="score_list">
			<div class="player_item" v-for="player in orderedPlayers">
				<span v-if="player.cards.length === 0">WINNER</span>
				• <strong>{{ player.pseudo }}</strong>
				<span v-if="player.cards.length > 0"><em>{{ player.cards.length }} carte(s)</em></span>
					<hr>
			</div>
		</div>
	</div>
	<button @click="backtoLobby">Retourner au lobby</button>
</template>


<script>
	import _ from 'lodash'

	export default {
		props: {
			players: Object
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