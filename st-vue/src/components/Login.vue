<template>
	<div id="login">

		<transition name="fading">
			<video class="bg_video" v-show="loadingVideo" autoplay loop muted key="videowave">
				<source src="/Abstract.mov" type="video/mp4">
			</video>
		</transition>

		<div id="login_bloc">
			<div class="header_logo">
				<Svg name="logo"></Svg>
			</div>

			<form v-on:submit.prevent="connecting" class="login" v-if="!tryreconnect">
				<input 
					ref="pseudo" 
					type="text" 
					placeholder="Pseudo" 
					maxlength="15" 
					v-model="pseudo" 
					autocomplete="false"
					spellcheck="false"
				/>
				<div class="error" v-show="errorMsg.length > 0">{{ errorMsg }}</div>
				<button @click.prevent="connecting">Connexion</button>
			</form>

			<div class="reconnect_loading" v-else>
				<h2>CHARGEMENT</h2>
			</div>

			<button class="spect_btn" @click="spectator">Je veux juste regarder <span>😎</span></button>
		</div>
		
	</div>
</template>

<script>
	export default {
		data() {
			return {
				pseudo: '',
				errorMsg:'',
				loadingVideo:false
			}
		},
		props: {
			tryreconnect: Boolean
		},
		methods: {
			connecting(e) {
				let tmpPseudo = this.pseudo.replace(/[^a-zA-Z0-9]+/g, "-")				
				if((tmpPseudo.length > 2) && (tmpPseudo.length < 16)){
					this.$socket.emit('connection', tmpPseudo)
					this.errorMsg = ""
				}else{
					if(tmpPseudo.length < 3) this.errorMsg = "Pseudo trop court :("
					if(tmpPseudo.length > 15) this.errorMsg = "Pseudo trop long :("
					this.$refs.pseudo.focus()
				}
			},
			spectator() {
				this.$socket.emit('spectator')
			}
		},
		mounted() {
			if(!this.tryreconnect) this.$refs.pseudo.focus()
			// Fake load to animate
			setTimeout(() => { this.loadingVideo = true }, 1000)
		}
	}
</script>

<style lang="less" scoped>
	@import "../assets/css/style-login.less";
</style>