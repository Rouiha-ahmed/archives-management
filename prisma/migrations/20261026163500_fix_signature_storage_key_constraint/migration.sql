-- Use a character class for the literal dot so the check behaves consistently
-- with PostgreSQL standard-conforming strings.
ALTER TABLE "signatures"
DROP CONSTRAINT "signatures_storage_key_check";

ALTER TABLE "signatures"
ADD CONSTRAINT "signatures_storage_key_check"
CHECK ("storage_key" ~ '^signatures/[0-9a-f-]{36}[.]png$');
