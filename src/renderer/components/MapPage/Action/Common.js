import L from "leaflet";
import 'leaflet-geometryutil/src/leaflet.geometryutil'

export {getDirection}

function getDirection(degree) {
    let dir;
    if (degree > -22.5 && degree <= 22.5) {
        dir = '↑';
    } else if (degree > 22.5 && degree <= 67.5) {
        dir = '↗';
    } else if (degree > 67.5 && degree <= 112.5) {
        dir = '→';
    } else if (degree > 112.5 && degree <= 157.5) {
        dir = '↘';
    } else if (degree > -157.5 && degree <= -112.5) {
        dir = '↙';
    } else if (degree > -112.5 && degree <= -67.5) {
        dir = '←';
    } else if (degree > -67.5 && degree <= -22.5) {
        dir = '↖';
    } else {
        dir = '↓';
    }
    return dir;
}