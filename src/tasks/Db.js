const fsPromises = require("fs").promises;
const fs = require("fs");
const _ = require("lodash");
const { DateTime } = require("luxon");
const copyTo = require("pg-copy-streams").to;
const util = require("util");
const stream = require("stream");
const zlib = require("zlib");
const del = require("del");
const { Store } = require("../models/Store");
const logger = require("../logger");
const runShell = require("../utils/runShell");
const knexConfig = require("../../knexfile");

const pipeline = util.promisify(stream.pipeline);

class Db {
  static async structureDump() {
    await runShell(
      "pg_dump",
      [
        "--host",
        knexConfig.development.connection.host,
        "--port",
        knexConfig.development.connection.port,
        "--dbname",
        knexConfig.development.connection.database,
        "--username",
        knexConfig.development.connection.user,
        "--schema-only",
        "--no-privileges",
        "--no-owner",
        "--file",
        "db/structure.sql",
      ],
      {
        env: {
          PGPASSWORD: knexConfig.development.connection.password,
        },
      }
    );

    const migrations = await runShell(
      "pg_dump",
      [
        "--host",
        knexConfig.development.connection.host,
        "--port",
        knexConfig.development.connection.port,
        "--dbname",
        knexConfig.development.connection.database,
        "--username",
        knexConfig.development.connection.user,
        "--data-only",
        "--table",
        "knex_migrations",
      ],
      {
        env: {
          PGPASSWORD: knexConfig.development.connection.password,
        },
      }
    );

    await fsPromises.appendFile("db/structure.sql", `\n\n${migrations.stdout}`);
  }

  static async backupPrivate() {
    process.env.RCLONE_S3_ACCESS_KEY_ID =
      process.env.BACKUPS_RCLONE_S3_ACCESS_KEY_ID;
    process.env.RCLONE_S3_SECRET_ACCESS_KEY =
      process.env.BACKUPS_RCLONE_S3_SECRET_ACCESS_KEY;

    const now = DateTime.utc();
    const filename = `${
      knexConfig.development.connection.database
    }_${now.toISO()}.pgdump`;
    const path = `tmp/${filename}`;
    try {
      await runShell(
        "pg_dump",
        [
          "--host",
          knexConfig.development.connection.host,
          "--port",
          knexConfig.development.connection.port,
          "--dbname",
          knexConfig.development.connection.database,
          "--username",
          knexConfig.development.connection.user,
          "--file",
          path,
          "--format",
          "custom",
          "--verbose",
        ],
        {
          env: {
            PGPASSWORD: knexConfig.development.connection.password,
          },
        }
      );

      await runShell("rclone", [
        "copyto",
        "-v",
        "--checksum",
        "--no-update-modtime",
        "--s3-no-head",
        path,
        `:s3:${process.env.BACKUPS_BUCKET}/database/${knexConfig.development.connection.host}/${filename}`,
      ]);
    } finally {
      await del(path);
    }
  }

  static async backupPublic() {
    process.env.RCLONE_S3_ACCESS_KEY_ID =
      process.env.BACKUPS_RCLONE_S3_ACCESS_KEY_ID;
    process.env.RCLONE_S3_SECRET_ACCESS_KEY =
      process.env.BACKUPS_RCLONE_S3_SECRET_ACCESS_KEY;

    const path = `tmp/vaccinespotter_public.pgdump`;
    try {
      await runShell(
        "pg_dump",
        [
          "--host",
          knexConfig.development.connection.host,
          "--port",
          knexConfig.development.connection.port,
          "--dbname",
          knexConfig.development.connection.database,
          "--username",
          knexConfig.development.connection.user,
          "--file",
          path,
          "--format",
          "custom",
          "--verbose",
          "--exclude-table-data",
          "public.cache",
          "--exclude-table-data",
          "audit.log",
        ],
        {
          env: {
            PGPASSWORD: knexConfig.development.connection.password,
          },
        }
      );

      await runShell("rclone", [
        "copyto",
        "-v",
        "--checksum",
        "--no-update-modtime",
        "--s3-no-head",
        "--header-upload",
        "Cache-Control: public, max-age=3600",
        path,
        `:s3:${process.env.WEBSITE_BUCKET}/database/vaccinespotter.pgdump`,
      ]);
    } finally {
      await del(path);
    }
  }

