import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { btree_gin } from '@electric-sql/pglite/contrib/btree_gin';
import fs from 'fs'; import path from 'path';
const dir='/workspace/work/Aidean/apps/web/prisma/migrations';
const db=new PGlite({extensions:{uuid_ossp,pg_trgm,btree_gin}});
for(const m of fs.readdirSync(dir).filter(d=>fs.statSync(path.join(dir,d)).isDirectory()).sort()){
  await db.exec(fs.readFileSync(path.join(dir,m,'migration.sql'),'utf8').replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;',''));}
const e=await db.query(`select t.typname, array_agg(e.enumlabel order by e.enumsortorder) l from pg_type t join pg_enum e on e.enumtypid=t.oid where t.typname in (select udt_name from information_schema.columns where table_name='ai_models' and column_name='model_type') or t.typname in (select udt_name from information_schema.columns where table_name='model_prices' and column_name in ('source_type','billing_mode')) group by 1`);
console.log(JSON.stringify(e.rows));
const mt=e.rows.find(r=>!['PriceSource','BillingMode'].includes(r.typname))?.l?.[0];
await db.exec(`insert into vendors(id,code,name,updated_at) values('v1','v1','V',now());
insert into ai_models(id,model_code,name_display,slug,vendor_id,model_type,updated_at) values('m1','m1','M1','m1','v1','${'1'}',now());`).catch(x=>console.log('seed err',x.message));
const ps=e.rows.find(r=>r.typname.toLowerCase().includes('pricesource'));
async function persist(round){ // 1:1 SQL of lib/sync/writers/index.ts persistPrices
  try{
    await db.exec('BEGIN');
    await db.query(`update model_prices set is_current=false, effective_until=now() where model_id='m1' and is_current=true`);
    await db.query(`insert into model_prices(id,model_id,price_input,price_output,effective_from,is_current) values($1,'m1',1,2,now(),true)`,['p'+round]);
    await db.exec('COMMIT'); console.log('round',round,'OK');
  }catch(x){ await db.exec('ROLLBACK'); console.log('round',round,'FAIL',x.code,x.message);}
}
// seed-equivalent first row
await db.query(`insert into model_prices(id,model_id,price_input,price_output,effective_from,is_current) values('p0','m1',1,2,now(),true)`);
await persist(1); await persist(2); await persist(3);
const c=await db.query(`select is_current,count(*)::int from model_prices group by 1`); console.log(JSON.stringify(c.rows));
// multi-price in one batch
await db.exec(`delete from model_prices`);
try{ await db.exec(`insert into model_prices(id,model_id,price_input,price_output,effective_from,is_current) values('a','m1',1,2,now(),true),('b','m1',1,2,now(),true)`);console.log('multi OK')}catch(x){console.log('multi FAIL',x.code,x.message)}
// promotion coexist: OFFICIAL current + PROMOTION current
await db.exec(`delete from model_prices`);
try{ await db.exec(`insert into model_prices(id,model_id,price_input,price_output,effective_from,is_current,source_type) values('o','m1',1,2,now(),true,'1'),('pr','m1',0,0,now(),true,'5')`);console.log('promo coexist OK')}catch(x){console.log('promo coexist FAIL',x.code,x.message)}
