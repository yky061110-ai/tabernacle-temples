// ══════════════════════════════════════════════════════════════
//  성전 탭 — 조감도(평면도) · 3D 구조 · 1인칭
// ══════════════════════════════════════════════════════════════
(function(){
const $=s=>document.querySelector(s);
const LS={ get(k){ try{ return localStorage.getItem(k); }catch(_){ return null; } }, set(k,v){ try{ localStorage.setItem(k,v); }catch(_){ } } };
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ── 자료 합치기: 성전 항목을 성막 ITEMS/SCRIPTURE 에 넣어 기존 모달·검색을 그대로 쓴다 ──
Object.keys(TITEMS).forEach(k=>{
  const it=TITEMS[k]; ITEMS[k]=it;
  SCRIPTURE[k]=(it.refs||[]).filter(r=>TREF[r]).map(r=>({ref:r,book:TREF[r].book,verses:TREF[r].verses}));
  if(!it.kw) it.kw='';
});
// 성막 기구도 같은 체계로 (조감도·3D·1인칭)
['court','gate','altar','laver','tent','holy','lamp','table','incense','veil','mhk','ark','mercy'].forEach(k=>{ if(ITEMS[k]){ ITEMS[k].t='tab'; Object.assign(ITEMS[k],TAB_PATCH[k]||{}); } });

// ── 탭 ──
const TABS=['tab','solomon','herod','ezekiel'];
const state={ tab:'tab', mode:{tab:'orbit',solomon:'plan',herod:'plan',ezekiel:'plan'}, vb:{}, curVP:null };
const paneTab=$('#pane-tab'), paneT=$('#pane-temple');
const ttl=$('#ttl'), tsub=$('#tsub');
const tabs=$('#tabs');
function setTab(t,opt={}){
  if(!TABS.includes(t)) t='tab';
  state.tab=t; LS.set('sm_tab',t);
  tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
  const T=TEMPLES[t];
  paneTab.hidden=true; paneT.hidden=false;
  ttl.innerHTML=t==='tab'?'성 <span class="glow">막</span>':`${esc(T.title.replace(/\s*성전$/,''))} <span class="glow">성전</span>`; tsub.textContent=T.sub;
  buildTemplePane(t);
  setMode(opt.mode||state.mode[t]||'plan',opt);
}
tabs.addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) setTab(b.dataset.t); });

// ── 성전 화면 구성 ──
let builtFor=null;
function buildTemplePane(t){
  if(builtFor===t) return; builtFor=t;
  const T=TEMPLES[t];
  // 범례
  const lg=$('#tlegend');
  lg.innerHTML=`<div class="lghead"><span>조감도 기호</span><em>누르면 도면에 위치가 표시됩니다</em></div><div class="lggrid">`+
    T.legend.map(([c,k])=>`<button class="lg" data-k="${k}"><b class="${/^\d+$/.test(c)?'num':''}">${esc(c)}</b><span>${esc(ITEMS[k].name)}</span></button>`).join('')+
    `</div><p class="lgnote">${esc(T.planNote)}</p>`;
  lg.querySelectorAll('.lg').forEach(b=>b.addEventListener('click',()=>{ stage.scrollIntoView({behavior:'smooth',block:'start'}); selectPlan(b.dataset.k); }));
  // 역사/해석 버튼
  $('#histBtn').innerHTML=`<span class="ico">${t==='tab'?'✛':'✦'}</span><b>${esc(T.histTitle)}</b><em>${esc(T.histSub)}</em>`;
  // 구역별 목록
  const gl=$('#tglist'); gl.innerHTML='';
  T.groups.forEach(g=>{ const s=document.createElement('div'); s.className='gsec '+g.cls;
    s.innerHTML=`<div class="ghead"><i></i>${esc(g.z)}<em>${g.keys.length}</em></div><div class="grid">`+
      g.keys.map(k=>`<button class="gitem" data-k="${k}">${esc(ITEMS[k].name.split(' (')[0])}</button>`).join('')+`</div>`;
    gl.appendChild(s); });
  gl.querySelectorAll('.gitem').forEach(n=>n.addEventListener('click',()=>openItem(n.dataset.k)));
  // 평면도
  renderPlan(t);
}

