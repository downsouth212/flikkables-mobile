INSERT INTO "api"."admins" ("email", "role", "granted_by")
VALUES ('david.mcmillan0212@gmail.com', 'master', 'seed')
ON CONFLICT ("email") DO UPDATE SET "role" = 'master';
