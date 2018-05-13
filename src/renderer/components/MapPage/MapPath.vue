<template>
    <div id="wrapper">
        <div>
            <p>path</p>
            <button @click="createTopo()">Analyze road network</button>
        </div>
    </div>
</template>

<script>
    import db from 'db/db'
    import topoSql from 'db/script/analyze_road_network'

    export default {
        name: 'map-path',

        data() {
            return {};
        },

        methods: {
            async createTopo() {
                await db.query(topoSql);
                alert('finish');
            }
        }
    }
</script>

<style>
</style>
