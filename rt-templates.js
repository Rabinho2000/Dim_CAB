/* ---------- modelos de projeto: topologias típicas para começar ("Novo projeto") ---------- */
const TPL=[
  {id:'exemplo',nome:'Exemplo de origem',d:'4 inversores Huawei (2 × 100 + 2 × 150 kW) → QFV → quadro de interligação → quadro do cliente.',make:()=>example()},
  {id:'cliente',nome:'QFV direto ao quadro do cliente',d:'2 × SUN2000-50KTL-M3 → QFV → quadro do cliente (sem interligação). C&I pequeno.',
    make:()=>Object.assign(example(),{invs:[1,2].map(()=>({id:uid++,modelo:'SUN2000-50KTL-M3',pman:0,q:'QFV',L:30,S:'auto'})),
      percs:[{id:uid++,orig:'QFV',dest:'Qentrada',L:25,S:'auto',...route('13','mono')}],gws:[]})},
  {id:'gwci',nome:'Com gateway Sigenergy (C&I)',d:'2 × SigenStor EC 30.0 TP → QFV → Gateway C60-2 → quadro do cliente. Um cabo por inversor até ao gateway.',
    make:()=>Object.assign(example(),{invs:[1,2].map(()=>({id:uid++,modelo:'SigenStor EC 30.0 TP',pman:0,q:'QFV',L:15,S:'auto'})),
      gws:[{id:uid++,nome:'Gateway',modelo:'Gateway C60-2',fases:3,In:91.2,dimNom:true}],
      percs:[{id:uid++,orig:'QFV',dest:'Gateway',L:5,S:'auto',split:true,...route('13','mono')},{id:uid++,orig:'Gateway',dest:'Qentrada',L:10,S:'auto',...route('13','mono')}]})},
  {id:'res3',nome:'Residencial trifásico com gateway',d:'1 × SigenStor EC 10.0 TP → QFV → Gateway HomeMax TP → quadro do cliente.',
    make:()=>Object.assign(example(),{invs:[{id:uid++,modelo:'SigenStor EC 10.0 TP',pman:0,q:'QFV',L:10,S:'auto'}],
      gws:[{id:uid++,nome:'Gateway',modelo:'HomeMax TP',fases:3,In:76,dimNom:true}],
      percs:[{id:uid++,orig:'QFV',dest:'Gateway',L:3,S:'auto',split:true,...route('3A','multi')},{id:uid++,orig:'Gateway',dest:'Qentrada',L:5,S:'auto',...route('3A','multi')}],rInv:route('3A','multi')})},
  {id:'res1',nome:'Residencial monofásico',d:'1 × SUN2000-6KTL-L1 → QFV → quadro do cliente, em tubo à vista.',
    make:()=>Object.assign(example(),{invs:[{id:uid++,modelo:'SUN2000-6KTL-L1',pman:0,q:'QFV',L:8,S:'auto'}],gws:[],
      percs:[{id:uid++,orig:'QFV',dest:'Qentrada',L:6,S:'auto',...route('3A','multi')}],rInv:route('3A','multi')})}];
function openTemplates(){
  $('#tpl-list').innerHTML=TPL.map(t=>`<button class="tcard" data-tpl="${t.id}"><b>${esc(t.nome)}</b><span>${esc(t.d)}</span></button>`).join('');
  $('#tpldlg').hidden=false;
}
function applyTemplate(id){
  const t=TPL.find(x=>x.id===id);if(!t)return;S=t.make();
  if(typeof CUR!=='undefined'){CUR=null;CURUPD=null;}
  $('#tpldlg').hidden=true;load();toast(`Novo projeto: ${t.nome}. Dá-lhe um nome e guarda-o em Projetos.`);
}
(function bindTemplates(){
  const b=$('#reset');if(!b)return;b.textContent='Novo projeto';b.title='Começar um projeto novo a partir de um modelo';
  b.replaceWith(b.cloneNode(true));$('#reset').addEventListener('click',openTemplates);
  $('#tpldlg').addEventListener('click',e=>{if(e.target.id==='tpldlg'||e.target.id==='tpl-close')return $('#tpldlg').hidden=true;
    const c=e.target.closest('[data-tpl]');if(c)applyTemplate(c.dataset.tpl);});
})();
