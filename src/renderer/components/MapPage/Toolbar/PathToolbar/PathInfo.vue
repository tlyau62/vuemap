<template>
    <div id="wrapper">
        <div>Total distance: {{dist}}m</div>
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
                this.dist = e.info.dist;
                console.log(e);
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
