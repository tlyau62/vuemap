<template>
    <div id="wrapper">
        <header>
            <button @click="goBack" class="btn btn-link">Back</button>
        </header>
        <div id="map"></div>
    </div>
</template>

<script>
    import L from 'leaflet'
    import 'leaflet/dist/leaflet.css'
    import 'leaflet-editable/src/Leaflet.Editable'
    import 'leaflet-toolbar'
    import 'leaflet-toolbar/dist/leaflet.toolbar.css'
    import 'leaflet-geometryutil/src/leaflet.geometryutil'
    import './MapPage/Toolbar/DrawToolbar/DrawToolbar'
    import './MapPage/Toolbar/EditToolbar/EditToolbar'
    import './MapPage/Toolbar/QueryToolbar/QueryToolbar'
    import './MapPage/Toolbar/PathToolbar/PathToolbar'
    import './MapPage/Toolbar/PathToolbar/PathInfoControl'
    import './MapPage/Control/MapInfo.js'
    import db from 'db/db'

    export default {
        name: 'map-page',

        data() {
            return {
                map: null,
                drawnItems: null,
                idLookup: {},
                isDraw: true
            };
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

            const map = this.map = L.map('map', {editable: true}).setView(location, 15);

            // fix marker
            fixMarkerIcon();

            // add map name to map
            map.mapName = mapName;
            map.mapLocation = location;

            // add drawn layer
            this.drawnItems = L.featureGroup().addTo(map);

            // add map control
            L.control.mapInfo({
                position: 'topright'
            }).addTo(map);

            // add tiles
            const baseTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            const previewTile = L.tileLayer(`http://localhost:20008/tile/${mapName}/{z}/{x}/{y}.png?updated=${new Date().getTime()}`, {
                minZoom: 0,
                maxZoom: 18
            });

            L.control.layers({drawnItems: this.drawnItems, previewTile}).addTo(map);

            map.on('baselayerchange', (e) => {
                previewTile.setUrl(`http://localhost:20008/tile/${mapName}/{z}/{x}/{y}.png?updated=${new Date().getTime()}`);
                this.toggleMode();
            });

            // add query toolbars
            // new L.Toolbar2.QueryToolbar({
            //     position: 'topleft'
            // }).addTo(map);

            // add draw, edit toolbars
            new L.Toolbar2.DrawToolbar({
                position: 'topleft'
            }).addTo(map);

            // add path toolbars
            new L.Toolbar2.PathToolbar({
                position: 'topleft'
            }).addTo(map);
            $('.path-toolbar').parent().hide();

            // add path control
            L.control.pathInfo({
                position: 'topright'
            }).addTo(map);
            $("#infoWrapper").hide();

            map.on('DRAW_ACTION.COMMIT', (e) => {
                const layer = e.layer;

                // add edit action
                layer.on('click', (e) => {
                    new L.Toolbar2.EditToolbar(e.latlng)
                        .addTo(this.map, layer);
                });

                // draw layer
                this.drawnItems.addLayer(layer);

                // save to db
                self.saveFeature(layer);
            });

            map.on('EDIT_ACTION.DELETE', (e) => {
                const layers = e.layers._layers;
                const idLookup = self.idLookup;

                for (let key in layers) {
                    if (!layers.hasOwnProperty(key)) continue;

                    this.drawnItems.removeLayer(layers[key]);

                    db.query(`
                        delete from feature
                        where id = ${idLookup[key].id};
                    `);
                }
            });

            map.on('EDIT_ACTION.SAVE', (e) => {
                const layers = e.layers._layers;
                const idLookup = self.idLookup;

                for (let key in layers) {
                    if (!layers.hasOwnProperty(key)) continue;
                    self.editFeature(idLookup[key].id, layers[key]);
                }
            });

            // load feature
            map.road = {};
            map.road.roadStartMarker = L.marker(location).addTo(map);
            map.road.drawnItems = this.drawnItems;
            this.loadFeatures();

            function fixMarkerIcon() {
                delete L.Icon.Default.prototype._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
                    iconUrl: require('leaflet/dist/images/marker-icon.png'),
                    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
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

            toggleMode() {
                this.isDraw = !this.isDraw;
                const drawToolbar = $('.draw-toolbar').parent();
                const pathToolbar = $('.path-toolbar').parent();

                if (this.isDraw) {
                    drawToolbar.show();
                    pathToolbar.hide();
                    this.drawnItems.addTo(this.map);
                    this.map.road.roadStartMarker.addTo(this.map);
                    for (let layer in this.map.path) {
                        if (!this.map.path.hasOwnProperty(layer) || !this.map.path[layer]) continue;
                        this.map.path[layer].remove();
                    }

                    $("#infoWrapper").hide();
                } else {
                    drawToolbar.hide();
                    pathToolbar.show();
                    this.drawnItems.remove();
                    this.map.road.roadStartMarker.remove();
                    for (let layer in this.map.path) {
                        if (!this.map.path.hasOwnProperty(layer) || !this.map.path[layer]) continue;
                        this.map.path[layer].addTo(this.map);
                    }
                    $("#infoWrapper").show();
                }
            },

            layerToGeomText(layer) {
                let geomType, geomText;
                const layerType = this.getLayerType(layer);
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

            layerToLatlngs(layer) {
                const layerType = this.getLayerType(layer);
                let result;
                if (layerType === 'polyline') {
                    result = layer._latlngs
                        .map(latlng => `{${latlng.lat}, ${latlng.lng}}`)
                        .join();
                } else if (layerType === 'polygon' || layerType === 'rectangle') {
                    result = layer._latlngs[0]
                        .map(latlng => `{${latlng.lat}, ${latlng.lng}}`)
                        .join();
                } else if (layerType === 'circle') {
                    result = `{${layer._latlng.lat}, ${layer._latlng.lng}}`;
                }

                return '{' + result + '}';
            },

            getLayerType(layer) {
                let type;
                if (layer instanceof L.Circle) {
                    type = 'circle';
                } else if ((layer instanceof L.Polyline) && !(layer instanceof L.Polygon)) {
                    type = 'polyline';
                } else if ((layer instanceof L.Polygon) && !(layer instanceof L.Rectangle)) {
                    type = 'polygon';
                } else if (layer instanceof L.Rectangle) {
                    type = 'rectangle';
                } else {
                    type = undefined;
                    console.log('error: getLayerType');
                }

                return type;
            },

            async saveFeature(layer) {
                const info = layer.info;
                const layerType = this.getLayerType(layer);

                let sql;
                if (layerType === 'circle') {
                    sql = `
                        insert into feature(latlngs, radius, geom_type, geom, type, name)
                        values ('${this.layerToLatlngs(layer)}', ${layer._mRadius}, '${layerType}', ${this.layerToGeomText(layer)}, '${info.type}', '${info.name}')
                        returning id;
                    `
                } else {
                    sql = `
                        insert into feature(latlngs, geom_type, geom, type, name)
                        values ('${this.layerToLatlngs(layer)}', '${layerType}', ${this.layerToGeomText(layer)}, '${info.type}', '${info.name}')
                        returning id;
                    `
                }

                const rows = (await db.query(sql)).rows;
                this.idLookup[layer._leaflet_id] = {id: rows[0].id, geom_type: layerType};
            },

            editFeature(id, layer) {
                const {name, type} = layer.info;
                const layerType = this.getLayerType(layer);
                let sql;
                if (layerType === 'circle') {
                    sql = `
                        update feature
                        set latlngs = '${this.layerToLatlngs(layer)}',
                            radius = ${layer._mRadius},
                            geom = ${this.layerToGeomText(layer)},
                            name = '${name}',
                            type = '${type}'
                        where id = ${id}
                    `;
                } else {
                    sql = `
                        update feature
                        set latlngs = '${this.layerToLatlngs(layer)}',
                            geom = ${this.layerToGeomText(layer)},
                            name = '${name}',
                            type = '${type}'
                        where id = ${id}
                    `;
                }
                db.query(sql);
            },

            async loadFeatures() {
                await db.connect(this.$route.params.name);

                const features = (await db.query(`
                    select id, latlngs, radius, geom_type, type, name
                    from feature;
                `)).rows;

                features.forEach(feature => {
                    const {id, latlngs, radius, geom_type, type, name} = feature;
                    let geom;

                    // create layer
                    if (geom_type === 'circle') {
                        geom = L.circle(latlngs[0], {radius: radius}).addTo(this.drawnItems);
                    } else {
                        geom = L[geom_type](latlngs).addTo(this.drawnItems);
                    }

                    // embed info
                    geom.info = {type: type || 'no type', name: name || 'no name'};

                    // add edit toolbar
                    geom.on('click', (e) => {
                        new L.Toolbar2.EditToolbar(e.latlng)
                            .addTo(this.map, geom);
                    });

                    // record id
                    this.idLookup[geom._leaflet_id] = {id, geom_type};
                });

            }
        }
    }
</script>

<style>
    header {
        height: 6vh;
    }

    #map {
        height: 94vh;
    }

    .mouse-marker {
        background-color: #fff;
        cursor: crosshair;
    }

    .detail-popup {
        width: auto;
        max-width: none;
    }

    .draw-toolbar {
        /*display: block;*/
        margin-bottom: 0;
    }

    .path-toolbar {
        /*display: none;*/
        margin-bottom: 0;
    }
</style>
