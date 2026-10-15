/* Servidor da ferramenta: serve cabos-rt.html e uma API JSON com os projetos e equipamentos partilhados (SQLite).
   Sem dependências: node:http + node:sqlite (Node ≥ 22.13).

   Identidade (quem está a usar):
   - atrás do `tailscale serve`, os cabeçalhos Tailscale-User-Login / Tailscale-User-Name (fiáveis porque o
     servidor só escuta em 127.0.0.1 e é o Tailscale que faz de proxy);
   - senão, o nome que a página envia em X-User-Name (modo local / desenvolvimento: não é autenticação).
   Administradores (podem apagar projetos de outros): variável ADMINS, e-mails separados por vírgulas.

   Variáveis: PORT (8080), HOST (127.0.0.1), DB_PATH (data/solcor.db), ADMINS, HTML (cabos-rt.html). */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {openDb}=require('./db.js');

const ROOT=path.join(__dirname,'..');
const COLS=new Set(['projects','inversores','paineis','gateways','precos']);
const MAX_BODY=5*1024*1024;

function identity(req,admins){
  const tsLogin=req.headers['tailscale-user-login'];
  if(tsLogin){const name=decodeURIComponent(req.headers['tailscale-user-name']||tsLogin);return {id:String(tsLogin).toLowerCase(),name,verified:true,admin:admins.has(String(tsLogin).toLowerCase())};}
  const raw=req.headers['x-user-name'];if(!raw)return null;
  const name=decodeURIComponent(String(raw)).trim().slice(0,80);if(!name)return null;
  const id='local:'+name.toLowerCase();return {id,name,verified:false,admin:admins.has(id)||admins.has(name.toLowerCase())};
}
const send=(res,code,obj)=>{const b=JSON.stringify(obj);res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(b);};
function readBody(req){return new Promise((ok,ko)=>{let n=0;const parts=[];
  /* acima do limite continua a ler (e a descartar) até ao fim, para poder responder 413 */
  req.on('data',c=>{n+=c.length;if(n<=MAX_BODY)parts.push(c);});
  req.on('end',()=>{if(n>MAX_BODY)return ko(Object.assign(new Error('too_large'),{code:413}));try{ok(JSON.parse(Buffer.concat(parts).toString('utf8')||'null'));}catch(e){ko(Object.assign(new Error('bad_json'),{code:400}));}});
  req.on('error',ko);});}

