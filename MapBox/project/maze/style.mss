#POLYGON[type='building'] {
	polygon-fill: #b5b5b5;
}

#POLYGON[type='river'] {
	polygon-fill: #42b0ff;
}

#LINESTRING {
  line-color: #636363;
  text-name: [name];
  text-face-name: 'Arial Regular';
  text-fill: #5d5d5d;
  text-size: 10;
  text-dy: 12;
  text-max-char-angle-delta: 15;  
  text-halo-radius: 1;
  text-halo-fill: #fff;
}

#LINESTRING[type='main road'] {
  ::case {
    line-width: 5;
    line-color:#cfcfcf;
  }
  ::fill {
    line-width: 2.5;
    line-color:#ffffff;
  }
}

#LINESTRING[type='side road'] {
  line-width: 1;
  line-cap: round;
  line-dasharray: 10, 4;
}

#LINESTRING[type='stream'] {
  ::case {
    line-width: 2;
    line-color:#fff;
  }
  ::fill {
    line-width: 2;
  	line-color: #42b0ff;
  }
}

