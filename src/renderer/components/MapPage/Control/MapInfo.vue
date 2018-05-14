<template>
    <div id="wrapper" class="card">
        <div class="card-body">
            <h5 class="card-title">Map Information</h5>

            <h6 class="card-subtitle mb-2 text-muted">Map name</h6>
            <p class="card-text">{{this.map.mapName}}</p>

            <h6 class="card-subtitle mb-2 text-muted">Road start location</h6>
            <p class="card-text">{{location}}</p>

            <h6 class="card-subtitle mb-2 text-muted">Address</h6>
            <loading-inline ref="loading"></loading-inline>
            <div style="max-width: 200px">
                <dl class="row">
                    <template v-for="place in address">
                        <dt class="col-sm-4">{{place.type}}</dt>
                        <dd class="col-sm-7">{{place.name}}</dd>
                    </template>
                </dl>
            </div>

            <a href="#" class="card-link" @click="search">Google this place</a>
        </div>
    </div>
</template>

<script>
    import axios from 'axios'
    import {shell} from 'electron'
    import LoadingInline from '../../Common/LoadingInline'

    export default {
        name: 'map-info',

        components: {
            LoadingInline
        },

        props: ['map'],

        data() {
            return {
                address: null,
                full_addr: null
            };
        },

        mounted() {
            const mapLocation = this.map.mapLocation;
            axios.get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${mapLocation.lat}&lon=${mapLocation.lng}`)
                .then((response) => {
                    this.$refs.loading.$destroy();
                    const {address, addresstype, category, display_name} = response.data;
                    const names = display_name.split(', ');
                    this.address = names.map(name => {
                        for (let key in address) {
                            if (!address.hasOwnProperty(key)) continue;

                            if (name === address[key]) {
                                const result = {};
                                result.type = key;
                                result.name = name;
                                return result;
                            }
                        }
                        return null;
                    }).slice(-3);
                    this.full_addr = display_name;
                })
                .catch((error) => {
                    console.log(error);
                });
        },

        computed: {
            location() {
                return this.map.mapLocation.toString();
            }
        },

        methods: {
            search() {
                shell.openExternal('https://www.google.com.hk/search?q=' + this.full_addr);
            }
        }
    }
</script>

<style scoped>
    #wrapper {
        background-color: white;
    }
</style>
