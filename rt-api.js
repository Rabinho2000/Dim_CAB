/* ---------- base partilhada no servidor próprio (server/server.js), com a mesma interface que claude.use('db'|'user') ---------- */
/* janela "Quem está a usar a ferramenta?": devolve o nome, ou '' com "Agora não" (fica só o projeto local) */
function askName(){return new Promise(ok=>{
  const d=document.createElement('div');d.className='modal';d.id='namedlg';
  d.innerHTML=`<div class="panel namedlg" role="dialog" aria-labelledby="namedlg-t"><div class="panel-head"><h2 id="namedlg-t">Quem está a usar a ferramenta?</h2></div>
    <p class="hint">O teu nome aparece nos projetos e equipamentos que guardares para a equipa e fica guardado neste navegador.</p>
    <form id="namedlg-f"><label>Nome<input id="namedlg-n" autocomplete="name" maxlength="80" required></label>
    <div class="actions"><button class="pri" type="submit">Continuar</button><button class="ghost" type="button" id="namedlg-skip">Agora não</button></div></form></div>`;
  document.body.appendChild(d);const n=d.querySelector('#namedlg-n');setTimeout(()=>n.focus(),0);
  d.querySelector('#namedlg-f').addEventListener('submit',e=>{e.preventDefault();const v=n.value.trim();if(!v)return;d.remove();ok(v);});
  d.querySelector('#namedlg-skip').addEventListener('click',()=>{d.remove();ok('');});});}
/* devolve [db, user] ou [null, null] se a página não estiver a ser servida pelo servidor da ferramenta */
async function apiConnect(){
  if(!/^https?:$/.test(location.protocol))return [null,null];
  const LS='cabosrt.user';let name=null;try{name=localStorage.getItem(LS);}catch(e){}
  const hdr=()=>name?{'X-User-Name':encodeURIComponent(name)}:{};
  const call=async(method,url,body,extra)=>{
    const r=await fetch(url,{method,headers:{...hdr(),...(body?{'Content-Type':'application/json'}:{}),...extra},body:body?JSON.stringify(body):undefined});
    if(!r.ok){const e=new Error('api '+r.status);e.code=r.status===403?'forbidden':r.status===409?'conflict':r.status===423?'locked':r.status===413?'quota_exceeded':'internal';
      if(r.status===409)try{e.current=(await r.json()).current;}catch(x){}
      throw e;}
    return r.json();};
  let me;
  try{
    let r=await fetch('/api/me',{headers:hdr()});
    if(r.status===401){
      /* sem Tailscale (uso local): pede o nome uma vez; serve só para identificar quem guardou, não é autenticação */
      name=await askName();if(!name)return [null,null];
      try{localStorage.setItem(LS,name);}catch(e){}
      r=await fetch('/api/me',{headers:hdr()});}
    if(!r.ok||!/json/.test(r.headers.get('content-type')||''))return [null,null];
    me=await r.json();
  }catch(e){return [null,null];}

  /* as alterações de outras pessoas chegam por consulta periódica do contador de revisão */
  const subs=new Map();let rev=-1,pend=null;
  const refresh=async force=>{
    try{const r=(await call('GET','/api/rev')).rev;if(r===rev&&!force)return;rev=r;
      await Promise.all([...subs.keys()].map(async col=>{const {docs}=await call('GET','/api/'+col);
        const snap={docs:docs.map(d=>({id:d.id,data:()=>d.data}))};subs.get(col).forEach(f=>f(snap));}));}
    catch(e){}};
  const soon=()=>{pend=pend||setTimeout(()=>{pend=null;refresh(true);},0);};
  setInterval(()=>{if(!document.hidden)refresh(false);},4000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(false);});
  const newId=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
  /* versioned: o servidor verifica a versão (set com {ifMatch}) e guarda o histórico (history) */
  const db={versioned:true,collection:col=>({
    doc:id=>{id=id||newId();const u=`/api/${col}/${encodeURIComponent(id)}`;
      return {id,
        set:async(data,o)=>{const r=await call('PUT',u,data,{...(o&&o.ifMatch?{'If-Match':o.ifMatch}:{}),...(o&&o.newRevision?{'X-New-Revision':'1'}:{})});soon();return r;},
        estado:async v=>{const r=await call('POST',u+'/estado',{estado:v});soon();return r;},
        track:async(code,step,done)=>{const r=await call('POST',u+'/track',{code,step,done});soon();return r;},
        delete:async()=>{await call('DELETE',u);soon();},
        history:async()=>(await call('GET',u+'/history')).history};},
    onSnapshot:fn=>{if(!subs.has(col))subs.set(col,[]);subs.get(col).push(fn);soon();
      return ()=>{const a=subs.get(col);a.splice(a.indexOf(fn),1);};}})};
  const user={id:async()=>me.id,can:async()=>true,isOwner:()=>!!me.admin,name:me.name,verified:me.verified,
    /* só sem Tailscale: esquece o nome guardado e volta a perguntar */
    changeName:me.verified?null:()=>{try{localStorage.removeItem(LS);}catch(e){}location.reload();},
    profiles:async ids=>call('GET','/api/users?ids='+ids.map(encodeURIComponent).join(','))};
  return [db,user];
}
