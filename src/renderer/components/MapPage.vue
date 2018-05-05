<template>
    <div id="wrapper">
        <header>
            <a @click="goBack">Go back</a>
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
                drawnItems: L.featureGroup(),
                idLookup: {}
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
            const mapName = this.$route.params.name;
            const location = L.latLng(self.$route.query);

            const map = L.map('map').setView(location, 15);

            // add tile
            const baseTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            const previewTile = L.tileLayer(`http://localhost:20008/tile/${mapName}/{z}/{x}/{y}.png?updated=${new Date().getTime()}`, {
                minZoom: 0,
                maxZoom: 18
            });

            L.control.layers({drawnItems: this.drawnItems, previewTile}).addTo(map);

            // render preview
            map.on('baselayerchange', (e) => {
                previewTile.setUrl(`http://localhost:20008/tile/${mapName}/{z}/{x}/{y}.png?updated=${new Date().getTime()}`);
            });

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

                map.on(L.Draw.Event.EDITED, (e) => {
                    const layers = e.layers._layers;
                    const idLookup = self.idLookup;

                    for (let key in layers) {
                        if (!layers.hasOwnProperty(key)) {
                            continue;
                        }
                        self.editFeature(idLookup[key].id, layers[key], idLookup[key].type);
                    }
                });

                map.on(L.Draw.Event.DELETED, (e) => {
                    const layers = e.layers._layers;
                    const idLookup = self.idLookup;

                    for (let key in layers) {
                        if (!layers.hasOwnProperty(key)) {
                            continue;
                        }
                        db.query(`
                            delete from feature
                            where id = ${idLookup[key].id};
                        `);
                    }
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

            editFeature(id, layer, layerType) {
                db.query(`
                    update feature
                    set geom = ${this.layerToGeomText(layer, layerType === 'LineString' ? 'polyline' : 'polygon')}
                    where id = ${id}
                `);
            },

            async loadFeatures() {
                const features = (await db.query(`
                    select id, st_asgeojson(geom) as geom
                    from feature;
                `)).rows;

                features.forEach(feature => {
                    const id = feature.id;
                    const geom = JSON.parse(feature.geom);
                    let coordinates = geom.coordinates;
                    let g;

                    if (geom.type === 'LineString') {
                        coordinates = coordinates.map(latlng => [latlng[1], latlng[0]]);
                        g = L.polyline(coordinates).addTo(this.drawnItems);
                    } else if (geom.type === 'Polygon') {
                        coordinates = coordinates[0].map(latlng => [latlng[1], latlng[0]]);
                        g = L.polygon(coordinates).addTo(this.drawnItems);
                    }

                    this.idLookup[g._leaflet_id] = {id, type: geom.type};
                });

                // L.geoJSON(features.map(feature => JSON.parse(feature.geom))).addTo(this.drawnItems);
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