function createServer(opts={}){
  const db=openDb(opts.dbPath||process.env.DB_PATH||path.join(ROOT,'data','solcor.db'));
  const admins=new Set(String(opts.admins??process.env.ADMINS??'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean));
  const htmlPath=opts.html||process.env.HTML||path.join(ROOT,'cabos-rt.html');
  /* cópias de segurança automáticas: a cada BACKUP_HOURS (24; 0 desliga) para BACKUP_DIR (backups/ ao lado da base), guarda as BACKUP_KEEP (14) mais recentes */
  const dbFile=opts.dbPath||process.env.DB_PATH||path.join(ROOT,'data','solcor.db');
  const bkDir=opts.backupDir||process.env.BACKUP_DIR||(dbFile===':memory:'?null:path.join(path.dirname(dbFile),'backups'));
  const bkHours=+(opts.backupHours??process.env.BACKUP_HOURS??24),bkKeep=Math.max(1,+(opts.backupKeep??process.env.BACKUP_KEEP??14));
  const stamp=()=>new Date().toISOString().replace(/[-:]/g,'').replace(/\..*/,'').replace('T','-');
  function doBackup(){
    if(!bkDir)return null;fs.mkdirSync(bkDir,{recursive:true});const f=path.join(bkDir,`solcor-${stamp()}.db`);
    if(fs.existsSync(f))return f;db.backup(f);
    const old=fs.readdirSync(bkDir).filter(n=>/^solcor-\d{8}-\d{6}\.db$/.test(n)).sort().reverse().slice(bkKeep);
    old.forEach(n=>{try{fs.unlinkSync(path.join(bkDir,n));}catch(e){}});return f;
  }
  let bkTimer=null;
  if(bkDir&&bkHours>0){
    const last=fs.existsSync(bkDir)?fs.readdirSync(bkDir).filter(n=>/^solcor-\d{8}-\d{6}\.db$/.test(n)).sort().pop():null;
    const lastT=last?fs.statSync(path.join(bkDir,last)).mtimeMs:0;
    if(Date.now()-lastT>bkHours*3600e3)try{doBackup();}catch(e){console.error('cópia de segurança:',e.message);}
    bkTimer=setInterval(()=>{try{doBackup();}catch(e){console.error('cópia de segurança:',e.message);}},bkHours*3600e3);bkTimer.unref();
  }

  const server=http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://x');const p=url.pathname;
      if(req.method==='GET'&&(p==='/'||p==='/index.html')){
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});return fs.createReadStream(htmlPath).pipe(res);}
      if(!p.startsWith('/api/'))return send(res,404,{error:'not_found'});
      const me=identity(req,admins);
      if(p==='/api/me'){if(me)db.seen(me.id,me.name);return send(res,me?200:401,me||{error:'no_user'});}
      if(p==='/api/rev')return send(res,200,{rev:db.rev()});
      if(!me)return send(res,401,{error:'no_user'});
      db.seen(me.id,me.name);
      /* descarregar uma cópia da base agora (só administradores) */
      if(p==='/api/backup'){if(!me.admin)return send(res,403,{error:'forbidden'});
        const tmp=path.join(require('node:os').tmpdir(),`solcor-${process.pid}-${Date.now()}.db`);db.backup(tmp);
        res.writeHead(200,{'Content-Type':'application/vnd.sqlite3','Content-Disposition':`attachment; filename="solcor-${stamp()}.db"`,'Cache-Control':'no-store'});
        const st=fs.createReadStream(tmp);st.pipe(res);st.on('close',()=>fs.unlink(tmp,()=>{}));return;}
      if(p==='/api/users')return send(res,200,db.names((url.searchParams.get('ids')||'').split(',').filter(Boolean).slice(0,200)));
      const m=p.match(/^\/api\/([a-z]+)(?:\/([^/]+))?(?:\/(history|estado|track))?$/);
      if(!m||!COLS.has(m[1]))return send(res,404,{error:'not_found'});
      const col=m[1],id=m[2]?decodeURIComponent(m[2]):null;
      if(id&&(id.length>150||!/^[A-Za-z0-9_.~:@+-]+$/.test(id)))return send(res,400,{error:'invalid_argument'});
      if(req.method==='GET'&&!id)return send(res,200,{rev:db.rev(),docs:db.list(col)});
      if(req.method==='GET'&&id&&m[3]==='history')return send(res,200,{history:db.history(col,id)});
      /* acompanhamento em obra: marcar um cabo como lançado / ligado / ensaiado (também com a revisão aprovada; não mexe no resto) */
      if(req.method==='POST'&&id&&m[3]==='track'&&col==='projects'){
        const body=await readBody(req);const old=db.get(col,id);if(!old)return send(res,404,{error:'not_found'});
        const code=String((body&&body.code)||''),step=body&&body.step;
        if(!/^C\d{1,4}$/.test(code)||!['lan','lig','ens'].includes(step))return send(res,400,{error:'invalid_argument'});
        const s=JSON.parse(JSON.stringify(old.data.s||{}));s.obra=s.obra||{};const tr=s.obra.track=s.obra.track||{};const t=tr[code]=tr[code]||{};
        if(body.done)t[step]={id:me.id,nome:me.name,em:new Date().toISOString()};else delete t[step];if(!Object.keys(t).length)delete tr[code];
        const data={...old.data,s,upd:new Date().toISOString(),edit:me.id};
        db.put(col,id,data,me.id);return send(res,200,{id,rev:db.rev(),upd:data.upd,mark:t[step]||null});}
      /* revisão aprovada: só o estado avança (aprovado → em obra → concluído), sem tocar no resto do projeto */
      if(req.method==='POST'&&id&&m[3]==='estado'&&col==='projects'){
        const body=await readBody(req);const old=db.get(col,id);if(!old)return send(res,404,{error:'not_found'});
        if(!old.data.lock||!['aprovado','obra','concluido'].includes(body&&body.estado))return send(res,400,{error:'invalid_argument'});
        const data={...old.data,estado:body.estado,upd:new Date().toISOString(),edit:me.id};
        if(data.s&&data.s.obra)data.s={...data.s,obra:{...data.s.obra,estado:body.estado}};
        db.put(col,id,data,me.id);return send(res,200,{id,rev:db.rev(),upd:data.upd});}
      if(req.method==='GET'&&id){const d=db.get(col,id);return d?send(res,200,d):send(res,404,{error:'not_found'});}
      if(req.method==='PUT'&&id){
        const body=await readBody(req);
        if(!body||typeof body!=='object'||Array.isArray(body))return send(res,400,{error:'invalid_argument'});
        const old=db.get(col,id);
        /* If-Match: data (upd) da versão em que a pessoa estava a trabalhar; se entretanto alguém gravou, 409 com a versão atual */
        const base=req.headers['if-match'];
        if(base&&old&&old.data.upd!==base)return send(res,409,{error:'conflict',current:old.data});
        /* o autor de um projeto mantém-se; quem grava fica em "edit" */
        const data={...body,autor:old&&old.data.autor?old.data.autor:me.id,upd:new Date().toISOString()};
        if(old&&col==='projects')data.edit=me.id;
        if(col==='projects'){
          /* revisão aprovada = só de leitura; para alterar, nova revisão (X-New-Revision: 1). A aprovação regista quem a fez
             a partir da identidade do pedido, nunca do que a página envia. */
          const newRev=req.headers['x-new-revision']==='1',locked=!!(old&&old.data.lock);
          if(locked&&!newRev)return send(res,423,{error:'locked',current:{rev:old.data.rev,aprov:old.data.aprov,estado:old.data.estado}});
          const now=data.upd,obra=data.s&&data.s.obra?data.s.obra:null;
          if(body.lock===true&&!locked&&!newRev){data.lock=true;data.estado='aprovado';data.aprov={id:me.id,nome:me.name,em:now};}
          else{data.lock=false;data.aprov=null;if(data.estado==='aprovado'||data.estado==='obra'||data.estado==='concluido')data.estado='rascunho';}
          if(obra)data.s={...data.s,obra:{...obra,estado:data.estado,aprov:data.aprov,rev:data.rev||obra.rev||'A'}};}
        db.put(col,id,data,me.id);return send(res,200,{id,rev:db.rev(),upd:data.upd,aprov:data.aprov||null,estado:data.estado});}
      if(req.method==='DELETE'&&id){
        const old=db.get(col,id);if(!old)return send(res,404,{error:'not_found'});
        if(col==='projects'&&old.data.autor!==me.id&&!me.admin)return send(res,403,{error:'forbidden'});
        if(col==='projects'&&old.data.lock&&!me.admin)return send(res,423,{error:'locked'});
        db.del(col,id,me.id);return send(res,200,{id,rev:db.rev()});}
      return send(res,405,{error:'method_not_allowed'});
    }catch(e){
      if(e.code===400||e.code===413)return send(res,e.code,{error:e.message});
      console.error(e);return send(res,500,{error:'internal'});}
  });
  server.on('close',()=>{if(bkTimer)clearInterval(bkTimer);db.close();});
  server.backupNow=doBackup;
  return server;
}

if(require.main===module){
  const port=+process.env.PORT||8080,host=process.env.HOST||'127.0.0.1';
  if(!fs.existsSync(path.join(ROOT,'cabos-rt.html')))console.warn('Falta cabos-rt.html: corre primeiro "npm run build".');
  createServer().listen(port,host,()=>console.log(`Solcor cabos em http://${host}:${port}`));
}
module.exports={createServer};
