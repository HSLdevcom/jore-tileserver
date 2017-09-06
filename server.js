const path = require("path");
const express = require("express");
const { Pool } = require("pg");
const SphericalMercator = require("@mapbox/sphericalmercator");

class TileServer {
    constructor(pgOptions) {
        this.app = express();
        this.pool = new Pool(pgOptions);
        this.mercator = new SphericalMercator();

        this.app.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });
    }

    addLayer({ name, query }) {
        this.app.get(`/${name}/index.json`, (req, res) => {
            const protocol = req.headers["x-forwarded-proto"] || req.protocol;
            const host = req.headers["x-forwarded-host"] || req.headers.host;
            const directory = path.dirname(req.headers["x-forwarded-path"] || req.path);
            const params = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";

            const tileJSON = {
                "tilejson": "2.2.0",
                "tiles": [`${protocol}://${host}${directory}/{z}/{x}/{y}.pbf${params}`],
            };
            res.send(tileJSON);
        });

        this.app.get(`/${name}/:z/:x/:y.pbf`, (req, res) => {
            const { x, y, z } = req.params;
            const bbox = this.mercator.bbox(x, y, z, false, "900913");
            const date = Date.parse(req.query.date) ? new Date(req.query.date) : new Date();
            const values = [...bbox, date];

            this.pool.query(query, values)
                .then((result) => {
                    res.setHeader("Content-Type", "application/x-protobuf");
                    res.send(result.rows[0].st_asmvt);
                })
                .catch((error) => {
                    console.error(error);
                    res.status(500).send({ error: error.message });
                });
        });
    }

    listen(port) {
        this.app.listen(port, () => {
            console.log(`Listening on port ${port}`);
        });
    }
}

module.exports = TileServer;
