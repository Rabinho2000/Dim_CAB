const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
const html=require('fs').readFileSync('cabos-rt.html','utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
await p.setContent('<!doctype html><meta charset=utf-8><body>'+html);
const out={};
const grab=async(name)=>{out[name]=await p.evaluate(()=>{const R=last;const g=c=>({Lc:c.Lc,kind:c.kind,nome:c.nome,modelo:c.modelo||'',Ib:c.Ib,L:c.L,loaded:c.loaded,p:c.p,ref:c.r.ref,cons:c.res.cons,disp:c.r.disp,trays:c.r.trays||1,nAgr:c.nAgr,
  mat:c.res.mat,s:c.res.s,n:c.res.n,Iz:c.res.Iz,In:c.res.In,du:c.res.du,acc:c.acc,fg:c.res.fg,ft:c.ti.ft,fsolo:c.ti.fsolo,ftubo:c.ti.ftubo,t:c.ti.t,iz0:c.res.iz0,q:c.res.q,col:c.res.qcol,path:(c.path||[]).map(x=>x.orig+'>'+x.dest),orig:c.ref.orig,dest:c.ref.dest,para:c.para});
  return {cos:S.cos,folga:S.folga,isol:S.isol,lim:S.lim,limT:S.limT,alThr:S.alThr,alPmin:S.alPmin,rows:R.invC.concat(R.pC).filter(c=>c.res).map(g)};});};
await grab('exemplo');
for(let k=0;k<2;k++) await p.click('#add');
for(const [i,L] of [[1,12],[2,20],[3,25],[4,30],[5,45],[6,80]]){await p.selectOption(`#inv-body tr:nth-child(${i}) select[data-k=modelo]`,'SUN2000-100KTL-M2');await p.fill(`#inv-body tr:nth-child(${i}) input[data-k=L]`,String(L));}
await grab('6x100');
await p.selectOption('#route-inv select[data-k=disp]','esteira');await p.selectOption('#route-inv select[data-k=trays]','2');await grab('esteira2');
await p.selectOption('#route-inv select[data-k=disp]','afh');await grab('afastH');
await p.click('#route-inv [data-pick]');await p.click('#pk-fav .pcard[data-ref="61"]');await grab('enterrado61');
await p.click('#route-inv [data-pick]');await p.click('#pk-fav .pcard[data-ref="11"]');await p.selectOption('#route-inv select[data-k=cons]','multi');await grab('parede11multi');
await p.selectOption('#inv-body tr:nth-child(1) select[data-k=modelo]','SigenStor EC 8.0 SP');await p.fill('#inv-body tr:nth-child(1) input[data-k=L]','25');await grab('mono1F');
await p.selectOption('#isol','PVC');await grab('pvc');
require('fs').writeFileSync('calc_dump.json',JSON.stringify(out));
console.log('ERR',errs);await b.close();})();
