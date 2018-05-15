<template>
    <div id="wrapper" class="card">
        <div v-show="dist">Total distance: {{dist}}m</div>
    </div>
</template>

<script>
    export default {
        name: 'path-info',

        props: ['map'],

        data() {
            return {
                dist: null
            };
        },

        mounted() {
            this.map.on('PATH_INFO.GENERATED', (e) => {
                this.dist = Math.round(e.info.dist);
            });
        },

        methods: {}
    }
</script>

<style scoped>
    #wrapper {
        width: 200px;
        background-color: white;
    }
</style>
