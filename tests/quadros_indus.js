/* componentes dos quadros como a Indusmelec orçamenta (rt-indus.js): envolvente, corte, DST, repartição, bornes e montagem
   em cada modelo de projeto, e um QFV com um só inversor de 30 kW. As proteções de saída não entram no subtotal. Tem de dar "ERR []". */
const { chromium } = require('playwright');const fs=require('fs');
(async()=>{const errs=[];const check=(ok,msg)=>{console.log(ok?'ok  ':'FALHA',msg);if(!ok)errs.push(msg);};
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:1000}});p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><meta charset=utf-8><body>'+fs.readFileSync(__dirname+'/../cabos-rt.html','utf8').replace(/<link[^>]*fonts[^>]*>/g,''));
const parts=()=>p.evaluate(()=>{const R=solveAll();return quadros().map(n=>indusParts(n,R)).filter(Boolean).map(P=>({node:P.node,role:P.role,encl:P.encl,mont:P.mont,sub:P.sub,
  refs:P.items.map(x=>x.ref).join(' '),prot:P.items.filter(x=>x.prot).every(x=>x.total==null),sum:P.items.reduce((a,x)=>a+(x.prot?0:x.total||0),0)}));});
const tpl=async id=>{await p.click('#reset');await p.click(`[data-tpl=${id}]`);return parts();};
let Q=await tpl('exemplo');const qfv=Q.find(x=>x.role==='QFV'),int=Q.find(x=>x.role==='INT');
check(qfv.encl==='MCS20086PER5'&&/MCS20046R5/.test(qfv.refs)&&/2CTB815710R4000/.test(qfv.refs)&&/7F\.20/.test(qfv.refs),'exemplo: QFV com caixa moldada em armário Eldon de chão, OVR T1+T2, ventilação');
check(int&&/NSYCRN/.test(int.encl)&&int.mont>=250,'exemplo: interligação em armário Schneider CRN com montagem');
check(Q.every(x=>x.prot&&Math.abs(x.sum-x.sub)<1e-6),'proteções de saída fora do subtotal');
Q=await tpl('cliente');
check(Q.length===1&&Q[0].encl==='FL52S'&&/UE21D2/.test(Q[0].refs)&&/7P\.24\.8\.275\.0020/.test(Q[0].refs)&&Q[0].mont===375,`2 × 50 kW: Hager univers FL52S com barramento UE21D2, DST Finder e montagem 375 € (${Q[0]&&Q[0].encl} ${Q[0]&&Q[0].mont})`);
Q=await tpl('res1');
check(Q.length===1&&Q[0].encl==='GW40104BS'&&Q[0].mont===80&&!/015\.563820|WPD/.test(Q[0].refs),`6 kW: Gewiss 24M, sem repartidor nem bornes, montagem 80 € (${Q[0]&&Q[0].encl})`);
Q=await tpl('gwci');
check(Q.every(x=>x.role==='QFV')&&Q.length===1,'com gateway: só o QFV tem lista (o gateway é do fabricante)');
/* um inversor de 50 kW (disjuntor de 100 A): Gewiss 36M com repartidor e bornes WPD */
await p.click('#reset');await p.click('[data-tpl=cliente]');
await p.evaluate(()=>{S.invs=S.invs.slice(0,1);render();});Q=await parts();
check(Q.length===1&&Q[0].encl==='GW40105BD'&&/015\.563820/.test(Q[0].refs)&&Q[0].mont===90,`1 × 50 kW: Gewiss 36M com repartidor TD 125 A, montagem 90 € (${Q[0]&&Q[0].encl} ${Q[0]&&Q[0].refs})`);
await p.click('[data-tab=brd]');check(await p.$eval('[data-pane=brd]',e=>/como a Indusmelec orçamenta/.test(e.innerText)&&/Subtotal do quadro/.test(e.innerText)),'tabela no separador Quadros');
console.log('ERR',errs);await b.close();process.exit(errs.length?1:0);})();