// ── 보기 방식 ──
const segs=$('#tmodes'), tplan=$('#tplan'), t3d=$('#t3d'), stage=$('#tstage');
function setMode(m,opt={}){
  const t=state.tab;
  state.mode[t]=m==='fp'?'fp':m; LS.set('sm_mode_'+t,state.mode[t]);
  segs.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
  stage.dataset.mode=m;
  $('#tlegend').hidden=(m!=='plan');
  if(m==='plan'){ tplan.hidden=false; t3d.hidden=true; T3Dhide(); return; }
  tplan.hidden=true; t3d.hidden=false;
  withT3D(api=>{
    if(m==='orbit') api.show(t,{});
    else if(opt.at) api.show(t,{at:opt.at});
    else { const v=opt.vp||state.curVP&&state.curVP[t]||firstVP(t); api.show(t,{vp:v}); markVP(v); }
    renderVPBar();
  });
}
segs.addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) setMode(b.dataset.m); });
const FIRST={tab:'court',solomon:'outer',herod:'israel',ezekiel:'outer'};
function firstVP(t){ return FIRST[t]; }

// ── 3D 모듈 (필요할 때만 불러옴) ──
let T3D=null, t3dLoading=null;
function T3Dhide(){ if(T3D) T3D.hide(); }
function withT3D(fn){
  if(T3D){ setLoading(true); setTimeout(()=>{ try{ fn(T3D); }catch(e){ showErr(e); } setLoading(false); },20); return; }
  setLoading(true);
  if(!t3dLoading) t3dLoading=import('./temples-3d.js');
  t3dLoading.then(api=>{
    if(!T3D){ api.init(t3d,{
      nameOf:k=>ITEMS[k]?ITEMS[k].name.split(' (')[0]:k,
      onPick:k=>openItem(k),
      onZone:k=>renderFPCard(k),
      onMode:m=>{ stage.dataset.view=m; segs.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===(m==='fp'?'fp':'orbit'))); state.mode[state.tab]=m==='fp'?'fp':'orbit'; if(m!=='fp') renderFPCard(null); }
    }); T3D=api; }
    setTimeout(()=>{ try{ if(state.mode[state.tab]!=='plan') fn(api); }catch(e){ showErr(e); } setLoading(false); },30);
  }).catch(e=>{ showErr(e); });
}
function setLoading(on){ $('#t3load').classList.toggle('on',on); }
function showErr(e){ console.error(e); const l=$('#t3load'); l.classList.add('on','err'); l.textContent='3D를 불러오지 못했어요. 인터넷 연결을 확인한 뒤 다시 눌러 주세요.'; }

// ── 1인칭 조작판 ──
function renderVPBar(){
  const t=state.tab, bar=$('#vpbar'); if(!T3D) return;
  const list=T3D.vps(t)||[];
  bar.innerHTML=list.map(v=>`<button data-v="${v.id}" class="${state.curVP&&state.curVP[t]===v.id?'on':''}">${esc(v.name)}</button>`).join('');
  bar.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ markVP(b.dataset.v);
    if(state.mode[t]!=='fp'){ setMode('fp',{vp:b.dataset.v}); } else T3D.goVP(b.dataset.v); }));
}
function markVP(v){ const t=state.tab; state.curVP=state.curVP||{}; state.curVP[t]=v;
  $('#vpbar').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v===v)); }
function renderFPCard(k){
  const c=$('#fpcard');
  if(!k||!ITEMS[k]){ c.innerHTML=`<p class="fpnone">바닥을 누르면 그곳으로 걸어갑니다</p>`; return; }
  const it=ITEMS[k]; const first=(it.use||'').split(/(?<=[.다])\s/)[0];
  c.innerHTML=`<div class="fpz ${it.cls||''}"><i></i>지금 서 있는 곳</div><b>${esc(it.name)}</b><p>${esc(first)}</p><button class="fpmore">자세히 ›</button>`;
  c.querySelector('.fpmore').addEventListener('click',()=>openItem(k));
}
$('#t3left').addEventListener('click',()=>{ if(!T3D) return; if(state.mode[state.tab]==='fp') T3D.lookTurn(Math.PI/4); else T3D.spin(-Math.PI/4); });
$('#t3right').addEventListener('click',()=>{ if(!T3D) return; if(state.mode[state.tab]==='fp') T3D.lookTurn(-Math.PI/4); else T3D.spin(Math.PI/4); });
$('#t3home').addEventListener('click',()=>{ if(!T3D) return; if(state.mode[state.tab]==='fp'){ setMode('orbit'); } else T3D.orbitReset(); });
$('#t3full').addEventListener('click',()=>toggleFull());
$('#t3zin').addEventListener('click',()=>{ if(T3D) T3D.zoomStep(.75); });
$('#t3zout').addEventListener('click',()=>{ if(T3D) T3D.zoomStep(1/.75); });
function toggleFull(on){ const f=on??!stage.classList.contains('full'); stage.classList.toggle('full',f); document.body.classList.toggle('tfull',f);
  $('#t3full').textContent=f?'✕':'⛶'; $('#t3full').title=f?'작게 보기':'크게 보기'; setTimeout(()=>{ T3D&&T3D.resize(); },60); }
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&stage.classList.contains('full')&&!overlay.classList.contains('on')) toggleFull(false); });

