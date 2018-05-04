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
    import 'leaflet-toolbar'
    import 'leaflet-toolbar/dist/leaflet.toolbar.css'
    import MapLayers from './MapPage/MapLayers'
    import MeasureToolbar from './MapPage/MeasureToolbar'
    import db from 'db/db'

    export default {
        name: 'map-page',

        components: {MapLayers},

        data() {
            return {
                drawnItems: L.featureGroup()
            };
        },

        async created() {
            await db.connect(this.$route.params.name);
            this.loadFeatures();
        },

        watch: {
            // call again the method if the route changes
            '$route': 'connectDb'
        },

        computed: {
            location() {
                return L.latLng(this.$route.query).toString();
            }
        },

        mounted() {
            const self = this;
            const location = L.latLng(self.$route.query);

            const map = L.map('map').setView(location, 15);

            // add tile
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // fix marker
            fixMarkerIcon();

            // measure toolbar
            new L.Toolbar2.MeasureToolbar({
                position: 'topleft'
            }).addTo(map);

            // add draw
            const drawnItems = this.drawnItems.addTo(map);
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

                map.on(L.Draw.Event.CREATED, (e) => {
                    const layer = e.layer;
                    const layerType = e.layerType;

                    // draw layer
                    drawnItems.addLayer(layer);

                    console.log(e);

                    // save to db
                    self.saveFeature(layer, layerType);
                });

                map.on(L.Draw.Event.DELETED, (e) => {
                    console.log(e);
                });

            }
        },
        methods: {
            async goBack() {
                await db.endPool();
                window.history.length > 1
                    ? this.$router.go(-1)
                    : this.$router.push('/');
            },

            layerToGeomText(layer, layerType) {
                let geomType, geomText;

                // decide geomtype
                if (layerType === 'polyline') {
                    geomType = 'LINESTRING';
                } else if (layerType === 'circle') {
                    geomType = 'POINT';
                } else {
                    geomType = 'POLYGON';
                }

                // create geomtext
                if (Array.isArray(layer._latlngs)) { // line, polygon
                    const latlngs = layer._latlngs;

                    geomText = latlngs
                        .map(latlng => {
                            if (!Array.isArray(latlng)) {
                                return latlng.lng + ' ' + latlng.lat;
                            } else {
                                return latlng.map(ll => ll.lng + ' ' + ll.lat).join()
                            }
                        }).join();

                    // close the line to form polygon
                    if (layerType !== 'polyline') {
                        geomText += (',' + latlngs[0][0].lng + ' ' + latlngs[0][0].lat);
                        geomText = '(' + geomText + ')';
                    }

                    return `ST_GeomFromText('${geomType}(${geomText})', 4326)`;
                } else { // circle
                    const latlng = layer._latlng;
                    const radius = layer._mRadius;
                    geomText = latlng.lng + ' ' + latlng.lat;
                    return `ST_Buffer(ST_GeomFromText('${geomType}(${geomText})', 4326)::geography, ${radius})::geometry`
                }

            },

            async saveFeature(layer, layerType) {
                const rows = await db.query(`
                    insert into feature(geom)
                    select ${this.layerToGeomText(layer, layerType)} as geom
                    returning id;
                `);

                console.log(rows);
            },

            async loadFeatures() {

                const features = (await db.query(`
                    select st_asgeojson(geom) as geom
                    from feature;
                `)).rows;

                L.geoJSON(features.map(feature => JSON.parse(feature.geom))).addTo(this.drawnItems);
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
