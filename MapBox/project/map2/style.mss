#POLYGON {
  [type='building'] {
	polygon-fill: #b5b5b5;
  }
  
  [type='river'] {
	polygon-fill: #42b0ff;
  }
  text-name: [name];
  text-face-name: 'Arial Regular';
  text-fill: #5d5d5d;
  text-placement: line;
  text-size: 10;
  text-dy: 12;
  text-max-char-angle-delta: 15;  
  text-halo-radius: 1;
  text-halo-fill: #fff;
}

#LINESTRING {
  [type='main road'] {
    ::case {
      line-width: 5;
      line-color:#cfcfcf;
    }
    ::fill {
      line-width: 2.5;
      line-color:#ffffff;
    }
  }
  
  [type='side road'] {
    line-width: 1;
    line-cap: round;
    line-dasharray: 10, 4;
  }
  
  [type='stream'] {
    ::case {
      line-width: 2;
      line-color:#fff;
    }
    ::fill {
      line-width: 2;
  	  line-color: #42b0ff;
    }
  }
  
  text-name: [name];
  text-face-name: 'Arial Regular';
  text-fill: #5d5d5d;
  text-size: 10;
  text-dy: 12;
  text-max-char-angle-delta: 15;  
  text-halo-radius: 1;
  text-halo-fill: #fff;
}

#POINT {
  [zoom>=16] {
    marker-width:30;
    [type='food'] {
      marker-file: url('icons\food.png');
    }
    [type='bank'] {
      marker-file: url('icons\bank.png');
    }
    [type='health'] {
      marker-file: url('icons\health.png');
    }
    [type='hotel'] {
      marker-file: url('icons\hotel.png');
    }
    [type='shop'] {
      marker-file: url('icons\shop.png');
    }
  }
}
