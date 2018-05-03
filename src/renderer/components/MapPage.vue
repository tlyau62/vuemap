<template>
    <div id="wrapper">
        <a @click="goBack">Go back!</a>

        <div id="map"></div>
    </div>
</template>

<script>
    import L from 'leaflet'
    import 'leaflet/dist/leaflet.css'
    import db from 'db/db'

    export default {
        name: 'map-page',

        data() {
            return {
            };
        },

        mounted() {
            const self = this;

            const map = L.map('map').setView([22.4022, 114.1073], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
        },
        methods: {
            goBack() {
                window.history.length > 1
                    ? this.$router.go(-1)
                    : this.$router.push('/')
            }
        }
    }
</script>

<style>
    #map {
        height: 500px;
    }
</style>
