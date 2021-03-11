<template>
	<div class="card_item" :class="{locked:reveal}" :data-card-id="card.id">
		
		<div class="thumb_wrap">
			<img :src="image_url">
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
	import dayjs from 'dayjs'
	import 'dayjs/locale/fr'
	dayjs.locale('fr')

	export default {
		props: {
			card: Object,
			settings: Object,
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
				if(this.settings.isDate){
					if(this.settings.dateFormat){
						return dayjs(this.card.date).format(this.settings.dateFormat)
					}else{
						return dayjs(this.card.date).format('DD/MM/YYYY')
					}
				}else{
					return this.card.date
				}
			},
			image_url: function(){
				if(import.meta.env.MODE === "development" ){
					// DEV
					return 'http://localhost:8082/' + this.card.thumbnail
				}else{
					// BUILD
					return this.card.thumbnail
				}
			}
		},
		methods: {
			zoomCard(){
				this.$emit('zoomcard', this.card, this.reveal);
			}
		}
	}
</script>