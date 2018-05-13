<template>
    <div id="wrapper">
        <div class="sk-circle">
            <div class="sk-circle1 sk-child"></div>
            <div class="sk-circle2 sk-child"></div>
            <div class="sk-circle3 sk-child"></div>
            <div class="sk-circle4 sk-child"></div>
            <div class="sk-circle5 sk-child"></div>
            <div class="sk-circle6 sk-child"></div>
            <div class="sk-circle7 sk-child"></div>
            <div class="sk-circle8 sk-child"></div>
            <div class="sk-circle9 sk-child"></div>
            <div class="sk-circle10 sk-child"></div>
            <div class="sk-circle11 sk-child"></div>
            <div class="sk-circle12 sk-child"></div>
        </div>
        <p>Setting up environment...</p>
    </div>
</template>

<script>
    import 'spinkit/css/spinners/8-circle.css'

    export default {
        data() {
            return {}
        },

        mounted() {
            $('body').append(this.$el);
        },

        beforeDestroy() {
            $(this.$el).remove();
        }
    }
</script>

<style scoped>
    #wrapper {
        position: absolute;
        top: 0;
        left: 0;
        background-color: rgba(255, 255, 255, 0.9);
        height: 100vh;
        width: 100%;
        z-index: 99999;
        padding-top: 20%;
        text-align: center;
    }
</style>
