import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'


Vue.config.productionTip = false
import axios from "axios";
Vue.prototype.$http = axios;

new Vue({
  vuetify,
  render: h => h(App)
}).$mount('#app')
