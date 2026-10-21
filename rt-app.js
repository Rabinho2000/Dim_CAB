/* tipo de cada quadro: escolhido no popup ou deduzido (QFV se tem inversores, gateway, cliente se é o ponto de injeção) */
const BTYPES={QFV:['Quadro fotovoltaico','Recebe os inversores: proteções de cada inversor, DST e terra.'],INT:['Quadro de interligação','Corte geral, proteção da saída para o cliente e DST.'],CONT:['Quadro de contagem','Contador de produção em armário próprio: direto até 50 kW, indireto com TI acima.'],GW:['Gateway Sigenergy','Entre o QFV e a rede: cada inversor entra numa porta do gateway.'],CLI:['Quadro do cliente','Quadro existente onde se faz a ligação (QGBT / Q. Entrada).']};
const btypeSet=n=>(S.btypes||{})[String(n).trim()]||null;
const FAV=['13','16','14','11','12','3A','4A','61','62'];
const METLAB={A:'A',A2:'A2',B:'B',B2:'B2',C:'C',EF:'E/F',D:'D',D61:'D'};

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

let S=example();
try{const o=JSON.parse(localStorage.getItem('cabosrt.v1')||'null');if(o&&o.invs&&o.percs){if(o.limT==null){o.limT=3;o.lim=5;o.alThr=15;o.alPmin=30;}if(o.folga==null){o.folga=true;o.cos=1;}S=Object.assign(example(),o);(S.gws||[]).forEach(g=>g.id=uid++);S.invs.forEach(i=>i.id=uid++);S.percs.forEach(p=>p.id=uid++);}}catch(e){}
const save=()=>{try{localStorage.setItem('cabosrt.v1',JSON.stringify(S));}catch(e){}};
function designation(c){
  const o=c.res;if(!o)return '—';const P=cableParts(o,c.loaded);
  const body=P.multi?`<div class="cgrid"><span>Cabo</span><b>${P.cabo}</b></div><span class="sub">${P.nota}</span>`
    :`<div class="cgrid"><span>Fase${P.fases>1?'s':''}</span><b>${P.fase}</b><span>Neutro</span><b>${P.neutro}</b><span>Terra</span><b>${P.terra}</b></div><span class="sub">por fase${P.fases>1?' (× 3 fases)':''}; neutro por conjunto; terra única</span>`;
  return `<div class="cable">${body}</div><span class="sub trace">${o.q} col. ${o.qcol} · Iz ${fmt(o.iz0,0)} A × ${o.n} × f ${fmt(o.f,2)}</span>`;
}
const eur=v=>v==null?'—':v.toLocaleString('pt-PT',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const breaker=(o,c)=>{if(!o)return '—';const b=o.brk;if(c.split)return `<b>${o.In} A ${c.loaded===2?'2P':'4P'}</b><span class="sub">entrada do gateway (proteção do fabricante); a proteção do inversor fica no QFV</span>`;if(!b)return `<b>${o.In} A ${c.loaded===2?'2P':'4P'}</b><span class="sub">a definir</span>`;
  const icu=o.ikmax==null?'':o.icuOk!==false?`<span class="sub">Icc no local ${fmt(o.ikmax,1)} kA ≤ Icu ${b.icu} kA</span>`
    :`<span class="sub limt">Poder de corte insuficiente: Icc no local ${fmt(o.ikmax,1)} kA > Icu ${b.icu} kA. ${o.icuAlt?`Usar ${esc(o.icuAlt.name)} (${o.icuAlt.icu} kA, ${esc(o.icuAlt.ref)}).`:'Nenhum disjuntor da tabela ABB da ferramenta chega para este calibre: escolher uma série de maior poder de corte com a ABB.'}</span>`;
  return `<b>${o.In} A ${c.loaded===2?'2P':'4P'}</b><span class="sub abb">ABB ${esc(b.name)} · ${b.icu} kA</span>${icu}<span class="sub trace">${esc(b.ref)}</span>${b.dif?`<span class="sub">Diferencial: ${esc(b.dif.name)}</span>`:''}<span class="sub">${eur(brkCost(b))}${+S.descABB?` (PVP −${S.descABB}%)`:' PVP'}</span>`;};
const scCell=o=>{if(!o||o.ikmax==null)return '<span class="sub">—</span>';
  const f=(ok,t)=>`<span class="${ok?'':'bad-t'}">${t}</span>`;
  return `<span class="n">${f(o.icuOk,`máx ${fmt(o.ikmax,1)} kA`)}</span><span class="sub n">${f(o.trip,`mín ${fmt(o.ikmin*1000,0)} A`)} · ${o.elec?`I₃ ≤ ${fmt(Math.min(o.Iset,15),1)} × In`:`Im ${fmt(o.Im,0)} A`}</span><span class="sub n">${f(o.therm,`I²t ${(o.i2t/1e3).toLocaleString('pt-PT',{maximumFractionDigits:0})}k ≤ k²S² ${(o.k2s2/1e3).toLocaleString('pt-PT',{maximumFractionDigits:0})}k`)}</span>`;};
const thumb=r=>{const m=MODE[r.ref];return `<img src="${m.img[0]}" alt="">`;};
function routeCard(key,r,c,autoN){
  const m=MODE[r.ref];const ti=tempInfo(r);
  const ef=m.m==='EF';const tr=ef?Math.max(1,+r.trays||1):1;
  const nE=c&&c.res?c.res.nEff:autoN,pT=c&&c.res?c.res.perTray:Math.ceil(autoN/tr);
  const [fg,src]=c&&c.res?[c.res.fg,c.res.fgSrc]:groupFactor(r,pT,tr);
  return `<div class="modecard"><button class="modepick" data-pick="${key}" aria-label="Escolher tipo de passagem"><span class="tile">${thumb(r)}</span>
      <span class="mtext"><b>Ref. ${m.ref} · método ${METLAB[m.m]}</b><span>${esc(m.d)}</span><u>Alterar passagem</u></span></button>
    <div class="fields">
      <label>${key==='inv'?'Constituição por defeito':'Constituição'}<select data-rk="${key}" data-k="cons"><option value="mono"${r.cons==='mono'?' selected':''}>Monocondutores</option><option value="multi"${r.cons==='multi'?' selected':''}>Multicondutor</option></select></label>
      ${m.m==='EF'&&r.cons==='mono'?`<label>Disposição dos monocondutores<select data-rk="${key}" data-k="disp">${[['trevo','Em trevo (triângulo) · F'],['esteira','Em esteira, sem afastamento · F'],['afh','Com afastamento, horizontal · G'],['afv','Com afastamento, vertical · G']].map(([v,l])=>`<option value="${v}"${r.disp===v?' selected':''}>${l}</option>`).join('')}</select></label>`:''}
      ${ef?`<label>Nº de esteiras sobrepostas<select data-rk="${key}" data-k="trays">${[1,2,3].concat(tr>3?[tr]:[]).map(v=>`<option value="${v}"${tr===v?' selected':''}>${v}${v>3?' (fora do quadro RTIEBT)':''}</option>`).join('')}</select></label>`:''}
      ${ti.buried?'':`<label class="check"><input type="checkbox" data-rk="${key}" data-k="sol"${r.sol?' checked':''}> Exposto ao sol (+10 °C)</label>`}
    </div>
    <div class="factor">${ti.buried?`Solo ${ti.t} °C → fT <b>${fmt(ti.ft,2)}</b> · resistividade <b>${fmt(ti.fsolo,2)}</b>${ti.ftubo<1?' · tubo <b>0,80</b>':''}`:`Ar ${ti.t} °C → fT <b>${fmt(ti.ft,2)}</b>`} · ${nE} circuito${nE===1?'':'s'}${ef&&tr>1?` em ${tr} esteiras (${pT} por esteira)`:''} → agrupamento <b>${fmt(fg,2)}</b> <span>(${src})</span></div></div>`;
}
function renderInvTable(){
  const qs=quadros();const groups={};INVALL.forEach(d=>(groups[d.marca||'Outros']??=[]).push(d));
  const modelSel=v=>Object.entries(groups).map(([b,l])=>`<optgroup label="${esc(b)}">${l.map(d=>`<option value="${esc(d.modelo)}"${d.modelo===v?' selected':''}>${esc(d.modelo)} · ${d.pnom} kW${d.fases===1?' · 1F':''}${d.conf?' · a confirmar':''}</option>`).join('')}</optgroup>`).join('')+`<option value="__outro"${v==='__outro'?' selected':''}>Outro (potência manual)</option>`;
  $('#inv-body').innerHTML=S.invs.map((i,k)=>{const info=invInfo(i);return `<tr data-id="${i.id}"><td class="n">${k+1}</td>
    <td><select data-k="modelo" aria-label="Modelo">${modelSel(i.modelo)}</select>${i.modelo==='__outro'?`<input data-k="pman" type="number" min="0" step="0.1" value="${i.pman||''}" placeholder="kW" class="pman" aria-label="Potência kW">`:''}</td>
    <td class="n r">${fmt(info.pnom,1)}</td><td class="n r">${fmt(info.Ib,1)}<span class="sub">${info.fases===1?'1F 230 V':'3F 400 V'}</span></td>
    <td><select data-k="cons" aria-label="Constituição do cabo"><option value="rota"${!i.cons||i.cons==='rota'?' selected':''}>Como a passagem (${routeFor(i).cons==='mono'?'mono':'multi'})</option><option value="mono"${i.cons==='mono'?' selected':''}>Monocondutores</option><option value="multi"${i.cons==='multi'?' selected':''}>Multicondutor</option></select></td>
    <td><select data-k="q" aria-label="Quadro">${qs.concat(qs.includes(i.q)?[]:[i.q]).map(n=>`<option${n===i.q?' selected':''}>${esc(n)}</option>`).join('')}</select></td>
    <td><input data-k="est" value="${esc(i.est||'')}" maxlength="3" placeholder="—" aria-label="Esteira" title="Letra da esteira (A, B, …): cada esteira tem a sua passagem, escolhida em baixo, e os inversores do mesmo quadro na mesma esteira contam juntos no agrupamento. Em branco: a passagem geral, todos os do quadro juntos." class="w-est"></td>
    <td><input data-k="cos" type="number" min="0.5" max="1" step="0.01" value="${+i.cos>0?i.cos:''}" placeholder="${fs(+S.cos||1)}" aria-label="cos φ" title="cos φ deste inversor (em branco: o dos Critérios). Nos percursos conta o menor dos inversores a montante." class="w-num"></td>
    <td><input data-k="L" type="number" min="0" step="1" value="${i.L}" aria-label="Distância m" class="w-num"></td>
    <td class="r"><button class="ghost" data-dup="${i.id}" title="Duplicar">Duplicar</button><button class="ghost del" data-del="${i.id}">Remover</button></td></tr>`;}).join('');
}
function renderPercTable(){
  $('#p-body').innerHTML=S.percs.map(p=>`<tr data-id="${p.id}">
    <td><input data-k="orig" data-prev="${esc(p.orig)}" value="${esc(p.orig)}" aria-label="Origem"></td>
    <td><input data-k="dest" value="${esc(p.dest)}" aria-label="Destino">${gwOf(p.dest)?'<span class="sub">Gateway</span>':`<select class="btype" data-bt="${esc(p.dest)}" aria-label="Tipo do quadro de destino"><option value="">Tipo automático</option>${['INT','CONT','CLI','QFV'].map(k=>`<option value="${k}"${btypeSet(p.dest)===k?' selected':''}>${BTYPES[k][0]}</option>`).join('')}</select>`}</td>
    <td><input data-k="L" type="number" min="0" step="1" value="${p.L}" aria-label="Distância" class="w-num"><label class="check" title="Outros circuitos que vão na mesma esteira que este (por exemplo, cabos dos inversores). Entram no fator de agrupamento.">+ <input data-k="extra" type="number" min="0" step="1" value="${p.extra||0}" class="w-num" aria-label="Outros circuitos na mesma esteira"> outros circuitos na esteira</label>${gwOf(p.dest)?`<label class="check"><input type="checkbox" data-k="split"${p.split!==false?' checked':''}> 1 cabo por inversor até ao gateway</label>`:''}</td>
    <td class="r"><button class="ghost del" data-delp="${p.id}">Remover</button></td></tr>
    <tr class="rrow" data-id="${p.id}"><td colspan="4" data-route></td></tr>`).join('');
}
const eur0=v=>v==null?'—':v.toLocaleString('pt-PT',{style:'currency',currency:'EUR',maximumFractionDigits:0});
function altName(o,loaded){const P=cableParts(o,loaded);return P.multi?P.cabo:`fases ${P.fase} · neutro ${P.neutro} · terra ${P.terra}`;}
let last;
/* estado de um circuito (tabela e relatório de cálculo): 'ok' ou 'bad' e o motivo */
/* aviso (não é "a rever"): queda acumulada do inversor até à injeção acima de S.lim — é uma subida de tensão nos terminais do inversor */
const accWarn=c=>c.kind==='inv'&&c.res&&+S.lim>0&&(c.acc||0)>+S.lim+1e-9?`ΔU acumulada até à injeção ${fmt(c.acc,2)} % > ${fs(S.lim)} %: a tensão nos terminais do inversor sobe outro tanto; confirma o limite de sobretensão do inversor ou reforça um troço.`:'';
function verdict(c){const o=c.res;
  const st=!o?'bad':(passes(o)&&o.icuOk!==false&&o.du<=S.limT&&!c.gwErr)?'ok':'bad';
  const why=!o?'Sem tabela':c.gwErr?c.gwErr:!o.term?(c.Ib>o.In?'In < Ib':'In > Iz'):!o.sob?'I₂ > 1,45 Iz':o.du>S.limT?'ΔU troço':o.icuOk===false?'Poder de corte':o.trip===false?'Icc mín < Im':o.therm===false?'I²t > k²S²':'OK';
  return {st,why};}
function render(){
  const R=solveAll();last=R;
  const maxN=Math.max(1,...R.invC.map(c=>c.nAgr));
  /* uma passagem por esteira usada (coluna "Esteira") e a geral para os inversores sem letra */
  const ests=[...new Set(R.invC.map(c=>c.est))].sort((a,b)=>a===''?-1:b===''?1:a.localeCompare(b));
  $('#route-inv').innerHTML=(ests.length?ests:['']).map(e=>{const cs=R.invC.filter(c=>c.est===e),key=e?'est:'+e:'inv',r=e?routeFor({est:e}):S.rInv;
    const head=ests.length>1||e?`<h4 class="rhead">${e?`Esteira ${esc(e)}`:'Sem esteira indicada (passagem geral)'} <span class="hint">${cs.map(c=>c.code||c.nome).join(', ')}</span></h4>`:'';
    return head+routeCard(key,r,cs[0],Math.max(1,...cs.map(c=>c.nAgr)));}).join('');
  R.pC.forEach(c=>{if(c.split&&c!==R.pC.find(x=>x.base===c.base))return;const td=document.querySelector(`#p-body tr.rrow[data-id="${c.base.id}"] [data-route]`);if(td)td.innerHTML=routeCard('p'+c.base.id,c.base,c,c.split?c.nAgr:1);});
  const all=R.invC.concat(R.pC);
  const bad=all.filter(c=>c.Ib>0&&(!c.res||!passes(c.res)||c.res.icuOk===false||c.res.du>S.limT||c.gwErr));
  const worst=Math.max(0,...all.filter(c=>c.res).map(c=>c.res.du));
  const ends=R.pC.filter(c=>!percFrom(c.ref.dest)&&c.res).sort((a,b)=>b.p-a.p);const main=ends[0];
  $('#kpis').innerHTML=[['Inversores',S.invs.length,''],['Potência total',fmt(R.Ptot,1),'kW'],['Corrente total',fmt(R.IbTot,0),'A'],
    ['Disjuntor de ligação',main?main.res.In:'—','A'],['ΔU máxima no troço',fmt(worst,2),'%',worst>S.limT],(R.icuOn?['Icc no ponto de ligação',fmt(R.ikSrc,1),'kA']:['Poder de corte','Não verificado','<button type="button" class="kpi-go" data-goto="icu-modo">Definir nos Critérios →</button>',false,'off']),['Cabos e terminais',eur0(R.costTot+R.termTot),R.costEst||R.invC.concat(R.pC).some(c=>c.term&&c.term.est)?'c/ estimativas':''],['Custo das proteções',eur0(R.brkTot),+S.descABB?`PVP −${S.descABB}%`:'PVP ABB'],['A rever',bad.length,'',bad.length>0]]
    .map(([l,v,u,b,x])=>`<div class="kpi${b?' bad':''}${x?' '+x:''}"><small>${l}</small><b>${v}</b><i>${u}</i></div>`).join('');
  $('#kpis').querySelectorAll('[data-goto]').forEach(el=>el.onclick=()=>{const f=document.getElementById(el.dataset.goto);f.scrollIntoView({behavior:'smooth',block:'center'});f.focus({preventScroll:true});});
  const rowHTML=c=>{
    const o=c.res;
    if(c.Ib<=0)return `<tr class="${c.kind==='perc'?'feeder':''}"><td>${esc(c.nome)}<span class="sub">${c.L} m</span></td><td class="n r">0,0</td><td colspan="8" class="hint">${c.kind==='perc'?'Nenhum inversor passa por este percurso. Confirma os nomes dos quadros.':'Indica a potência.'}</td></tr>`;
    const {st,why}=verdict(c);
    const sel=`<select class="ovr" data-sel="${c.kind}:${c.ref.id}" aria-label="Secção"><option value="auto">Auto</option>${c.opts.map(x=>{const v=`${x.n}x${x.s}|${x.mat}|${x.cons}`;return `<option value="${v}"${c.ref.S===v?' selected':''}>${x.n>1?x.n+'×':''}${fs(x.s)} ${x.mat}${x.cons==='multi'?' multi':''}</option>`;}).join('')}</select>`;
    const label=(c.code?`<b class="ccode">${c.code}</b> `:'')+(c.kind==='inv'?`${esc(c.nome)} → ${esc(c.para)}`:esc(c.nome));
    const sub=c.kind==='inv'?`${esc(c.modelo)} · ${c.L} m${c.Lc!==c.L?` (cálculo ${fmt(c.Lc,1)} m)`:''} · ref. ${c.r.ref}`:`${c.L} m${c.Lc!==c.L?` (cálculo ${fmt(c.Lc,1)} m)`:''} · ${c.nInv} inversor${c.nInv===1?'':'es'}${c.gw?` · gateway ${c.gw.In} A ${+c.gw.fases===1?'1F':'3F'}${c.gw.dimNom!==false&&c.Ib>c.IbInv?' (cabo pela corrente nominal)':''}`:(c.fases===1?' · 1F':'')} · ref. ${c.r.ref}`;
    return `<tr class="${c.kind==='perc'?'feeder ':''}${st==='bad'?'err':''}"><td>${label}<span class="sub">${sub}</span></td><td class="n r">${fmt(c.p,1)}</td><td class="n r">${fmt(c.Ib,1)}</td>
      <td>${designation(c)}${c.alt?`<span class="sub altc">Mais barato e também cumpre: <b>${altName(c.alt.o,c.loaded)}</b> · poupa ${eur0(c.cost.v+(c.term?c.term.v:0)-c.alt.v)} em cabo e terminais${c.alt.est||c.cost.est?' (com preço estimado)':''} <button class="linkb" data-useal="${c.kind}:${c.ref.id}" data-o="${c.alt.o.n}x${c.alt.o.s}|${c.alt.o.mat}|${c.alt.o.cons}">Usar</button></span>`:''}${accWarn(c)?`<span class="sub limt">${esc(accWarn(c))}</span>`:''}${c.sel?`<span class="sub limt">Seletividade a confirmar: ${c.sel.In} A a montante &lt; ${fs(c.sel.k)} × ${c.sel.dn} A a jusante (${c.sel.code}). Confirma nas tabelas de seletividade ABB.</span>`:''}${c.dropMsg?`<span class="sub limt">${esc(c.dropMsg)}</span>`:''}${c.noFitMsg?`<span class="sub limt">${esc(c.noFitMsg)}</span>`:o&&c.opts.length&&c.i===c.opts.length-1&&o.n===3?`<span class="sub limt">Secção máxima: 3 cabos por fase. Se a queda de tensão apertar, considera cobre neste troço.</span>`:''}</td><td>${breaker(o,c)}</td><td class="n r">${o?fmt(o.Iz,0)+' A':'—'}</td><td class="n r">${o?`<b>${fmt(o.du*2.3,2)} V</b><span class="sub">${fmt(o.du,2)} %</span>`:'—'}</td>
      <td class="n r">${c.cost?eur0(c.cost.v)+(c.cost.est?'<span class="est" title="Preço estimado: sem compra deste cabo em 2026">*</span>':''):'—'}</td><td>${sel}</td><td><span class="pill ${st}">${why}</span></td></tr>`;};
  $('#res-body').innerHTML=R.invC.map(rowHTML).join('')+R.pC.map(rowHTML).join('');
  $('#sumline').textContent=(bad.length?`${bad.length} circuito(s) a rever`:'Todos os circuitos verificados')+(ends.length?` · injeção em ${[...new Set(ends.map(e=>e.ref.dest))].join(', ')}`:'');
  save();HOOKS.forEach(f=>f(R));
}

/* ---------- seletor de passagem ---------- */
let pickTarget=null;
function openPicker(key){
  pickTarget=key;const r=routeOf(key);
  const card=m=>`<button class="pcard${m.ref===r.ref?' on':''}" data-ref="${m.ref}"><span class="tile">${m.img.map(s=>`<img src="${s}" alt="">`).join('')}</span><b>Ref. ${m.ref} · ${METLAB[m.m]}</b><span>${esc(m.d)}</span></button>`;
  $('#pk-fav').innerHTML=FAV.map(f=>card(MODE[f])).join('');
  $('#pk-all').innerHTML=MODES.filter(m=>!FAV.includes(m.ref)).map(card).join('');
  $('#picker').hidden=false;$('#pk-fav .pcard.on, #pk-all .pcard.on, #pk-fav .pcard')?.focus();
}
function closePicker(){$('#picker').hidden=true;pickTarget=null;}


/* ---------- gateways ---------- */
function renderGwTable(){
  const gws=S.gws||[];$('#gw-empty').hidden=gws.length>0;$('#gw-wrap').hidden=!gws.length;
  $('#gw-body').innerHTML=gws.map(g=>`<tr data-id="${g.id}">
    <td><input data-g="nome" data-prev="${esc(g.nome)}" value="${esc(g.nome)}" aria-label="Nome do gateway"></td>
    <td><select data-g="modelo" aria-label="Modelo"><option value="">Manual</option>${GWALL.concat(g.modelo&&!GWALL.some(x=>x.modelo===g.modelo)?[{modelo:g.modelo}]:[]).map(x=>`<option value="${esc(x.modelo)}"${x.modelo===g.modelo?' selected':''}>${esc((x.marca?x.marca+' ':'')+x.modelo)}</option>`).join('')}</select></td>
    <td><select data-g="fases" aria-label="Rede"><option value="3"${+g.fases===3?' selected':''}>Trifásico 400 V</option><option value="1"${+g.fases===1?' selected':''}>Monofásico 230 V</option></select></td>
    <td><input data-g="In" type="number" min="1" step="1" value="${g.In}" class="w-num" aria-label="Corrente nominal"></td>
    <td><label class="check"><input type="checkbox" data-g="dimNom"${g.dimNom!==false?' checked':''}> Cabo de saída pela corrente nominal</label></td>
    <td class="r"><button class="ghost del" data-delg="${g.id}">Remover</button></td></tr>`).join('');
}
function bindGw(){
  const gb=$('#gw-body');
  const ev=e=>{const el=e.target,k=el.dataset.g;if(!k)return;const g=S.gws.find(x=>x.id===+el.closest('tr').dataset.id);
    if(k==='nome'){const prev=el.dataset.prev,nv=el.value;
      /* o gateway é um nó: o novo nome segue para os inversores e percursos que o usam */
      S.invs.forEach(i=>{if(i.q===prev)i.q=nv;});S.percs.forEach(p=>{if(p.orig===prev)p.orig=nv;if(p.dest===prev)p.dest=nv;});
      g.nome=nv;el.dataset.prev=nv;renderPercTable();renderInvTable();}
    else if(k==='modelo'){g.modelo=el.value;const m=GWALL.find(x=>x.modelo===el.value);if(m){g.fases=+m.fases;g.In=+m.In;}renderGwTable();}
    else if(k==='dimNom')g.dimNom=el.checked;else if(k==='fases')g.fases=+el.value;else g.In=parseFloat(el.value)||0;
    render();};
  gb.addEventListener('input',e=>{if(e.target.type!=='checkbox'&&e.target.tagName==='INPUT')ev(e);});
  gb.addEventListener('change',e=>{if(e.target.tagName==='SELECT'||e.target.type==='checkbox')ev(e);});
  gb.addEventListener('click',e=>{const b=e.target.closest('[data-delg]');if(!b)return;const g=S.gws.find(x=>x.id===+b.dataset.delg);
    /* ao remover, os inversores ligados ao gateway passam para o quadro a jusante */
    const out=S.percs.find(p=>p.orig===g.nome);const ins=S.percs.filter(p=>p.dest===g.nome);
    const to=out?out.dest:(ins[0]?ins[0].orig:(S.percs[0]?S.percs[0].orig:'QFV'));
    /* os percursos que chegavam ao gateway passam a ir para onde o gateway ia */
    ins.forEach(p=>{if(out)p.dest=out.dest;});S.percs=S.percs.filter(p=>p.orig!==g.nome&&(out||p.dest!==g.nome));
    S.invs.forEach(i=>{if(i.q===g.nome)i.q=to;});S.gws=S.gws.filter(x=>x!==g);
    renderGwTable();renderPercTable();renderInvTable();render();});
  $('#addgw').addEventListener('click',()=>openBP('GW'));
  $('#addgw-old')?.addEventListener('click',()=>{S.gws=S.gws||[];let k=S.gws.length+1;while(quadros().includes('Gateway '+k))k++;const nome='Gateway '+k;
    /* ordem inversor → QFV → gateway → quadro seguinte: o gateway entra logo a seguir ao QFV */
    const cnt={};S.invs.forEach(i=>cnt[i.q]=(cnt[i.q]||0)+1);const qfv=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0]||'QFV';
    const invs=S.invs.filter(i=>i.q===qfv).map(invInfo);const n=invs.length,f1=invs.length&&invs.every(x=>x.fases===1),Ib=invs.reduce((a,x)=>a+(x.iac||x.Ib),0);
    const sp=GWDB.find(g=>g.fases===(f1?1:3)&&g.ports>=n&&g.In>=Ib-1e-9&&invs.every(x=>(x.iac||x.Ib)<=g.portI+1e-9))||null;
    S.gws.push({id:uid++,nome,modelo:sp?sp.modelo:'',fases:sp?sp.fases:(f1?1:3),In:sp?sp.In:63,dimNom:true});
    const out=S.percs.find(p=>p.orig===qfv);
    if(out){const d=out.dest;out.dest=nome;out.split=true;S.percs.push({id:uid++,orig:nome,dest:d,L:5,S:'auto',...route('13','mono')});}
    else S.percs.unshift({id:uid++,orig:qfv,dest:nome,L:5,S:'auto',split:true,...route('13','mono')},{id:uid++,orig:nome,dest:'Quadro do cliente',L:10,S:'auto',...route('13','mono')});
    renderGwTable();renderPercTable();renderInvTable();render();toast(`${nome}${sp?' ('+sp.modelo+')':''} criado entre o ${qfv} e o quadro seguinte.`);});
}

