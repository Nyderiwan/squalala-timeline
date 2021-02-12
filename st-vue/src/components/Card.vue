<template>
	<div class="card_item" :class="{locked:reveal}" :data-card-id="card.id">
		
		<div class="thumb_wrap">
			<img :src="image_url">
			<!-- <img :src="card.thumbnail"> -->
		</div>
		
		<div class="card_handle"></div>
		<div class="card_zoom" @click="zoomCard" >
			<Svg name="plus"></Svg>
		</div>

		<div v-if="reveal" class="reveal_content">
			<span class="date">{{ date_format }}</span>
			<span class="info">{{ card.name }}</span>
		</div>

	</div>
</template>

<script>
	export default {
		props: {
			card: Object,
			reveal: {
				default: false,
				type: Boolean
			}
		},
		data() {
			return {
			}
		},
		computed: {
			date_format: function() {
				let tmpdate = new Date(this.card.date)
				return tmpdate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
			},
			image_url: function(){
				return 'http://localhost:3001/' + this.card.thumbnail
			}
		},
		methods: {
			zoomCard(){
				this.$emit('zoomcard', this.card, this.reveal);
			}
		}
	}
</script>