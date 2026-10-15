/* ---------- lado DC (motor, sem DOM): strings por MPPT, verificação com o inversor, cabo solar e fusíveis ----------
   S.dc = {tmin °C, tcell °C (célula a quente), lim (ΔU DC %), ifuse (fusível máx. em série do módulo, A),
           route (passagem dos cabos DC), arr:[{ii (índice do inversor em S.invs), mppt, pan (modelo), nser, npar, L (m)}]}
   Tensões: Voc e Vmp corrigidos com o coeficiente kVoc do módulo (para o Vmp é uma aproximação habitual).
   Corrente de projeto do cabo: 1,25 × Isc (IEC 60364-7-712). Não há quadro RTIEBT para o cabo solar H1Z2Z2-K: a corrente admissível
   verifica-se com os valores do cabo de cobre XLPE monocondutor com 2 condutores carregados no método da passagem — abaixo dos do
   cabo solar, do lado da segurança, e sem extrapolar. Queda de tensão: u = 2·ρ·L'·Imp/S, ΔU % = u / (nº × Vmp), L' com a folga do AC.
   Fusíveis (gPV, nos dois polos): quando (strings em paralelo − 1) × 1,25 × Isc > fusível máx. do módulo; 1,5 × Isc ≤ In ≤ 2,4 × Isc
   e In ≤ fusível máx. do módulo. */
const DC_SECS=[4,6,10,16],GPV=[10,12,15,16,20,25,30,32];
const dcDefaults=()=>({tmin:-3,tcell:70,lim:1.5,ifuse:25,route:{ref:'13',cons:'mono',disp:'trevo',trays:1,sol:true},arr:[]});
function dcState(){const D=Object.assign(dcDefaults(),S.dc||{});D.route=Object.assign(dcDefaults().route,D.route||{},{cons:'mono'});
  D.arr=(D.arr||[]).filter(a=>a&&typeof a==='object');return D;}
