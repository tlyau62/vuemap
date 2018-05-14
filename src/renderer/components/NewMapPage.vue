<template>
    <div id="wrapper">
        <header style="height: 14vh">
            <button @click="goBack" class="btn btn-link">Back</button>
            <form class="form-inline" @submit.prevent="submit" style="padding-left: 1rem">
                <div class="form-group">
                    <label for="map-name">Map name</label>
                    <input type="text" id="map-name" class="form-control mx-sm-3"
                           placeholder="mymap" v-model="mapName" style="width: 150px">
                </div>

                <div class="form-group">
                    <label for="location">Road starting location</label>
                    <input type="text" id="location" class="form-control mx-sm-3" readonly
                           :value="!selectedLocation ? 'empty' : selectedLocation.toString()" style="width: 250px">
                </div>

                <button type="submit" class="btn btn-primary">Create</button>
            </form>
        </header>
        <div id="map" style="height: 86vh;"></div>
    </div>
</template>

<script>
    import Vue from 'vue'
    import L from 'leaflet'
    import 'leaflet/dist/leaflet.css'
    import db from 'db/db'
    import fs from 'fs'
    import {execSync} from 'child_process'
    import 'leaflet-control-geocoder/dist/Control.Geocoder'
    import 'leaflet-control-geocoder/dist/Control.Geocoder.css'
    import Loading from './Common/Loading'

    export default {
        name: 'new-map-page',

        data() {
            return {
                mapName: null,
                selectedLocation: undefined,
                locationMarker: null
            };
        },

        mounted() {
            const self = this;

            const map = L.map('map').setView([22.4022, 114.1073], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            L.Control
                .geocoder({
                    defaultMarkGeocode: false,
                    showResultIcons: true
                })
                .on('markgeocode', function (e) {
                    const bbox = e.geocode.bbox;
                    map.flyTo(bbox.getCenter());
                })
                .addTo(map);


            fixMarkerIcon();
            addLocationPopup(map);
            db.connect();

            function fixMarkerIcon() {
                delete L.Icon.Default.prototype._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
                    iconUrl: require('leaflet/dist/images/marker-icon.png'),
                    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
                });
            }

            function addLocationPopup(map) {

                let currentLocation;

                // create dom
                const container = L.DomUtil.create('div', 'text-center', map.getContainer());
                const displayLocation = L.DomUtil.create('p', '', container);
                const btn = L.DomUtil.create('button', 'btn btn-outline-primary btn-sm', container);
                const popup = L.popup();

                btn.setAttribute('type', 'button');
                btn.innerHTML = 'select this location';

                // click button event
                L.DomEvent.on(btn, 'click', (e) => {
                    self.selectedLocation = currentLocation;
                    if (self.locationMarker) {
                        map.removeLayer(self.locationMarker);
                    }
                    self.locationMarker = L.marker(currentLocation).addTo(map);
                    map.flyTo(currentLocation);
                    map.closePopup();
                    e.stopPropagation();
                });

                // click map event
                map.on('click', (e) => {
                    currentLocation = e.latlng;

                    displayLocation.innerHTML = "Current location:<br/>" + currentLocation.toString();
                    popup.setLatLng(currentLocation).setContent(container);
                    map.openPopup(popup);
                });

            }

        },
        methods: {
            async goBack() {
                await db.endPool();
                window.history.length > 1
                    ? this.$router.go(-1)
                    : this.$router.push('/')
            },

            async submit() {
                const mapName = this.mapName;
                const selectedLocation = this.selectedLocation;

                if (!mapName || !selectedLocation) {
                    alert('missing name or location');
                    return;
                }

                // loading ui
                const loading = Vue.extend(Loading);
                const loadingInstance = new loading().$mount();

                // check db exists
                const isExists = (await db.query(`
                    select 1 from mapdb where name = '${mapName}';
                `,)).rows.length > 0;

                if (isExists) {
                    alert('map exists');
                    return;
                }

                // create new db
                await db.query(`
                     insert into mapdb(name, locat_geom)
                     select
                         '${mapName}' as name,
                         ST_SetSRID(ST_Point(${selectedLocation.lng}, ${selectedLocation.lat}), 4326) as locat_geom;
                `);
                await db.query(`create database ${mapName}`);
                await db.connect(mapName);
                await db.query(require('db/script/preparedb.sql'));

                // import tilemill
                this.importTilemill(mapName);

                // remove loading
                loadingInstance.$destroy();

                // move to map page
                this.$router.push({
                    path: `/map/${mapName}`,
                    query: {lat: selectedLocation.lat, lng: selectedLocation.lng}
                })
            },

            importTilemill(mapName) {
                const tilemillConfig = JSON.parse(fs.readFileSync('MapBox\\project\\osm_origin\\project.mml', 'utf8'));

                // copy origin folder
                execSync(`xcopy MapBox\\project\\osm_origin MapBox\\project\\${mapName}\\ /s/h/e/k/f/c`);

                // change datasource
                const layer = tilemillConfig.Layer;
                for (let i = 0; i < layer.length; i++) {
                    layer[i].Datasource.dbname = mapName;
                }
                // change settings
                fs.writeFileSync(`MapBox\\project\\${mapName}\\project.mml`, JSON.stringify(tilemillConfig), 'utf-8');
            }
        }
    }
</script>

<style scoped>
</style>
