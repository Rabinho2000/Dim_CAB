/* ---------- ficheiros, projetos partilhados e base de equipamentos da equipa ---------- */
async function saveFile(name,data){
  try{const d=(typeof claude!=='undefined'&&claude.use)?await claude.use('downloads'):null;
    if(d){await d.save({filename:name,data});toast('Ficheiro guardado');return;}}
  catch(e){const c=e&&e.code;if(c==='declined')return;if(c==='rate_limited'){toast('Já há um pedido de descarga aberto');return;}}
  const blob=data instanceof Blob?data:new Blob([data],{type:name.endsWith('.svg')?'image/svg+xml':'application/octet-stream'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
}
let DBX=null,USR=null,ME=null,CUR=null,PROJ=[],CUST={inv:[],pan:[],pr:[],gw:[]},NAMES={},RO=false,EQ='inv',EDIT=null;
const docId=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9_.~:@+-]+/g,'_').replace(/^\.+$/,'_').slice(0,150)||'x';
const isoNow=()=>new Date().toISOString();
const dtxt=s=>{try{return new Date(s).toLocaleString('pt-PT',{dateStyle:'short',timeStyle:'short'});}catch(e){return s;}};
/* equipamentos: a base fixa da ferramenta + os registos da equipa (o mesmo modelo substitui o da base) */
function rebuildEquip(){
  const mi=new Map(INVDB.map(d=>[d.modelo,{...d}]));CUST.inv.forEach(d=>mi.set(d.modelo,{...d,_c:true}));INVALL=[...mi.values()];
  const mp=new Map(PANELDB.map(d=>[d.modelo,{...d}]));CUST.pan.forEach(d=>mp.set(d.modelo,{...d,_c:true}));PANALL=[...mp.values()];
  {const mg=new Map(GWDB.map(d=>[d.modelo,d]));CUST.gw.forEach(d=>mg.set(d.modelo,{...d,_c:true}));GWALL=[...mg.values()];}renderGwTable();
  rebuildPrices(CUST.pr.map(d=>[d.mat,d.form,+d.s,+d.p,d.data,d.ref||'',d.des||'',d.forn||'Equipa']));
  renderPrices();renderInvTable();render();if(TAB==='dc')renderDC();renderEq();
}
const INVF=[['marca','Marca','t'],['modelo','Modelo','t'],['pnom','Pnom (kW)'],['pmax','Smax (kVA)'],['iac','Iac nom. (A)'],['iacmax','Iac máx. (A)'],['fases','Fases (1 ou 3)'],['mppt','Nº MPPT'],['cc','Entradas/MPPT'],['imax','Imax MPPT (A)'],['isc','Isc MPPT (A)'],['vmax','Vmax DC (V)'],['vstart','V arranque (V)'],['vmppmin','MPP mín. (V)'],['vmppmax','MPP máx. (V)']];
const PANF=[['marca','Marca','t'],['modelo','Modelo','t'],['pmax','Pmax (W)'],['vmp','Vmp (V)'],['imp','Imp (A)'],['voc','Voc (V)'],['isc','Isc (A)'],['kvoc','kVoc (%/°C)'],['kisc','kIsc (%/°C)'],['kp','kP (%/°C)'],['ef','Eficiência (%)']];
const PRF=[['mat','Material','s',[['Cu','Cobre'],['Al','Alumínio']]],['form','Tipo','s',[['mono','Monocondutor'],['multi5','Multicondutor 5G'],['multi3','Multicondutor 3G'],['pe','Terra verde/amarelo'],['solar','Solar H1Z2Z2-K']]],['s','Secção (mm²)'],['p','€/m sem IVA'],['data','Data da compra','d'],['forn','Fornecedor','t'],['ref','Referência','t'],['des','Designação','t']];
const GWF=[['marca','Marca','t'],['modelo','Modelo','t'],['gama','Gama','t'],['fases','Rede','s',[['3','Trifásico 400 V'],['1','Monofásico 230 V']]],['In','Corrente nominal (A)'],['P','Potência (kW)'],['ports','Entradas de inversor'],['portI','In por entrada (A)']];
function eqFields(){return EQ==='inv'?INVF:EQ==='pan'?PANF:EQ==='gw'?GWF:PRF;}
const eqCol=()=>EQ==='inv'?'inversores':EQ==='pan'?'paineis':EQ==='gw'?'gateways':'precos';
function renderEq(){
  const f=eqFields(),v=EDIT||{};
  document.querySelectorAll('.eqtabs [data-eq]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.eq===EQ)));
  const can=!!DBX&&!RO;
  $('#eq-status').textContent=!DBX?'Base partilhada indisponível nesta vista: só leitura.':RO?'Só leitura: sem permissão para alterar a base.':'';
  $('#eq-form').innerHTML=`<div class="eqform">${f.map(([k,l,t,o])=>t==='s'?`<label>${l}<select data-ef="${k}"${can?'':' disabled'}>${o.map(([a,b])=>`<option value="${a}"${String(v[k]??o[0][0])===a?' selected':''}>${b}</option>`).join('')}</select></label>`
      :`<label>${l}<input data-ef="${k}" ${t==='t'?'':t==='d'?'type="date"':'type="number" step="any"'} value="${esc(v[k]??(t==='d'?new Date().toISOString().slice(0,10):''))}"${can?'':' disabled'}></label>`).join('')}
    <div class="actions"><button class="pri" id="eq-save"${can?'':' disabled'}>${EDIT&&EDIT._c?'Guardar alteração':'Guardar na base da equipa'}</button>${EDIT?'<button id="eq-cancel">Cancelar</button>':''}</div></div>`;
  let head,rows;
  if(EQ==='inv'){head=['Modelo','Marca','Pnom','Iac máx.','Fases','MPPT','Vmax DC','MPP','Origem',''];
    rows=INVALL.map(d=>[`${esc(d.modelo)}${d.conf?'<span class="conf2">a confirmar</span>':''}`,esc(d.marca||''),fmt(d.pnom,1)+' kW',fmt(d.iacmax,1)+' A',d.fases===1?'1F':'3F',d.mppt??'—',d.vmax??'—',d.vmppmin?`${d.vmppmin}–${d.vmppmax}`:'—',d._c?'<span class="mine">equipa</span>':'base',d.modelo]);}
  else if(EQ==='pan'){head=['Modelo','Marca','Pmax','Vmp','Imp','Voc','Isc','kVoc','Origem',''];
    rows=PANALL.map(d=>[esc(d.modelo),esc(d.marca||''),d.pmax+' W',d.vmp,d.imp,d.voc,d.isc,d.kvoc,d._c?'<span class="mine">equipa</span>':'base',d.modelo]);}
  else if(EQ==='gw'){head=['Modelo','Marca / gama','Rede','Corrente nominal','Entradas','Origem',''];
    rows=GWALL.map(d=>[esc(d.modelo),esc((d.marca||'')+(d.gama?' · '+d.gama:'')),+d.fases===1?'1F 230 V':'3F 400 V',d.In+' A',`${d.ports??'—'} × ${d.portI??'—'} A`,d._c?'<span class="mine">equipa</span>':'base',d.modelo]);}
  else{head=['Família','Secção','€/m','Data','Fornecedor','Referência','Origem',''];
    rows=PRICES.map(r=>{const c=CUST.pr.find(d=>d.mat===r[0]&&d.form===r[1]&&+d.s===r[2]&&d.data===r[4]);return [FAMN[r[0]+'|'+r[1]]||r[0]+' '+r[1],fs(r[2]),(+r[3]).toFixed(4).replace('.',','),esc(r[4]),esc(r[7]||''),esc(r[5]),c?'<span class="mine">equipa</span>':'folhas 2026',c?c._id:null];});}
  $('#eq-table').innerHTML=`<thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>{const key=r[r.length-1];const mine=EQ==='pr'?!!key:EQ==='gw'?!!(GWALL.find(d=>d.modelo===key)||{})._c:(EQ==='inv'?INVALL:PANALL).find(d=>d.modelo===key)?._c;
    return `<tr>${r.slice(0,-1).map(x=>`<td>${x}</td>`).join('')}<td class="r">${can&&EQ!=='pr'?`<button class="ghost" data-eedit="${esc(key)}">Editar</button>`:''}${can&&mine?`<button class="ghost del" data-edel="${esc(key)}">Apagar</button>`:''}</td></tr>`;}).join('')}</tbody>`;
}
async function eqSave(){
  const f=eqFields(),o={};
  for(const [k,l,t] of f){const el=document.querySelector(`[data-ef="${k}"]`);const v=el.value.trim();
    if(t==='t'||t==='s'||t==='d')o[k]=v;else o[k]=v===''?null:parseFloat(v.replace(',','.'));}
  if(EQ!=='pr'&&!o.modelo){toast('Indica o modelo');return;}
  if(EQ==='inv'&&(!o.pnom||!o.iacmax)){toast('Pnom e Iac máx. são obrigatórios');return;}
  if(EQ==='inv')o.fases=o.fases===1?1:3;
  if(EQ==='gw'){o.fases=o.fases==='1'?1:3;o.marca=o.marca||'Sigenergy';if(!o.In){toast('Indica a corrente nominal');return;}}
  if(EQ==='pr'&&(!o.s||!o.p||!o.data)){toast('Secção, preço e data são obrigatórios');return;}
  o.autor=ME;o.upd=isoNow();
  const col=eqCol();
  const id=EQ==='pr'?docId(`${o.mat}_${o.form}_${o.s}_${o.data}`):docId(o.modelo);
  try{await DBX.collection(col).doc(id).set(o);EDIT=null;toast('Guardado na base da equipa');}catch(e){eqErr(e);}
}
function eqErr(e){if(e&&e.code==='invalid_argument'){RO=true;renderEq();toast('Sem permissão para alterar a base');}else if(e&&e.code==='forbidden')toast('Só o autor ou um administrador pode apagar este projeto');else if(e&&e.code==='quota_exceeded')toast('A base está cheia: apaga registos antigos');else toast('Não foi possível guardar. Tenta outra vez.');}
function bindEq(){
  document.querySelector('.eqtabs').addEventListener('click',e=>{const b=e.target.closest('[data-eq]');if(!b)return;EQ=b.dataset.eq;EDIT=null;renderEq();});
  $('#eq-form').addEventListener('click',e=>{if(e.target.id==='eq-save')eqSave();if(e.target.id==='eq-cancel'){EDIT=null;renderEq();}});
  $('#eq-table').addEventListener('click',async e=>{const ed=e.target.closest('[data-eedit]'),dl=e.target.closest('[data-edel]');
    if(ed){const key=ed.dataset.eedit;EDIT={...(EQ==='inv'?INVALL:EQ==='gw'?GWALL.map(g=>({...g,fases:String(g.fases)})):PANALL).find(d=>d.modelo===key)};renderEq();$('#eq-form').scrollIntoView({block:'nearest'});}
    if(dl){if(dl.dataset.armed!=='1'){dl.dataset.armed='1';dl.textContent='Confirmar';setTimeout(()=>{if(dl.isConnected){dl.dataset.armed='';dl.textContent='Apagar';}},3000);return;}
      const key=dl.dataset.edel;const col=eqCol();
      try{await DBX.collection(col).doc(EQ==='pr'?key:docId(key)).delete();toast('Apagado');}catch(err){eqErr(err);}}});
}
/* projetos */
function projState(){const s=JSON.parse(JSON.stringify(S));return s;}
function renderProj(){
  const q=($('#pj-q').value||'').toLowerCase();
  $('#pj-status').textContent=!DBX?'Os projetos partilhados não estão disponíveis nesta vista. O projeto atual continua guardado neste navegador.':CUR?`Projeto aberto: ${(PROJ.find(p=>p.id===CUR)||{}).nome||S.proj||'sem nome'}. “Guardar projeto atual” atualiza-o para toda a equipa.`:'O projeto atual ainda não foi guardado na equipa.';
  ['pj-save','pj-new'].forEach(id=>$('#'+id).disabled=!DBX||RO);
  const list=PROJ.filter(p=>!q||(p.nome||'').toLowerCase().includes(q)||(NAMES[p.autor]||'').toLowerCase().includes(q));
  $('#proj-badge').hidden=!PROJ.length;$('#proj-badge').textContent=PROJ.length;
  $('#pj-body').innerHTML=list.length?list.map(p=>`<tr class="${p.id===CUR?'cur':''}"><td><b>${esc(p.nome||'Sem nome')}</b>${p.loc?`<span class="sub">${esc(p.loc)}</span>`:''}</td><td class="n">${p.nInv??'—'}</td><td class="n r">${p.P!=null?fmt(p.P,1)+' kW':'—'}</td>
    <td>${esc(NAMES[p.autor]||(p.autor===ME?'Eu':'Alguém da equipa'))}</td><td class="n">${dtxt(p.upd)}</td>
    <td class="r"><button class="ghost" data-popen="${p.id}">Abrir</button><button class="ghost" data-pdup="${p.id}">Duplicar</button>${p.autor===ME||(USR&&USR.isOwner())?`<button class="ghost del" data-pdel="${p.id}">Apagar</button>`:''}</td></tr>`).join('')
    :`<tr><td colspan="6" class="hint">${DBX?(PROJ.length?'Nenhum projeto corresponde à procura.':'Ainda não há projetos guardados.'):'—'}</td></tr>`;
}
async function resolveNames(){if(!USR||!USR.profiles)return;const ids=[...new Set(PROJ.map(p=>p.autor).filter(Boolean))].filter(i=>!(i in NAMES));if(!ids.length)return;
  try{const ps=await USR.profiles(ids);ids.forEach(i=>{NAMES[i]=(ps&&ps[i]&&ps[i].name)||'';});renderProj();}catch(e){}}
async function projSave(asNew){
  if(!DBX)return;const R=last;const nome=(S.proj||'').trim()||'Sem nome';
  const body={nome,loc:S.loc,nInv:S.invs.length,P:R?Math.round(R.Ptot*10)/10:null,autor:ME,upd:isoNow(),s:projState()};
  try{if(CUR&&!asNew){const old=PROJ.find(p=>p.id===CUR);if(old&&old.autor)body.autor=old.autor;body.edit=ME;await DBX.collection('projects').doc(CUR).set(body);}
    else{const ref=DBX.collection('projects').doc();await ref.set(body);CUR=ref.id;}
    toast(`Projeto “${nome}” guardado para a equipa`);renderProj();}catch(e){eqErr(e);}
}
function openState(s){const o=JSON.parse(JSON.stringify(s));S=Object.assign(example(),o);(S.gws||[]).forEach(g=>g.id=uid++);S.invs.forEach(i=>i.id=uid++);S.percs.forEach(p=>p.id=uid++);(S.dc.arr||[]).forEach(a=>a.id=uid++);load();}
function bindProj(){
  $('#pj-save').addEventListener('click',()=>projSave(false));$('#pj-new').addEventListener('click',()=>projSave(true));
  $('#pj-q').addEventListener('input',renderProj);
  $('#pj-body').addEventListener('click',async e=>{const o=e.target.closest('[data-popen]'),d=e.target.closest('[data-pdup]'),x=e.target.closest('[data-pdel]');
    const p=PROJ.find(q=>q.id===(o||d||x||{}).dataset?.[o?'popen':d?'pdup':'pdel']);if(!p)return;
    if(o){openState(p.s);CUR=p.id;showTab('ac');toast(`Projeto “${p.nome}” aberto`);}
    if(d){openState({...p.s,proj:(p.s.proj||p.nome)+' (cópia)'});CUR=null;showTab('ac');toast('Cópia aberta: guarda-a para a criar na equipa');}
    if(x){if(x.dataset.armed!=='1'){x.dataset.armed='1';x.textContent='Confirmar';setTimeout(()=>{if(x.isConnected){x.dataset.armed='';x.textContent='Apagar';}},3000);return;}
      try{await DBX.collection('projects').doc(p.id).delete();if(CUR===p.id)CUR=null;toast('Projeto apagado');}catch(err){eqErr(err);}}});
}
async function initShare(){
  bindEq();bindProj();renderEq();renderProj();
  /* artifact do claude.ai ou servidor próprio (rt-api.js); aberto como ficheiro, fica só o projeto local */
  let db=null,user=null;
  if(typeof claude!=='undefined'&&claude.use)[db,user]=await Promise.all([claude.use('db'),claude.use('user')]);
  else if(typeof apiConnect==='function')[db,user]=await apiConnect();
  DBX=db;USR=user;if(!DBX){renderEq();renderProj();return;}
  try{ME=USR?await USR.id():null;}catch(e){ME=null;}
  try{const c=USR&&USR.can?await USR.can('data.write'):null;if(c===false)RO=true;}catch(e){}
  const sub=(col,fn)=>DBX.collection(col).onSnapshot(fn,()=>{});
  sub('projects',snap=>{PROJ=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.upd).localeCompare(String(a.upd)));renderProj();resolveNames();});
  sub('inversores',snap=>{CUST.inv=snap.docs.map(d=>({...d.data(),_id:d.id})).filter(d=>d.modelo);rebuildEquip();});
  sub('paineis',snap=>{CUST.pan=snap.docs.map(d=>({...d.data(),_id:d.id})).filter(d=>d.modelo);rebuildEquip();});
  sub('gateways',snap=>{CUST.gw=snap.docs.map(d=>({...d.data(),_id:d.id})).filter(d=>d.modelo&&d.In);rebuildEquip();});
  sub('precos',snap=>{CUST.pr=snap.docs.map(d=>({...d.data(),_id:d.id})).filter(d=>d.s&&d.p);rebuildEquip();});
  renderEq();renderProj();
}