function solveDC(){
  const D=dcState(),ti=tempInfo(D.route),lc=L=>S.folga===false?L:(L<30?L*1.2:L*1.1);
  const perInv={};D.arr.forEach(a=>{perInv[a.ii]=(perInv[a.ii]||0)+Math.max(0,+a.npar||0);});
  const rows=D.arr.map((a,k)=>{
    const iv=S.invs[+a.ii],d=iv&&INVALL.find(x=>x.modelo===iv.modelo),p=PANALL.find(x=>x.modelo===a.pan);
    const r={a,k,code:'D'+(k+1),iv,inv:d,pan:p,ns:Math.max(0,Math.round(+a.nser||0)),np:Math.max(0,Math.round(+a.npar||0)),errs:[],warns:[]};
    if(!iv)r.errs.push('Inversor inexistente: escolhe um dos inversores do projeto');
    if(!p)r.errs.push('Escolhe o módulo');
    if(d&&!d.vmax)r.errs.push(`Sem dados DC do inversor ${d.modelo}${d.conf?' (a confirmar)':''}: completa em Equipamentos`);
    if(!r.ns||!r.np)r.errs.push('Indica os módulos por string e as strings em paralelo');
    if(r.errs.length)return r;
    const kv=(+p.kvoc||0)/100,T=t=>1+kv*(t-25);
    r.voc=r.ns*p.voc*T(D.tmin);r.vmpHot=r.ns*p.vmp*T(D.tcell);r.vmpCold=r.ns*p.vmp*T(D.tmin);
    r.isc=r.np*p.isc*(1+(+p.kisc||0)/100*(D.tcell-25));r.imp=r.np*p.imp;r.pdc=r.ns*r.np*p.pmax/1000;
    /* gama de módulos por string que cabe no inversor */
    r.nMax=Math.floor(d.vmax/(p.voc*T(D.tmin)));r.nMin=Math.ceil(Math.max(d.vmppmin||0,d.vstart||0)/(p.vmp*T(D.tcell)));
    if(r.voc>d.vmax+1e-9)r.errs.push(`Voc a ${fs(D.tmin)} °C = ${fmt(r.voc,0)} V > ${d.vmax} V do inversor: no máximo ${r.nMax} módulos por string`);
    if(+a.mppt<1||+a.mppt>(d.mppt||1))r.errs.push(`MPPT ${a.mppt||'—'} não existe (o inversor tem ${d.mppt||1})`);
    if(d.cc&&r.np>d.cc)r.errs.push(`${r.np} strings em paralelo > ${d.cc} entradas por MPPT`);
    if(d.isc&&r.isc>d.isc+1e-9)r.errs.push(`Isc = ${fmt(r.isc,1)} A > ${d.isc} A por MPPT`);
    if(d.vmppmin&&r.vmpHot<d.vmppmin)r.warns.push(`Vmp a ${fs(D.tcell)} °C = ${fmt(r.vmpHot,0)} V abaixo da gama MPP (${d.vmppmin} V): perde produção a quente`);
    if(d.vmppmax&&r.vmpCold>d.vmppmax)r.warns.push(`Vmp a ${fs(D.tmin)} °C = ${fmt(r.vmpCold,0)} V acima da gama MPP (${d.vmppmax} V)`);
    if(d.vstart&&r.vmpHot<d.vstart)r.warns.push(`Vmp a quente abaixo da tensão de arranque (${d.vstart} V)`);
    if(d.imax&&r.imp>d.imax+1e-9)r.warns.push(`Imp = ${fmt(r.imp,1)} A > ${d.imax} A por MPPT: o inversor limita a corrente`);
    /* fusíveis de string */
    r.fuse=null;if(r.np>=2&&(r.np-1)*1.25*p.isc>D.ifuse+1e-9){const lo=1.5*p.isc,hi=Math.min(2.4*p.isc,D.ifuse);const In=GPV.find(x=>x>=lo-1e-9);
      if(In&&In<=hi+1e-9)r.fuse={In,n:r.np*2};else r.errs.push(`Fusível de string impossível: precisa de ${fmt(lo,1)} A ≤ In ≤ ${fmt(hi,1)} A (fusível máx. do módulo ${D.ifuse} A)`);}
    /* cabo: por string, + e − */
    const Ib=1.25*p.isc,L=Math.max(0,+a.L||0),Lc=lc(L),nAgr=Math.max(1,perInv[a.ii]||r.np);
    const trays=MODE[D.route.ref]&&MODE[D.route.ref].m==='EF'?Math.max(1,+D.route.trays||1):1;
    const [fg,fgSrc]=groupFactor(D.route,Math.ceil(nAgr/trays),trays);const f=ti.ft==null||fg==null?0:ti.ft*ti.fsolo*ti.ftubo*fg;
    /* em E/F os monocondutores só estão no quadro a partir de 25 mm²: abaixo, o par + / − conta como cabo com 2 condutores
       carregados (coluna E), como o AC faz com o multicondutor */
    const opt=s=>{const z=izBase({...D.route,cons:MODE[D.route.ref]&&MODE[D.route.ref].m==='EF'&&s<25?'multi':'mono'},'Cu',s,2);const Iz=z?z.v*f:0;const du=2*0.0225*Lc*p.imp/s/(r.ns*p.vmp)*100;
      return {s,Iz,iz0:z?z.v:null,q:z?z.q:'',du,ok:!!z&&Iz>=Ib-1e-9&&(!r.fuse||Iz>=r.fuse.In-1e-9)&&du<=D.lim+1e-9};};
    const all=DC_SECS.map(opt).filter(o=>o.iz0!=null);const best=all.find(o=>o.ok);
    r.cab={...(best||all[all.length-1]||{s:DC_SECS[DC_SECS.length-1],Iz:0,du:Infinity}),Ib,L,Lc,fg,fgSrc,f,nAgr,m:r.np*2*Lc};
    if(!best){const o=r.cab;r.errs.push(o.Iz<Ib?`Nenhuma secção de cabo solar até ${DC_SECS[DC_SECS.length-1]} mm² cumpre Iz ≥ ${fmt(Ib,1)} A nesta passagem (${fgSrc})`
      :`ΔU DC ${fmt(o.du,2)} % > ${fs(D.lim)} % mesmo com ${fs(o.s)} mm²: aproxima o inversor ou divide a string`);}
    return r;});
  const invs={};rows.forEach(r=>{if(!r.iv||!r.pdc)return;const g=invs[r.a.ii]||(invs[r.a.ii]={ii:+r.a.ii,iv:r.iv,inv:r.inv,pdc:0,mppts:new Set()});g.pdc+=r.pdc;g.mppts.add(+r.a.mppt);});
  Object.values(invs).forEach(g=>{const pn=invInfo(g.iv).pnom;g.ratio=pn?g.pdc/pn:null;g.mppts=g.mppts.size;});
  return {D,rows,invs:Object.values(invs),pdc:rows.reduce((a,r)=>a+(r.pdc||0),0),bad:rows.filter(r=>r.errs.length).length,warn:rows.filter(r=>!r.errs.length&&r.warns.length).length,
    metros:rows.reduce((a,r)=>a+(r.cab?r.cab.m:0),0)};
}
