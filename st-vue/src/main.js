import { createApp } from 'vue'
import App from './App.vue'
import { io } from 'socket.io-client'

const connectionOptions =  {
	"force new connection" : true,
	"reconnectionAttempts": "Infinity",
	"timeout" : 10000,
	"transports" : ["websocket"]
};

const socket = io('localhost:3001', connectionOptions)

import jQuery from "jquery";
import Svg from './components/SvgIcon.vue'

const app = createApp(App)

	app.component('Svg', Svg)
	app.config.globalProperties.$socket = socket
	app.config.globalProperties.$jquery = jQuery
	app.mount('#app')


