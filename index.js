
const express = require("express");
const { Pool } = require("pg");
const SphericalMercator = require("@mapbox/sphericalmercator");

const stopQuery = `
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

const app = express();
const pool = new Pool({ connectionString: process.env.PG_CONNECTION_STRING });
const mercator = new SphericalMercator();

app.get("/stops/:z/:x/:y.pbf", (req, res) => {
    const bbox = mercator.bbox(req.params.x, req.params.y, req.params.z);
    const values = [...bbox, 4326];

    pool.query(stopQuery, values)
        .then((result) => {
            res.setHeader("Content-Type", "application/x-protobuf");
            res.send(result.rows[0].st_asmvt);
        })
        .catch((error) => {
            console.error(error);
        });
});

app.listen(3000, () => {
    console.log("Listening on port 3000");
});
