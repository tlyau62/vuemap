<template>
    <div id="wrapper">
        <header>
            <a @click="goBack">Go back!!!</a>
            <p>map name:{{$route.params.name}}, location: {{location}}</p>
        </header>

        <div class="container-fluid">
            <div class="row">
                <div id="map" class="col-10"></div>
                <map-layers class="col"></map-layers>
            </div>

        </div>
    </div>
</template>

<script>
    import L from 'leaflet'
    import 'leaflet/dist/leaflet.css'
    import 'leaflet-draw'
    import 'leaflet-draw/dist/leaflet.draw.css'
    import MapLayers from './MapPage/MapLayers'

    export default {
        name: 'map-page',

        components: {MapLayers},

        data() {
            return {};
        },

        computed: {
            location() {
                return L.latLng(this.$route.query).toString();
            }
        },

        mounted() {
            const self = this;
            const mapName = self.$route.params.name;
            const location = L.latLng(self.$route.query);

            const map = L.map('map').setView(location, 15);

            // add tile
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // fix marker
            fixMarkerIcon();

            // add draw
            let drawnItems = L.featureGroup().addTo(map);
            addDraw(drawnItems, map);

            function fixMarkerIcon() {
                delete L.Icon.Default.prototype._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
                    iconUrl: require('leaflet/dist/images/marker-icon.png'),
                    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
                });
            }

            function addDraw(editableLayers, map) {

                map.addControl(new L.Control.Draw({
                    edit: {
                        featureGroup: drawnItems,
                        poly: {
                            allowIntersection: false
                        }
                    },
                    draw: {
                        polygon: {
                            allowIntersection: false,
                            showArea: true
                        }
                    }
                }));

                map.on(L.Draw.Event.CREATED, function (event) {
                    var layer = event.layer;

                    drawnItems.addLayer(layer);
                });

            }
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
    header {
        height: 10vh;
    }

    #map {
        height: 90vh;
    }
</style>
