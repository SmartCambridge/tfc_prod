-- Remove the read-only user tfcserver_r for the tfcserver database
--
-- Connect to database tfcserver
\connect tfcserver
--
-- -------------------Drop permissions owned by tfcserver_r ---------
DROP OWNED BY tfcserver_r;
-- -------------------Drop user -------------------------------------
DROP USER tfcserver_r;
--
\q

