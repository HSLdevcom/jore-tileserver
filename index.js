const TileServer = require("./server");

const stopsQuery = `
    SELECT ST_AsMVT('stops', 4096, 'geom', q)
    FROM (
        SELECT
            stop_id,
            short_id,
            name_fi,
            name_se,
            ST_AsMVTGeom(point, ST_MakeEnvelope($1, $2, $3, $4, $5), 4096, 0, false) geom
        FROM stop
        WHERE point && ST_MakeEnvelope($1, $2, $3, $4, $5)
    ) q`;

const tileServer = new TileServer({ connectionString: process.env.PG_CONNECTION_STRING });

tileServer.addLayer({ name: "stops", query: stopsQuery });

tileServer.listen(3000);