// ── 역사 / 해석 노트 ──
const hOverlay=$('#hoverlay'), hModal=$('#hmodal');
function openHist(){ const T=TEMPLES[state.tab];
  hModal.innerHTML=`<div class="mtop"><button class="mclose" id="hclose">✕</button><div class="mzone">${esc(T.title)}</div>
    <h3 class="mname">${esc(T.histTitle)}</h3><div class="men">${esc(T.histSub)}</div></div>
    <div class="mbody"><div class="timeline">`+T.hist.map(k=>{ const it=ITEMS[k];
      return `<button class="tnode${it.warn?' warn':''}${it.christ?' christ':''}" data-k="${k}"><i class="tdot"></i>
        <div class="tinfo"><div class="tl-h"><b>${esc(it.name)}</b><em>${esc(it.era||it.zone)}</em></div>
        <span>${esc((it.use||'').split(/(?<=[.다])\s/)[0])}</span></div></button>`; }).join('')+`</div></div>`;
  hModal.className='modal';
  hModal.querySelector('#hclose').addEventListener('click',closeHist);
  hModal.querySelectorAll('.tnode').forEach(n=>n.addEventListener('click',()=>openItem(n.dataset.k)));
  hOverlay.classList.add('on'); document.body.style.overflow='hidden'; hModal.scrollTop=0; }
function closeHist(){ hOverlay.classList.remove('on'); if(!overlay.classList.contains('on')) document.body.style.overflow=''; }
hOverlay.addEventListener('click',e=>{ if(e.target===hOverlay) closeHist(); });
$('#histBtn').addEventListener('click',()=>{ if(state.tab==='tab') openPriestModal(); else openHist(); });

