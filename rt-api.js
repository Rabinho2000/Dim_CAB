/* ---------- base partilhada no servidor próprio (server/server.js), com a mesma interface que claude.use('db'|'user') ---------- */
/* devolve [db, user] ou [null, null] se a página não estiver a ser servida pelo servidor da ferramenta */
async function apiConnect(){
  if(!/^https?:$/.test(location.protocol))return [null,null];
  const LS='cabosrt.user';let name=null;try{name=localStorage.getItem(LS);}catch(e){}
  const hdr=()=>name?{'X-User-Name':encodeURIComponent(name)}:{};
  const call=async(method,url,body)=>{
    const r=await fetch(url,{method,headers:{...hdr(),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    if(!r.ok){const e=new Error('api '+r.status);e.code=r.status===403?'forbidden':r.status===413?'quota_exceeded':'internal';throw e;}
    return r.json();};
  let me;
  try{
    let r=await fetch('/api/me',{headers:hdr()});
    if(r.status===401){
      /* sem Tailscale (uso local): pede o nome uma vez; serve só para identificar quem guardou, não é autenticação */
      name=(prompt('Para guardar projetos e equipamentos da equipa, indica o teu nome:')||'').trim();if(!name)return [null,null];
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
  const db={collection:col=>({
    doc:id=>{id=id||newId();const u=`/api/${col}/${encodeURIComponent(id)}`;
      return {id,set:async data=>{await call('PUT',u,data);soon();},delete:async()=>{await call('DELETE',u);soon();}};},
    onSnapshot:fn=>{if(!subs.has(col))subs.set(col,[]);subs.get(col).push(fn);soon();
      return ()=>{const a=subs.get(col);a.splice(a.indexOf(fn),1);};}})};
  const user={id:async()=>me.id,can:async()=>true,isOwner:()=>!!me.admin,name:me.name,verified:me.verified,
    profiles:async ids=>call('GET','/api/users?ids='+ids.map(encodeURIComponent).join(','))};
  return [db,user];
}
