/* ---------- comparar alternativas: janela com as variantes de variants() (rt-engine.js), calculadas sem mexer no projeto aberto ---------- */
let CMP=null;
function openCompare(){
  CMP=variants();const ok=CMP.filter(v=>v.sum&&!v.sum.bad),best=ok.length?ok.reduce((a,v)=>v.sum.total<a.sum.total?v:a):null,cur=CMP[0].sum;
  const d=(v,k,f)=>{if(!cur||v.id==='atual')return '';const x=v.sum[k]-cur[k];if(Math.abs(x)<1e-9)return '';return `<span class="sub ${x<0?'okt':'bad-t'}">${x>0?'+':''}${f(x)}</span>`;};
  $('#cmp-body').innerHTML=CMP.map(v=>{const s=v.sum;if(!s)return `<tr><td><b>${esc(v.nome)}</b></td><td colspan="7" class="hint">Não foi possível calcular: ${esc(v.err||'')}</td></tr>`;
    return `<tr class="${v===best?'cur':''}${s.bad?' err':''}"><td><b>${esc(v.nome)}</b><span class="sub">${esc(v.nota)}</span>${v===best?'<span class="pill ok">mais barata sem circuitos a rever</span>':''}</td>
      <td class="n r">${eur0(s.cab+s.term)}${d(v,'cab',x=>eur0(x))}</td><td class="n r">${eur0(s.brk)}${d(v,'brk',x=>eur0(x))}</td><td class="n r"><b>${eur0(s.total)}</b>${d(v,'total',x=>eur0(x))}</td>
      <td class="n r">${fmt(s.duMax,2)} %</td><td class="n r">${s.kinds}</td><td class="n r">${s.al} / ${s.n}</td><td class="n r">${s.bad?`<span class="bad-t">${s.bad}</span>`:'0'}</td>
      <td class="r">${v.id==='atual'?'':`<button class="ghost" data-cmpapl="${v.id}">Aplicar</button>`}</td></tr>`;}).join('');
  $('#cmpdlg').hidden=false;
}
function applyVariant(id){
  const v=CMP&&CMP.find(x=>x.id===id);if(!v)return;
  S=Object.assign(example(),JSON.parse(JSON.stringify(v.st)));(S.gws||[]).forEach(g=>g.id=uid++);S.invs.forEach(i=>i.id=uid++);S.percs.forEach(p=>p.id=uid++);
  $('#cmpdlg').hidden=true;load();toast(`Alternativa aplicada: ${v.nome}. Guarda o projeto se a quiseres manter.`);
}
(function bindCompare(){
  const b=$('#cmp-open');if(!b)return;b.addEventListener('click',openCompare);
  $('#cmpdlg').addEventListener('click',e=>{if(e.target.id==='cmpdlg'||e.target.id==='cmp-close')return $('#cmpdlg').hidden=true;
    const a=e.target.closest('[data-cmpapl]');if(a)applyVariant(a.dataset.cmpapl);});
})();
