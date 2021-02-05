<template>
	<div id="log">
		<form v-on:submit.prevent="connecting">
			<input ref="pseudo" type="text" placeholder="Pseudo" maxlength="15" v-model="pseudo" /><br/>
			<button @click.prevent="connecting">Connexion</button>
		</form>
	</div>
</template>

<script>
	export default {
		data() {
			return {
				pseudo: '',
				// socket : this.$io(url, connectionOptions)
			}
		},
		methods: {
			connecting(e) {
				// e.preventDefault();
				let tmpPseudo = this.pseudo.replace(/[^a-zA-Z0-9]+/g, "-");
				
				if((tmpPseudo.length > 2) && (tmpPseudo.length < 15)){
					this.$socket.emit('connection', tmpPseudo)
				}else{
					console.log('Oups pseudo is :', this.pseudo.length)
				}
			}
		},
		mounted() {
			this.$refs.pseudo.focus()
		}
	}
</script>

<style lang="less">
</style>