<template>
	<div id="popup" :class="{reveal: reveal}" @click="close">
		<div class="polaroid">			
			<div class="image">
				<img :src="image_url">
			</div>
			<div class="content" v-if="reveal">
				<div class="name">{{ card.name }}</div>
				<div class="date">{{ date_format }}</div>
			</div>
		</div>
	</div>
</template>

<script>

	import $ from "jquery"

	export default {
		props: {
			card: Object,
			reveal: Boolean,
			close: Function
		},
		data(){
			return {
				sizeInterval: null
			}
		},
		created: function(){
			this.sizeInterval =  setInterval(() => {
					let tmpW = $('.polaroid .image img').width() + 60
					if(!isNaN(tmpW) && tmpW > 60 ){
						$('.polaroid').css('width', tmpW)
						clearInterval(this.sizeInterval);
					}
				}, 25);
		},
		computed: {
			date_format: function() {
				let tmpdate = new Date(this.card.date)
				return tmpdate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
			},
			image_url: function(){
				if(import.meta.env.MODE === "development" ){
					// DEV
					return 'http://localhost:8082/' + this.card.image
				}else{
					// BUILD
					return this.card.image
				}
			}
		},
		unmounted(){
			clearInterval( this.sizeInterval )
		},
		mounted(){
			$(document).on("mousemove",function(e){
				var ax = -($(window).innerWidth()/4- e.pageX)/150;
				var ay = ($(window).innerHeight()/4- e.pageY)/150;
				$(".polaroid").css({
					'transform': '"transform: translateX(-50%) rotateY("+ax+"deg) rotateX("+ay+"deg)',
					'-webkit-transform': "translateX(-50%) rotateY("+ax+"deg) rotateX("+ay+"deg)",
					'-moz-transform': "translateX(-50%) rotateY("+ax+"deg) rotateX("+ay+"deg)",
				});
			});
		}
	}
</script>

<style lang="less" scoped>
	@import "../assets/css/style-zoom.less";
</style>