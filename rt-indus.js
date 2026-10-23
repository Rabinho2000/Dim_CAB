/* ---------- componentes de cada quadro como a Indusmelec os orçamenta (orçamentos 2025–2026 das pastas de projeto) ----------
   Os aparelhos são os de qfvParts/boardFor (regras Solcor do unifilar); daqui vêm as referências, a envolvente, os acessórios e a
   montagem. Preço = líquido do último orçamento Indusmelec 2025–2026 com essa referência (indicativo). Os disjuntores e diferenciais
   dos circuitos já estão em "Disjuntores e diferenciais ABB" (brkTot): aqui aparecem com prot:true e não entram no subtotal. */
/* envolventes Hager Orion plus (preferidas; PVP da tabela 2026, hager.json gerado por mkhager.py): {ref: [descrição, PVP]} */
const HAGER=__HAGER__;
const INDUS={ /* ref: [descrição, € líquido, data do orçamento] */
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
Object.keys(HAGER).forEach(r=>{INDUS[r]=[`Hager ${HAGER[r][0]} (PVP 2026)`,HAGER[r][1],'2026'];});
/* corte geral: referência pelo calibre (as que aparecem nos orçamentos; as outras ficam a escolher) */
const INDUS_CORTE={125:'2CDE284001R0125',800:'1SCA022753R5250',1000:'1SCA022871R5870',1250:'1SCA022871R5870'};
const INDUS_TI={125:'CTD1X1255AXXX',150:'TM3200A5',200:'TM3200A5',800:'TS00850800X05',1000:'CTD8S12505AXXX',1250:'CTD8S12505AXXX'};
function indusParts(node,R){
  const Q=qfvParts(node,R);if(!Q||Q.gw||Q.existing||Q.role==='CONT')return null;
  const items=[],notes=[];
  const add=(papel,ref,q,o={})=>{if(!q)return;const c=INDUS[ref];items.push({papel,ref:o.semRef?'':ref,des:o.des||(c?c[0]:ref),q,pu:o.prot?null:c?c[1]:null,data:c?c[2]:'',prot:!!o.prot});};
  const fs_=Q.feeders,mccb=fs_.filter(f=>f.rele),nInv=fs_.filter(f=>f.c.kind==='inv').length;
  const kW=(Q.outs||[Q.out]).reduce((a,c)=>a+(c?c.p:0),0);
  const sumIn=fs_.reduce((a,f)=>a+f.In,0),maxIn=Math.max(...fs_.map(f=>f.In));
  /* envolvente: Hager Orion plus, a mais pequena onde cabe a aparelhagem e o trabalho do cabo (boardFor); só se não couber, armário de chão
     (Eldon, ou Schneider no quadro de interligação). Montagem pelas regras dos orçamentos Indusmelec 2025–2026. */
  const B=boardFor(node,R),orion=B&&B.best?B.best.ref:null;
  let encl,mont=0,small=false;
  if(Q.role==='INT'&&!mccb.length&&Q.out.res.In<=125){small=true;mont=0;}
  else if(Q.role==='INT'){mont=Q.out.res.In>800?300:250;}
  else if(mccb.length){mont=Math.round(1950+1.75*kW);notes.push('Com caixas moldadas: na Indusmelec o barramento, a estrutura de espelhos, a cablagem e o transporte estão incluídos na montagem.');
    if(fs_.length>4)notes.push(`${fs_.length} saídas com caixa moldada: os orçamentos de referência têm 4; confirmar o número de colunas.`);}
  else if(fs_.length===1){small=maxIn<=63;mont=maxIn<=63?80:maxIn<=100?90:125;}
  else{mont=105+135*fs_.length;if(sumIn>125)notes.push(`Soma das saídas modulares de ${sumIn} A: o repartidor TD 125 A pode não chegar; confirmar o barramento.`);}
  if(orion){encl=orion;add('Envolvente',orion,1);notes.push('Envolvente Hager Orion plus: preço da caixa (PVP tabela 2026); placas de montagem, calhas DIN e acessórios a confirmar no catálogo Hager.');}
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
  if(Q.dst){const dref=mccb.length||Q.role==='INT'&&!small?'2CTB815710R4000':'7P.24.8.275.0020';add('Sobretensões',dref,Q.dst.per?fs_.length:1);
    if(Q.dst.brk)add('Sobretensões','2CCG001233R0001',1);}
  /* repartição */
  if(!Q.split){if(mccb.length)items.push({papel:'Barramento',ref:'',des:'Barramento 3F+N (incluído na montagem)',q:1,pu:null,prot:false});
    else if(!small||fs_.length>1)add('Barramento','015.563820',1);}
  /* bornes de passagem para o cabo de saída (WPD 130 até 50 mm²) */
  if(!small&&!mccb.length){(Q.outs||[Q.out]).forEach(c=>{if(c&&c.res.cons!=='multi'&&c.res.s<=50)add('Bornes',`WPD 130`,5*c.res.n);});}
  /* serviços auxiliares e sinalização (quadros com relés) */
  if(Q.aux){add('Serviços auxiliares','2CSR275080R1254',1);add('Serviços auxiliares','',1,{semRef:true,des:'ABB S201 disjuntor 1P C16'});add('Serviços auxiliares','2CDS251001R0104',1);add('Serviços auxiliares','7U.00.8.230.0010',1);
    add('Sinalização','2CSM200923R1801',3);add('Sinalização','LF302G',3);['XB7EV03MP','XB7EV04MP','XB7EV05MP'].forEach(r=>add('Sinalização',r,1));
    add('Ventilação','7T.81',1);add('Ventilação','7F.20',1);add('Ventilação','7F.02',1);}
  /* contagem: TI no quadro que tem a contagem */
  if(Q.meter&&Q.meter.type==='indireta'){const n=3*(Q.meter.perCircuit?(Q.outs||[Q.out]).length:1),r=INDUS_TI[Q.meter.ti];
    if(r)add('Contagem',r,n);else add('Contagem','',n,{semRef:true,des:`TI ${Q.meter.ti}/5 A`});}
  if(mont)items.push({papel:'Montagem',ref:'',des:'Montagem do quadro (mão de obra Indusmelec)',q:1,pu:mont,data:'',prot:false});
  items.forEach(x=>{x.total=x.pu==null?null:x.pu*x.q;});
  const sub=items.reduce((a,x)=>a+(x.total||0),0);
  return {node,role:Q.role,encl,encDes:INDUS[encl]?INDUS[encl][0]:'',items,mont,sub,notes,semPreco:items.some(x=>!x.prot&&x.pu==null&&!/incluído/.test(x.des))};
}
function indusTable(P){
  return `<table class="bom"><thead><tr><th>Função</th><th>Referência</th><th>Descrição</th><th class="r">Qtd.</th><th class="r">€ líq.</th></tr></thead><tbody>${P.items.map(x=>
    `<tr><td>${esc(x.papel)}</td><td class="ref">${esc(x.ref.replace(/ \+ /g,'\n'))}</td><td>${esc(x.des)}</td><td class="n r">${x.q}</td><td class="n r">${x.prot?'<span class="sub">em Proteções</span>':x.total==null?(/incluído/.test(x.des)?'—':'<span class="sub">sem preço</span>'):eur0(x.total)}</td></tr>`).join('')}
    <tr><td colspan="4"><b>Subtotal do quadro</b><span class="sub">sem as proteções de saída, que estão no custo das proteções</span></td><td class="n r"><b>${eur0(P.sub)}</b></td></tr></tbody></table>`;
}
