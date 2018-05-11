<template>
    <div class="modal" tabindex="-1" role="dialog" id="myModal">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <form @submit.prevent="send()">
                    <div class="modal-header">
                        <h5 class="modal-title">Modal title</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <label>
                            <span>type</span>
                            <input type="text" v-model="feature.type"/>
                        </label>
                        <label>
                            <span>name</span>
                            <input type="text" v-model="feature.name"/>
                        </label>
                    </div>
                    <div class="modal-footer">
                        <input type="submit" class="btn btn-primary" value="submit"/>
                        <input type="button" class="btn btn-secondary" @click="send(true)" value="cancel"/>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script>
    import 'bootstrap/dist/js/bootstrap'

    export default {
        name: 'draw-new-layer',

        data() {
            return {
                feature: {
                    type: null,
                    name: null
                }
            };
        },

        mounted() {
            $('#myModal').modal({show: true, backdrop: 'static'});
        },

        methods: {
            getData() {
                return this.formData;
            },
            send(isCancel) {
                $('#myModal')
                    .modal('hide')
                    .modal('dispose')
                    .remove();

                if (!isCancel) {
                    this.$emit('FORM_SEND', {
                        feature: this.feature
                    });
                } else {
                    this.$emit('FORM_SEND', 'cancel');
                }
            }
        }
    }
</script>

<style>
</style>
