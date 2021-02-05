<template>
	<component :is="name"></component>
</template>

<script>
	import beer from "./svg/beer.vue"
	import skull from "./svg/skull.vue"
	import history from "./svg/history.vue"
	import logo from "./svg/logo.vue"
	import polaroid from "./svg/polaroid.vue"
	import reset from "./svg/reset.vue"
	import plus from "./svg/plus.vue"

	export default {
		props: {
			name: String
		},
		components: {
			beer, 
			skull, 
			history, 
			logo, 
			polaroid, 
			reset,
			plus
		},
	}
</script>

<style scoped>	
	svg{
		width: 150px;
		height: auto;
		fill:#000;
	}
</style>