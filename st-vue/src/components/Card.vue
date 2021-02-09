<template>

	<div class="card_item" :class="{locked:reveal}" :data-card-id="card.id">
		
		<div class="thumb_wrap">
			<img :src="card.thumbnail">
		</div>
		
		<div class="card_handle"></div>
		<div class="card_zoom" @click="zoomCard" >
			<Svg name="plus"></Svg>
		</div>

		<template v-if="reveal">
			
			<div class="reveal_content">
				<span class="date">{{ card.date_text }}</span>				
			</div>
		</template>

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
		methods: {
			zoomCard(){
				this.$emit('zoomcard', this.card, this.reveal);
			}
		}
	}
	// @import "../assets/css/style-game.less";


	/*
		<span class="info">{{ card.date_info }}</span>
		<div class="position">{{ card.position }}</div>

	*/
</script>

<style lang="less" scoped>
</style>