// ══════════════ 평면도 (조감도) ══════════════
const NS='http://www.w3.org/2000/svg';
function planSVG(t,b,opt={}){
  const P=TEMPLES[t].plan, B=b||P.b, W=B[3]-B[2], H=B[1]-B[0];
  const fs=P.fs*(opt.fsScale||1), u=P.fs/10;
  const R=r=>({x:B[3]-r[3],y:r[0]-B[0],w:r[3]-r[2],h:r[1]-r[0]});
  const X=p=>[B[3]-p[1],p[0]-B[0]];
  const kattr=(e)=>e.k?` class="pk" data-k="${e.k}"${e.fp?' data-fp="1"':''}`:'';
  const cs=Math.min(W,H)*.045, EX=opt.noCompass?0:cs*3.6;
  let s=`<svg xmlns="${NS}" class="plansvg" viewBox="0 0 ${W} ${H+EX}" preserveAspectRatio="xMidYMid meet">
    <defs><pattern id="hatch-${t}" width="${4*u}" height="${4*u}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="${4*u}" stroke="#b7a684" stroke-width="${.6*u}"/></pattern>
    <radialGradient id="glw-${t}"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".95"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient></defs>
    <rect x="0" y="0" width="${W}" height="${H+EX}" fill="#efe7d6"/>`;
  const body=[], top=[];
  P.els.forEach(e=>{
    if(e.t==='a'){ const q=R(e.r); body.push(`<rect${kattr(e)} x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="${e.f||'#f3eee2'}" stroke="#8a7c66" stroke-width="${.6*u}"${e.dash?` stroke-dasharray="${3*u} ${2*u}"`:''}/>`);
      if(e.hatch) body.push(`<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="url(#hatch-${t})" pointer-events="none"/>`); }
    else if(e.t==='w'){ const q=R(e.r); body.push(`<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="#2a241d" pointer-events="none"/>`); }
    else if(e.t==='b'){ const q=R(e.r); body.push(`<rect${kattr(e)} x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="${e.f||'#faf6ec'}" stroke="#2a241d" stroke-width="${.7*u}"${e.dash?` stroke-dasharray="${2.5*u} ${1.5*u}"`:''}/>`); }
    else if(e.t==='s'){ const q=R(e.r); let g=`<g${kattr(e)}><rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="#e3d9c4" stroke="#2a241d" stroke-width="${.4*u}"/>`;
      if(e.d==='x'){ for(let y=q.y+1.1;y<q.y+q.h;y+=1.1) g+=`<line x1="${q.x}" y1="${y}" x2="${q.x+q.w}" y2="${y}" stroke="#6d6252" stroke-width="${.25*u}"/>`; }
      else { for(let x=q.x+1.1;x<q.x+q.w;x+=1.1) g+=`<line x1="${x}" y1="${q.y}" x2="${x}" y2="${q.y+q.h}" stroke="#6d6252" stroke-width="${.25*u}"/>`; }
      body.push(g+'</g>'); }
    else if(e.t==='g'){ let g=`<g pointer-events="none">`; for(let i=1;i<e.n;i++){ const x=e.x0+(e.x1-e.x0)*i/e.n; const a=X([x,e.z-4.5]), c=X([x,e.z+4.5]); g+=`<line x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" stroke="#2a241d" stroke-width="${.3*u}"/>`; } body.push(g+'</g>'); }
    else if(e.t==='d'){ const [x,y]=X(e.p); body.push(`<circle${kattr(e)} cx="${x}" cy="${y}" r="${e.r}" fill="${e.f||'#2a241d'}"/>`); }
    else if(e.t==='c'){ const [x,y]=X(e.p); body.push(`<circle${kattr(e)} cx="${x}" cy="${y}" r="${e.r}" fill="${e.f||'#faf6ec'}" stroke="#2a241d" stroke-width="${.5*u}"/>`); }
    else if(e.t==='l'){ const a=X(e.p[0]), c=X(e.p[1]); body.push(`<line${kattr(e)} x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" stroke="${e.c||'#2a241d'}" stroke-width="${e.sw||u}" stroke-linecap="round"/>`); }
    else if(e.t==='cols'){ let g=`<g${kattr(e)}>`; e.z.forEach(z=>{ for(let x=e.x0;x<=e.x1;x+=9){ const [cx,cy]=X([x,z]); g+=`<circle cx="${cx}" cy="${cy}" r="${1.1}" fill="#6d6252"/>`; } }); body.push(g+'</g>'); }
    else if(e.t==='colz'){ let g=`<g${kattr(e)}>`; e.x.forEach(x=>{ for(let z=e.z0;z<=e.z1;z+=8){ const [cx,cy]=X([x,z]); g+=`<circle cx="${cx}" cy="${cy}" r="${1}" fill="#6d6252"/>`; } }); body.push(g+'</g>'); }
    else if(e.t==='arc'){ const [cx,cy]=X(e.p); let g=`<g${kattr(e)}>`;
      for(let i=e.n;i>=0;i--){ const r=12+(e.r-12)*i/e.n; g+=`<path d="M ${cx+r} ${cy} A ${r} ${r} 0 0 1 ${cx-r} ${cy} Z" fill="${i===e.n?'#e3d9c4':'none'}" stroke="#6d6252" stroke-width="${.3*u}"/>`; }
      body.push(g+'</g>'); }
    else if(e.t==='water'){ const pts=e.pts.map(X).map(p=>p.join(',')).join(' ');
      body.push(`<polyline${kattr(e)} points="${pts}" fill="none" stroke="#5d9ec7" stroke-width="${e.w}" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`); }
    else if(e.t==='glory'){ const [cx,cy]=X(e.p); top.push(`<circle${kattr(e)} cx="${cx}" cy="${cy}" r="${22}" fill="url(#glw-${t})"/>`); }
    else if(e.t==='gate'){ const n=e.n||7;
      const G=(u0,u1,v0,v1)=>{ let x0,x1,z0,z1; if(e.o==='E'){ x0=e.e-u1; x1=e.e-u0; z0=e.c+v0; z1=e.c+v1; } else if(e.o==='N'){ z0=e.e+u0; z1=e.e+u1; x0=e.c+v0; x1=e.c+v1; } else { z0=e.e-u1; z1=e.e-u0; x0=e.c+v0; x1=e.c+v1; } return R([x0,x1,z0,z1]); };
      let g=`<g class="pk" data-k="${e.k}">`;
      const box=(q,f,sw)=>`<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="${f}" stroke="#2a241d" stroke-width="${sw}"/>`;
      g+=box(G(0,50,-12.5,12.5),'#faf6ec',0);
      [[-12.5,-5],[5,12.5]].forEach(([a,c])=>{ g+=box(G(0,50,a,c),'#2a241d',0); [[3,9],[14,20],[25,31]].forEach(([p,q])=>{ g+=box(G(p,q,a<0?-11:5,a<0?-5:11),'#faf6ec',.3*u); }); });
      const pu=e.porch==='in'?[42,50]:[0,8]; g+=box(G(pu[0],pu[1],-12.5,12.5),'#faf6ec',.3*u);
      [[-12.5,-8],[8,12.5]].forEach(([a,c])=>{ g+=box(G(pu[0],pu[1],a,c),'#2a241d',0); });
      const sq=G(-n*1.1,0,-6,6); g+=box(sq,'#e3d9c4',.3*u);
      body.push(g+'</g>'); }
    else if(e.t==='n'){ const [x,y]=X(e.p), sz=fs*(e.s||1);
      if(/^\d+$/.test(e.c)) top.push(`<g class="pk code" data-k="${e.k}"><circle cx="${x}" cy="${y}" r="${sz*.8}" fill="#ffffff" stroke="#000" stroke-width="${.45*u*(e.s||1)}"/><text x="${x}" y="${y+sz*.36}" text-anchor="middle" font-size="${sz*(e.c.length>1?.9:1.05)}" font-weight="800" fill="#000" letter-spacing="${e.c.length>1?-.04*sz:0}">${e.c}</text></g>`);
      else top.push(`<text class="pk code" data-k="${e.k}" x="${x}" y="${y+sz*.35}" text-anchor="middle" font-size="${sz}" font-weight="700" fill="#2a241d" stroke="#efe7d6" stroke-width="${sz*.22}" paint-order="stroke">${esc(e.c)}</text>`); }
  });
  s+=body.join('')+top.join('');
  if(!opt.noCompass){ const cx=cs*2.2, cy=H+EX/2+cs*.1;
    s+=`<g pointer-events="none" font-size="${cs*.42}" font-weight="700" fill="#6d6252" text-anchor="middle">
      <line x1="${cx}" y1="${cy-cs}" x2="${cx}" y2="${cy+cs}" stroke="#6d6252" stroke-width="${cs*.05}"/><line x1="${cx-cs}" y1="${cy}" x2="${cx+cs}" y2="${cy}" stroke="#6d6252" stroke-width="${cs*.05}"/>
      <text x="${cx}" y="${cy-cs*1.12}">서</text><text x="${cx}" y="${cy+cs*1.5}">동</text><text x="${cx+cs*1.35}" y="${cy+cs*.15}">북</text><text x="${cx-cs*1.35}" y="${cy+cs*.15}">남</text></g>`; }
  return s+'</svg>';
}
function renderPlan(t){
  tplan.querySelector('.planwrap').innerHTML=planSVG(t);
  const svg=tplan.querySelector('svg'); const P=TEMPLES[t].plan, B=P.b;
  const v0=svg.viewBox.baseVal, full={x:0,y:0,w:v0.width,h:v0.height}; let vb={...full}; state.vb[t]=vb;
  const apply=()=>svg.setAttribute('viewBox',`${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const toSvg=(cx,cy)=>{ const p=svg.createSVGPoint(); p.x=cx; p.y=cy; return p.matrixTransform(svg.getScreenCTM().inverse()); };
  const zoom=(f,cx,cy)=>{ const p=toSvg(cx,cy); const nw=Math.max(full.w*.08,Math.min(full.w*1.05,vb.w*f)), k=nw/vb.w;
    vb.x=p.x-(p.x-vb.x)*k; vb.y=p.y-(p.y-vb.y)*k; vb.w=nw; vb.h=vb.h*k; apply(); };
  const ptrs=new Map(); let down=null, pinch=null;
  svg.addEventListener('pointerdown',e=>{ try{svg.setPointerCapture(e.pointerId);}catch(_){}
    ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptrs.size===1) down={x:e.clientX,y:e.clientY,t:performance.now(),moved:false,target:e.target};
    if(ptrs.size===2){ const a=[...ptrs.values()]; pinch={d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)}; if(down) down.moved=true; } });
  svg.addEventListener('pointermove',e=>{ const p=ptrs.get(e.pointerId); if(!p) return; e.preventDefault();
    const dx=e.clientX-p.x, dy=e.clientY-p.y; p.x=e.clientX; p.y=e.clientY;
    if(ptrs.size===1&&down){ if(Math.abs(e.clientX-down.x)+Math.abs(e.clientY-down.y)>6) down.moved=true;
      if(down.moved){ const r=svg.getBoundingClientRect(); const s=Math.max(vb.w/r.width,vb.h/r.height); vb.x-=dx*s; vb.y-=dy*s; apply(); } }
    else if(ptrs.size===2&&pinch){ const a=[...ptrs.values()]; const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
      zoom(pinch.d/Math.max(10,d),(a[0].x+a[1].x)/2,(a[0].y+a[1].y)/2); pinch.d=d; } },{passive:false});
  const up=e=>{ const had=ptrs.has(e.pointerId); ptrs.delete(e.pointerId); if(ptrs.size<2) pinch=null;
    if(had&&ptrs.size===0&&down&&!down.moved&&performance.now()-down.t<600){
      const el=document.elementFromPoint(e.clientX,e.clientY); const pk=el&&el.closest&&el.closest('.pk');
      if(pk){ const k=pk.dataset.k;
        if(pk.dataset.fp){ const q=toSvg(e.clientX,e.clientY); const wz=B[3]-q.x, wx=q.y+B[0]; flashDot(q.x,q.y,svg); setTimeout(()=>setMode('fp',{at:[wx,wz]}),260); }
        else selectPlan(k,{zoom:false}); } else hidePlanCard(); }
    if(ptrs.size===0) down=null; };
  svg.addEventListener('pointerup',up); svg.addEventListener('pointercancel',e=>{ ptrs.delete(e.pointerId); pinch=null; down=null; });
  svg.addEventListener('wheel',e=>{ e.preventDefault(); zoom(Math.exp(e.deltaY*.0015),e.clientX,e.clientY); },{passive:false});
  const r=()=>svg.getBoundingClientRect();
  tplan.querySelector('#pzin').onclick=()=>{ const b=r(); zoom(.7,b.left+b.width/2,b.top+b.height/2); };
  tplan.querySelector('#pzout').onclick=()=>{ const b=r(); zoom(1/.7,b.left+b.width/2,b.top+b.height/2); };
  tplan.querySelector('#pzreset').onclick=()=>{ vb={...full}; state.vb[t]=vb; apply(); };
  // 선택한 곳으로 부드럽게 확대
  state.zoomTo=(x0,y0,x1,y1)=>{ let w=Math.max((x1-x0)*3,full.w*.55), h=w*full.h/full.w;
    if(h<(y1-y0)*2.4){ h=(y1-y0)*2.4; w=h*full.w/full.h; } if(w>full.w){ w=full.w; h=full.h; }
    const tx=(x0+x1)/2-w/2, ty=(y0+y1)/2-h/2+h*.12, a={...vb}, t0=performance.now();
    const step=now=>{ const k=Math.min(1,(now-t0)/450), e=1-Math.pow(1-k,3);
      vb.x=a.x+(tx-a.x)*e; vb.y=a.y+(ty-a.y)*e; vb.w=a.w+(w-a.w)*e; vb.h=a.h+(h-a.h)*e; apply(); if(k<1) requestAnimationFrame(step); };
    requestAnimationFrame(step); };
  hidePlanCard();
}
function flashDot(x,y,svg){ const c=document.createElementNS(NS,'circle'); c.setAttribute('cx',x); c.setAttribute('cy',y); c.setAttribute('r',3); c.setAttribute('class','tapdot'); svg.appendChild(c); setTimeout(()=>c.remove(),700); }
// ── 도면에서 위치 표시 + 정보 카드 ──
function selectPlan(k,opt={}){ const svg=tplan.querySelector('svg'); if(!svg||!ITEMS[k]) return;
  svg.querySelectorAll('.sel').forEach(n=>n.classList.remove('sel')); svg.querySelectorAll('.selring').forEach(n=>n.remove());
  const els=[...svg.querySelectorAll(`.pk[data-k="${k}"]`)]; let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  els.forEach(n=>{ n.classList.add('sel'); const b=n.getBBox(); x0=Math.min(x0,b.x); y0=Math.min(y0,b.y); x1=Math.max(x1,b.x+b.width); y1=Math.max(y1,b.y+b.height);
    if(n.classList.contains('code')){ const c=document.createElementNS(NS,'circle'); c.setAttribute('cx',b.x+b.width/2); c.setAttribute('cy',b.y+b.height/2);
      c.setAttribute('r',Math.max(b.width,b.height)*.95); c.setAttribute('class','selring'); svg.appendChild(c); } });
  document.querySelectorAll('#tlegend .lg').forEach(b=>b.classList.toggle('on',b.dataset.k===k));
  showPlanCard(k);
  if(opt.zoom!==false&&els.length&&state.zoomTo) state.zoomTo(x0,y0,x1,y1); }
function showPlanCard(k){ const it=ITEMS[k], c=$('#plancard'); const first=(it.use||'').split(/(?<=[.다])\s/)[0];
  const code=(TEMPLES[state.tab].legend.find(l=>l[1]===k)||[])[0];
  c.innerHTML=`<button class="pcx" title="닫기">✕</button><div class="fpz ${it.cls||''}"><i></i>${esc(it.zone)}</div>
    <b>${code?`<span class="pcn">${esc(code)}</span>`:''}${esc(it.name)}</b><p>${esc(first)}</p>
    <div class="pcbtns"><button class="fpmore pcmore">자세히 보기</button>${it.fp?'<button class="fpmore pcfp">1인칭 시점으로 보기</button>':''}</div>`;
  c.hidden=false;
  c.querySelector('.pcx').onclick=hidePlanCard; c.querySelector('.pcmore').onclick=()=>openItem(k);
  const f=c.querySelector('.pcfp'); if(f) f.onclick=()=>{ markVP(it.fp); setMode('fp',{vp:it.fp}); }; }
function hidePlanCard(){ const c=$('#plancard'); if(c) c.hidden=true; const svg=tplan.querySelector('svg');
  if(svg){ svg.querySelectorAll('.sel').forEach(n=>n.classList.remove('sel')); svg.querySelectorAll('.selring').forEach(n=>n.remove()); }
  document.querySelectorAll('#tlegend .lg.on').forEach(b=>b.classList.remove('on')); }
function flashPlan(k){ const svg=tplan.querySelector('svg'); if(!svg) return;
  svg.querySelectorAll(`.pk[data-k="${k}"]`).forEach(n=>{ n.classList.remove('hl'); void n.getBBox; n.classList.add('hl'); setTimeout(()=>n.classList.remove('hl'),1600); }); }

// ── 모달 안 평면 확대도 ──
function innerFor(k){ const it=ITEMS[k]; if(!it||!it.t||!it.detail) return '';
  return `<div class="interior"><div class="ihead">평면 확대 — 누르면 열립니다</div><div class="minip">${planSVG(it.t,it.detail,{fsScale:.55,noCompass:true})}</div></div>`; }
function bindInner(scope){ scope.querySelectorAll('.minip .pk').forEach(n=>{ n.style.cursor='pointer';
  n.addEventListener('click',e=>{ e.stopPropagation(); const k=n.dataset.k; if(k&&ITEMS[k]) { zoomfx.className='zoomfx on'; setTimeout(()=>{ openItem(k); zoomfx.className='zoomfx'; },200); } }); }); }

// ── 모달에서 1인칭으로 ──
function enterFP(t,vp){ closeModal(); closeHist(); if(state.tab!==t) setTab(t,{mode:'fp',vp}); else setMode('fp',{vp}); markVP(vp);
  setTimeout(()=>{ stage.scrollIntoView({behavior:'smooth',block:'center'}); },80); }

window.TempleUI={ innerFor, bindInner, enterFP, templeName:t=>TEMPLES[t]?TEMPLES[t].title:'성막' };

// ── 시작 ──
['tab','solomon','herod','ezekiel'].forEach(t=>{ const m=LS.get('sm_mode_'+t); if(m==='plan'||m==='orbit') state.mode[t]=m; });
// 주소 끝 #herod · #herod-orbit · #herod-fp-israel 로 바로 열기
const hm=(location.hash||'').slice(1).split('-');
renderFPCard(null);
if(TABS.includes(hm[0])){ const m=['plan','orbit','fp'].includes(hm[1])?hm[1]:null; setTab(hm[0],m?{mode:m,vp:hm[2]}:{}); }
else { const saved=LS.get('sm_tab'); setTab(saved&&TABS.includes(saved)?saved:'tab'); }
})();
