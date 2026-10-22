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
check(await p.$eval('[data-pane=brd]',e=>/Eldon MCS 2000 × 800 × 600/.test(e.innerText)&&/1SCA022753R5250/.test(e.innerText)&&/em Proteções/.test(e.innerText)&&/Montagem do quadro/.test(e.innerText)),'Quadros: QFV com armário Eldon, OT800, proteções e montagem');
await p.click('[data-tab=ac]');
/* seletividade (o exemplo tem 1000 A + 1000 A em série) */
check(/Seletividade a confirmar: 800 A a montante < 1,6 × 800 A a jusante \(C5\)/.test(await rowTxt(/^C6 /)),'C6: aviso de seletividade com C5');
check(/A REVER\s*0/i.test(await kpis()),'os avisos não contam como "a rever"');
/* ΔU acumulada */
check(!/ΔU acumulada até à injeção/.test(await rowTxt(/^C1 /)),'com o aviso a 5 %, o C1 (4,31 %) não avisa');
await p.fill('#lim','3');check(/ΔU acumulada até à injeção 4,31 % > 3 %/.test(await rowTxt(/^C1 /)),'com 3 %, o C1 avisa (4,31 %)');await p.fill('#lim','5');
/* passagens dos inversores: a geral e uma acrescentada, com os inversores marcados */
check(await p.evaluate(()=>!document.querySelector('#inv-body [data-k=est], #inv-body [data-pick]')),'a tabela dos inversores já não tem as colunas Esteira e Passagem');
await p.click('#rt-add');
check(await p.$$eval('#route-inv [data-pick]',b=>b.map(x=>x.dataset.pick).join())==='inv,rt:1'&&await p.$eval('[data-rtname="1"]',e=>e.value)==='Passagem 1','"Adicionar passagem" cria o cartão Passagem 1');
for(const n of [3,4])await p.click(`#route-inv .rtinvs label:nth-of-type(${n}) input`);
check(await p.evaluate(()=>last.invC.map(c=>c.rtKey).join()==='inv,inv,rt:1,rt:1'&&last.invC.every(c=>c.nAgr===2)),'inversores 3 e 4 na Passagem 1: 2 circuitos em cada passagem');
check(/Passagem geral\s*inversores 1, 2/.test(await p.$eval('#route-inv',e=>e.innerText)),'a passagem geral diz que inversores tem');
await p.fill('[data-rtname="1"]','Tubo cobertura');await p.press('[data-rtname="1"]','Tab');
await p.click('#route-inv [data-pick="rt:1"]');await p.click('#picker .pcard[data-ref="3A"]');
check(await p.evaluate(()=>last.invC.map(c=>c.r.ref).join()==='13,13,3A,3A'&&S.rts[0].nome==='Tubo cobertura'&&S.rInv.ref==='13'),'Passagem 1 em tubo (3A) com nome próprio; a geral fica em caminho de cabos');
check(await p.evaluate(()=>last.invC[2].res.Iz!==last.invC[0].res.Iz),'os inversores da passagem 1 são calculados com a passagem deles');
await p.click('#route-inv .rtinvs label:nth-of-type(4) input');
check(await p.evaluate(()=>last.invC[3].rtKey==='inv'&&last.invC[3].nAgr===3),'desmarcar o inversor 4: volta à passagem geral');
await p.click('[data-rtdel="1"]');
check(await p.evaluate(()=>!S.rts.length&&last.invC.every(c=>c.rtKey==='inv'&&c.nAgr===4)),'remover a passagem: os inversores voltam à geral');
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
/* escolha manual: qualquer cabo tabelado, agrupado por material e constituição; um que não cumpre fica a rever */
const selC2='#res-body select[data-sel^="inv:"] >> nth=1';
check(await p.$eval('#res-body select[data-sel^="inv:"]',s=>[...s.querySelectorAll('optgroup')].map(g=>g.label).join('|')).then(t=>/Sugeridas/.test(t)&&/Alumínio · multicondutor/.test(t)&&/Cobre · multicondutor/.test(t)),'lista com as sugeridas e todos os outros cabos tabelados');
await p.selectOption(selC2,'1x25|Cu|mono');
check(/^C2 .*1×25 mm²/.test(await rowTxt(/^C2 /))&&/IN > IZ/i.test(await rowTxt(/^C2 /))&&await p.evaluate(()=>verdict(last.invC[1]).st==='bad'),'C2 com 1×25 Cu escolhido à mão: fica o cabo e o circuito a rever (In > Iz)');
await p.selectOption(selC2,'auto');check(await p.evaluate(()=>verdict(last.invC[1]).st==='ok'),'Auto volta a escolher um cabo que cumpre');
console.log('ERR',errs);await b.close();process.exit(errs.length?1:0);})();
