/* ---------- componentes de cada quadro como a Indusmelec os orçamenta (orçamentos Indusmelec de abr.–out. 2026, indus.json) ----------
   Os aparelhos são os de qfvParts/boardFor (regras Solcor do unifilar); daqui vêm as referências, a envolvente, os acessórios e a
   montagem. Preço = líquido do orçamento Indusmelec mais recente com essa referência (indus.json, gerado por mkindus.py a partir dos PDF);
   as referências que não aparecem nesses orçamentos ficam com o preço dos orçamentos 2025–2026 das pastas de projeto. Os disjuntores e diferenciais
   dos circuitos já estão em "Disjuntores e diferenciais ABB" (brkTot): aqui aparecem com prot:true e não entram no subtotal. */
/* envolventes Hager Orion plus (PVP da tabela 2026, hager.json gerado por mkhager.py): {ref: [descrição, PVP]} */
const HAGER=__HAGER__;
/* orçamentos Indusmelec 2026: {refs: {ref: [descrição, € líquido, aaaa-mm, nº do orçamento]}, mont: [[data, nº, obra, quadro, €]]} */
const INDUSQ=__INDUS__;
/* desconto da Indusmelec no material Hager nos orçamentos 2026 (35 % + 2 %): para as Orion plus que não aparecem nos orçamentos */
const HAGER_NET=0.65*0.98;
const INDUS={ /* ref: [descrição, € líquido, data do orçamento]; primeiro os de 2025–2026 que não aparecem nos orçamentos de 2026 */
  'MCS20086PER5':['Eldon MCS 2000 × 800 × 600 PE',534.22,'2026-02'],'MCS20046R5':['Eldon MF 2000 × 400 × 600',482.31,'2026-02'],'CCI06':['Eldon: suporte de união interna',30.63,'2026-02'],'CCM04':['Eldon: kit de união interna de esquina',22.11,'2026-02'],
  'PF1080':['Eldon: esquadro frontal 100 × 800',41.87,'2026-02'],'PF1040':['Eldon: rodapé lateral',38.24,'2026-02'],
  'NSYCRN108250':['Schneider Spacial CRN 1000 × 800 × 250',209.92,'2025-12'],'NSYMM108':['Schneider: platina 1000 × 800',70.00,'2025-12'],'NSYCRN128300':['Schneider Spacial CRN 1200 × 800 × 300',336.68,'2026-02'],'NSYMM128':['Schneider: platina 1200 × 800',121.89,'2026-02'],
  '2CDE284001R0125':['ABB E204/125 interruptor-seccionador 4P 125 A',55.93,'2025-11'],'1SCA022753R5250':['ABB OT800 interruptor-seccionador 4P 800 A, comando frontal',420.50,'2025-05'],'1SCA022871R5870':['ABB OT1250 interruptor-seccionador 4P 1250 A, comando frontal',612.17,'2026-02'],
  '7P.24.8.275.0020':['Finder 7P.24 descarregador de sobretensões tipo 2, 3F+N',90.00,'2026-03'],'2CTB815710R4000':['ABB OVR T1+T2 25 kA descarregador de sobretensões 3F+N',354.20,'2026-02'],'2CCG001233R0001':['ABB S803P-C100 disjuntor 3P 100 A 50 kA (proteção do DST)',104.71,'2026-02'],
  '015.563820':['Repartidor tetrapolar TD 125 A',15.00,'2026-01'],'WPD 130':['Weidmüller WPD 130 1×50/1×50 (borne de passagem)',6.28,'2025-12'],
  '2CSM200893R1801':['ABB porta-fusíveis seccionável 1P+N 32 A 10×38',5.76,'2026-02'],'2CSM200923R1801':['ABB porta-fusíveis seccionável 1P 32 A 10×38',2.90,'2026-02'],'LF302G':['Fusível 10×38 gG 2 A',0.40,'2026-03'],
  '2CSR275080R1254':['ABB DS201 disjuntor diferencial 1P+N C25',56.70,'2026-02'],'2CDS251001R0104':['ABB S201 disjuntor 1P C10',5.74,'2026-02'],'7U.00.8.230.0010':['Finder tomada Schuko com LED',4.09,'2026-02'],
  'XB7EV03MP':['Sinalizador LED verde 230 V',3.50,'2026-02'],'XB7EV04MP':['Sinalizador LED vermelho 230 V',3.50,'2026-02'],'XB7EV05MP':['Sinalizador LED amarelo 230 V',3.50,'2026-02'],
  '7T.81':['Finder termóstato de painel',9.50,'2026-02'],'7F.20':['Finder ventilador com filtro',44.37,'2026-02'],'7F.02':['Finder grelha com filtro 150 × 150 IP54',6.50,'2026-02'],
  'CTD1X1255AXXX':['TI CTD 125/5 A',12.50,'2026-01'],'TM3200A5':['TI TM3 200/5 A',11.00,'2025-11'],'TS00850800X05':['TI TS85 800/5 A (barra)',28.70,'2025-12'],'CTD8S12505AXXX':['TI CTD8S 1250/5 A, abrir',148.86,'2026-02']};