/* ---------- eventos ---------- */
/* referência editável de um circuito: inversor, percurso, ou cabo de um inversor até ao gateway (id "percurso_inversor") */
function refOf(kind,id){if(kind==='inv')return S.invs.find(x=>x.id===+id);const [a,b]=String(id).split('_');const p=S.percs.find(x=>x.id===+a);if(!p)return null;
  if(b==null)return p;p.subs=p.subs||{};const sub=(p.subs[b]??={S:'auto'});return sub;}
function routeOf(key){return key==='inv'?S.rInv:key.startsWith('est:')?routeFor({est:key.slice(4)}):S.percs.find(p=>'p'+p.id===key);}
/* inversores que usam a passagem key ('inv' = sem esteira, 'est:A' = esteira A) */
const invsOfRoute=key=>S.invs.filter(i=>key==='inv'?!estOf(i):key.startsWith('est:')&&estOf(i)===key.slice(4));
function bind(){
  $('#loc').innerHTML=LOCS.map(([n,a,s])=>`<option value="${n}">${n} (${a} °C)</option>`).join('');
  $('#rsolo').innerHTML=E6.map(([r,f,d])=>`<option value="${r}">${fs(r)} K·m/W · ${d} (${fs(f.toFixed(2))})</option>`).join('');
  $('#folga').addEventListener('change',e=>{S.folga=e.target.checked;render();});
  document.querySelector('.tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)showTab(b.dataset.tab);});
  ['proj','rsolo','isol','mat','alThr','alPmin','limT','lim','cos','descABB','pint'].forEach(k=>{const el=document.getElementById(k);
    el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{S[k]=(el.type==='number'||k==='rsolo')?parseFloat(el.value):el.value;if(k!=='proj')render();else save();});});
  /* poder de corte: S.icu = {modo:''|'icc'|'pt', icc kA, sn kVA} */
  const icuVis=()=>document.querySelectorAll('[data-icu]').forEach(l=>l.hidden=l.dataset.icu!==S.icu.modo);
  [['icu-modo','modo'],['icu-icc','icc'],['icu-sn','sn']].forEach(([id,k])=>{const el=document.getElementById(id);
    el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{S.icu=Object.assign(example().icu,S.icu||{});S.icu[k]=k==='modo'?el.value:parseFloat(el.value);icuVis();render();});});
  $('#loc').addEventListener('change',e=>{S.loc=e.target.value;syncTemps();$('#tair').value=S.tair;$('#tsoil').value=S.tsoil;render();});
  const ib=$('#inv-body');
  const invEv=e=>{const k=e.target.dataset.k;if(!k)return;const i=S.invs.find(x=>x.id===+e.target.closest('tr').dataset.id);
    if(k==='modelo'){i.modelo=e.target.value;i.S='auto';renderInvTable();}else if(k==='q')i.q=e.target.value;else if(k==='est')i.est=e.target.value.trim().toUpperCase();else if(k==='cos'){const v=parseFloat(e.target.value);i.cos=v>0?Math.min(Math.max(v,0.5),1):null;}else if(k==='cons'){i.cons=e.target.value;i.S='auto';}else i[k]=parseFloat(e.target.value)||0;
    if(k==='modelo'||k==='pman'){const tr=document.querySelector(`#inv-body tr[data-id="${i.id}"]`);const info=invInfo(i);if(tr&&k==='pman'){tr.children[2].textContent=fmt(info.pnom,1);tr.children[3].firstChild.textContent=fmt(info.Ib,1);}}
    render();};
  ib.addEventListener('input',e=>{if(e.target.tagName==='INPUT')invEv(e);});ib.addEventListener('change',e=>{if(e.target.tagName==='SELECT')invEv(e);});
  ib.addEventListener('click',e=>{const d=e.target.closest('[data-del]'),u=e.target.closest('[data-dup]');
    if(d){S.invs=S.invs.filter(x=>x.id!==+d.dataset.del);}
    if(u){const src=S.invs.find(x=>x.id===+u.dataset.dup);const at=S.invs.indexOf(src);S.invs.splice(at+1,0,{...src,id:uid++,S:'auto'});}
    if(d||u){renderInvTable();render();}});
  $('#add').addEventListener('click',()=>{const l=S.invs[S.invs.length-1];S.invs.push({id:uid++,modelo:l?l.modelo:'SUN2000-50KTL-M3',pman:l?l.pman:0,q:l?l.q:(S.percs[0]?S.percs[0].orig:'QFV'),L:l?l.L:20,S:'auto'});renderInvTable();render();});
  const pb=$('#p-body');
  pb.addEventListener('input',e=>{const el=e.target,k=el.dataset.k;if(!k||el.dataset.rk)return;const p=S.percs.find(x=>x.id===+el.closest('tr').dataset.id);if(!p)return;
    if(k==='split'){p.split=el.checked;render();return;}
    if(k==='orig'||k==='dest'){const prev=el.dataset.prev,nv=el.value;
      if(k==='orig'&&prev&&!S.percs.some(x=>x!==p&&(x.orig===prev||x.dest===prev)))S.invs.forEach(i=>{if(i.q===prev)i.q=nv;});
      p[k]=nv;if(k==='orig')el.dataset.prev=nv;renderInvTable();}else p[k]=parseFloat(el.value)||0;render();});
  pb.addEventListener('change',e=>{const el=e.target;if(!el.dataset.bt)return;S.btypes=S.btypes||{};if(el.value)S.btypes[el.dataset.bt]=el.value;else delete S.btypes[el.dataset.bt];render();});
  pb.addEventListener('click',e=>{const b=e.target.closest('[data-delp]');if(!b)return;S.percs=S.percs.filter(x=>x.id!==+b.dataset.delp);renderPercTable();renderInvTable();render();});
  $('#addp').addEventListener('click',()=>openBP());
  $('#addp-old')?.addEventListener('click',()=>{const ends=S.percs.filter(p=>!percFrom(p.dest));const from=ends.length?ends[ends.length-1].dest:'QFV';
    S.percs.push({id:uid++,orig:from,dest:'Novo quadro',L:10,S:'auto',...route('13','mono')});renderPercTable();renderInvTable();render();
    const inp=document.querySelector('#p-body tr:last-child input[data-k="dest"]');if(inp){inp.focus();inp.select();}});
  /* cartões de passagem (inversores e percursos) */
  const routeEv=e=>{const el=e.target,key=el.dataset.rk;if(!key)return;const r=routeOf(key);const k=el.dataset.k;
    if(k==='sol')r.sol=el.checked;else if(k==='trays')r.trays=parseInt(el.value)||1;else{r[k]=el.value;(key==='inv'||key.startsWith('est:')?invsOfRoute(key):[r]).forEach(x=>x.S='auto');}
    if((key==='inv'||key.startsWith('est:'))&&k==='cons')renderInvTable();
    render();};
  /* o nº de circuitos aplica-se ao sair do campo, para o cartão poder ser redesenhado sem perder o foco */
  document.addEventListener('change',e=>{if(e.target.dataset.rk)routeEv(e);});
  document.addEventListener('click',e=>{const p=e.target.closest('[data-pick]');if(p)openPicker(p.dataset.pick);
    const c=e.target.closest('.pcard');if(c&&pickTarget){const r=routeOf(pickTarget);r.ref=c.dataset.ref;if(MODE[r.ref].m==='A2'&&r.cons==='mono')r.cons='multi';
      (pickTarget==='inv'||pickTarget.startsWith('est:')?invsOfRoute(pickTarget):[r]).forEach(x=>x.S='auto');closePicker();renderInvTable();render();}});
  $('#pk-close').addEventListener('click',closePicker);
  $('#picker').addEventListener('click',e=>{if(e.target.id==='picker')closePicker();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closePicker();});
  $('#res-body').addEventListener('click',e=>{const b=e.target.closest('[data-useal]');if(!b)return;const [kind,id]=b.dataset.useal.split(':');const ref=refOf(kind,id);if(ref){ref.S=b.dataset.o;render();}});
  $('#res-body').addEventListener('change',e=>{const s=e.target.dataset.sel;if(!s)return;const [kind,id]=s.split(':');const ref=refOf(kind,id);if(ref){ref.S=e.target.value;render();}});
  $('#reset').addEventListener('click',()=>{S=example();if(typeof CUR!=='undefined')CUR=null;load();});
  $('#copy').addEventListener('click',async()=>{const R=last;const L=['Circuito\tEquipamento\tP (kW)\tIb (A)\tL (m)\tPassagem (52H)\tFases (por fase)\tNeutro\tTerra (PE)\tDisjuntor\tRef. ABB disjuntor\tDiferencial ABB\tIz corr. (A)\tΔU troço (V)\tΔU troço (%)\tIcc máx. (kA)\tIcc mín. fim (kA)'];
    R.invC.concat(R.pC).forEach(c=>{const o=c.res;if(!o)return;const P=cableParts(o,c.loaded);
      L.push([c.kind==='inv'?`${c.nome} → ${c.para}`:c.nome,c.kind==='inv'?c.modelo:'',fmt(c.p,1),fmt(c.Ib,1),c.L,`Ref. ${c.r.ref} (${METLAB[MODE[c.r.ref].m]})`,P.multi?P.cabo:P.fase,P.multi?'no mesmo cabo':P.neutro,P.multi?'no mesmo cabo':P.terra,`${o.In} A ${c.loaded===2?'2P':'4P'}`,o.brk?`ABB ${o.brk.name} ${o.brk.icu} kA (${o.brk.ref})`:'',o.brk&&o.brk.dif?`${o.brk.dif.name} (${o.brk.dif.refs.join(', ')})`:'',fmt(o.Iz,0),fmt(o.du*2.3,2),fmt(o.du,2),o.ikmax!=null?fmt(o.ikmax,2):'',o.ikmin!=null?fmt(o.ikmin,2):''].join('\t'));});
    try{await navigator.clipboard.writeText(L.join('\n'));toast('Tabela copiada: cola no Excel ou no Word');}catch(e){toast('A cópia foi bloqueada neste navegador');}});
}
function scVis(){const on=S.sc.on!==false;document.querySelectorAll('#sc-fields [data-f]').forEach(l=>l.hidden=l.dataset.f!==S.sc.fonte);document.querySelectorAll('#sc-fields input,#sc-fields select').forEach(el=>el.disabled=!on);}
let TAB='ac';const HOOKS=[];
function showTab(t){TAB=t;document.querySelectorAll('.tabs [data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===t)));
  document.querySelectorAll('[data-pane]').forEach(p=>p.hidden=p.dataset.pane!==t);if(last)HOOKS.forEach(f=>f(last));}
function load(){syncTemps();renderGwTable();$('#folga').checked=S.folga!==false;['proj','tair','tsoil','isol','mat','alThr','alPmin','limT','lim','cos','descABB','pint'].forEach(k=>document.getElementById(k).value=S[k]??'');
  S.sc=Object.assign(example().sc,S.sc||{});S.dc=Object.assign(example().dc,S.dc||{});
  S.sc.on=false; /* curto-circuito retirado da ferramenta */
  S.icu=Object.assign(example().icu,S.icu||{});$('#icu-modo').value=S.icu.modo||'';$('#icu-icc').value=S.icu.icc??'';$('#icu-sn').value=S.icu.sn??'';
  document.querySelectorAll('[data-icu]').forEach(l=>l.hidden=l.dataset.icu!==S.icu.modo);
  $('#rsolo').value=String(S.rsolo);$('#loc').value=S.loc;renderPercTable();renderInvTable();render();}
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,2400);}
bind();bindGw();load();