  static async auditDump() {
    process.env.RCLONE_S3_ACCESS_KEY_ID =
      process.env.BACKUPS_RCLONE_S3_ACCESS_KEY_ID;
    process.env.RCLONE_S3_SECRET_ACCESS_KEY =
      process.env.BACKUPS_RCLONE_S3_SECRET_ACCESS_KEY;

    const knex = Store.knex();

    const result = await knex.raw(
      "SELECT MIN(action_tstamp_tx) AS min_action_tstamp_tx, MAX(action_tstamp_tx) AS max_action_tstamp_tx FROM audit.log"
    );
    console.info(result.rows[0]);
    let time = DateTime.fromJSDate(result.rows[0].min_action_tstamp_tx)
      .toUTC()
      .startOf("day");
    console.info(time.toISO());
    const maxTime = DateTime.fromJSDate(result.rows[0].max_action_tstamp_tx)
      .toUTC()
      .startOf("day");
    console.info(maxTime.toISO());

    const existingPublicFilesCmd = await runShell("rclone", [
      "lsjson",
      "--no-modtime",
      "--no-mimetype",
      `:s3:${process.env.WEBSITE_BUCKET}/database/history/`,
    ]);
    const existingPublicFiles = JSON.parse(existingPublicFilesCmd.stdout).map(
      (d) => d.Path
    );

    const existingPrivateFilesCmd = await runShell("rclone", [
      "lsjson",
      "--no-modtime",
      "--no-mimetype",
      `:s3:${process.env.BACKUPS_BUCKET}/database/history/`,
    ]);
    const existingPrivateFiles = JSON.parse(existingPrivateFilesCmd.stdout).map(
      (d) => d.Path
    );

    while (time < maxTime) {
      const startTime = time;
      const endTime = time.plus({ days: 1 });

      await Db.auditDumpPublicDay(startTime, endTime, existingPublicFiles);
      await Db.auditDumpPrivateDay(startTime, endTime, existingPrivateFiles);
      // await Db.auditPruneDay(startTime, endTime);

      time = endTime;
    }

    const historyFilesCmd = await runShell("rclone", [
      "lsjson",
      "--no-modtime",
      "--no-mimetype",
      `:s3:${process.env.WEBSITE_BUCKET}/database/history/`,
    ]);
    let historyFiles = JSON.parse(historyFilesCmd.stdout)
      .map((d) => ({ name: d.Name, size: d.Size }))
      .filter((f) => f.name.endsWith(".jsonl.gz"));
    historyFiles = _.orderBy(historyFiles, ["name"]);

    await fsPromises.writeFile(
      "tmp/history-files.json",
      JSON.stringify({
        files: historyFiles,
      })
    );

    await runShell("rclone", [
      "copyto",
      "-v",
      "--checksum",
      "--no-update-modtime",
      "--s3-no-head",
      "--header-upload",
      "Cache-Control: public, max-age=300",
      "tmp/history-files.json",
      `:s3:${process.env.WEBSITE_BUCKET}/database/history/days.json`,
    ]);

    await Db.dumpPublicStores();

    await knex.destroy();
  }

  static async auditDumpPublicDay(startTime, endTime, existingPublicFiles) {
    const filename = `${startTime.toISODate()}.jsonl.gz`;
    const bucketPath = `:s3:${process.env.WEBSITE_BUCKET}/database/history/${filename}`;
    if (existingPublicFiles.includes(filename)) {
      console.info(`${bucketPath} already exists, skipping`);
      return;
    }

    const sql = `
      COPY (
        WITH t1 AS (
          SELECT
            id,
            table_name,
            action_tstamp_tx,
            transaction_id,
            action,
            row_data - ARRAY['metadata_raw', 'appointments_raw'] AS row_data,
            (row_data->>'location')::geography AS row_data_location,
            changed_fields - ARRAY['metadata_raw', 'appointments_raw'] AS changed_fields,
            (changed_fields->>'location')::geography AS changed_fields_location
          FROM audit.log
          WHERE action_tstamp_tx >= '${startTime.toISO()}'
            AND action_tstamp_tx < '${endTime.toISO()}'
          ORDER BY id
        ),
        t2 AS (
          SELECT
            id,
            table_name,
            action_tstamp_tx,
            transaction_id,
            action,
            CASE WHEN row_data_location IS NOT NULL THEN
              (row_data - 'location') || jsonb_build_object(
                'location', jsonb_build_object(
                  'latitude', st_y(row_data_location::geometry),
                  'longitude', st_x(row_data_location::geometry)
                )
              )
            ELSE
              row_data
            END AS row_data,
            CASE WHEN changed_fields_location IS NOT NULL THEN
              (changed_fields - 'location') || jsonb_build_object(
                'location', jsonb_build_object(
                  'latitude', st_y(changed_fields_location::geometry),
                  'longitude', st_x(changed_fields_location::geometry)
                )
              )
            ELSE
              changed_fields
            END AS changed_fields
          FROM t1
        )
        SELECT
          json_build_object(
            'audit_id', id,
            'table_name', table_name,
            'transaction_timestamp', action_tstamp_tx,
            'transaction_id', transaction_id,
            'action', CASE action
              WHEN 'I' THEN 'INSERT'
              WHEN 'D' THEN 'DELETE'
              WHEN 'U' THEN 'UPDATE'
              WHEN 'T' THEN 'TRUNCATE'
              END,
            'previous_data', row_data,
            'changed_data', changed_fields,
            'data', (row_data || changed_fields)
          )
        FROM t2
      )
      TO STDOUT
      WITH ENCODING 'UTF-8'`;

    const path = `tmp/${filename}`;
    try {
      await Db.copyToFile(sql, path);

      await runShell("rclone", [
        "copyto",
        "-v",
        "--checksum",
        "--no-update-modtime",
        "--s3-no-head",
        "--header-upload",
        "Cache-Control: public, max-age=3600",
        "--header-upload",
        "Content-Encoding: gzip",
        path,
        bucketPath,
      ]);
    } finally {
      await del(path);
    }
  }

