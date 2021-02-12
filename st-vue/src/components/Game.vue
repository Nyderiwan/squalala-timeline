<template>
	<div id="game_app">
		<div id="header" :class="{myturn: isItMyTurn}">
			<div class="logo">
				<Svg name="logo"></Svg>
			</div>

			<div class="players">
				<div v-for="player in players" @click="showPlayerCards(player.id)" class="player_item"
				:class="{playing : player.id==currentPlayer, you : player.id==myId}" >					
					<div class="player_inner">						
						<div class="pseudo">{{ player.pseudo }}</div>
						<div class="score"><span>{{ player.cards.length }}</span></div>
					</div>
				</div>
			</div>
		</div>

		<div id="middle">
			<div id="game_board_wrapper" class="horizon_scroll">
				<div id="game_board" :key="renderKey">
					<Card v-for="card in boardCards" :card="card" reveal @zoomcard="zoomCard" :key="card.id"></Card>
				</div>
			</div>
		</div>

		<div id="bottom">

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

			<div id="bottom_right">

				<button class="discard_btn" @click="showDiscard" v-show="discard.length">
					<Svg name="skull"></Svg>
				</button>
				
				<div id="game_tools" v-if="isItMyTurn">
					<h3>C'est ton tour !</h3>
					<div class="place_btns" v-if="placeCard">
						<button class="validate_btn" @click.prevent="validate">Valider</button>
						
						<button class="reset_btn" @click.prevent="cancel">
							<Svg name="reset"></Svg>
						</button>
					</div>
				</div>

				<template v-if="isPlayer">
					<h2 class="mycards_title">Vos souvenirs à placer</h2>

					<div id="my_cards_wrap" class="horizon_scroll">
						<div id="my_cards" :key="renderKey">
							<Card v-for="card in myCards" :card="card" @zoomcard="zoomCard" :key="card.id"></Card>
						</div>
					</div>
				</template>

				<template v-else>
					<div class="spectator_info">
						<h2>Vous êtes spectateur de la partie</h2>
					</div>
				</template>

			</div>
		</div>

		<Popup v-if="popUp.show && popUp.card != null" 
			:card="popUp.card"
			:reveal="popUp.reveal"
			:close="closePopup"
		></Popup>

		<div id="discard_pile" v-if="discard.length" :class="{open: show_discardPile}">
			<Card v-for="discard in lastDiscards" :card="discard" reveal @zoomcard="zoomCard"></Card>
			<div class="discard_title">Défausse</div>
		</div>

		<div id="player_pile" v-if="playerCards.cards.length" :class="{open: show_playerPile}">
			<div class="playerCards_title">Cartes de {{ playerCards.pseudo }}</div>
			<div class="player_stack_wrapper">
				<Card 
					v-for="card in playerCards.cards" 
					:card="card" 
					@zoomcard="zoomCard"
					:style="randomDeg"
				></Card>
			</div>
		</div>
		
		<div class="overlay" @click="closeAddPanel" v-show="show_overlay"></div>
	</div>
</template>

