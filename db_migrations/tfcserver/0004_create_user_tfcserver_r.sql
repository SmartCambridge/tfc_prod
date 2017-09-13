-- Create the read-only user tfcserver_r for the tfcserver database
--
-- Connect to database tfcserver
\connect tfcserver
--
-- -------------------Create user -------------------------------------
-- this is a temporary password
CREATE USER tfcserver_r WITH PASSWORD 'foo!x';
--
GRANT CONNECT ON DATABASE tfcserver TO tfcserver_r;
--
GRANT USAGE ON SCHEMA public TO tfcserver_r;
--
GRANT SELECT ON ALL TABLES IN SCHEMA public TO tfcserver_r;
--
\q

