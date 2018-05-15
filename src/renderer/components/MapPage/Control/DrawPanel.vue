<template>
    <div id="wrapper" class="card">
        <div class="card-body">
            <h5 class="card-title">Draw Panel</h5>
            <div id="list">
                <div v-for="(layer, index) in layers" @click="flyTo(index)" style="cursor: pointer;">
                    <i v-bind:style="{ color: layer.color}">■</i>
                    {{layer.name}} - {{layer.type}}
                </div>
            </div>
        </div>
    </div>
</template>

<script>

    export default {
        name: 'drawp-panel',

        props: ['map'],

        data() {
            return {
                layers: []
            }
        },

        mounted() {
            this.map.on('DRAW_PANEL.UPDATE', () => {
                const drawnItemsLayers = this.map.drawnItems._layers;
                if (!drawnItemsLayers || drawnItemsLayers.length === 0) {
                    return;
                }

                const layers = [];

                for (let key in drawnItemsLayers) {
                    if (!drawnItemsLayers.hasOwnProperty(key)) continue;
                    if (!drawnItemsLayers[key].info || !drawnItemsLayers[key].options) continue;

                    if (drawnItemsLayers[key] instanceof L.Marker) {
                        layers.push({
                            layer: drawnItemsLayers[key],
                            name: drawnItemsLayers[key].info.name || 'no name',
                            type: drawnItemsLayers[key].info.type || 'no type',
                            color: 'blue',
                        });
                    } else {
                        layers.push({
                            layer: drawnItemsLayers[key],
                            name: drawnItemsLayers[key].info.name || 'no name',
                            type: drawnItemsLayers[key].info.type || 'no type',
                            color: drawnItemsLayers[key].options.color || '#000000',
                        });
                    }

                }

                this.layers = layers;
            })
        },

        methods: {
            flyTo(index) {
                const layer = this.layers[index].layer;
                const zoomLevel = 18;
                if (this.layers[index].layer instanceof L.Marker) {
                    this.map.flyTo(layer.getLatLng(), zoomLevel);
                } else {
                    this.map.flyTo(layer.getBounds().getCenter(), zoomLevel);
                }
            }
        }
    }
</script>

<style scoped>
    #wrapper {
        background-color: white;
        padding: 1px;
    }

    #list {
        max-height: 150px;
        overflow-y: auto;
    }
</style>
