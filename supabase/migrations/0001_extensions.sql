-- 0001_extensions.sql
-- Enable pgcrypto for gen_random_uuid().

create extension if not exists "pgcrypto";
