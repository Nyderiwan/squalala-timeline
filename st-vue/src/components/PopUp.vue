<template>
	<div id="popup" :class="{reveal: reveal}" @click="close">
		<div class="polaroid">			
			<div class="image">
				<img :src="card.image">
			</div>
			<div class="content">
				<div class="name">{{ card.name }}</div>
				
				<template v-if="reveal">
					<div class="date">{{ card.date_text }}</div>
					<div class="info">{{ card.date_info }}</div>
				</template>
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