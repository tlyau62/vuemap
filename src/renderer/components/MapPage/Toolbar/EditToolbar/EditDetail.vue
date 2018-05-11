<template>
    <div id="wrapper">
        <form @submit.prevent="save()">
            <div>
                <span>Name</span>:
                <input type="text" v-model="layer.info.name"/>
            </div>
            <div>
                <span>Type</span>:
                <input type="text" v-model="layer.info.type"/>
            </div>
            <div v-for="(value, key) in detailWithoutChart">
                <span>{{ key }}</span>: {{ value }}
            </div>

            <div v-if="detail.chart">
                <h6>Cross section chart</h6>
                <div id="chart">loading...</div>
            </div>

            <input type="submit" value="submit"/>
        </form>
    </div>
</template>

<script>

    export default {
        name: 'edit-detail',

        props: ['layer', 'detail'],

        data() {
            return {};
        },

        computed: {
            detailWithoutChart() {
                const subset = {};
                const detail = this.detail;

                for (let key in detail) {
                    if (!detail.hasOwnProperty(key) || key === 'chart') continue;
                    subset[key] = detail[key];
                }

                return subset;
            }
        },

        mounted() {
            const detail = this.detail;
            if (detail.chart) {
                detail.chart.then(chart => {
                    $('#chart').empty().append(chart);
                });
            }
        },

        methods: {
            save() {
                this.layer._map.fire('EDIT_ACTION.SAVE', {layers: L.layerGroup([this.layer])});
            }
        }
    }
</script>

<style scoped>
    #wrapper {
        width: 300px;
    }
</style>
