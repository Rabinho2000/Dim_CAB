/* Base de dados SQLite (node:sqlite): documentos JSON por coleção, histórico de todas as gravações e um contador de revisão
   que a página consulta para saber se há alterações de outras pessoas. */
const fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');

function openDb(file){
  if(file!==':memory:')fs.mkdirSync(path.dirname(file),{recursive:true});
  const db=new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS docs(col TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,upd TEXT NOT NULL,PRIMARY KEY(col,id));
    CREATE TABLE IF NOT EXISTS history(n INTEGER PRIMARY KEY AUTOINCREMENT,col TEXT NOT NULL,id TEXT NOT NULL,op TEXT NOT NULL,data TEXT,autor TEXT,ts TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS history_doc ON history(col,id);
    CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY,v INTEGER NOT NULL);
    INSERT OR IGNORE INTO meta VALUES('rev',0);
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,seen TEXT NOT NULL);`);
  const q={
    rev:db.prepare(`SELECT v FROM meta WHERE k='rev'`),bump:db.prepare(`UPDATE meta SET v=v+1 WHERE k='rev'`),
    list:db.prepare(`SELECT id,data FROM docs WHERE col=? ORDER BY upd DESC`),get:db.prepare(`SELECT id,data FROM docs WHERE col=? AND id=?`),
    put:db.prepare(`INSERT INTO docs(col,id,data,upd) VALUES(?,?,?,?) ON CONFLICT(col,id) DO UPDATE SET data=excluded.data,upd=excluded.upd`),
    del:db.prepare(`DELETE FROM docs WHERE col=? AND id=?`),
    hist:db.prepare(`INSERT INTO history(col,id,op,data,autor,ts) VALUES(?,?,?,?,?,?)`),
    hlist:db.prepare(`SELECT n,op,autor,ts,data FROM history WHERE col=? AND id=? ORDER BY n DESC LIMIT 100`),
    user:db.prepare(`INSERT INTO users VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,seen=excluded.seen`),
    uget:db.prepare(`SELECT name FROM users WHERE id=?`)};
  const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}};
  const row=r=>r&&{id:r.id,data:JSON.parse(r.data)};
  return {
    rev:()=>q.rev.get().v,
    list:col=>q.list.all(col).map(row),
    get:(col,id)=>row(q.get.get(col,id)),
    put:(col,id,data,autor)=>tx(()=>{const ts=new Date().toISOString(),s=JSON.stringify(data);q.put.run(col,id,s,ts);q.hist.run(col,id,'put',s,autor,ts);q.bump.run();}),
    del:(col,id,autor)=>tx(()=>{q.del.run(col,id);q.hist.run(col,id,'del',null,autor,new Date().toISOString());q.bump.run();}),
    history:(col,id)=>q.hlist.all(col,id).map(h=>({n:h.n,op:h.op,autor:h.autor,ts:h.ts,data:h.data?JSON.parse(h.data):null})),
    seen:(id,name)=>q.user.run(id,name,new Date().toISOString()),
    names:ids=>Object.fromEntries(ids.map(i=>[i,{name:(q.uget.get(i)||{}).name||''}])),
    /* cópia consistente da base, mesmo com o servidor a correr (SQLite VACUUM INTO) */
    backup:file=>{db.exec(`VACUUM INTO '${String(file).replace(/'/g,"''")}'`);},
    close:()=>db.close()};
}
module.exports={openDb};
