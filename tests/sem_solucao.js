/* abre a app com 3 × 150 kW em tubo à vista (ref. 3A): o percurso QFV → Qentrada não tem secção que cumpra.
   Gera tests/sem_solucao.png com a tabela de resultados; tem de dar "ERR []" e mostrar a explicação. */
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1500,height:900}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
const r=(ref,cons)=>({ref,cons,disp:'trevo',trays:1,sol:false});
const st={invs:[1,2,3].map(()=>({modelo:'SUN2000-150K-MG0',pman:0,q:'QFV',L:5,S:'auto'})),rInv:r('3A','mono'),percs:[{orig:'QFV',dest:'Qentrada',L:5,S:'auto',...r('3A','mono')}],gws:[]};
await p.addInitScript(s=>{try{localStorage.setItem('cabosrt.v1',s);}catch(e){}},JSON.stringify(st));
await p.goto(require('url').pathToFileURL(require('path').resolve('cabos-rt.html')).href);
const msg=await p.evaluate(()=>[...document.querySelectorAll('#res-body .limt')].map(e=>e.textContent));
console.log('mensagens:',msg);
await (await p.$('#res-body')).screenshot({path:'tests/sem_solucao.png'});
console.log('ERR',errs);await b.close();})();
