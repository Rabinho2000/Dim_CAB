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
check(await p.$eval('[data-pane=brd]',e=>/Hager Orion plus FL342B/.test(e.innerText)&&/1SCA022753R5250/.test(e.innerText)&&/em Proteções/.test(e.innerText)&&/Montagem do quadro/.test(e.innerText)),'Quadros: QFV em Orion plus, OT800, proteções e montagem');
await p.click('[data-tab=ac]');
/* seletividade (o exemplo tem 1000 A + 1000 A em série) */
check(/Seletividade a confirmar: 800 A a montante < 1,6 × 800 A a jusante \(C5\)/.test(await rowTxt(/^C6 /)),'C6: aviso de seletividade com C5');
check(/A REVER\s*0/i.test(await kpis()),'os avisos não contam como "a rever"');
/* ΔU acumulada */
check(!/ΔU acumulada até à injeção/.test(await rowTxt(/^C1 /)),'com o aviso a 5 %, o C1 (4,31 %) não avisa');
await p.fill('#lim','3');check(/ΔU acumulada até à injeção 4,31 % > 3 %/.test(await rowTxt(/^C1 /)),'com 3 %, o C1 avisa (4,31 %)');await p.fill('#lim','5');
/* passagens dos inversores: sem passagem geral; o exemplo abre com a Passagem 1 com os 4 inversores */
check(await p.evaluate(()=>!document.querySelector('#inv-body [data-k=est], #inv-body [data-pick]')),'a tabela dos inversores já não tem as colunas Esteira e Passagem');
check(await p.$$eval('#route-inv [data-pick]',b=>b.map(x=>x.dataset.pick).join())==='rt:1'&&!/Passagem geral/.test(await p.$eval('#route-inv',e=>e.innerText)),'só a Passagem 1, sem passagem geral');
await p.click('#rt-add');
check(await p.$$eval('#route-inv [data-pick]',b=>b.map(x=>x.dataset.pick).join())==='rt:1,rt:2'&&await p.$eval('[data-rtname="2"]',e=>e.value)==='Passagem 2','"Adicionar passagem" cria o cartão Passagem 2');
for(const n of [3,4])await p.click(`[data-rtinv="2"][value="${await p.evaluate(n=>S.invs[n-1].id,n)}"]`);
check(await p.evaluate(()=>last.invC.map(c=>c.rtKey).join()==='rt:1,rt:1,rt:2,rt:2'&&last.invC.every(c=>c.nAgr===2)),'inversores 3 e 4 na Passagem 2: 2 circuitos em cada passagem');
await p.fill('[data-rtname="2"]','Tubo cobertura');await p.press('[data-rtname="2"]','Tab');
await p.click('#route-inv [data-pick="rt:2"]');await p.click('#picker .pcard[data-ref="3A"]');
check(await p.evaluate(()=>last.invC.map(c=>c.r.ref).join()==='13,13,3A,3A'&&S.rts[1].nome==='Tubo cobertura'&&S.rts[0].ref==='13'),'Passagem 2 em tubo (3A) com nome próprio; a 1 fica em caminho de cabos');
check(await p.evaluate(()=>last.invC[2].res.Iz!==last.invC[0].res.Iz),'os inversores da passagem 2 são calculados com a passagem deles');
await p.click(`[data-rtinv="2"][value="${await p.evaluate(()=>S.invs[3].id)}"]`);
check(await p.evaluate(()=>last.invC[3].rtKey==='none'&&verdict(last.invC[3]).st==='bad')&&/Sem passagem: inversor 4/.test(await p.$eval('#route-inv',e=>e.innerText))&&/Sem passagem atribuída/i.test(await rowTxt(/^C4 /)),'desmarcar o inversor 4: fica sem passagem, com aviso, a rever');
await p.click(`[data-rtinv="1"][value="${await p.evaluate(()=>S.invs[3].id)}"]`);
await p.click('[data-rtdel="2"]');
check(await p.evaluate(()=>S.rts.length===1&&last.invC.map(c=>c.rtKey).join()==='rt:1,rt:1,none,rt:1'),'remover a passagem: os inversores dela ficam sem passagem');
await p.click(`[data-rtinv="1"][value="${await p.evaluate(()=>S.invs[2].id)}"]`);
check(await p.evaluate(()=>last.invC.every(c=>c.rtKey==='rt:1'&&c.nAgr===4))&&/A REVER\s*0/i.test(await kpis()),'marcados na Passagem 1: os 4 juntos e nada a rever');
/* outros circuitos na esteira do percurso C5 */
const fg0=await p.evaluate(()=>last.pC[0].res.fg);
await p.fill('#p-body tr:first-child input[data-k=extra]','4');
check(await p.evaluate(fg0=>last.pC[0].nAgr===5&&last.pC[0].res.fg<fg0,fg0),'C5 com +4 circuitos na esteira: fator de agrupamento menor');
/* critérios fixos: sem isolamento, cos φ, desconto ABB, proteção de interface nem poder de corte */
check(await p.evaluate(()=>!['isol','cos','descABB','pint','icu-modo'].some(id=>document.getElementById(id))&&!document.querySelector('#inv-body input[data-k=cos]')),'Critérios sem os campos retirados');
await p.click('[data-tab=ac]');await (await p.$('#res-body')).screenshot({path:__dirname+'/avisos.png'});
/* escolha manual: Automático com o cabo escolhido, depois "Cumprem" e "Não cumprem", com Iz e ΔU ou o motivo; sem Al multicondutor */
const selC2='#res-body select[data-sel^="inv:"] >> nth=1';
const opt=await p.$eval('#res-body select[data-sel^="inv:"]',s=>({g:[...s.querySelectorAll('optgroup')].map(g=>g.label).join('|'),a:s.options[0].text,t:[...s.options].map(o=>o.text)}));
check(opt.g==='Cumprem|Não cumprem (só para verificar)'&&/^Automático \(1 × 95 mm² alumínio\)$|^Automático \(95 mm² alumínio\)$/.test(opt.a),'lista: Automático (cabo escolhido), Cumprem, Não cumprem: '+opt.a);
check(opt.t.some(x=>/^95 mm² alumínio — Iz \d+ A · ΔU [\d,]+ %$/.test(x))&&opt.t.some(x=>/^50 mm² cobre — Iz \d+ A < In 160 A$/.test(x)),'cada cabo com Iz e ΔU, ou o motivo');
check(!opt.t.some(x=>/alumínio multicondutor/.test(x)),'sem alumínio multicondutor');
await p.selectOption(selC2,'1x50|Cu|mono');
check(/^C2 .*1×50 mm²/.test(await rowTxt(/^C2 /))&&/IN > IZ/i.test(await rowTxt(/^C2 /))&&await p.evaluate(()=>verdict(last.invC[1]).st==='bad'),'C2 com 1×50 Cu escolhido à mão: fica o cabo e o circuito a rever (In > Iz)');
await p.selectOption(selC2,'auto');check(await p.evaluate(()=>verdict(last.invC[1]).st==='ok'),'Automático volta a escolher um cabo que cumpre');
console.log('ERR',errs);await b.close();process.exit(errs.length?1:0);})();
