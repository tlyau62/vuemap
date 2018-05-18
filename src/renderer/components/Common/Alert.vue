<template>
    <div id="wrapper">
        <div class="alert alert-danger" role="alert" id="alert-box">
            <div>Alert: {{msg}}</div>
        </div>
    </div>
</template>

<script>
    export default {
        name: 'alert',

        props: ['msg'],

        data() {
            return {}
        },

        mounted() {
            $('body').append(this.$el);
            window.setTimeout(() => {
                this.$destroy();
            }, 3000);
        },

        beforeDestroy() {
            $(this.$el).remove();
        }
    }
</script>

<style scoped>
    #wrapper {
        width: 100%;
        text-align: center;
        position: fixed;
        top: 8vh;
        left: 1vw;
        z-index: 9999;
    }

    #alert-box {
        width: 30%;
        margin: 0 auto;
    }
</style>
