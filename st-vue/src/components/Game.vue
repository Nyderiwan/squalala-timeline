<template>
	<div id="game_app">

		<div id="header" :class="{myturn: isItMyTurn}">
			<div class="logo">
				<Svg name="logo"></Svg>
			</div>

			<div class="players">
				<div v-for="player in players" @click="showPlayerCards" class="player_item"
				:class="{playing : player.id==currentPlayer, you : player.id==myId}" >					
					<div class="player_inner">						
						<div class="pseudo">{{ player.pseudo }}</div>
						<div class="score"><span>{{ player.cards.length }}</span></div>
					</div>
				</div>
			</div>
		</div>

		<div id="middle">
			<div id="game_board_wrapper">
				<div id="game_board" :key="renderKey">
					<Card v-for="card in boardCards" :card="card" reveal @zoomcard="zoomCard"></Card>
				</div>
			</div>
		</div>

		<div id="bottom">

			<div id="history">
				<header class="history_head">Historique</header>
				<div class="history_inner">
					<div v-for="log in history" class="log_item" :class="'log_'+log.type">
						<span class="player">{{ log.player }}</span>
						<span class="log">{{ log.log }}</span>
						<span class="card">{{ log.card }}</span>
					</div>
				</div>
			</div>

			<div id="bottom_right">

				<button class="discard_btn" @click="showDiscard" >
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
				
				<h2 class="mycards_title">Vos souvenirs à placer</h2>

				<div id="my_cards_wrap">
					<div id="my_cards" :key="renderKey">
						<Card v-for="card in myCards" :card="card" @zoomcard="zoomCard"></Card>
					</div>
				</div>

			</div>
		</div>

	</div>

	<div id="popup" :class="{reveal: popUp.reveal}"	v-if="popUp.card != null" v-show="popUp.show" @click="closePopup">
		<div class="polaroid">
			
			<div class="image">
				<!-- <img :src="popUp.card.image"> -->
				<img src="https://www.ecranlarge.com/media/cache/1600x1200/uploads/image/001/175/star-wars-lascension-de-skywalker-affiche-saga-1175304.jpg">
			</div>

			<div class="content">
				<div class="name">{{ popUp.card.name }}</div>
				
				<template v-if="popUp.reveal">
					<div class="date">{{ popUp.card.date_text }}</div>
					<div class="info">{{ popUp.card.date_info }}</div>
				</template>
			</div>

		</div>
	</div>

</template>

<script>
	import Card from './Card.vue'
	import $ from "jquery"
	import Sortable from 'sortablejs'

	let socket, _this

	let sound = new Audio('https://www.zapsplat.com/wp-content/uploads/2015/sound-effects-55112/zapsplat_multimedia_game_sound_high_pitched_generic_tone_digital_003_61659.mp3')
		sound.volume = 0.5;

	export default {
		props: {
			players: Object,
			myCards: Array,
			boardCards: Array,
			history: Array,
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
				popUp:{
					show: true,
					card: null,
					reveal : false
				},
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

				if(this.isItMyTurn) this.BOARDSTACK.option("disabled", false);

				this.placeCard = false
			},
			destroySortable(){
				this.renderKey += 1;

				return new Promise(function(resolve, reject) {
					_this.PLAYERSTACK.destroy()
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

				setTimeout(function(){
					let tmpW = $('.polaroid .image img').width() + 60
					if(!isNaN(tmpW) && tmpW > 0 ){
						$('.polaroid').css('width', tmpW);
					}
				}, 10);
			},
			closePopup(){
				this.popUp.show = false
			},
			showPlayerCards(){
				alert('test PLAYER\'s Cards')
			},
			showDiscard(){
				alert('test DISCARD')
			}
		},
		created(){
			socket = this.$socket
			_this = this
			this.myId = socket.id
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
			}
		},
		mounted(){
			// if you're the start player
			if(this.currentPlayer === socket.id) this.isItMyTurn = true

			this.initSortable()

			$(document).on("mousemove",function(e){
				var ax = -($(window).innerWidth()/4- e.pageX)/150;
				var ay = ($(window).innerHeight()/4- e.pageY)/150;
				$(".polaroid").css({
					'transform': '"transform: translateX(-50%) rotateY("+ax+"deg) rotateX("+ay+"deg)',
					'-webkit-transform': "translateX(-50%) rotateY("+ax+"deg) rotateX("+ay+"deg)",
					'-moz-transform': "translateX(-50%) rotateY("+ax+"deg) rotateX("+ay+"deg)",
				});
			});
		},
		components: {
			Card
		}
	}

</script>