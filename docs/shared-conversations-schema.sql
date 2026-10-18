-- Draft migration only. Apply through the existing reviewed migration process.
-- Uses existing server-owned identity IDs; no development-header/public grants.
BEGIN;
CREATE TABLE IF NOT EXISTS tay_shared_conversations (
 tenant_id text NOT NULL, user_id text NOT NULL, id text NOT NULL,
 version bigint NOT NULL DEFAULT 0 CHECK(version>=0),
 active_request text, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,user_id,id)
);
CREATE TABLE IF NOT EXISTS tay_shared_turns (
 tenant_id text NOT NULL,user_id text NOT NULL,conversation_id text NOT NULL,
 request_id text NOT NULL,input_hash text NOT NULL,
 status text NOT NULL CHECK(status IN('active','complete','incomplete')),
 lease text NOT NULL,expires_at timestamptz NOT NULL,receipt jsonb,
 PRIMARY KEY(tenant_id,user_id,conversation_id,request_id),
 FOREIGN KEY(tenant_id,user_id,conversation_id)
 REFERENCES tay_shared_conversations(tenant_id,user_id,id)
);
CREATE TABLE IF NOT EXISTS tay_shared_messages (
 tenant_id text NOT NULL,user_id text NOT NULL,conversation_id text NOT NULL,
 seq bigint NOT NULL,request_id text NOT NULL,
 role text NOT NULL CHECK(role IN('user','assistant')),content text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,user_id,conversation_id,seq),
 FOREIGN KEY(tenant_id,user_id,conversation_id,request_id)
 REFERENCES tay_shared_turns(tenant_id,user_id,conversation_id,request_id)
);
-- No automatic migration or public table permission. Server-only least-privilege role.
REVOKE ALL ON tay_shared_conversations,tay_shared_turns,tay_shared_messages FROM PUBLIC;
COMMIT;
