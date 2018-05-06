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
                        self.editFeature(idLookup[key].id, layers[key], idLookup[key].geom_type);
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
                const latlngs = layer._latlngs;
                const latlng = layer._latlng;
                const radius = layer._mRadius;

                // decide geomtype
                if (layerType === 'polyline') {
                    geomType = 'LINESTRING';
                } else if (layerType === 'circle') {
                    geomType = 'POINT';
                } else {
                    geomType = 'POLYGON';
                }

                // create geomtext
                if (layerType === 'polyline') {
                    geomText = latlngs
                        .map(latlng => `${latlng.lng} ${latlng.lat}`).join();

                    return `ST_GeomFromText('${geomType}(${geomText})', 4326)`;
                } else if (layerType === 'polygon' || layerType === 'rectangle') {
                    geomText = latlngs[0]
                        .map(latlng => `${latlng.lng} ${latlng.lat}`).join();
                    geomText += (',' + latlngs[0][0].lng + ' ' + latlngs[0][0].lat);
                    geomText = '(' + geomText + ')';

                    return `ST_GeomFromText('${geomType}(${geomText})', 4326)`;
                } else if (layerType === 'circle') {
                    geomText = latlng.lng + ' ' + latlng.lat;

                    return `ST_Buffer(ST_GeomFromText('${geomType}(${geomText})', 4326)::geography, ${radius})::geometry`
                }

            },

            layerToLatlngs(layer, layerType) {
                let result;
                if (layerType === 'polyline') {
                    result = layer._latlngs
                        .map(latlng => `{${latlng.lat}, ${latlng.lng}}`)
                        .join()
                } else if (layerType === 'polygon' || layerType === 'rectangle') {
                    result = layer._latlngs[0]
                        .map(latlng => `{${latlng.lat}, ${latlng.lng}}`)
                        .join()
                } else if (layerType === 'circle') {
                    result = `{${layer._latlng.lat}, ${layer._latlng.lng}}`
                }

                return '{' + result + '}';

                // console.log(layer);
                // console.log(layerType);
            },

            async saveFeature(layer, layerType) {
                let sql;
                if (layerType === 'circle') {
                    sql = `
                        insert into feature(latlngs, radius, geom_type, geom)
                        values ('${this.layerToLatlngs(layer, layerType)}', ${layer._mRadius}, '${layerType}', ${this.layerToGeomText(layer, layerType)})
                        returning id;
                    `
                } else {
                    sql = `
                        insert into feature(latlngs, geom_type, geom)
                        values ('${this.layerToLatlngs(layer, layerType)}', '${layerType}', ${this.layerToGeomText(layer, layerType)})
                        returning id;
                    `
                }

                const rows = (await db.query(sql)).rows;
                this.idLookup[layer._leaflet_id] = {id: rows[0].id, geom_type: layerType};
            },

            editFeature(id, layer, layerType) {
                let sql;
                if (layerType === 'circle') {
                    sql = `
                        update feature
                        set latlngs = '${this.layerToLatlngs(layer, layerType)}',
                            radius = ${layer._mRadius},
                            geom = ${this.layerToGeomText(layer, layerType)}
                        where id = ${id}
                    `;
                } else {
                    sql = `
                        update feature
                        set latlngs = '${this.layerToLatlngs(layer, layerType)}',
                            geom = ${this.layerToGeomText(layer, layerType)}
                        where id = ${id}
                    `;
                }
                db.query(sql);
            },

            async loadFeatures() {
                const features = (await db.query(`
                    select id, latlngs, radius, geom_type
                    from feature;
                `)).rows;
                let geom;

                features.forEach(feature => {
                    const {id, latlngs, radius, geom_type} = feature;

                    if (geom_type === 'circle') {
                        // console.log(feature.latlngs);
                        // console.log(radius);
                        geom = L.circle(latlngs[0], {radius: radius}).addTo(this.drawnItems);
                    } else {
                        geom = L[geom_type](latlngs).addTo(this.drawnItems);
                    }

                    this.idLookup[geom._leaflet_id] = {id, geom_type};
                });

                // features.forEach(feature => {
                //     const id = feature.id;
                //     const geom = JSON.parse(feature.geom);
                //     let coordinates = geom.coordinates;
                //     let g;
                //
                //     if (geom.type === 'LineString') {
                //         coordinates = coordinates.map(latlng => [latlng[1], latlng[0]]);
                //         g = L.polyline(coordinates).addTo(this.drawnItems);
                //     } else if (geom.type === 'Polygon') {
                //         coordinates = coordinates[0].map(latlng => [latlng[1], latlng[0]]);
                //         g = L.polygon(coordinates).addTo(this.drawnItems);
                //     }
                //
                //     this.idLookup[g._leaflet_id] = {id, type: geom.type};
                // });

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