<script>
	import Card from './Card.vue'
	import Popup from './PopUp.vue'
	import $ from "jquery"
	import Sortable from 'sortablejs'

	let socket, _this, shouldScroll = false

	let sound = new Audio('https://www.zapsplat.com/wp-content/uploads/2015/sound-effects-55112/zapsplat_multimedia_game_sound_high_pitched_generic_tone_digital_003_61659.mp3')
		sound.volume = 0.5;

	export default {
		props: {
			players: Object,
			myCards: Array,
			boardCards: Array,
			history: Array,
			discard: Array,
			currentPlayer: String
		},
		data() {
			return {
				renderKey: 0,
				isItMyTurn: false,
				myId: null,
				placeCard: false,
				BOARDSTACK: null,
				PLAYERSTACK: null,
				playerCards: {
					pseudo: '',
					cards: []
				},
				popUp:{
					show: true,
					card: null,
					reveal : false
				},
				show_discardPile: false,
				show_overlay: false,
				show_playerPile: false
			}
		},
		computed: {
			lastDiscards: function(){
				return this.discard.slice(-3)
			},
			isPlayer: function(){
				if(this.myId in this.players){
					return true
				}
				return false
			},
			randomDeg: function(){
				let max = 20
				let rand = Math.ceil(Math.random() * max) * (Math.round(Math.random()) ? 1 : -1)
        		return { transform: 'rotate(' + rand + 'deg)'}
			}
		},
		methods: {
			initSortable(){
				this.BOARDSTACK = Sortable.create(document.getElementById('game_board'), {
					group: {
						name:'shared',
						pull: false
					},
					sort: false,
					direction: 'horizontal',
					swapThreshold: 0.5,
					filter: '.card_item',
					forceFallback: true,
					disabled: true,
					handle: '.card_handle'
				});

				if(_this.isPlayer){
					this.PLAYERSTACK = Sortable.create(document.getElementById('my_cards'), {
						group: 'shared',
						dataIdAttr: 'data-card-id',
						direction: 'horizontal',
						swapThreshold: 0.5,
						forceFallback: true,
						dragoverBubble: true,
						handle: '.card_handle',
						onStart: function() {
							let tmpW = $('#history').width() + 2;
							$('#history').css('max-width', tmpW);
						},
						onEnd: function (evt) {
							$('#history').css('max-width', '');
							if(evt.to.id=="game_board") _this.play()
						}
					});
				}

				if(this.isItMyTurn) this.BOARDSTACK.option("disabled", false);

				this.placeCard = false
			},
			destroySortable(){
				this.renderKey += 1;

				return new Promise(function(resolve, reject) {
					if(_this.isPlayer) _this.PLAYERSTACK.destroy()
					_this.BOARDSTACK.destroy()
					resolve(true)
				});
			},
			play(){
				this.placeCard = true
				this.BOARDSTACK.option("disabled", true);
				// $('#game_board .card_item').removeClass('movable')
			},
			validate(){
				let orderCards = []
				$('#game_board .card_item').each(function(index){
					let tmp = $(this).data('card-id')
					orderCards.push(tmp)
				})
				socket.emit('played', orderCards)				
			},
			cancel(){
				this.restartSortable()
			},
			restartSortable(){
				this.destroySortable().then((test) => {
					if(test) this.initSortable()
				})
			},
			zoomCard(card, reveal){
				this.popUp.card = card
				this.popUp.reveal = reveal
				this.popUp.show = true
			},
			closePopup(){
				this.popUp.show = false
			},
			showPlayerCards(id){
				this.playerCards.pseudo = this.players[id].pseudo
				this.playerCards.cards = this.players[id].cards
				this.show_playerPile = true
				this.show_overlay = true

				setTimeout(function(){ 
					$('#player_pile .card_item').addClass('transition')
				}, 200);
			},
			showDiscard(){
				this.show_discardPile = true
				this.show_overlay = true
			},
			closeAddPanel(){
				this.show_discardPile = false
				this.show_playerPile = false
				this.show_overlay = false

				$('#player_pile .card_item').removeClass('transition')
			},
			scrollLogs(){
				let tar = document.getElementById('history_inner')
				tar.scrollTop = tar.scrollHeight
				shouldScroll = false
			}
		},
		created(){
			socket = this.$socket
			_this = this
			this.myId = socket.id
		},
		unmounted(){
			this.destroySortable()
		},
		watch: {
			boardCards: function(newVal, oldVal){
				this.restartSortable()
			},
			currentPlayer: function(newVal, oldVal){
				if(newVal != oldVal && newVal === socket.id){
					sound.play()
					this.isItMyTurn = true
				}else{
					this.isItMyTurn = false
				}
			},
			history: function(newVal, oldVal){
				if(newVal != oldVal){
					shouldScroll = true
				}
			}
		},
		updated: function(){
			if(shouldScroll) this.scrollLogs()
		},
		mounted(){
			// if you're the start player
			if(this.currentPlayer === socket.id) this.isItMyTurn = true

			this.initSortable()

			let scrollForce = 40
			$('.horizon_scroll').on('wheel', function(e) {
				if(e.originalEvent.deltaY > 0) this.scrollLeft += scrollForce
				else this.scrollLeft -= scrollForce
			})
		},
		components: {
			Card,
			Popup
		}
	}

</script>

<style lang="less">
	@import "../assets/css/style-game.less";
</style>