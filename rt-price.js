/* ---------- preços de cabo (folhas JMM e Indusmelec, compras de 2026; o preço mais recente de cada cabo) ---------- */
const PRICES0=__PRICES__; /* [material, forma, secção, €/m, data, referência, designação, fornecedor] */
let PRICES=PRICES0.slice(),PFAM={};
/* junta os preços da base partilhada (Equipamentos): para o mesmo cabo fica o de data mais recente */
function rebuildPrices(extra){
  const m=new Map();PRICES0.concat(extra||[]).forEach(r=>{const k=r[0]+'|'+r[1]+'|'+r[2];const o=m.get(k);if(!o||String(r[4])>=String(o[4]))m.set(k,r);});
  PRICES=[...m.values()].sort((a,b)=>(a[0]+a[1]).localeCompare(b[0]+b[1])||a[2]-b[2]);
  PFAM={};PRICES.forEach(([mt,f,s,p,d,ref,des,forn])=>{(PFAM[mt+'|'+f]??=[]).push({s,p,d,ref,des,forn});});
  Object.values(PFAM).forEach(a=>a.sort((x,y)=>x.s-y.s));
}
rebuildPrices();
/* €/m de um condutor: valor comprado se existir; senão interpolado (ou extrapolado) entre as secções compradas da mesma família */
function pricePer(mat,form,s){
  const a=PFAM[mat+'|'+form];if(!a||!a.length)return null;
  const ex=a.find(x=>x.s===s);if(ex)return {p:ex.p,est:false};
  if(form==='pe'||form==='multi3')return null;
  if(a.length===1)return {p:a[0].p*s/a[0].s,est:true};
  let i=a.findIndex(x=>x.s>s);if(i<=0)i=i===0?1:a.length-1;
  const A=a[i-1],B=a[i];const p=A.p+(B.p-A.p)*(s-A.s)/(B.s-A.s);
  return {p:Math.max(p,0.05),est:true};
}
/* custo por metro de circuito */
function costPerM(o,loaded){
  if(o.cons==='multi'){
    if(loaded===2){const q3=pricePer('Cu','multi3',o.s);if(q3)return {p:q3.p*o.n,est:false};}
    const q=pricePer('Cu','multi5',o.s);if(!q)return null;return {p:q.p*(loaded===2?0.6:1)*o.n,est:q.est||loaded===2};}
  /* fases + neutro (por conjunto em paralelo) + um condutor de terra (cabo verde/amarelo comprado, se existir para essa secção) */
  const {sn,spe}=condSizes(o,loaded);const f=pricePer(o.mat,'mono',o.s),nn=pricePer(o.mat,'mono',sn),pe=pricePer(o.mat,'pe',spe)||pricePer(o.mat,'mono',spe);
  if(!f||!nn||!pe)return null;
  return {p:o.n*((loaded===2?1:3)*f.p+nn.p)+pe.p,est:f.est||nn.est||pe.est};
}
/* terminais de um circuito, nas duas pontas: por conjunto em paralelo, um por fase e um no neutro, mais um de terra.
   Cobre: terminal de cravar; alumínio: bimetálico Cu/Al. Multicondutores (secções pequenas): ponteiras, não contadas. */
function termLines(o,loaded){
  if(o.cons==='multi')return [];const {sn,spe}=condSizes(o,loaded),m=new Map();
  [[o.s,o.n*(loaded===2?1:3)*2],[sn,o.n*2],[spe,2]].forEach(([s,q])=>m.set(s,(m.get(s)||0)+q));
  return [...m].map(([s,q])=>({mat:o.mat,s,q}));
}
/* custo dos terminais de um circuito (preço comprado ou interpolado entre secções compradas); null se não houver preço */
function termCost(o,loaded){
  let v=0,est=false;
  for(const l of termLines(o,loaded)){const p=pricePer(l.mat,'term',l.s);if(!p)return null;v+=p.p*l.q;est=est||p.est;}
  return {v,est};
}
const FAMN={'Cu|term':'Terminal de cravar em cobre','Al|term':'Terminal bimetálico Cu/Al','Al|mono':'Alumínio monocondutor (LXV / XZ1-AL)','Cu|mono':'Cobre monocondutor (XV / RZ1-K)','Cu|multi5':'Cobre multicondutor 5G','Cu|multi3':'Cobre multicondutor 3G','Cu|pe':'Condutor de terra verde/amarelo','Cu|solar':'Cabo solar H1Z2Z2-K'};
function renderPrices(){const el=document.getElementById('price-table');if(!el)return;
  el.innerHTML='<thead><tr><th>Família</th><th class="r">Secção mm²</th><th class="r">€/m</th><th>Compra</th><th>Fornecedor</th><th>Referência</th></tr></thead><tbody>'+
    PRICES.map(([m,f,s,p,d,ref,des,forn])=>`<tr><td>${FAMN[m+'|'+f]||m+' '+f}</td><td class="n r">${String(s).replace('.',',')}</td><td class="n r">${(+p).toFixed(4).replace('.',',')}</td><td class="n">${esc(d)}</td><td>${esc(forn||'')}</td><td class="n">${esc(ref)}</td></tr>`).join('')+'</tbody>';}