  static async auditDumpPrivateDay(startTime, endTime, existingPrivateFiles) {
    const filename = `${startTime.toISODate()}.csv.gz`;
    const bucketPath = `:s3:${process.env.BACKUPS_BUCKET}/database/history/${filename}`;
    if (existingPrivateFiles.includes(filename)) {
      console.info(`${bucketPath} already exists, skipping`);
      return;
    }

    const sql = `
      COPY (
        SELECT *
        FROM audit.log
        WHERE action_tstamp_tx >= '${startTime.toISO()}'
          AND action_tstamp_tx < '${endTime.toISO()}'
      )
      TO STDOUT
      WITH CSV HEADER`;

    const path = `tmp/${filename}`;
    try {
      await Db.copyToFile(sql, path);

      await runShell("rclone", [
        "copyto",
        "-v",
        "--checksum",
        "--no-update-modtime",
        "--s3-no-head",
        "--header-upload",
        "Cache-Control: public, max-age=3600",
        "--header-upload",
        "Content-Encoding: gzip",
        path,
        bucketPath,
      ]);
    } finally {
      await del(path);
    }
  }

  static async auditPruneDay(startTime, endTime) {
    const sql = `
      DELETE
      FROM audit.log
      WHERE action_tstamp_tx >= '${startTime.toISO()}'
        AND action_tstamp_tx < '${endTime.toISO()}'`;

    logger.info(sql);
  }

  static async dumpPublicStores() {
    const sql = `
      COPY (
        SELECT
          json_build_object(
            'id', id,
            'provider_id', provider_id,
            'provider_location_id', provider_location_id,
            'provider_brand_id', provider_brand_id,
            'name', name,
            'address', address,
            'city', city,
            'state', state,
            'postal_code', postal_code,
            'location', jsonb_build_object(
              'latitude', st_y(location::geometry),
              'longitude', st_x(location::geometry)
            ),
            'location_source', location_source,
            'normalized_address_key', normalized_address_key,
            'time_zone', time_zone,
            'carries_vaccine', carries_vaccine,
            'appointments', appointments,
            'appointments_available', appointments_available,
            'appointment_types', appointment_types,
            'appointment_vaccine_types', appointment_vaccine_types,
            'appointments_last_fetched', appointments_last_fetched,
            'appointments_last_modified', appointments_last_modified,
            'url', url,
            'active', active,
            'created_at', created_at,
            'updated_at', updated_at,
            'metadata_raw', metadata_raw
          )
        FROM stores
      )
      TO STDOUT
      WITH ENCODING 'UTF-8'`;

    const filename = `stores.jsonl.gz`;
    const path = `tmp/${filename}`;
    const bucketPath = `:s3:${process.env.WEBSITE_BUCKET}/database/${filename}`;
    try {
      await Db.copyToFile(sql, path);

      await runShell("rclone", [
        "copyto",
        "-v",
        "--checksum",
        "--no-update-modtime",
        "--s3-no-head",
        "--header-upload",
        "Cache-Control: public, max-age=3600",
        "--header-upload",
        "Content-Encoding: gzip",
        path,
        bucketPath,
      ]);
    } finally {
      await del(path);
    }
  }

  static async copyToFile(sql, path) {
    const knex = Store.knex();
    const client = await knex.client.acquireConnection();
    try {
      logger.debug(sql);
      const queryStream = client.query(copyTo(sql));
      await pipeline(
        queryStream,
        zlib.createGzip(),
        fs.createWriteStream(path)
      );
    } finally {
      await knex.client.releaseConnection(client);
    }
  }
}

module.exports = Db;
