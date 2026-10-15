/* avisos e opções novas na interface (exemplo de origem): componentes Indusmelec no separador Quadros, coluna Esteira, outros circuitos na
   esteira de um percurso, aviso de ΔU acumulada, aviso de seletividade e proteção de interface. Avisos não mudam o estado "OK".
   Gera tests/avisos.png. Tem de dar "ERR []". */
const { chromium } = require('playwright');const fs=require('fs');
(async()=>{const errs=[];const check=(ok,msg)=>{console.log(ok?'ok  ':'FALHA',msg);if(!ok)errs.push(msg);};
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:1000}});p.on('pageerror',e=>errs.push(e.message));
await p.setContent('<!doctype html><meta charset=utf-8><body>'+fs.readFileSync(__dirname+'/../cabos-rt.html','utf8').replace(/<link[^>]*fonts[^>]*>/g,''));
const rowTxt=async re=>(await p.$$eval('#res-body tr',t=>t.map(r=>r.innerText.replace(/\s+/g,' ')))).find(r=>re.test(r))||'';
const kpis=()=>p.$eval('#kpis',e=>e.innerText.replace(/\s+/g,' '));
/* componentes Indusmelec no separador Quadros */
await p.click('[data-tab=brd]');
check(await p.$eval('[data-pane=brd]',e=>/Eldon MCS 2000 × 800 × 600/.test(e.innerText)&&/1SCA022871R5870/.test(e.innerText)&&/em Proteções/.test(e.innerText)&&/Montagem do quadro/.test(e.innerText)),'Quadros: QFV com armário Eldon, OT1250, proteções e montagem');
await p.click('[data-tab=ac]');
/* seletividade (o exemplo tem 1000 A + 1000 A em série) */
check(/Seletividade a confirmar: 1000 A a montante < 1,6 × 1000 A a jusante \(C5\)/.test(await rowTxt(/^C6 /)),'C6: aviso de seletividade com C5');
check(/A REVER\s*0/i.test(await kpis()),'os avisos não contam como "a rever"');
/* ΔU acumulada */
check(!/ΔU acumulada até à injeção/.test(await rowTxt(/^C1 /)),'com o aviso a 5 %, o C1 (4,06 %) não avisa');
await p.fill('#lim','3');check(/ΔU acumulada até à injeção 4,06 % > 3 %/.test(await rowTxt(/^C1 /)),'com 3 %, o C1 avisa (4,06 %)');await p.fill('#lim','5');
/* esteiras dos inversores */
for(const [i,v] of [[1,'a'],[2,'A'],[3,'B'],[4,'B']])await p.fill(`#inv-body tr:nth-child(${i}) input[data-k=est]`,v);
check(await p.evaluate(()=>last.invC.every(c=>c.nAgr===2)&&S.invs[0].est==='A'),'Esteira A/A/B/B: 2 circuitos por esteira (letra em maiúsculas)');
check(/agrupamento\s*[\d,]+/.test(await p.$eval('#route-inv',e=>e.innerText))&&!/4 circuitos/.test(await p.$eval('#route-inv',e=>e.innerText)),'o cartão da passagem já não diz 4 circuitos');
/* outros circuitos na esteira do percurso C5 */
const fg0=await p.evaluate(()=>last.pC[0].res.fg);
await p.fill('#p-body tr:first-child input[data-k=extra]','4');
check(await p.evaluate(fg0=>last.pC[0].nAgr===5&&last.pC[0].res.fg<fg0,fg0),'C5 com +4 circuitos na esteira: fator de agrupamento menor');
/* proteção de interface */
await p.fill('#pint','400');await p.click('[data-tab=brd]');
check(await p.$eval('[data-pane=brd]',e=>/Proteção de interface\s*relé de proteção de interface/.test(e.innerText)),'Quadros: QInterligação com a proteção de interface (500 kW ≥ 400 kW)');
await p.click('[data-tab=sld]');check(/Proteção de interface \(a especificar\)/.test(await p.$eval('#sld',e=>e.innerHTML)),'unifilar com a proteção de interface');
await p.click('[data-tab=ac]');await p.fill('#pint','');await p.click('[data-tab=brd]');
check(!(await p.$eval('[data-pane=brd]',e=>/Proteção de interface/.test(e.innerText))),'em branco: sem proteção de interface');
await p.click('[data-tab=ac]');await (await p.$('#res-body')).screenshot({path:__dirname+'/avisos.png'});
console.log('ERR',errs);await b.close();process.exit(errs.length?1:0);})();
