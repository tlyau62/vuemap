<template>
    <div id="wrapper">
        <a @click="goBack">Go back</a>

        <form @submit.prevent="submit">
            <label>
                map name
                <input type="text" v-model="mapName"/>
            </label>

            <p>select a starting location: {{!selectedLocation ? 'empty' : selectedLocation.toString()}}</p>
            <div id="map"></div>


            <input type="submit" value="create"/>
        </form>
    </div>
</template>

<script>
    import L from 'leaflet'
    import 'leaflet/dist/leaflet.css'
    import db from 'db/db'

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
                const container = L.DomUtil.create('div', '', map.getContainer());
                const displayLocation = L.DomUtil.create('p', '', container);
                const btn = L.DomUtil.create('button', '', container);
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

                console.log(mapName + ' ' + selectedLocation);

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

                // move to map page
                this.$router.push({
                    path: `/map/${mapName}`,
                    query: {lat: selectedLocation.lat, lng: selectedLocation.lng}
                })
            }
        }
    }
</script>

<style>
    #map {
        height: 500px;
    }
</style>
