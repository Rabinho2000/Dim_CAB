/* testes da API do servidor (node --test tests/api.test.js): base em memória, porta livre */
const test=require('node:test');const assert=require('node:assert/strict');
const {createServer}=require('../server/server.js');

let srv,base;
test.before(async()=>{srv=createServer({dbPath:':memory:',admins:'local:chefe'});await new Promise(r=>srv.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${srv.address().port}`;});
test.after(()=>new Promise(r=>srv.close(r)));
const api=async(method,path,{user,body,headers}={})=>{
  const h={...(user?{'X-User-Name':encodeURIComponent(user)}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers};
  const r=await fetch(base+path,{method,headers:h,body:body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body)});
  return {status:r.status,json:/json/.test(r.headers.get('content-type')||'')?await r.json():null};};

test('sem nome: /api/me dá 401 e a escrita é recusada',async()=>{
  assert.equal((await api('GET','/api/me')).status,401);
  assert.equal((await api('PUT','/api/projects/p1',{body:{nome:'x'}})).status,401);
});

test('identidade local e via Tailscale',async()=>{
  const a=await api('GET','/api/me',{user:'Ana Silva'});
  assert.equal(a.status,200);assert.equal(a.json.id,'local:ana silva');assert.equal(a.json.verified,false);
  const t=await api('GET','/api/me',{headers:{'Tailscale-User-Login':'Rui@Solcor.pt','Tailscale-User-Name':'Rui'}});
  assert.equal(t.json.id,'rui@solcor.pt');assert.equal(t.json.name,'Rui');assert.equal(t.json.verified,true);
});

test('projeto: criar, listar, atualizar mantém o autor, histórico',async()=>{
  const r0=(await api('GET','/api/rev')).json.rev;
  assert.equal((await api('PUT','/api/projects/p1',{user:'Ana',body:{nome:'Obra A',s:{invs:[]}}})).status,200);
  assert.ok((await api('GET','/api/rev')).json.rev>r0,'a revisão sobe a cada gravação');
  const l=await api('GET','/api/projects',{user:'Rui'});
  const p=l.json.docs.find(d=>d.id==='p1');assert.equal(p.data.nome,'Obra A');assert.equal(p.data.autor,'local:ana');
  await api('PUT','/api/projects/p1',{user:'Rui',body:{nome:'Obra A v2',autor:'local:rui'}});
  const g=(await api('GET','/api/projects/p1',{user:'Rui'})).json.data;
  assert.equal(g.nome,'Obra A v2');assert.equal(g.autor,'local:ana','o autor não muda');assert.equal(g.edit,'local:rui');
  const h=(await api('GET','/api/projects/p1/history',{user:'Ana'})).json.history;
  assert.deepEqual(h.map(x=>[x.op,x.autor,x.data.nome]),[['put','local:rui','Obra A v2'],['put','local:ana','Obra A']]);
});

test('conflito: gravar sobre uma versão antiga dá 409 com a versão atual',async()=>{
  const v1=(await api('PUT','/api/projects/c1',{user:'Ana',body:{nome:'V1'}})).json.upd;assert.ok(v1);
  const v2=(await api('PUT','/api/projects/c1',{user:'Rui',body:{nome:'V2'},headers:{'If-Match':v1}}));
  assert.equal(v2.status,200,'a versão certa grava');
  const c=await api('PUT','/api/projects/c1',{user:'Ana',body:{nome:'V3'},headers:{'If-Match':v1}});
  assert.equal(c.status,409);assert.equal(c.json.current.nome,'V2');assert.equal(c.json.current.edit,'local:rui');
  assert.equal((await api('GET','/api/projects/c1',{user:'Ana'})).json.data.nome,'V2','nada foi gravado');
  assert.equal((await api('PUT','/api/projects/c1',{user:'Ana',body:{nome:'V3'}})).status,200,'sem If-Match substitui');
  assert.equal((await api('PUT','/api/projects/novo',{user:'Ana',body:{nome:'N'},headers:{'If-Match':'qualquer'}})).status,200,'documento novo não tem conflito');
});

test('aprovação: regista quem aprova, fica só de leitura, só o estado avança, nova revisão desbloqueia',async()=>{
  const s=r=>({obra:{rev:r,aprov:{id:'local:falso',nome:'Falso',em:'2000-01-01'},estado:'aprovado'}});
  /* a página não consegue fingir uma aprovação: sem lock, aprov e estado aprovado são limpos */
  let r=await api('PUT','/api/projects/ap1',{user:'Ana',body:{nome:'Obra',rev:'A',estado:'aprovado',s:s('A')}});
  let d=(await api('GET','/api/projects/ap1',{user:'Ana'})).json.data;
  assert.equal(d.lock,false);assert.equal(d.aprov,null);assert.equal(d.estado,'rascunho');assert.equal(d.s.obra.aprov,null);
  /* aprovar: o servidor regista a identidade do pedido */
  r=await api('PUT','/api/projects/ap1',{user:'Rui',body:{nome:'Obra',rev:'A',estado:'analise',lock:true,s:s('A')}});
  assert.equal(r.status,200);assert.equal(r.json.aprov.id,'local:rui');assert.equal(r.json.estado,'aprovado');
  d=(await api('GET','/api/projects/ap1',{user:'Ana'})).json.data;
  assert.equal(d.lock,true);assert.equal(d.aprov.nome,'Rui');assert.equal(d.s.obra.aprov.id,'local:rui');assert.equal(d.s.obra.estado,'aprovado');
  /* só de leitura */
  r=await api('PUT','/api/projects/ap1',{user:'Ana',body:{nome:'Mudada',rev:'A',s:s('A')}});
  assert.equal(r.status,423);assert.equal(r.json.current.rev,'A');
  assert.equal((await api('DELETE','/api/projects/ap1',{user:'Ana'})).status,423,'nem a autora apaga uma revisão aprovada');
  /* estado: só os de depois da aprovação, e o resto não muda */
  assert.equal((await api('POST','/api/projects/ap1/estado',{user:'Ana',body:{estado:'rascunho'}})).status,400);
  assert.equal((await api('POST','/api/projects/ap1/estado',{user:'Ana',body:{estado:'obra'}})).status,200);
  d=(await api('GET','/api/projects/ap1',{user:'Ana'})).json.data;
  assert.equal(d.estado,'obra');assert.equal(d.s.obra.estado,'obra');assert.equal(d.lock,true);assert.equal(d.nome,'Obra');
  /* nova revisão: desbloqueia, sem aprovação; a revisão A aprovada fica no histórico */
  r=await api('PUT','/api/projects/ap1',{user:'Ana',body:{nome:'Obra B',rev:'B',estado:'rascunho',s:s('B')},headers:{'X-New-Revision':'1'}});
  assert.equal(r.status,200);
  d=(await api('GET','/api/projects/ap1',{user:'Ana'})).json.data;
  assert.equal(d.lock,false);assert.equal(d.aprov,null);assert.equal(d.rev,'B');assert.equal(d.s.obra.aprov,null);
  const h=(await api('GET','/api/projects/ap1/history',{user:'Ana'})).json.history;
  assert.ok(h.some(v=>v.data&&v.data.lock&&v.data.rev==='A'&&v.data.aprov.id==='local:rui'),'a revisão A aprovada está no histórico');
  /* estado por esta via só com revisão aprovada */
  assert.equal((await api('POST','/api/projects/ap1/estado',{user:'Ana',body:{estado:'obra'}})).status,400);
});

test('projeto aprovado: só um administrador o pode apagar',async()=>{
  await api('PUT','/api/projects/ap2',{user:'Ana',body:{nome:'X',lock:true,s:{obra:{}}}});
  assert.equal((await api('DELETE','/api/projects/ap2',{user:'Ana'})).status,423,'nem a autora');
  assert.equal((await api('DELETE','/api/projects/ap2',{user:'Chefe'})).status,200);
});

test('apagar projeto: só o autor ou um administrador',async()=>{
  await api('PUT','/api/projects/p2',{user:'Ana',body:{nome:'Obra B'}});
  assert.equal((await api('DELETE','/api/projects/p2',{user:'Rui'})).status,403);
  assert.equal((await api('DELETE','/api/projects/p2',{user:'Chefe'})).status,200);
  assert.equal((await api('GET','/api/projects/p2',{user:'Ana'})).status,404);
  await api('PUT','/api/projects/p3',{user:'Ana',body:{nome:'Obra C'}});
  assert.equal((await api('DELETE','/api/projects/p3',{user:'Ana'})).status,200);
});

test('equipamentos: qualquer pessoa grava e apaga',async()=>{
  assert.equal((await api('PUT','/api/inversores/INV-X',{user:'Ana',body:{modelo:'INV-X',pnom:10,iacmax:16}})).status,200);
  assert.equal((await api('DELETE','/api/inversores/INV-X',{user:'Rui'})).status,200);
});

test('nomes dos autores',async()=>{
  const n=(await api('GET','/api/users?ids=local:ana,local:ninguem',{user:'Rui'})).json;
  assert.equal(n['local:ana'].name,'Ana');assert.equal(n['local:ninguem'].name,'');
});

test('pedidos inválidos',async()=>{
  assert.equal((await api('GET','/api/outra',{user:'Ana'})).status,404);
  assert.equal((await api('PUT','/api/projects/a%20b',{user:'Ana',body:{}})).status,400);
  assert.equal((await api('PUT','/api/projects/p9',{user:'Ana',body:'{nao json'})).status,400);
  assert.equal((await api('PUT','/api/projects/p9',{user:'Ana',body:[1,2]})).status,400);
  assert.equal((await api('PUT','/api/projects/p9',{user:'Ana',body:{x:'a'.repeat(6*1024*1024)}})).status,413);
  assert.equal((await api('POST','/api/projects/p9',{user:'Ana',body:{}})).status,405);
});

test('cópias de segurança: automática ao arrancar, rodação e descarga só para administradores',async()=>{
  const os=require('node:os'),fs=require('node:fs'),path=require('node:path');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'solcor-bk-')),dbp=path.join(dir,'t.db');
  const s2=createServer({dbPath:dbp,admins:'local:chefe',backupHours:24,backupKeep:2});await new Promise(r=>s2.listen(0,'127.0.0.1',r));
  const b2=`http://127.0.0.1:${s2.address().port}`,bk=path.join(dir,'backups');
  try{
    assert.equal(fs.readdirSync(bk).length,1,'uma cópia ao arrancar (não havia nenhuma)');
    await fetch(b2+'/api/projects/x',{method:'PUT',headers:{'X-User-Name':'Ana','Content-Type':'application/json'},body:JSON.stringify({nome:'X'})});
    for(let i=0;i<3;i++){await new Promise(r=>setTimeout(r,1100));s2.backupNow();}
    assert.equal(fs.readdirSync(bk).length,2,'fica só com as 2 mais recentes (BACKUP_KEEP)');
    const {DatabaseSync}=require('node:sqlite');const last=fs.readdirSync(bk).sort().pop();const c=new DatabaseSync(path.join(bk,last));
    assert.equal(c.prepare("SELECT count(*) n FROM docs WHERE col='projects'").get().n,1,'a cópia tem o projeto');c.close();
    assert.equal((await fetch(b2+'/api/backup',{headers:{'X-User-Name':'Ana'}})).status,403);
    const r=await fetch(b2+'/api/backup',{headers:{'X-User-Name':'Chefe'}});assert.equal(r.status,200);
    const buf=Buffer.from(await r.arrayBuffer());assert.equal(buf.subarray(0,15).toString(),'SQLite format 3','descarrega uma base SQLite');
  }finally{await new Promise(r=>s2.close(r));}
});

test('a página é servida na raiz',async()=>{
  const r=await fetch(base+'/');assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/text\/html/);
  assert.match(await r.text(),/apiConnect/);
});
