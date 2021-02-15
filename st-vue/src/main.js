import { createApp } from 'vue'
import App from './App.vue'
import { io } from 'socket.io-client'

/*
import.meta.env.MODE
=>  development or  production
*/

let socket

// DEV
if(import.meta.env.MODE === "development" ){
	socket = io('localhost:8082', {
		"force new connection" : true,
		"reconnectionAttempts": "Infinity",
		"timeout" : 10000,
		"transports" : ["websocket"]
	})
}

// BUILD
if(import.meta.env.MODE === "production" ){
	socket = io.connect({
		forceNew:true,
		reconnection: true,
		reconnectionDelay: 500,
		reconnectionDelayMax : 5000,
		reconnectionAttempts: 99999
	});
}

import jQuery from "jquery";
import Svg from './components/SvgIcon.vue'

const app = createApp(App)

	app.component('Svg', Svg)
	app.config.globalProperties.$socket = socket
	app.config.globalProperties.$jquery = jQuery
	app.mount('#app')


