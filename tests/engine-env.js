/* carrega o motor de cálculo (rt-data + rt-engine + rt-sc + rt-price) em Node, sem navegador nem DOM */
const fs=require('fs'),path=require('path'),vm=require('vm');
const rd=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const SRC=[rd('rt-data.js'),rd('rt-engine.js'),rd('rt-dc.js'),
  rd('rt-sc.js').replace('__BRK__',rd('brk.json')),rd('rt-price.js').replace('__PRICES__',rd('jmm/prices.json')),
  'let S=example();'].join('\n');
/* devolve um motor novo; os objetos vêm de outro contexto, por isso converte-se para JSON simples quando se compara */
function engine(over){
  const ctx=vm.createContext({console});vm.runInContext(SRC,ctx);
  const ev=code=>vm.runInContext(code,ctx);
  const set=o=>{ctx.__o=JSON.parse(JSON.stringify(o||{}));ev('S=Object.assign(example(),__o);S.invs.forEach(i=>i.id=uid++);S.percs.forEach(p=>p.id=uid++);');};
  set(over);
  return {ev,set,ctx,solve:()=>ev('solveAll()'),S:()=>ev('S')};
}
module.exports={engine};
