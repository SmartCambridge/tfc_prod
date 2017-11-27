-- Setup database for the TFC (historical) API
-- Asumes user tfc_prod already created by the tfc_web_psql_setup.sql script
CREATE DATABASE tfcapi;
GRANT ALL PRIVILEGES ON DATABASE tfcapi TO tfc_prod;
\connect tfcapi
CREATE EXTENSION postgis;
\q

