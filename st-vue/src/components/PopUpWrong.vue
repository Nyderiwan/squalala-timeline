<template>
	<div id="popUpWrong">
		<div class="popup_inner">
			<h3>Oups</h3>
			<h4>c'est raté</h4>

			<div class="popup_content_wraper">
				<div class="image">
					<img :src="image_url">
				</div>

				<div class="content">
					<div class="name">{{ card.name }}</div>
					<div class="date">{{ date_format }}</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
	import $ from "jquery"
	import dayjs from 'dayjs'
	import 'dayjs/locale/fr'
	dayjs.locale('fr')

	export default {
		props: {
			card: Object,
			settings: Object,
		},
		data(){
			return {
				sizeInterval: null
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
					return 'http://localhost:8082/' + this.card.image
				}else{
					// BUILD
					return this.card.image
				}
			}
		}
	}
</script>