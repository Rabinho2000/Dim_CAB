/* componentes dos quadros como a Indusmelec orçamenta (rt-indus.js, orçamentos 2026), com a envolvente Hager Orion plus (univers por dentro nos de platinas): envolvente, corte,
   DST, repartição, bornes e montagem em cada modelo de projeto. As proteções de saída não entram no subtotal. O quadro do cliente não tem cartão:
   o disjuntor de interligação fica no quadro de interligação ou, sem ele, num bloco à parte. Tem de dar "ERR []". */
const { chromium } = require('playwright');const fs=require('fs');
(async()=>{const errs=[];const check=(ok,msg)=>{console.log(ok?'ok  ':'FALHA',msg);if(!ok)errs.push(msg);};
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:1000}});p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><meta charset=utf-8><body>'+fs.readFileSync(__dirname+'/../cabos-rt.html','utf8').replace(/<link[^>]*fonts[^>]*>/g,''));
const parts=()=>p.evaluate(()=>{const R=solveAll();return quadros().map(n=>indusParts(n,R)).filter(Boolean).map(P=>({node:P.node,role:P.role,encl:P.encl,mont:P.mont,sub:P.sub,
  refs:P.items.map(x=>x.ref).join(' '),protQ:P.items.filter(x=>x.papel==='Proteção de saída').reduce((a,x)=>a+x.q,0),prot:P.items.filter(x=>x.prot).every(x=>x.total==null),sum:P.items.reduce((a,x)=>a+(x.prot?0:x.total||0),0)}));});
const tpl=async id=>{await p.click('#reset');await p.click(`[data-tpl=${id}]`);return parts();};
let Q=await tpl('exemplo');const qfv=Q.find(x=>x.role==='QFV'),int=Q.find(x=>x.role==='INT');
check(qfv.encl==='FL342B'&&/7P2482750020/.test(qfv.refs)&&!/2CTB815710R4000/.test(qfv.refs)&&/7F2082302055/.test(qfv.refs)&&/2CCG001233R0001/.test(qfv.refs)&&/2CSJ341001R0202/.test(qfv.refs)&&!/RGU/.test(qfv.refs)&&qfv.mont===900,`exemplo: QFV em Orion plus FL342B, DST Finder protegido por S800P 3P 100 A, unidade central 4 E/S, ventilação, montagem 900 € (${qfv.encl} ${qfv.mont})`);
check(int&&int.encl==='FL312B'&&int.mont>=250&&int.protQ===4,`exemplo: interligação em Orion plus com o disjuntor de entrada e o de interligação (2 × E1.2 + 2 relés) (${int&&int.encl} ${int&&int.protQ})`);
check(Q.every(x=>!/GW401|FL52S|FL72S|MCS2|NSYCRN/.test(x.refs)),'sem Gewiss, armário univers, Eldon nem Schneider quando cabe numa Orion plus');
check(Q.every(x=>x.prot&&Math.abs(x.sum-x.sub)<1e-6),'proteções de saída fora do subtotal');
Q=await tpl('cliente');
check(Q.length===1&&Q[0].encl==='FL301B'&&/UT52S/.test(Q[0].refs)&&/UN05A/.test(Q[0].refs)&&/563200/.test(Q[0].refs)&&/7P2482750020/.test(Q[0].refs)&&Q[0].mont===350,`2 × 50 kW (corte 160 A): Orion plus FL301B com univers, repartidor TD 160 A, DST Finder e montagem 350 € (${Q[0]&&Q[0].encl} ${Q[0]&&Q[0].mont})`);
Q=await tpl('res1');
check(Q.length===1&&Q[0].encl==='FL213B'&&/FL992A/.test(Q[0].refs)&&Q[0].mont===80&&!/563|K50AL/.test(Q[0].refs),`6 kW: Orion plus FL213B, sem repartidor nem bornes, montagem 80 € (${Q[0]&&Q[0].encl})`);
Q=await tpl('gwci');
check(Q.every(x=>x.role==='QFV')&&Q.length===1,'com gateway: só o QFV tem lista (o gateway é do fabricante)');
/* um inversor de 50 kW (disjuntor de 80 A): Orion plus 500 × 400 com kit modular, como os orçamentos 1 × 50 kW (Buijnik, Metalgarve) */
await p.click('#reset');await p.click('[data-tpl=cliente]');
await p.evaluate(()=>{S.invs=S.invs.slice(0,1);render();});Q=await parts();
check(Q.length===1&&Q[0].encl==='FL213B'&&/FL992A/.test(Q[0].refs)&&/563920/.test(Q[0].refs)&&Q[0].mont===240,`1 × 50 kW: Orion plus FL213B com kit modular e repartidor TD 80 A, montagem 240 € (${Q[0]&&Q[0].encl} ${Q[0]&&Q[0].refs})`);
await p.click('[data-tab=brd]');check(await p.$eval('[data-pane=brd]',e=>/como a Indusmelec orçamenta/.test(e.innerText)&&/Subtotal do quadro/.test(e.innerText)&&/Hager Orion plus FL213B · 135\s€ líq\./.test(e.innerText)),'tabela no separador Quadros, com a Orion plus e o preço líquido');
/* quadro do cliente: sem cartão; o disjuntor de interligação fica no quadro de interligação ou, sem ele, num bloco à parte */
const cards=()=>p.$$eval('#boards .bname',e=>e.map(x=>x.innerText));
await p.click('#reset');await p.click('[data-tpl=exemplo]');await p.click('[data-tab=brd]');
let nm=await cards();check(nm.join('|')==='QFV|QInterligação'&&await p.$eval('#boards',e=>/Disjuntor de interligação\s*QInterligação → Qentrada/.test(e.innerText)&&!/no quadro do cliente/.test(e.innerText)),'com interligação: só os cartões QFV e QInterligação, o disjuntor de interligação dentro do QInterligação: '+nm);
await p.click('#reset');await p.click('[data-tpl=cliente]');await p.click('[data-tab=brd]');
nm=await cards();check(nm.join('|')==='QFV|Disjuntor de interligação · no quadro do cliente'&&await p.$eval('#boards',e=>/QFV → Qentrada\s+160 A/.test(e.innerText)&&!/ponto de injeção/.test(e.innerText)),'sem interligação: o disjuntor fica no quadro do cliente, sem cartão do quadro do cliente: '+nm);
console.log('ERR',errs);await b.close();process.exit(errs.length?1:0);})();
