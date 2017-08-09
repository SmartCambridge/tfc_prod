-- Create the initial database "tfcserver" for use by the java real-time platform
--
-- This assumes:
--   - postgresql/postgis is already installed
--   - user is accessing psql as user 'postgres'
--  
-- Tables created are csn_sensors, csn_destinations, csn_sensordata
--
-- -------------------Create database -----------------------------------
CREATE DATABASE tfcserver;
GRANT ALL PRIVILEGES ON DATABASE tfcserver TO tfc_prod;
--
\echo 'Database tfcserver created';
--
\connect tfcserver
--
-- -------------------Add PostGIS extension -----------------------------
CREATE EXTENSION postgis;
--
\echo 'Extension PostGIS added to tfcserver database';
--
-- -------------------Change user to tfc_prod
--
set role tfc_prod;
--
-- -------------------Create tables -------------------------------------
--
-- Create table csn_sensors
--
BEGIN;
CREATE TABLE "csn_sensors" 
(   "id" serial NOT NULL PRIMARY KEY, 
    "info" jsonb NOT NULL
);
--
CREATE INDEX "idx_csn_sensors_info_sensor_id" ON "csn_sensors" USING BTREE ((info->>'sensor_id'));
CREATE INDEX "idx_csn_sensors_info_sensor_type" ON "csn_sensors" USING BTREE ((info->>'sensor_type'));
CREATE UNIQUE INDEX "idx_csn_sensors_info_sensor_id_and_type" ON "csn_sensors" ((info->>'sensor_id'),(info->>'sensor_type'));
CREATE INDEX "idx_csn_sensors_info_destination_id" ON "csn_sensors" USING BTREE ((info->>'destination_id'));
--
\echo 'Table csn_sensors created';
COMMIT;
--
-- Create table csn_destinations
--
BEGIN;
CREATE TABLE "csn_destinations" 
(   "id" serial NOT NULL PRIMARY KEY, 
    "info" jsonb NOT NULL
);
--
CREATE INDEX "idx_csn_destinations_info_destination_id" ON "csn_destinations" USING BTREE ((info->>'destination_id'));
CREATE INDEX "idx_csn_destinations_info_user_id" ON "csn_destinations" USING BTREE ((info->>'user_id'));
--
\echo 'Table csn_destinations created';
COMMIT;
--
-- Create table csn_sensordata
--
BEGIN;
CREATE TABLE "csn_sensordata" 
(   "id" serial NOT NULL PRIMARY KEY, 
    "ts" timestamp with time zone NOT NULL, 
    "location_4d" geography(POINTZM,4326) NOT NULL, 
    "info" jsonb NOT NULL
);
--
CREATE INDEX "idx_csn_sensordata_info_sensor_id" ON "csn_sensordata" USING BTREE ((info->>'sensor_id'));
CREATE INDEX "idx_csn_sensordata_info_sensor_type" ON "csn_sensordata" USING BTREE ((info->>'sensor_type'));
CREATE INDEX "idx_csn_sensordata_timestamp" ON "csn_sensordata" USING BTREE ("ts" );
CREATE INDEX "idx_csn_sensordata_location_4d" ON "csn_sensordata" USING GIST ("location_4d" );
-- (debug, from django) CREATE INDEX "csn_sensordata_device_id_bdd1e719_like" ON "csn_sensordata" ("device_id" varchar_pattern_ops);
--
\echo 'Table csn_sensors created';
COMMIT;
--
\q

