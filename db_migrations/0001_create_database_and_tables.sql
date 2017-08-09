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
RAISE NOTICE 'Database tfcserver created';
--
\connect tfcserver
--
-- -------------------Add PostGIS extension -----------------------------
CREATE EXTENSION postgis;
--
RAISE NOTICE 'Extension PostGIS added to tfcserver database';
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
CREATE TABLE "csn_sensor" 
(   "id" serial NOT NULL PRIMARY KEY, 
    "info" jsonb NOT NULL
);
--
CREATE INDEX "idx_csn_sensor_info_sensor_id" ON "csn_sensor" USING BTREE ((info->>'sensor_id'));
CREATE INDEX "idx_csn_sensor_info_sensor_type" ON "csn_sensor" USING BTREE ((info->>'sensor_type'));
CREATE UNIQUE INDEX "idx_csn_sensor_info_sensor_id_and_type" ON "csn_sensor" ((info->>'sensor_id'),(info->>'sensor_type'));
CREATE INDEX "idx_csn_sensor_info_destination_id" ON "csn_sensor" USING BTREE ((info->>'destination_id'));
--
RAISE NOTICE 'Table csn_sensor created';
COMMIT;
--
-- Create table csn_destination
--
BEGIN;
CREATE TABLE "csn_destination" 
(   "id" serial NOT NULL PRIMARY KEY, 
    "info" jsonb NOT NULL
);
--
CREATE INDEX "idx_csn_destination_info_destination_id" ON "csn_destination" USING BTREE ((info->>'destination_id'));
CREATE INDEX "idx_csn_destination_info_user_id" ON "csn_destination" USING BTREE ((info->>'user_id'));
--
RAISE NOTICE 'Table csn_destination created';
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
RAISE NOTICE 'Table csn_sensordata created';
COMMIT;
--
\q