/* ---------- popup "novo quadro" ---------- */
let BP={type:'INT'};
function bpEnds(){return S.percs.filter(p=>!percFrom(p.dest));}
function openBP(type){BP.type=type||'INT';
  $('#bp-types').innerHTML=['INT','CONT','GW','CLI'].map(k=>`<button class="tcard${k===BP.type?' on':''}" data-bt2="${k}"><b>${BTYPES[k][0]}</b><span>${BTYPES[k][1]}</span></button>`).join('');
  const pos=S.percs.map(p=>[String(p.id),`Entre ${p.orig} e ${p.dest}`]);const ends=bpEnds();const endN=ends.length?ends[ends.length-1].dest:(S.invs[0]?S.invs[0].q:'QFV');
  $('#bp-pos').innerHTML=pos.map(([v,l])=>`<option value="${v}">${esc(l)}</option>`).join('')+`<option value="end">No fim, a seguir a ${esc(endN)}</option>`;
  $('#bp-gw').innerHTML=GWALL.map(g=>`<option value="${esc(g.modelo)}">${esc(g.modelo)} · ${g.gama||''} · ${g.In} A ${+g.fases===1?'1F':'3F'} · ${g.ports??'?'} entradas</option>`).join('');
  bpSync(true);$('#bpick').hidden=false;}
