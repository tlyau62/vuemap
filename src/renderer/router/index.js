import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router);

export default new Router({
    routes: [
        {
            path: '/',
            name: 'landing-page',
            component: require('@/components/LandingPage').default
        },
        {
            path: '/newmap',
            name: 'new-map-page',
            component: require('@/components/NewMapPage').default
        },
        {
            path: '/map/:name',
            name: 'map-page',
            component: require('@/components/MapPage').default
        },
        {
            path: '*',
            redirect: '/'
        }
    ]
})