Object.keys(HAGER).forEach(r=>{INDUS[r]=[`Hager ${HAGER[r][0]} (PVP 2026 −35 % −2 %)`,Math.round(HAGER[r][1]*HAGER_NET*100)/100,'2026'];});
/* nomes legíveis das referências que a ferramenta usa (a descrição dos orçamentos vem abreviada) */
const INDUS_NOME={'7P2482750020':'Finder 7P.24 descarregador de sobretensões tipo 2, 3F+N','2CSM277502R1801':'ABB porta-fusíveis seccionável 3P 125 A 22×58','LF599G':'Fusível 22×58 gG 125 A',
  '563920':'Repartidor tetrapolar TD 80 A','563820':'Repartidor tetrapolar TD 125 A','563200':'Repartidor tetrapolar TD 160 A','K50AL':'Hager borne de junção Al/Cu 50 mm²',
  '7T8100002303':'Finder termóstato de painel','7F2082302055':'Finder ventilador com filtro','7F0200001000':'Finder grelha com filtro','LF302G':'Fusível 10×38 gG 2 A',
  '2CDD284101R0025':'ABB SD204/25 interruptor-seccionador 4P 25 A','2CDD284101R0032':'ABB SD204/32 interruptor-seccionador 4P 32 A','2CDD284101R0040':'ABB SD204/40 interruptor-seccionador 4P 40 A',
  '2CDE284001R0100':'ABB E204/100 interruptor-seccionador 4P 100 A','2CDE284001R0125':'ABB E204/125 interruptor-seccionador 4P 125 A','1SCA120521R1001':'ABB OT160EV04P interruptor-seccionador 4P 160 A',
  'FL992A':'Hager Orion plus: kit modular 3 × 16 M (500 × 400)','FL463A':'Hager Orion plus: montante funcional a.650','FL366A':'Hager Orion plus: tampa p/ modular 1 × 16 M l.400','FL367A':'Hager Orion plus: tampa p/ modular 1 × 22 M l.500',
  'UT52S':'Hager: adaptação Orion plus/univers 850 × 600','UT72S':'Hager: adaptação Orion plus/univers 1150 × 600','UT73S':'Hager: adaptação Orion plus/univers 1150 × 850','UN05A':'Hager univers: jogo de 2 montantes a.750','UN07A':'Hager univers: jogo de 2 montantes a.1050',
  'TM3200A5':'TI TM3 200/5 A','2CDS251001R0164':'ABB S201 disjuntor 1P C16'};
Object.entries(INDUSQ.refs).forEach(([r,[d,p,m,no]])=>{INDUS[r]=[INDUS_NOME[r]||(HAGER[r]?`Hager ${HAGER[r][0]}`:d),p,`${m} · orç. ${no}`];});
/* corte geral: referência pelo calibre (as que aparecem nos orçamentos; as outras ficam a escolher) */
const INDUS_CORTE={25:'2CDD284101R0025',32:'2CDD284101R0032',40:'2CDD284101R0040',100:'2CDE284001R0100',125:'2CDE284001R0125',160:'1SCA120521R1001',800:'1SCA022753R5250',1000:'1SCA022871R5870',1250:'1SCA022871R5870'};
/* acessórios da Orion plus como nos orçamentos 2026: só modular com kit ou montante funcional; com platinas, adaptação + montantes univers */
const ORION_ACC={FL213B:[['FL992A',1]],FL216B:[['FL463A',1],['FL366A',3]],FL221B:[['FL463A',1],['FL367A',3]],
  FL301B:[['UT52S',1],['UN05A',2]],FL302B:[['UT72S',1],['UN07A',2]],FL307B:[['UT73S',1],['UN07A',2]]};
/* unidades funcionais univers (platinas, unidades p/ modular, tampas, barramento vertical): média dos orçamentos 2026 por m² de frente
   (850 × 600: ~200 €, 1150 × 600: ~380 €, 1150 × 850: ~490 €) */
