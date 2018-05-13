with endpt as (
  select ST_GeomFromText('POINT(${endpt.lng} ${endpt.lat})', 4326) as geom
), edge as (
  select road.id, road.geom
  from road, endpt
  order by st_distance(endpt.geom, road.geom)
  limit 1
), snap_point as (
	select ST_ClosestPoint(edge.geom, endpt.geom) as geom, st_distance(edge.geom::geography, endpt.geom::geography) as dist
	from endpt, edge
)
select st_x(geom) as lng, st_y(geom) as lat, dist
from snap_point;