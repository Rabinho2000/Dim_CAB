/* ---------- resumo dos projetos da equipa e acompanhamento em obra (separador Projetos) ---------- */
const TSTEPS=[['lan','Lançado'],['lig','Ligado'],['ens','Ensaiado']];
/* linhas dos cabos C1…Cn (código, origem, destino, cabo, comprimento, passagem, disjuntor, ΔU, estado) */
function cableMapData(R){
  return R.invC.concat(R.pC).filter(c=>c.res&&c.Ib>0).map(c=>{const o=c.res,P=cableParts(o,c.loaded),m=MODE[c.r.ref];
    const orig=c.kind==='inv'?c.nome:c.ref.orig,dest=c.kind==='inv'?c.para:c.split?`${c.ref.dest} (entrada ${c.sub.nome})`:c.ref.dest;
    return {code:c.code,orig,dest,modelo:c.kind==='inv'?c.modelo:'',cabo:cableDwg(c).replace(/^Cabo /,''),
      fases:P.multi?P.cabo:P.fase,neutro:P.multi?'no mesmo cabo':P.neutro,terra:P.multi?'no mesmo cabo':P.terra,
      L:c.L,Lc:c.Lc,pass:`Ref. ${m.ref} · ${m.d}`,brk:o.brk?`${o.In} A ${c.loaded===2?'2P':'4P'} · ${o.brk.name}`:`${o.In} A ${c.loaded===2?'2P':'4P'}`,
      du:o.du,ok:verdict(c).st==='ok'};});
}
/* resumo: por estado, nº de projetos, kW AC e custo por kW (dos projetos guardados com custo) */
function renderSummary(){
  const box=$('#pj-sum');if(!box)return;if(!PROJ.length){box.innerHTML='';return;}
  const by=ESTADOS.map(([k,l,cls])=>{const L=PROJ.filter(p=>(p.estado||'rascunho')===k);return {k,l,cls,n:L.length,P:L.reduce((a,p)=>a+(+p.P||0),0)};});
  const wc=PROJ.filter(p=>+p.custo>0&&+p.P>0),cpk=wc.length?wc.reduce((a,p)=>a+ +p.custo,0)/wc.reduce((a,p)=>a+ +p.P,0):null,mx=Math.max(1,...by.map(x=>x.P));
  box.innerHTML=`<div class="sumgrid">${by.map(x=>`<div class="sumcard"><span class="pill ${x.cls}">${x.l}</span><b>${x.n}</b><small>${fmt(x.P,0)} kW AC</small><i style="width:${Math.round(100*x.P/mx)}%"></i></div>`).join('')}
    <div class="sumcard"><span class="pill neu">Total</span><b>${PROJ.length}</b><small>${fmt(by.reduce((a,x)=>a+x.P,0),0)} kW AC${cpk!=null?` · ${fmt(cpk,0)} €/kW (cabos, proteções e quadros; ${wc.length} projeto${wc.length===1?'':'s'})`:''}</small></div></div>`;
}
/* acompanhamento: uma linha por cabo (C1…Cn) com lançado / ligado / ensaiado, quem e quando */
/* com o projeto na equipa, as marcas vêm da versão mais recente da equipa (outras pessoas marcam em obra ao mesmo tempo) */
function trackState(){obraDef();
  if(DBX&&DBX.versioned&&CUR){const p=PROJ.find(q=>q.id===CUR);const t=p&&p.s&&p.s.obra?p.s.obra.track:undefined;
    if(p&&String(p.upd)>=String(S.obra.trackUpd||''))S.obra.track=JSON.parse(JSON.stringify(t||{})),S.obra.trackUpd=p.upd;}
  S.obra.track=S.obra.track||{};return S.obra.track;}
function renderTrack(){
  const box=$('#trk-body');if(!box||!last)return;const tr=trackState(),rows=cableMapData(last);
  const done=rows.reduce((a,r)=>a+TSTEPS.filter(([k])=>tr[r.code]&&tr[r.code][k]).length,0),tot=rows.length*TSTEPS.length;
  $('#trk-prog').innerHTML=tot?`<i style="width:${Math.round(100*done/tot)}%"></i><span>${done} de ${tot} passos (${Math.round(100*done/tot)} %)</span>`:'';
  $('#trk-hint').textContent=DBX&&DBX.versioned?(CUR?'As marcas ficam guardadas no projeto da equipa (também numa revisão aprovada).':'Guarda o projeto na equipa para partilhar o acompanhamento.'):'Base partilhada indisponível nesta vista: as marcas ficam só neste navegador.';
  box.innerHTML=rows.map(r=>`<tr><td><b class="ccode">${esc(r.code)}</b></td><td>${esc(r.orig)} → ${esc(r.dest)}<span class="sub">${esc(r.cabo)} · ${fmt(r.L,0)} m</span></td>${
    TSTEPS.map(([k,l])=>{const m=tr[r.code]&&tr[r.code][k];return `<td class="trk"><label class="check" title="${m?esc(`${l} por ${m.nome||who(m.id)} em ${dtxt(m.em)}`):l}"><input type="checkbox" data-trk="${esc(r.code)}|${k}"${m?' checked':''}> ${l}</label>${m?`<span class="sub">${esc(m.nome||who(m.id))} · ${dtxt(m.em)}</span>`:''}</td>`;}).join('')}</tr>`).join('')
    ||'<tr><td colspan="5" class="hint">Sem cabos.</td></tr>';
}
async function trackSet(code,step,done){
  const tr=trackState(),t=tr[code]=tr[code]||{};
  if(DBX&&DBX.versioned&&CUR){try{const r=await DBX.collection('projects').doc(CUR).track(code,step,done);CURUPD=r.upd;S.obra.trackUpd=r.upd;if(r.mark)t[step]=r.mark;else delete t[step];}
    catch(e){eqErr(e);renderTrack();return;}}
  else{if(done)t[step]={id:ME,nome:(USR&&USR.name)||'',em:isoNow()};else delete t[step];}
  if(!Object.keys(t).length)delete tr[code];save();renderTrack();
}
(function bindTrack(){
  const box=$('#trk-body');if(!box)return;
  box.addEventListener('change',e=>{const el=e.target.closest('[data-trk]');if(!el)return;const [code,step]=el.dataset.trk.split('|');trackSet(code,step,el.checked);});
  HOOKS.push(()=>{if(TAB==='proj'){renderTrack();renderSummary();}});
})();
