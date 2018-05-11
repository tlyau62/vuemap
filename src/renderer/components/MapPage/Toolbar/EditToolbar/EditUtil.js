import axios from 'axios'
import Chart from 'chart.js'
import Vue from 'vue';
import EditDetail from './EditDetail'

export class LayerDetail {
    constructor(layer) {
        this.layer = layer;
    }

    get detail() {
        return this.calcDetail();
    }

    get detailTemplate() {
        const detail = this.calcDetail(true);
        let template = '';
        for (let key in detail) {
            if (!detail.hasOwnProperty(key)) continue;
            template += `<div><span>${key}</span>: ${detail[key]}</div>`
        }
        return template;
    }

    get detailTemplateWithChart() {
        const formWrapper = $('<div id="formWrapper"></div>')[0];
        const form = Vue.extend(EditDetail);
        const formVm = new form({
            propsData: {
                layer: this.layer,
                detail: this.calcDetail(true, true) // calc geom
            }
        }).$mount();

        const cleanup = () => {
            formVm.$destroy();
            this.layer._map.off('popupclose', cleanup);
        };
        this.layer._map.on('popupclose', cleanup);

        formWrapper.appendChild(formVm.$el);

        return formWrapper;
    }

    calcDetail(isUnit, isAddChart) {
        const layer = this.layer;
        let detail;

        if (layer instanceof L.Circle) {
            let radius = layer.getRadius();

            detail = {
                radius: Math.round(radius),
                area: Math.round(Math.PI * (radius * radius))
            };
        } else if ((layer instanceof L.Polyline) && !(layer instanceof L.Polygon)) {
            const shapeLatlngs = layer._latlngs;

            detail = {
                length: Math.round(L.GeometryUtil.length(shapeLatlngs))
            };

            if (isAddChart && isAddChart === true) {
                detail.chart = LayerDetail.calcCrossSection(layer);
            }
        } else if ((layer instanceof L.Polygon) && !(layer instanceof L.Rectangle)) {
            const shapeLatlngs = layer._latlngs[0];

            detail = {
                area: Math.round(L.GeometryUtil.geodesicArea(shapeLatlngs)),
                perimeter: Math.round(L.GeometryUtil.length(shapeLatlngs.concat([shapeLatlngs[0]])))
            };
        } else if (layer instanceof L.Rectangle) {
            const shapeLatlngs = layer._latlngs[0];

            detail = {
                area: Math.round(L.GeometryUtil.geodesicArea(shapeLatlngs)),
                perimeter: Math.round(L.GeometryUtil.length(shapeLatlngs.concat([shapeLatlngs[0]])))
            };
        } else {
            console.log('error: calcDetail');
            detail = undefined;
        }

        if (isUnit && isUnit === true) {
            let unit;
            for (let key in detail) {
                if (!detail.hasOwnProperty(key)) continue;

                if (key === 'length' || key === 'perimeter' || key === 'radius') {
                    unit = 'm';
                } else if (key === 'area') {
                    unit = 'm^2';
                } else if (key === 'chart') {
                    continue;
                } else {
                    unit = undefined;
                    console.log('error: calcDetail');
                }

                detail[key] += ' ' + unit;
            }
        }

        return detail;
    }

    static calcCrossSection(layer) {
        const shapeLatlngs = layer._latlngs;
        const shapeLength = Math.round(L.GeometryUtil.length(shapeLatlngs));
        const samples = [];
        const sampleDist = 100;
        const samplePortion = sampleDist / shapeLength;

        if (!((layer instanceof L.Polyline) && !(layer instanceof L.Polygon))) {
            console.log('err: calcCrossSection');
            return undefined;
        }

        // cal dist for each sample
        for (let i = 0, dist = 0; dist <= shapeLength; i++) {
            samples.push({
                dist,
                latlng: L.GeometryUtil.interpolateOnLine(layer._map, shapeLatlngs, i * samplePortion).latLng
            });
            dist += sampleDist;
        }
        samples.push({dist: shapeLength, latlng: shapeLatlngs[shapeLatlngs.length - 1]});

        // query elevation
        let query;
        query = samples
            .map(pt => pt.latlng.lat + ',' + pt.latlng.lng)
            .join('|');

        return axios.get(`https://api.open-elevation.com/api/v1/lookup?locations=${query}`)
            .then(function (response) {

                const elevations = response.data.results;
                const pts = [];

                for (let i = 0; i < samples.length; i++) {
                    pts.push({
                        x: samples[i].dist,
                        y: elevations[i].elevation
                    });
                }

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const chart = new Chart(ctx, {
                    type: 'scatter',
                    data: {
                        labels: ["January", "February", "March", "April", "May", "June", "July"],
                        datasets: [{
                            // label: "My First dataset",
                            backgroundColor: 'rgb(255, 99, 132)',
                            borderColor: 'rgb(255, 99, 132)',
                            data: pts,
                            showLine: true
                        }]
                    },
                    options: {
                        legend: {
                            display: false
                        },
                        tooltips: {
                            callbacks: {
                                label: function (tooltipItem) {
                                    return tooltipItem.yLabel;
                                }
                            }
                        }
                    }
                });

                return canvas;
            })
            .catch(function (error) {
                console.log(error);
            });
    }
}