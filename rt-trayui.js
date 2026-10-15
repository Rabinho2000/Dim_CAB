/* ---------- quadro "Esteiras" no separador Cabos AC (motor em rt-tray.js) ---------- */
function renderTrays(R){
  const box=$('#trays');if(!box)return;const T=solveTrays(R);
  if(!T.length){box.innerHTML='';return;}
  box.innerHTML=`<h3>Esteiras (caminhos de cabos e escadas)</h3>
    <p class="hint">Largura para uma só camada, como supõem os fatores de agrupamento 52-E4/E5, com 1 diâmetro livre entre circuitos e 20 % de reserva. <b>Diâmetros exteriores típicos de catálogo (estimativa): confirmar com o catálogo do fornecedor.</b></p>
    <div class="tablewrap"><table><thead><tr><th>Esteira</th><th>Passagem</th><th class="r">Circuitos</th><th class="r">Largura ocupada</th><th class="r">Esteira sugerida</th><th class="r">Comprimento</th></tr></thead><tbody>${
    T.map(t=>`<tr class="${t.err?'err':''}"><td><b>${esc(t.nome)}</b><span class="sub">${t.cs.map(c=>c.code).join(', ')}${t.extra?` + ${t.extra} outros`:''}</span></td>
      <td>Ref. ${esc(t.r.ref)}${t.trays>1?` · ${t.trays} esteiras sobrepostas`:''}<span class="sub">${esc((MODE[t.r.ref]||{}).d||'')}</span></td>
      <td class="n r">${t.cs.length+(t.extra||0)}</td><td class="n r">${t.w!=null?`${Math.round(t.perTray)} mm${t.trays>1?'<span class="sub">por esteira</span>':''}`:'—'}</td>
      <td class="n r">${t.std?`<b>${t.std} mm</b>${t.trays>1?`<span class="sub">× ${t.trays}</span>`:''}`:'—'}${t.err?`<span class="sub limt">${esc(t.err)}</span>`:''}</td>
      <td class="n r">${fmt(t.L,0)} m</td></tr>`).join('')}</tbody></table></div>`;
}
HOOKS.push(R=>{if(TAB==='ac')renderTrays(R);});
