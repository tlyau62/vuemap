<template>
    <div id="wrapper">
        <form @submit.prevent="save()">
            <div class="form-group row">
                <label for="name" class="col-sm-2 col-form-label">Name</label>
                <div class="col-sm-10">
                    <input type="text" required class="form-control-plaintext" id="name" v-model="layer.info.name">
                </div>
            </div>
            <div class="form-group row">
                <label for="type" class="col-sm-2 col-form-label">Type</label>
                <div class="col-sm-10">
                    <input type="text" readonly class="form-control-plaintext" id="type" v-model="layer.info.type">
                </div>
            </div>
            <div class="form-group row" v-for="(value, key) in detailWithoutChart">
                <label :for="key" class="col-sm-2 col-form-label">{{key}}</label>
                <div class="col-sm-10">
                    <input type="text" readonly class="form-control-plaintext" :id="key" :value="value">
                </div>
            </div>
            <div v-if="detail.chart">
                <h6>Cross section chart</h6>
                <div id="chart">loading...</div>
            </div>

            <div style="text-align: center">
                <input type="submit" value="save changes" class="btn btn-primary mb-2"/>
            </div>
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
            },

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
