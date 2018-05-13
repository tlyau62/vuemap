drop table if exists road;

select * into road
from feature
where type in ('main road', 'side road');

DO $$
DECLARE
  r record;
  isExists boolean;
BEGIN
  isExists := (
    SELECT EXISTS(SELECT 1 FROM information_schema.schemata
    WHERE schema_name = 'road_topo')
  );

  if (isExists = TRUE) then
    perform topology.dropTopology('road_topo');
  end if;

  perform topology.CreateTopology('road_topo', 4326);
  perform topology.AddTopoGeometryColumn('road_topo', 'public', 'road', 'topo_geom', 'LINESTRING');

  FOR r IN SELECT * FROM road LOOP
    BEGIN
      UPDATE road
	  SET topo_geom = topology.toTopoGeom(geom, 'road_topo', 1, 1e-5)
      WHERE id = r.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Loading';
    END;
  END LOOP;
END
$$;