function bpSync(defaults){const t=BP.type;document.querySelectorAll('#bp-types .tcard').forEach(b=>b.classList.toggle('on',b.dataset.bt2===t));
  $('#bp-gwl').hidden=t!=='GW';
  const base={INT:'Q. Interligação',CONT:'Q. Contagem',GW:'Gateway',CLI:'Q. Entrada'}[t];let nm=base,k=2;while(quadros().includes(nm))nm=base+' '+k++;
  if(defaults||!$('#bp-name').value||Object.values({INT:'Q. Interligação',CONT:'Q. Contagem',GW:'Gateway',CLI:'Q. Entrada'}).some(b=>$('#bp-name').value.startsWith(b)))$('#bp-name').value=nm;
  /* posição sugerida: gateway logo a seguir ao QFV; contagem e interligação antes do quadro do cliente; cliente no fim */
  const cnt={};S.invs.forEach(i=>cnt[i.q]=(cnt[i.q]||0)+1);const qfv=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
  const ends=bpEnds();let sug='end';
  if(t==='GW'){const o=S.percs.find(p=>p.orig===qfv);if(o)sug=String(o.id);}
  else if(t!=='CLI'&&ends.length)sug=String(ends[ends.length-1].id);
  if(defaults)$('#bp-pos').value=sug;
  if(t==='GW'&&defaults){const invs=S.invs.filter(i=>i.q===qfv).map(invInfo);const n=invs.length,f1=n&&invs.every(x=>x.fases===1),Ib=invs.reduce((a,x)=>a+(x.iac||x.Ib),0);
    const sp=GWALL.find(g=>+g.fases===(f1?1:3)&&(g.ports||99)>=n&&g.In>=Ib-1e-9&&invs.every(x=>(x.iac||x.Ib)<=(g.portI||999)+1e-9));if(sp)$('#bp-gw').value=sp.modelo;}
  $('#bp-hint').textContent=t==='GW'?'Do QFV sai um cabo por inversor até à respetiva entrada do gateway; a saída do gateway liga ao quadro seguinte.':t==='CONT'?'O contador fica neste quadro (direto até 50 kW, indireto com TI acima) e deixa de aparecer nos outros.':'';}
