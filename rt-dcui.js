/* ---------- separador Strings DC (interface do motor rt-dc.js) ---------- */
const dcInvLabel=k=>{const i=S.invs[k];return i?`Inversor ${k+1} · ${invInfo(i).nome}`:`Inversor ${k+1} (removido)`;};
const dcDefPan=()=>(PANALL.find(p=>p.pmax>=500)||PANALL[0]||{}).modelo;
function dcSet(fn){S.dc=dcState();fn(S.dc);save();renderDC();}
/* sugestão para os inversores ainda sem strings: a string mais comprida que cabe (Voc a T mín.), as strings em paralelo por MPPT
   que as entradas e o Isc deixam, e MPPT preenchidos até uma relação DC/AC de DC_RATIO (só ponto de partida: confirmar) */
const DC_RATIO=1.2;
function dcFill(){
  let n=0;
  dcSet(D=>{const pan=PANALL.find(p=>p.modelo===(D.arr[0]&&D.arr[0].pan))||PANALL.find(p=>p.modelo===dcDefPan());if(!pan)return;
    const kv=(+pan.kvoc||0)/100;
    S.invs.forEach((iv,ii)=>{const d=INVALL.find(x=>x.modelo===iv.modelo);if(!d||!d.vmax||D.arr.some(a=>+a.ii===ii))return;
      const ns=Math.floor(d.vmax/(pan.voc*(1+kv*(D.tmin-25))));if(ns<1)return;const isc=pan.isc*(1+(+pan.kisc||0)/100*(D.tcell-25));
      /* limites duros: entradas por MPPT e Isc máx. (o Imax só dá aviso de corte de potência) */
      const np=Math.max(1,Math.min(d.cc||1,d.isc?Math.floor(d.isc/isc):1));
      let left=Math.ceil(DC_RATIO*invInfo(iv).pnom*1000/(ns*pan.pmax));
      for(let m=1;m<=(d.mppt||1)&&left>0;m++){const k=Math.min(np,left);D.arr.push({ii,mppt:m,pan:pan.modelo,nser:ns,npar:k,L:+iv.L||30});left-=k;n++;}});});
  toast(n?`${n} MPPT sugeridos (DC/AC ≈ ${fs(DC_RATIO)}): confirma os módulos e as distâncias`:'Todos os inversores com dados DC já têm strings');
}
function renderDC(){
  const box=$('#dc-body');if(!box)return;const D=dcState(),R=solveDC();
  const set=(id,v)=>{const el=$(id);if(el&&el!==document.activeElement)el.value=v;};
  set('#dc-tmin',D.tmin);set('#dc-tcell',D.tcell);set('#dc-lim',D.lim);set('#dc-ifuse',D.ifuse);
  const rs=$('#dc-ref');if(!rs.options.length)rs.innerHTML=MODES.map(m=>`<option value="${m.ref}">Ref. ${m.ref} · ${esc(m.d)}</option>`).join('');
  rs.value=D.route.ref;$('#dc-sol').checked=!!D.route.sol;
  const invOpts=v=>S.invs.map((i,k)=>`<option value="${k}"${+v===k?' selected':''}>${esc(dcInvLabel(k))}</option>`).join('')+(S.invs[+v]?'':`<option value="${v}" selected>${esc(dcInvLabel(+v))}</option>`);
  const panOpts=v=>PANALL.map(p=>`<option value="${esc(p.modelo)}"${p.modelo===v?' selected':''}>${esc((p.marca?p.marca+' ':'')+p.modelo)} · ${p.pmax} W</option>`).join('')+(v&&!PANALL.some(p=>p.modelo===v)?`<option selected>${esc(v)}</option>`:'')+(v?'':'<option value="" selected>—</option>');
  box.innerHTML=D.arr.length?D.arr.map((a,k)=>`<tr data-k="${k}"><td class="n"><b class="ccode">D${k+1}</b></td>
    <td><select data-d="ii" aria-label="Inversor">${invOpts(a.ii)}</select></td>
    <td><input data-d="mppt" type="number" min="1" step="1" value="${a.mppt??1}" class="w-num" aria-label="MPPT"></td>
    <td><select data-d="pan" aria-label="Módulo">${panOpts(a.pan)}</select></td>
    <td><input data-d="nser" type="number" min="1" step="1" value="${a.nser??''}" class="w-num" aria-label="Módulos por string"></td>
    <td><input data-d="npar" type="number" min="1" step="1" value="${a.npar??1}" class="w-num" aria-label="Strings em paralelo"></td>
    <td><input data-d="L" type="number" min="0" step="1" value="${a.L??''}" class="w-num" aria-label="Distância m"></td>
    <td class="r"><button class="ghost" data-ddup="${k}">Duplicar</button><button class="ghost del" data-ddel="${k}">Remover</button></td></tr>`).join('')
    :`<tr><td colspan="8" class="hint">Ainda não há strings. Usa “Adicionar string” ou “Sugerir strings”.</td></tr>`;
  $('#dc-res-body').innerHTML=R.rows.map(r=>{const st=r.errs.length?'bad':r.warns.length?'warn':'ok',a=r.a,d=r.inv||{};
    const ok=(c,t)=>`<span class="${c?'':'bad-t'}">${t}</span>`;
    return `<tr class="${st==='bad'?'err':''}"><td><b class="ccode">${r.code}</b> ${esc(dcInvLabel(+a.ii))}<span class="sub">MPPT ${esc(a.mppt)} · ${esc(a.pan||'—')}</span></td>
      <td class="n">${r.pdc?`${r.ns} × ${r.np}<span class="sub">${fmt(r.pdc,2)} kWp</span>`:'—'}</td>
      <td class="n">${r.voc?`${ok(r.voc<=d.vmax,fmt(r.voc,0)+' V')}<span class="sub">máx ${d.vmax} V · ${r.nMin}–${r.nMax} mód.</span>`:'—'}</td>
      <td class="n">${r.voc?`${fmt(r.vmpHot,0)}–${fmt(r.vmpCold,0)} V<span class="sub">MPP ${d.vmppmin||'—'}–${d.vmppmax||'—'} V</span>`:'—'}</td>
      <td class="n">${r.voc?`${ok(!d.isc||r.isc<=d.isc,fmt(r.isc,1)+' A')}<span class="sub">máx ${d.isc||'—'} A</span>`:'—'}</td>
      <td>${r.fuse?`<b>gPV ${r.fuse.In} A</b><span class="sub">${r.fuse.n} fusíveis (+ e −)</span>`:r.voc?'<span class="sub">não precisa</span>':'—'}</td>
      <td>${r.cab&&r.voc?`<b>2 × H1Z2Z2-K 1×${fs(r.cab.s)} mm²</b><span class="sub">por string · ${fmt(r.cab.L,0)} m (${fmt(r.cab.Lc,1)} m) · ΔU ${fmt(r.cab.du,2)} %</span><span class="sub trace">Iz ${fmt(r.cab.Iz,0)} A ≥ 1,25·Isc ${fmt(r.cab.Ib,1)} A · ${esc(r.cab.q)} · ${esc(r.cab.fgSrc)}</span>`:'—'}
        ${r.errs.map(e=>`<span class="sub limt">${esc(e)}</span>`).join('')}${r.warns.map(w=>`<span class="sub">${esc(w)}</span>`).join('')}</td>
      <td><span class="pill ${st}">${st==='bad'?'A rever':st==='warn'?'Aviso':'OK'}</span></td></tr>`;}).join('')||`<tr><td colspan="8" class="hint">—</td></tr>`;
  $('#dc-invs').innerHTML=R.invs.length?`<table class="bom"><thead><tr><th>Inversor</th><th class="r">Potência DC</th><th class="r">DC/AC</th><th class="r">MPPT usados</th></tr></thead><tbody>${R.invs.map(g=>`<tr><td>${esc(dcInvLabel(g.ii))}</td><td class="n r">${fmt(g.pdc,1)} kWp</td><td class="n r">${g.ratio!=null?fmt(g.ratio,2):'—'}</td><td class="n r">${g.mppts} / ${(g.inv&&g.inv.mppt)||'—'}</td></tr>`).join('')}</tbody></table>`:'';
  $('#dc-sum').textContent=R.rows.length?`${fmt(R.pdc,1)} kWp DC · ${R.bad?`${R.bad} a rever`:'todas verificadas'}${R.warn?` · ${R.warn} com aviso`:''} · ${fmt(R.metros,0)} m de cabo solar`:'';
}
(function bindDC(){
  const body=$('#dc-body');if(!body)return;
  [['#dc-tmin','tmin'],['#dc-tcell','tcell'],['#dc-lim','lim'],['#dc-ifuse','ifuse']].forEach(([id,k])=>$(id).addEventListener('input',e=>{const v=parseFloat(e.target.value);if(isFinite(v))dcSet(D=>{D[k]=v;});}));
  $('#dc-ref').addEventListener('change',e=>dcSet(D=>{D.route.ref=e.target.value;}));
  $('#dc-sol').addEventListener('change',e=>dcSet(D=>{D.route.sol=e.target.checked;}));
  const ev=e=>{const el=e.target,k=el.dataset.d;if(!k)return;const i=+el.closest('tr').dataset.k;
    dcSet(D=>{const a=D.arr[i];if(!a)return;a[k]=k==='pan'?el.value:parseFloat(el.value);if(k!=='pan'&&!isFinite(a[k]))a[k]=null;});};
  body.addEventListener('change',e=>{if(e.target.tagName==='SELECT')ev(e);});
  body.addEventListener('input',e=>{if(e.target.tagName==='INPUT')ev(e);});
  body.addEventListener('click',e=>{const d=e.target.closest('[data-ddel]'),u=e.target.closest('[data-ddup]');
    if(d)dcSet(D=>{D.arr.splice(+d.dataset.ddel,1);});if(u)dcSet(D=>{D.arr.splice(+u.dataset.ddup+1,0,{...D.arr[+u.dataset.ddup]});});});
  $('#dc-add').addEventListener('click',()=>dcSet(D=>{const l=D.arr[D.arr.length-1];D.arr.push(l?{...l,mppt:(+l.mppt||0)+1}:{ii:0,mppt:1,pan:dcDefPan(),nser:null,npar:1,L:30});}));
  $('#dc-fill').addEventListener('click',dcFill);
  HOOKS.push(()=>{if(TAB==='dc')renderDC();});
})();
