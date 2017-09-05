const TileServer = require("./server");

const stopsQuery = `
    SELECT ST_AsMVT('stops', 4096, 'geom', rows)
    FROM (
        SELECT
            stop_id,
            short_id,
            name_fi,
            name_se,
            jore.stop_modes(stop.*, $5) AS type,
            ST_AsMVTGeom(point, ST_MakeEnvelope($1, $2, $3, $4, 4326), 4096, 0, false) AS geom
        FROM jore.stop stop
        WHERE point && ST_MakeEnvelope($1, $2, $3, $4, 4326)
    ) AS rows`;

const tileServer = new TileServer({ connectionString: process.env.PG_CONNECTION_STRING });

tileServer.addLayer({ name: "stops", query: stopsQuery });

tileServer.listen(3000);
