import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("migration enforces PostgreSQL ownership, references, validation and private storage", async (t) => {
  const db = new PGlite();
  const a = "11111111-1111-4111-8111-111111111111",
    b = "22222222-2222-4222-8222-222222222222";
  const tradeA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    tradeB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
      grant usage on schema auth,storage to authenticated,anon;
      grant select,insert,update,delete on storage.objects to authenticated;
    `);
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/001_foundation.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(`insert into auth.users(id) values('${a}'),('${b}');`);
    const asUser = async (id: string) => {
      await db.exec(
        `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
      );
    };
    const count = async (sql: string) =>
      Number((await db.query<{ n: number }>(sql)).rows[0].n);
    await t.test(
      "signup provision and shared specs are readable only in authenticated context",
      async () => {
        await asUser(a);
        assert.equal(
          await count("select count(*) as n from public.profiles"),
          1,
        );
        assert.equal(
          await count(
            "select count(*) as n from public.futures_contract_specs",
          ),
          8,
        );
        await db.exec(
          `insert into public.trades(id,user_id,trade_date,symbol,tick_size,point_value,direction,status) values('${tradeA}','${a}','2026-11-05','NQ',0.25,20,'long','draft');`,
        );
        await asUser(b);
        await db.exec(
          `insert into public.trades(id,user_id,trade_date,symbol,tick_size,point_value,direction,status) values('${tradeB}','${b}','2026-11-05','NQ',0.25,20,'long','draft');`,
        );
      },
    );
    await t.test(
      "users cannot read or mutate another owner and cannot change shared contracts",
      async () => {
        await asUser(b);
        assert.equal(await count("select count(*) as n from public.trades"), 1);
        assert.equal(
          (
            await db.query(
              `update public.trades set symbol='ES' where id='${tradeA}' returning id`,
            )
          ).rows.length,
          0,
        );
        assert.equal(
          (
            await db.query(
              `delete from public.trades where id='${tradeA}' returning id`,
            )
          ).rows.length,
          0,
        );
        await assert.rejects(
          db.exec(
            `insert into public.trades(user_id,trade_date,symbol,tick_size,point_value,direction,status) values('${a}','2026-11-05','NQ',.25,20,'long','draft')`,
          ),
          /row-level security/,
        );
        assert.equal(
          (
            await db.query(
              "update public.futures_contract_specs set point_value=1 where symbol='NQ' returning id",
            )
          ).rows.length,
          0,
        );
      },
    );
    await t.test(
      "composite foreign keys prevent cross-owner screenshot attachment",
      async () => {
        await asUser(b);
        await assert.rejects(
          db.exec(
            `insert into public.trade_screenshots(user_id,trade_id,object_path) values('${b}','${tradeA}','${b}/trade/other/chart.png')`,
          ),
          /foreign key/,
        );
        await asUser(a);
        await assert.rejects(
          db.exec(
            `insert into public.trade_screenshots(user_id,trade_id,object_path) values('${a}','${tradeA}','${b}/chart.png')`,
          ),
          /check constraint/,
        );
        await db.exec(
          `insert into public.trade_screenshots(user_id,trade_id,object_path) values('${a}','${tradeA}','${a}/trade/${tradeA}/chart.png');`,
        );
      },
    );
    await t.test("storage objects are private and owner-prefixed", async () => {
      await asUser(a);
      await db.exec(
        `insert into storage.objects(bucket_id,name) values('screenshots','${a}/trade/${tradeA}/chart.png')`,
      );
      await asUser(b);
      assert.equal(await count("select count(*) as n from storage.objects"), 0);
      await assert.rejects(
        db.exec(
          `insert into storage.objects(bucket_id,name) values('screenshots','${a}/stolen.png')`,
        ),
        /row-level security/,
      );
      assert.equal(
        (
          await db.query(
            `delete from storage.objects where name='${a}/trade/${tradeA}/chart.png' returning id`,
          )
        ).rows.length,
        0,
      );
    });
    await t.test(
      "database rejects invalid ticks, stops and duplicate daily reflections",
      async () => {
        await asUser(a);
        await assert.rejects(
          db.exec(
            `update public.trades set entry_price=20000.1 where id='${tradeA}'`,
          ),
          /check constraint/,
        );
        await assert.rejects(
          db.exec(
            `update public.trades set entry_price=20000,stop_price=20010 where id='${tradeA}'`,
          ),
          /check constraint/,
        );
        await db.exec(
          `insert into public.journal_entries(user_id,entry_date) values('${a}','2026-11-05')`,
        );
        await assert.rejects(
          db.exec(
            `insert into public.journal_entries(user_id,entry_date) values('${a}','2026-11-05')`,
          ),
          /unique constraint/,
        );
      },
    );
    await t.test(
      "anonymous access is denied and bulk delete affects only the current user",
      async () => {
        await db.exec("reset role;set role anon;");
        await assert.rejects(
          db.query("select * from public.trades"),
          /permission denied/,
        );
        await assert.rejects(
          db.exec("select public.delete_journal_data()"),
          /permission denied/,
        );
        await asUser(a);
        await db.exec("select public.delete_journal_data()");
        assert.equal(await count("select count(*) as n from public.trades"), 0);
        assert.equal(
          await count("select count(*) as n from public.trade_screenshots"),
          0,
        );
        await asUser(b);
        assert.equal(await count("select count(*) as n from public.trades"), 1);
      },
    );
  } finally {
    await db.close();
  }
});