const UNIV_M2=485;
const INDUS_TI={125:'CTD1X1255AXXX',150:'TM3200A5',200:'TM3200A5',800:'TS00850800X05',1000:'CTD8S12505AXXX',1250:'CTD8S12505AXXX'};
function indusParts(node,R){
  const Q=qfvParts(node,R);if(!Q||Q.gw||Q.existing||Q.role==='CONT')return null;
  const items=[],notes=[];
  const add=(papel,ref,q,o={})=>{if(!q)return;const c=INDUS[ref];items.push({papel,ref:o.semRef?'':ref,des:o.des||(c?c[0]:ref),q,pu:o.prot?null:c?c[1]:null,data:c?c[2]:'',prot:!!o.prot});};
  const fs_=Q.feeders,mccb=fs_.filter(f=>f.rele),nInv=fs_.filter(f=>f.c.kind==='inv').length;
  const kW=(Q.outs||[Q.out]).reduce((a,c)=>a+(c?c.p:0),0);
  const sumIn=fs_.reduce((a,f)=>a+f.In,0),maxIn=Math.max(...fs_.map(f=>f.In));
  /* envolvente: Hager Orion plus, a mais pequena onde cabe a aparelhagem e o trabalho do cabo (boardFor); só se não couber, armário de chão
     (Eldon, ou Schneider no quadro de interligação). Montagem pelos orçamentos Indusmelec de 2026 (mão de obra, sem material):
     só modular, uma saída: até 40 A 80 € (residenciais), até 63 A 125 €, acima 240 €; várias saídas: 200 € até 63 A, senão 240 €;
     com platinas (caixas moldadas ou corte acima de 125 A, Orion plus com univers): 350 € até 250 A à saída, 900 € acima (850–950 €). */
  const B=boardFor(node,R),orion=B&&B.best?B.best.ref:null,univ=!!(B&&B.plates.length),outIn=Q.out?Q.out.res.In:maxIn;
  let encl,mont=0,small=false;
  if(Q.role==='INT'&&!mccb.length&&Q.out.res.In<=125){small=true;mont=0;}
  else if(Q.role==='INT'){mont=Q.out.res.In>800?300:250;}
  else if(univ){mont=outIn>250?900:350;notes.push(`Montagem: ${outIn>250?'850–950 € nos orçamentos com caixas moldadas de 250 a 630 A (barramento e estrutura incluídos)':'280–400 € nos orçamentos com platinas até 250 A'}.`);
    if(mccb.length>6)notes.push(`${mccb.length} caixas moldadas: os orçamentos de referência têm até 6; confirmar a montagem.`);}
  else if(fs_.length===1){small=maxIn<=63;mont=maxIn<=40?80:maxIn<=63?125:240;}
  else{mont=maxIn<=63?200:240;if(fs_.length>2)notes.push(`${fs_.length} saídas modulares: os orçamentos de referência têm até 2; confirmar a montagem.`);
    if(sumIn>160)notes.push(`Soma das saídas modulares de ${sumIn} A: o repartidor TD 160 A pode não chegar; confirmar o barramento.`);}
  if(orion){encl=orion;add('Envolvente',orion,1);(ORION_ACC[orion]||[]).forEach(([r,q])=>add('Envolvente',r,q));
    if(univ){const H=B.best.H,W=B.best.W;items.push({papel:'Envolvente',ref:'',des:`Hager univers: unidades funcionais (platinas, unidades p/ modular, tampas, barramento vertical), estimativa ${fs(Math.round(H*W/1e4)/100)} m² × ${UNIV_M2} €/m²`,q:1,pu:Math.round(UNIV_M2*H*W/1e6/5)*5,data:'estimado',prot:false});}
    if(!ORION_ACC[orion])notes.push(`Orion plus ${orion}: sem orçamento de referência com esta caixa; ${univ?'adaptação e montantes univers':'kit modular'} a escolher no catálogo Hager.`);}
  else if(Q.role==='INT'){const big=Q.out.res.In>800;encl=big?'NSYCRN128300':'NSYCRN108250';add('Envolvente',encl,1);add('Envolvente',big?'NSYMM128':'NSYMM108',1);notes.push('Não cabe numa Orion plus: armário de chão Schneider Spacial CRN.');}
  else{encl='MCS20086PER5';add('Envolvente','MCS20086PER5',1);
    if(fs_.length>2){add('Envolvente','MCS20046R5',1);add('Envolvente','CCI06',1);add('Envolvente','CCM04',1);}
    add('Envolvente','PF1080',1);add('Envolvente','PF1040',2);notes.push('Não cabe numa Orion plus: armário de chão Eldon.');}
  /* corte geral */
  if(Q.corte){const r=INDUS_CORTE[Q.corte.In];
    if(r)add('Corte geral',r,1);else add('Corte geral','',1,{semRef:true,des:`Interruptor-seccionador 4P ${Q.corte.In} A (${Q.corte.In<=125?'ABB E200':'ABB OT'}; referência a escolher)`});}
  /* saídas: disjuntor e diferencial do motor (já em Proteções) */
  /* disjuntor de interligação no quadro de interligação (sem ele, fica no quadro do cliente, que não é nosso) */
  const fin=Q.role==='INT'&&Q.out&&!percFrom(Q.out.ref.dest)&&Q.out.res.brk?{c:Q.out,b:Q.out.res.brk,In:Q.out.res.In,rele:!Q.out.res.brk.mod}:null,fx=fin?fs_.concat(fin):fs_;
  const bm=new Map();fx.forEach(f=>{if(!f.b)return;const k=f.b.ref;const g=bm.get(k);if(g)g.q++;else bm.set(k,{b:f.b,q:1});});
  bm.forEach(({b,q})=>{add('Proteção de saída',b.ref.replace(/^58\./,''),q,{prot:true,des:b.name||b.d});
    if(b.dif)add('Proteção de saída',b.dif.refs.join(' + '),q,{prot:true,des:b.dif.name});});
  const rl=relays(fx);if(rl.nCen)add('Relés diferenciais','2CSJ341001R0202',rl.nCen,{prot:true,des:'ABB unidade central diferencial 4 E/S (CBS-4)'});
  if(rl.n){add('Alimentação dos relés','2CSM200893R1801',rl.n);add('Alimentação dos relés','LF302G',2*rl.n);}
  /* DST */
  if(Q.dst){add('Sobretensões','7P2482750020',Q.dst.per?fs_.length:1); /* Finder 7P.24 em todos os orçamentos 2026, também nos de 630 A */
    if(Q.dst.brk)add('Sobretensões','2CCG001233R0001',1);}
  /* repartição */
  if(!Q.split){if(mccb.length)items.push({papel:'Barramento',ref:'',des:'Barramento 3F+N (incluído na montagem)',q:1,pu:null,prot:false});
    else if(!small||fs_.length>1)add('Barramento',sumIn<=80?'563920':sumIn<=125?'563820':'563200',1);}
  /* bornes de junção Al/Cu para o cabo de saída em alumínio até 50 mm² (5 por cabo nos orçamentos 2026) */
  if(!mccb.length){(Q.outs||[Q.out]).forEach(c=>{if(c&&c.res.mat==='Al'&&c.res.cons!=='multi'&&c.res.s<=50)add('Bornes','K50AL',5*c.res.n);});}
  /* serviços auxiliares e sinalização (quadros com relés) */
  if(Q.aux){add('Serviços auxiliares','2CSR275080R1254',1);add('Serviços auxiliares','2CDS251001R0164',1);add('Serviços auxiliares','2CDS251001R0104',1);add('Serviços auxiliares','7U.00.8.230.0010',1);
    add('Sinalização','2CSM200923R1801',3);add('Sinalização','LF302G',3);['XB7EV03MP','XB7EV04MP','XB7EV05MP'].forEach(r=>add('Sinalização',r,1));
    add('Ventilação','7T8100002303',1);add('Ventilação','7F2082302055',1);add('Ventilação','7F0200001000',1);}
  /* contagem: TI no quadro que tem a contagem */
  if(Q.meter&&Q.meter.type==='indireta'){const n=3,r=INDUS_TI[Q.meter.ti];
    if(r)add('Contagem',r,n);else add('Contagem','',n,{semRef:true,des:`TI ${Q.meter.ti}/5 A`});}
  if(mont)items.push({papel:'Montagem',ref:'',des:'Montagem do quadro (mão de obra Indusmelec, orçamentos 2026)',q:1,pu:mont,data:'',prot:false});
  items.forEach(x=>{x.total=x.pu==null?null:x.pu*x.q;});
  const sub=items.reduce((a,x)=>a+(x.total||0),0);
  return {node,role:Q.role,encl,encDes:INDUS[encl]?INDUS[encl][0]:'',items,mont,sub,notes,semPreco:items.some(x=>!x.prot&&x.pu==null&&!/incluído/.test(x.des))};
}
function indusTable(P){
  return `<table class="bom"><thead><tr><th>Função</th><th>Referência</th><th>Descrição</th><th class="r">Qtd.</th><th class="r">€ líq.</th></tr></thead><tbody>${P.items.map(x=>
    `<tr><td>${esc(x.papel)}</td><td class="ref">${esc(x.ref.replace(/ \+ /g,'\n'))}</td><td>${esc(x.des)}</td><td class="n r">${x.q}</td><td class="n r">${x.prot?'<span class="sub">em Proteções</span>':x.total==null?(/incluído/.test(x.des)?'—':'<span class="sub">sem preço</span>'):eur0(x.total)}</td></tr>`).join('')}
    <tr><td colspan="4"><b>Subtotal do quadro</b><span class="sub">sem as proteções de saída, que estão no custo das proteções</span></td><td class="n r"><b>${eur0(P.sub)}</b></td></tr></tbody></table>`;
}
