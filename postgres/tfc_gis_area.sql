--
-- PostgreSQL database dump
--

-- Dumped from database version 9.5.6
-- Dumped by pg_dump version 9.5.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: tfc_gis_area; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE tfc_gis_area (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    poly geometry(Polygon,4326) NOT NULL,
    image character varying(100)
);


--
-- Name: tfc_gis_area_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE tfc_gis_area_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tfc_gis_area_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE tfc_gis_area_id_seq OWNED BY tfc_gis_area.id;


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY tfc_gis_area ALTER COLUMN id SET DEFAULT nextval('tfc_gis_area_id_seq'::regclass);


--
-- Data for Name: tfc_gis_area; Type: TABLE DATA; Schema: public; Owner: -
--

COPY tfc_gis_area (id, name, poly, image) FROM stdin;
1	Cambridge	0103000020E6100000010000001E000000801EF0FFFF8ABA3FC83A498B44144A40DA27F6FFBF7AC03FF76C02167B154A402821F5FF7F31C23FEB67D295E2154A40D733F4FF3FBBC33F5256736121154A40598BF3FF7FD4C43FEE64571505164A407226F2FFBF28C73F0A55CFE2CD154A407C09F2FFBF55C73F5BFFDE0F71194A40B167F2FF3FB8C63FB461B8CD461A4A409698F2FF7F69C63F988B6B68E41B4A401A4AF3FFFF44C53F35407B9FD61B4A40E81FF4FFFFDCC33F13379DA4131D4A40E5EBF2FF7FE2C53FA0755223F01D4A40E81FF4FFFFDCC33FBFE42743651E4A406EABF4FFBFF0C23FA3E312017B1D4A40DB01F6FFFFB2C03F60ED2909351E4A4071D3EDFFFF68BE3FC21AA53CAB1D4A401A11EEFF7FF8BD3FF6A6EB342F1D4A402574EFFF7FAFBB3F04ACF0AC8F1D4A40CCB6F3FFFF90B43F988B6B68E41B4A40539CF5FFFF66B13F37D6EE5FA61B4A404156F4FFFF82B33F71DA26F57D1A4A40CCB6F3FFFF90B43F27CECD54241A4A409364F1FFFF6EB83F35CCA8954E194A40E3F7F0FFFF22B93FB868816494184A40A3F6EFFF7FCEBA3F71359F8748184A40ECDAF0FFFF4FB93FE6C49C873B174A405B92F0FFFFD6B93F7059A5926C164A4004D0F0FF7F66B93FF76B7462F0154A40EFD5EFFFFF11BB3F5DFFB82FB9154A40801EF0FFFF8ABA3FC83A498B44144A40	./Cambridge.jpg
\.


--
-- Name: tfc_gis_area_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('tfc_gis_area_id_seq', 2, true);


--
-- Name: tfc_gis_area_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY tfc_gis_area
    ADD CONSTRAINT tfc_gis_area_pkey PRIMARY KEY (id);


--
-- Name: tfc_gis_area_poly_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tfc_gis_area_poly_id ON tfc_gis_area USING gist (poly);


--
-- Name: tfc_gis_area; Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON TABLE tfc_gis_area FROM PUBLIC;
REVOKE ALL ON TABLE tfc_gis_area FROM tfcwebuser;
GRANT ALL ON TABLE tfc_gis_area TO tfcwebuser;
GRANT ALL ON TABLE tfc_gis_area TO tfc_prod;


--
-- PostgreSQL database dump complete
--