function bpAdd(){const t=BP.type,name=$('#bp-name').value.trim();if(!name){toast('Indica o nome do quadro');return;}if(quadros().includes(name)){toast('Já existe um quadro com esse nome');return;}
  const L=parseFloat($('#bp-L').value)||5;S.btypes=S.btypes||{};
  if(t==='GW'){const g=GWALL.find(x=>x.modelo===$('#bp-gw').value);S.gws=S.gws||[];S.gws.push({id:uid++,nome:name,modelo:g?g.modelo:'',fases:g?+g.fases:3,In:g?+g.In:63,dimNom:true});}
  else S.btypes[name]=t;
  const pos=$('#bp-pos').value;
  if(pos==='end'){const ends=bpEnds();const from=ends.length?ends[ends.length-1].dest:(S.invs[0]?S.invs[0].q:'QFV');S.percs.push({id:uid++,orig:from,dest:name,L,S:'auto',split:t==='GW',...route('13','mono')});}
  else{const p=S.percs.find(x=>String(x.id)===pos);const d=p.dest;p.dest=name;if(t==='GW')p.split=true;const i=S.percs.indexOf(p);S.percs.splice(i+1,0,{id:uid++,orig:name,dest:d,L,S:'auto',...route('13','mono')});}
  $('#bpick').hidden=true;renderGwTable();renderPercTable();renderInvTable();render();toast(`${name} adicionado`);}
$('#bp-types').addEventListener('click',e=>{const b=e.target.closest('[data-bt2]');if(!b)return;BP.type=b.dataset.bt2;bpSync(true);});
$('#bp-add').addEventListener('click',bpAdd);$('#bp-close').addEventListener('click',()=>$('#bpick').hidden=true);
$('#bpick').addEventListener('click',e=>{if(e.target.id==='bpick')$('#bpick').hidden=true;});
