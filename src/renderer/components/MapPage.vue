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
    import './MapPage/Control/DrawPanel.js'
    import RoadStartIcon from '../assets/marker-icon-2x-yellow.png';
    import ShadowIcon from '../assets/marker-shadow.png';
    import randomColor from 'randomColor'
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
            this.map.drawnItems = this.drawnItems;

            // add map info control
            L.control.mapInfo({
                position: 'topright'
            }).addTo(map);

            // add draw panel control
            L.control.drawPanel({
                position: 'topright'
            }).addTo(map);

            // add tiles
            const baseTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(map);

            const previewTile = L.tileLayer(`http://localhost:20008/tile/${mapName}/{z}/{x}/{y}.png?updated=${new Date().getTime()}`, {
                minZoom: 0,
                maxZoom: 18
            });

            L.control.layers({drawnItems: this.drawnItems, previewTile}, null, {position: 'bottomleft'}).addTo(map);

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

            map.on('DRAW_ACTION.COMMIT', async (e) => {
                const layer = e.layer;

                const isConflict = await this.checkConflicts(null, layer, 'commit'); // conflict

                if (isConflict) {
                    this.map.removeLayer(layer);
                    return;
                }

                // add edit action
                layer.on('click', (e) => {
                    new L.Toolbar2.EditToolbar(e.latlng)
                        .addTo(this.map, layer);
                });

                // draw layer
                if (!(layer instanceof L.Marker)) {
                    layer.setStyle({
                        color: randomColor({
                            hue: 'random'
                        })
                    });
                }
                this.drawnItems.addLayer(layer);
                this.map.fire('DRAW_PANEL.UPDATE');

                // save to db
                self.saveFeature(layer);
            });

            map.on('EDIT_ACTION.DELETE', async (e) => {
                const layers = e.layers._layers;
                const idLookup = self.idLookup;

                for (let key in layers) {
                    if (!layers.hasOwnProperty(key)) continue;

                    const isConflict = await this.checkConflicts(idLookup[key].id, layers[key], 'delete'); // conflict

                    if (isConflict) continue;

                    // remove layer
                    this.drawnItems.removeLayer(layers[key]);
                    this.map.fire('DRAW_PANEL.UPDATE');

                    // update db
                    db.query(`
                        delete from feature
                        where id = ${idLookup[key].id};
                    `);
                }
            });

            map.on('EDIT_ACTION.SAVE', async (e) => {
                const layers = e.layers._layers;
                const idLookup = self.idLookup;

                for (let key in layers) {
                    if (!layers.hasOwnProperty(key)) continue;

                    // self intersect
                    const isConflict = await this.checkConflicts(idLookup[key].id, layers[key], 'edit'); // conflict
                    if (isConflict) {
                        if (layers[key] instanceof L.Marker) {
                            layers[key].setLatLng(layers[key].originalLatlng);
                        } else {
                            layers[key].setLatLngs(layers[key].originalLatlng);
                        }
                        continue;
                    }

                    self.editFeature(idLookup[key].id, layers[key]);
                }
            });

            // load feature
            map.road = {};
            map.road.roadStartMarker = L.marker(location, {
                icon: L.icon({
                    iconUrl: RoadStartIcon,
                    shadowUrl: ShadowIcon,
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map);
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
                } else if (layerType === 'circle' || layerType === 'marker') {
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
                } else if (layerType === 'marker') {
                    geomText = latlng.lng + ' ' + latlng.lat;

                    return `ST_GeomFromText('${geomType}(${geomText})', 4326)`;
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
                } else if (layerType === 'circle' || layerType === 'marker') {
                    result = `${layer._latlng.lat}, ${layer._latlng.lng}`;
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
                } else if (layer instanceof L.Marker) {
                    type = 'marker';
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

            async checkConflicts(id, layer, mode) {
                const roadStartMarker = this.map.road.roadStartMarker;
                const type = layer.info.type;
                const geomText = this.layerToGeomText(layer);
                let isConflict = false;
                let rows;

                if (mode === 'commit') {
                    // intersecting
                    rows = (await db.query(`
                        select exists (
                            select 1
                            from feature
                            where st_intersects(feature.geom, ${geomText}) -- conflicts
                            and not ((feature.type in ('main road', 'side road') and '${type}' in ('main road', 'side road')) -- but not both are road
                                or (feature.type = 'stream' and '${type}' = 'stream'))
                        );
                    `)).rows;

                    if (rows[0].exists === true) {
                        isConflict = true;
                        alert('intersecting');
                    }
                } else if (mode === 'delete') {
                    if (type === 'main road' || type === 'side road') {
                        // >1 connected components
                        rows = (await db.query(`
                            with groups as (
                                select
                                    row_number() over (order by unnest(ST_ClusterWithin(geom, 5e-5))) as id,
                                    (st_dump(unnest(ST_ClusterWithin(geom, 5e-5)))).geom as geom
                                from feature
                                where type in ('main road', 'side road') and id != ${id}
                            )
                            select id from groups group by id;`
                        )).rows;

                        if (rows.length > 1) {
                            isConflict = true;
                            alert('disconnected road');
                        }

                        // delete road from start point
                        rows = (await db.query(`
                        select st_intersects((select geom from feature where id = ${id}), ${this.layerToGeomText(roadStartMarker)})`
                        )).rows;

                        if (rows[0]['st_intersects'] === true) {
                            isConflict = true;
                            alert('disconnected road');
                        }
                    }
                } else if (mode === 'edit') {
                    // intersecting
                    rows = (await db.query(`
                        select exists (
                            select 1
                            from feature
                            where id != ${id}
                            and st_intersects(feature.geom, ${geomText}) -- conflicts
                            and not (feature.type in ('main road', 'side road') and '${type}' in ('main road', 'side road')) -- but not both are road
                        );
                    `)).rows;

                    if (rows[0].exists === true) {
                        isConflict = true;
                        alert('intersecting');
                    }

                    if (type === 'main road' || type === 'side road') {
                        // >1 connected components
                        rows = (await db.query(`
                            with newroad as (
                                select geom
                                from feature
                                where type in ('main road', 'side road') and id != ${id}
                                union
                                (select ${geomText} as geom)
                            ), groups as (
                                select
                                    row_number() over (order by unnest(ST_ClusterWithin(geom, 5e-5))) as id,
                                    (st_dump(unnest(ST_ClusterWithin(geom, 5e-5)))).geom as geom
                                from newroad
                            )
                            select id from groups group by id;`
                        )).rows;

                        if (rows.length > 1) {
                            isConflict = true;
                            alert('disconnected road');
                        }
                    }

                } else {
                    console.log('error: checkConflicts');
                    return undefined;
                }

                return isConflict;
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
                    let geom, color;

                    // get color
                    color = randomColor({
                        hue: 'random'
                    });

                    // create layer
                    if (geom_type === 'circle') {
                        geom = L[geom_type](latlngs, radius, {color}).addTo(this.drawnItems);
                    } else {
                        geom = L[geom_type](latlngs, {color}).addTo(this.drawnItems);
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

                this.map.fire('DRAW_PANEL.UPDATE');
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

    .edit-toolbar {
        width: 150px !important;
    }
</style>
