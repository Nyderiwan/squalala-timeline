import { createApp } from 'vue'
import App from './App.vue'
import Svg from './components/SvgIcon.vue'

// check URL - redirect if BAD room ID
const regex = new RegExp('^\/[0-9a-zA-Z]{8}$')
let getUrl = window.location;
let baseUrl = getUrl.origin;
let namespace = getUrl.pathname

if(namespace.length > 1  && !regex.test(namespace))	window.location.replace(baseUrl);

const app = createApp(App)
app.component('Svg', Svg)
app.mount('#app')
