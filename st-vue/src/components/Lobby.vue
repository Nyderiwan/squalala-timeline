<template>
	<div id="lobby">
		
		<img alt="Vue logo" src="https://pm1.narvii.com/6972/43bf0ef4cda1eae43d1e46db1519e7cb5f262636r1-500-375v2_00.jpg" /><br/>

		<p>
			<a href="https://vitejs.dev/guide/features.html" target="_blank">Vite Documentation</a> | 
			<a href="https://v3.vuejs.org/" target="_blank">Vue 3 Documentation</a>
		</p>

		<h2>Hello <strong>{{ pseudo }}</strong></h2>

		<div class="players_list">
			<ul>
				<li v-for="player in orderedPlayers">{{ player.pseudo }}
					<span class="ready">
						<span v-if="player.ready">Prêt</span>
						<strong v-else>En attente</strong>
					</span>
				</li>
			</ul>
		</div>

		<div class="player_bloc">
			<p><button @click.prevent="ready">{{ label_ready }}</button></p>
		</div>
	</div>

</template>

<script>
	import _ from 'lodash'

	export default {
		props: {
			pseudo: String,
			players: Object,
		},
		mounted() {
		},
		computed: {
			label_ready: function(){
				let tmp = 'Ready ?'
				if(this.players[this.$socket.id].ready){
					tmp = 'I\'m not ready'
				}				
				return tmp 
			},
			orderedPlayers: function() {
				return _.orderBy(this.players, 'pseudo')
			}
		},
		methods: {
			ready(){
				this.$socket.emit('ready')
			}
		}
	}
</script>


<style lang="less">	
	#test_drag{
		position: fixed;
		left: 150px;
		bottom:0;

		height: 150px;
		width: 100px;

		touch-action: none;
		padding: 30px;
		background: white;
		border: solid 2px grey;

		padding-top:30px;

		.handle{
			position:absolute;
			top: 0;
			left: 0;
			width: 100%;
			background:red;
			height: 25px;
		}
	}
</style>