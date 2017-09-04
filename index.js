const path = require("path");
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

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get("/stops/index.json", (req, res) => {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const directory = path.dirname(req.headers["x-forwarded-path"] || req.path);

    const tileJSON = {
        "tilejson": "2.2.0",
        "tiles": [`${protocol}://${host}${directory}/{z}/{x}/{y}.pbf`],
    };
    res.setHeader("Content-Type", "application/json");
    res.send(tileJSON);
});

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
