// ══════════════════════════════════════════════════════════════
//  성전 3D — 솔로몬 성전 · 헤롯 성전 · 에스겔 성전
//  단위: 1 = 1규빗 · x = 동(+) · z = 남(+) · y = 위
// ══════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const EYE = 3.7;                       // 눈높이 (약 1.7m)
const SUN = new THREE.Vector3(0.78, 0.46, 0.42).normalize();   // 동남쪽 아침 해

// ─────────── 난수 · 노이즈 ───────────
function RNG(seed){ let s=(seed|0)||7; return ()=>{ s=(Math.imul(s,1664525)+1013904223)|0; return (s>>>0)/4294967296; }; }
function hash2(x,z){ let h=Math.imul(x|0,374761393)+Math.imul(z|0,668265263); h=Math.imul(h^(h>>>13),1274126177); return ((h^(h>>>16))>>>0)/4294967296; }
function vnoise(x,z){ const xi=Math.floor(x), zi=Math.floor(z), xf=x-xi, zf=z-zi;
  const u=xf*xf*(3-2*xf), v=zf*zf*(3-2*zf);
  const a=hash2(xi,zi), b=hash2(xi+1,zi), c=hash2(xi,zi+1), d=hash2(xi+1,zi+1);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function fbm(x,z,o=4){ let s=0,a=1,f=1,n=0; for(let i=0;i<o;i++){ s+=a*vnoise(x*f,z*f); n+=a; a*=0.5; f*=2.03; } return s/n; }
const sstep=(a,b,x)=>{ const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };

// ─────────── 캔버스 텍스처 ───────────
function cv(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return [c,c.getContext('2d')]; }
function T(c,rep=true){ const t=new THREE.CanvasTexture(c); if(rep){ t.wrapS=t.wrapT=THREE.RepeatWrapping; } t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8; return t; }
function sh(hex,f){ const n=parseInt(hex.slice(1),16); const c=v=>Math.max(0,Math.min(255,Math.round(v*f)));
  return `rgb(${c(n>>16&255)},${c(n>>8&255)},${c(n&255)})`; }
function speckle(x,R,base,n=7000,a=.22){ x.globalAlpha=a; for(let i=0;i<n;i++){ x.fillStyle=sh(base,0.82+R()*0.36); x.fillRect(R()*512,R()*512,1.6,1.6);} x.globalAlpha=1; }

function ashlarTex(base,seed=1,rows=6,marg=true,vr=.07){
  const [c,x]=cv(512,512), R=RNG(seed);
  x.fillStyle=sh(base,.74); x.fillRect(0,0,512,512);
  const rh=512/rows;
  for(let r=0;r<rows;r++){
    let px=-R()*140;
    while(px<512){
      const len=100+R()*180, f=1+(R()-.5)*2*vr;
      const draw=(ox)=>{
        const x0=px+ox+2, y0=r*rh+2, w=len-4, h=rh-4;
        x.fillStyle=sh(base,f); x.fillRect(x0,y0,w,h);
        if(marg){ x.strokeStyle=sh(base,f*1.06); x.lineWidth=4; x.strokeRect(x0+5,y0+5,w-10,h-10);
          x.strokeStyle=sh(base,f*.9); x.lineWidth=1.4; x.strokeRect(x0+9,y0+9,w-18,h-18); }
      };
      draw(0); if(px<0) draw(512); if(px+len>512) draw(-512);
      px+=len;
    }
  }
  speckle(x,R,base); return T(c);
}
function pavingTex(base,seed=2,n=4){
  const [c,x]=cv(512,512), R=RNG(seed), s=512/n;
  x.fillStyle=sh(base,.8); x.fillRect(0,0,512,512);
  for(let j=0;j<n;j++){ const off=(j%2)*s/2;
    for(let i=-1;i<n;i++){ const f=1+(R()-.5)*.12; x.fillStyle=sh(base,f);
      x.fillRect(i*s+off+1.5,j*s+1.5,s-3,s-3); } }
  speckle(x,R,base,9000,.18); return T(c);
}
function plasterTex(base,seed=3){ const [c,x]=cv(256,256), R=RNG(seed);
  x.fillStyle=base; x.fillRect(0,0,256,256);
  x.globalAlpha=.25; for(let i=0;i<3000;i++){ x.fillStyle=sh(base,.85+R()*.3); x.fillRect(R()*256,R()*256,2,2);} x.globalAlpha=1; return T(c); }
function woodTex(base,seed=4){ const [c,x]=cv(256,256), R=RNG(seed);
  x.fillStyle=base; x.fillRect(0,0,256,256);
  for(let i=0;i<8;i++){ x.fillStyle=sh(base,.9+R()*.2); x.fillRect(i*32,0,31,256); x.fillStyle=sh(base,.6); x.fillRect(i*32+31,0,1,256); }
  x.globalAlpha=.25; for(let i=0;i<260;i++){ x.strokeStyle=sh(base,.7+R()*.5); x.beginPath(); const px=R()*256; x.moveTo(px,0); x.bezierCurveTo(px+R()*6-3,80,px+R()*6-3,170,px+R()*4-2,256); x.stroke(); } x.globalAlpha=1;
  return T(c); }
// 새김 무늬 (그룹 · 종려나무 · 핀 꽃)
function carvedTex(base,line,seed=5){
  const [c,x]=cv(512,512), R=RNG(seed);
  x.fillStyle=base; x.fillRect(0,0,512,512);
  speckle(x,R,base,4000,.15);
  const palm=(cx,by,h)=>{ x.strokeStyle=line; x.lineWidth=5; x.beginPath(); x.moveTo(cx,by); x.lineTo(cx,by-h); x.stroke();
    for(let i=0;i<7;i++){ const a=-Math.PI/2+(i-3)*0.45; x.beginPath(); x.moveTo(cx,by-h); x.quadraticCurveTo(cx+Math.cos(a)*h*.35,by-h+Math.sin(a)*h*.35-10,cx+Math.cos(a)*h*.55,by-h+Math.sin(a)*h*.4+18); x.stroke(); } };
  const cherub=(cx,cy,s)=>{ x.strokeStyle=line; x.lineWidth=4;
    x.beginPath(); x.arc(cx,cy-s*.55,s*.16,0,Math.PI*2); x.stroke();
    x.beginPath(); x.moveTo(cx,cy-s*.38); x.lineTo(cx,cy+s*.4); x.stroke();
    x.beginPath(); x.moveTo(cx,cy-s*.3); x.quadraticCurveTo(cx-s*.7,cy-s*.9,cx-s*.75,cy+s*.1); x.stroke();
    x.beginPath(); x.moveTo(cx,cy-s*.3); x.quadraticCurveTo(cx+s*.7,cy-s*.9,cx+s*.75,cy+s*.1); x.stroke(); };
  const flower=(cx,cy,r)=>{ x.strokeStyle=line; x.lineWidth=3; for(let i=0;i<8;i++){ const a=i*Math.PI/4; x.beginPath(); x.ellipse(cx+Math.cos(a)*r*.55,cy+Math.sin(a)*r*.55,r*.45,r*.2,a,0,Math.PI*2); x.stroke(); } };
  palm(128,470,190); palm(384,470,190); cherub(256,300,210); cherub(0,300,210); cherub(512,300,210);
  flower(128,110,46); flower(384,110,46); flower(256,40,30);
  x.fillStyle=line; x.fillRect(0,500,512,6); x.fillRect(0,6,512,4);
  return T(c);
}
function veilTex(kind){
  const [c,x]=cv(512,1024), R=RNG(kind==='S'?11:12);
  if(kind==='S'){
    const cols=['#2c4f8c','#6b3f8c','#a8322e','#e8e0cc'];
    for(let i=0;i<64;i++){ x.fillStyle=cols[i%4]; x.fillRect(i*8,0,8,1024); }
    x.globalAlpha=.55; x.fillStyle='#1e2a4d'; x.fillRect(0,0,512,1024); x.globalAlpha=1;
    x.strokeStyle='#e6c56a'; x.lineWidth=5;
    for(let r=0;r<4;r++) for(let k=0;k<2;k++){ const cx=128+k*256, cy=140+r*250, s=150;
      x.beginPath(); x.arc(cx,cy-s*.5,s*.15,0,Math.PI*2); x.stroke();
      x.beginPath(); x.moveTo(cx,cy-s*.33); x.lineTo(cx,cy+s*.45); x.stroke();
      x.beginPath(); x.moveTo(cx,cy-s*.25); x.quadraticCurveTo(cx-s*.8,cy-s*.9,cx-s*.8,cy+s*.2); x.stroke();
      x.beginPath(); x.moveTo(cx,cy-s*.25); x.quadraticCurveTo(cx+s*.8,cy-s*.9,cx+s*.8,cy+s*.2); x.stroke(); }
  } else {
    const g=x.createLinearGradient(0,0,0,1024); g.addColorStop(0,'#1d2b5a'); g.addColorStop(1,'#35205a');
    x.fillStyle=g; x.fillRect(0,0,512,1024);
    for(let i=0;i<420;i++){ x.fillStyle=R()<.3?'#f1d78a':'#d9d3ea'; const s=R()*3+1; x.fillRect(R()*512,R()*1024,s,s); }
    ['#a8322e','#6b3f8c','#e8e0cc','#2c4f8c'].forEach((col,i)=>{ x.fillStyle=col; x.fillRect(0,980-i*14,512,12); x.fillRect(0,20+i*14,512,12); });
  }
  const t=T(c,false); return t;
}
function inscriptionTex(){
  const [c,x]=cv(256,512); x.fillStyle='#e7e0cf'; x.fillRect(0,0,256,512);
  x.fillStyle='#6d6252'; x.font='bold 22px serif'; x.textAlign='center';
  ['ΜΗΘΕΝΑ ΑΛΛΟ-','ΓΕΝΗ ΕΙΣΠΟ-','ΡΕΥΕΣΘΑΙ ΕΝ-','ΤΟΣ ΤΟΥ ΠΕ-','ΡΙ ΤΟ ΙΕΡΟΝ','ΤΡΥΦΑΚΤΟΥ','ΚΑΙ ΠΕΡΙ-','ΒΟΛΟΥ…'].forEach((l,i)=>x.fillText(l,128,80+i*44));
  return T(c,false);
}
function groundTex(){ const [c,x]=cv(512,512), R=RNG(21); x.fillStyle='#bfae8c'; x.fillRect(0,0,512,512);
  for(let i=0;i<26000;i++){ x.globalAlpha=.25; x.fillStyle=sh('#bfae8c',.72+R()*.55); const s=R()*2.5+.5; x.fillRect(R()*512,R()*512,s,s);} x.globalAlpha=1;
  const t=T(c); t.repeat.set(220,220); return t; }
function waterTex(){ const [c,x]=cv(256,256), R=RNG(31); x.fillStyle='#4f86a8'; x.fillRect(0,0,256,256);
  x.strokeStyle='rgba(220,240,255,.35)'; x.lineWidth=2;
  for(let i=0;i<60;i++){ const px=R()*256, py=R()*256; x.beginPath(); x.moveTo(px,py); x.quadraticCurveTo(px+10,py-4,px+22,py); x.stroke(); }
  return T(c); }
function glowTex(){ const [c,x]=cv(128,128); const g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.35,'rgba(255,255,255,.45)'); g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g; x.fillRect(0,0,128,128); const t=new THREE.CanvasTexture(c); return t; }

// ─────────── 재질 ───────────
let M=null, TILE=null, TEXGLOW=null;
function materials(){
  if(M) return M;
  const std=o=>new THREE.MeshStandardMaterial(o);
  const gcol=0xe2b556;
  TEXGLOW=glowTex();
  M={
    stone:   std({map:ashlarTex('#d7c7a2',3), roughness:.9}),
    stoneW:  std({map:ashlarTex('#ece6d8',5,6,true,.05), roughness:.7}),
    stoneH:  std({map:ashlarTex('#d6c9ab',8,5,true,.08), roughness:.9}),
    stoneDk: std({map:ashlarTex('#b9a27d',9,6,true,.1), roughness:.95}),
    pave:    std({map:pavingTex('#cbbd9d',2,4), roughness:.92, envMapIntensity:.4}),
    paveW:   std({map:pavingTex('#e0d8c6',4,4), roughness:.88, envMapIntensity:.35}),
    paveDk:  std({map:pavingTex('#b3a07c',6,8), roughness:.95}),
    gold:    std({color:gcol, metalness:1, roughness:.26}),
    goldCarved: std({map:carvedTex('#d8ae55','#8a6420',5), metalness:.92, roughness:.34}),
    bronze:  std({color:0xa8703f, metalness:.85, roughness:.42}),
    bronze2: std({color:0xa8703f, metalness:.85, roughness:.42, side:THREE.DoubleSide}),
    bronzeC: std({color:0xc79a55, metalness:.95, roughness:.3}),
    cedar:   std({map:woodTex('#7b4a2b'), roughness:.8}),
    woodCarved: std({map:carvedTex('#8a5a33','#4a2c14',7), roughness:.75}),
    veilS:   std({map:veilTex('S'), roughness:.95, side:THREE.DoubleSide}),
    veilH:   std({map:veilTex('H'), roughness:.95, side:THREE.DoubleSide}),
    linen:   std({color:0xf2eee4, roughness:.95}),
    skin:    std({color:0xa4714c, roughness:.8}),
    robe1:   std({color:0x5b6f8c, roughness:1}), robe2: std({color:0x8c4b38, roughness:1}),
    robe3:   std({color:0xa38a5c, roughness:1}), robe4: std({color:0x68764f, roughness:1}),
    robe5:   std({color:0x6c5a82, roughness:1}), robe6: std({color:0xd9ceb6, roughness:1}),
    robe7:   std({color:0x3f4c63, roughness:1}),
    dark:    new THREE.MeshBasicMaterial({color:0x17110b}),
    ash:     std({color:0x2c2622, roughness:1}),
    water:   std({color:0x5d8fb0, metalness:.2, roughness:.08, transparent:true, opacity:.88}),
    house:   std({map:plasterTex('#d4c29d',3), roughness:.95}),
    house2:  std({map:plasterTex('#c6ad86',4), roughness:.95}),
    roofT:   std({color:0xb8a784, roughness:1}),
    leaf:    std({color:0x5f6d43, roughness:.95, flatShading:true}),
    leaf2:   std({color:0x4f7a3a, roughness:.95, flatShading:true}),
    trunk:   std({color:0x5b4633, roughness:1}),
    cypress: std({color:0x3e4b2e, roughness:1, flatShading:true}),
    red:     std({color:0x8e2b22, roughness:.8}),
    rock:    std({color:0x9b8b70, roughness:1, flatShading:true}),
    inscr:   std({map:inscriptionTex(), roughness:.8}),
    wool:    std({color:0xebe6d8, roughness:1}),
    cattle:  std({color:0x7a5236, roughness:1}),
    bread:   std({color:0xd8b27a, roughness:.9}),
    ground:  std({map:groundTex(), vertexColors:true, roughness:1}),
  };
  TILE={stone:12,stoneW:12,stoneH:14,stoneDk:12,pave:16,paveW:16,paveDk:16,cedar:6,goldCarved:10,woodCarved:10,house:10,house2:10};
  return M;
}

// ─────────── 기하 도우미 ───────────
function gBox(w,h,d,tile){ const g=new THREE.BoxGeometry(w,h,d);
  if(tile){ const uv=g.attributes.uv, dm=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
    for(let f=0;f<6;f++) for(let i=0;i<4;i++){ const j=f*4+i; uv.setXY(j,uv.getX(j)*dm[f][0]/tile,uv.getY(j)*dm[f][1]/tile); } }
  return g; }
// 단면(z,y) 다각형을 x0~x1로 밀어낸 기둥꼴 (경사로 등)
function prismX(prof,x0,x1){ const pos=[]; const n=prof.length;
  const P=(x,[z,y])=>[x,y,z];
  for(let i=1;i<n-1;i++){ pos.push(...P(x0,prof[0]),...P(x0,prof[i+1]),...P(x0,prof[i]));
                          pos.push(...P(x1,prof[0]),...P(x1,prof[i]),...P(x1,prof[i+1])); }
  for(let i=0;i<n;i++){ const a=prof[i], b=prof[(i+1)%n];
    pos.push(...P(x0,a),...P(x0,b),...P(x1,b), ...P(x0,a),...P(x1,b),...P(x1,a)); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  const uv=[]; for(let i=0;i<pos.length;i+=3) uv.push((pos[i]+pos[i+2])/12,pos[i+1]/12);
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); g.computeVertexNormals(); return g; }

class Bld{
  constructor(){ this.bins=new Map(); }
  add(g,mat,k,fl){ fl=fl||{}; const key=mat+'|'+(k||'')+'|'+(fl.walk?1:0)+'|'+(fl.ns?1:0);
    let b=this.bins.get(key); if(!b){ b={mat,k,walk:!!fl.walk,ns:!!fl.ns,g:[]}; this.bins.set(key,b); }
    b.g.push(g.index?g.toNonIndexed():g); }
  bx(x0,x1,y0,y1,z0,z1,mat,k,fl){ if(x1<x0)[x0,x1]=[x1,x0]; if(z1<z0)[z0,z1]=[z1,z0]; if(y1<y0)[y0,y1]=[y1,y0];
    const w=x1-x0,h=y1-y0,d=z1-z0; if(w<=1e-4||h<=1e-4||d<=1e-4) return;
    const g=gBox(w,h,d,TILE[mat]); g.translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2); this.add(g,mat,k,fl); }
  cyl(x,y0,z,r,h,mat,k,seg=14,rTop,fl){ const g=new THREE.CylinderGeometry(rTop??r,r,h,seg); g.translate(x,y0+h/2,z); this.add(g,mat,k,fl); }
  finish(root){ const pick=[],walk=[];
    for(const b of this.bins.values()){
      const g=mergeGeometries(b.g,false); if(!g) continue; g.computeBoundingSphere(); g.computeBoundingBox();
      const m=new THREE.Mesh(g,M[b.mat]); m.castShadow=!b.ns; m.receiveShadow=true;
      m.userData.k=b.k||null; m.userData.walk=b.walk; m.matrixAutoUpdate=false; m.updateMatrix();
      root.add(m); pick.push(m); if(b.walk) walk.push(m); }
    this.bins.clear(); return {pick,walk}; }
}
function wallX(B,x0,x1,zc,t,y0,y1,mat,k,gaps=[],fl){ let c=x0; [...gaps].sort((a,b)=>a[0]-b[0]).forEach(([a,b,h])=>{
    if(a>c) B.bx(c,a,y0,y1,zc-t/2,zc+t/2,mat,k,fl);
    if(h!=null&&y0+h<y1) B.bx(a,b,y0+h,y1,zc-t/2,zc+t/2,mat,k,fl); c=b; });
  if(c<x1) B.bx(c,x1,y0,y1,zc-t/2,zc+t/2,mat,k,fl); }
function wallZ(B,z0,z1,xc,t,y0,y1,mat,k,gaps=[],fl){ let c=z0; [...gaps].sort((a,b)=>a[0]-b[0]).forEach(([a,b,h])=>{
    if(a>c) B.bx(xc-t/2,xc+t/2,y0,y1,c,a,mat,k,fl);
    if(h!=null&&y0+h<y1) B.bx(xc-t/2,xc+t/2,y0+h,y1,a,b,mat,k,fl); c=b; });
  if(c<z1) B.bx(xc-t/2,xc+t/2,y0,y1,c,z1,mat,k,fl); }
// 계단: 가장자리 e에서 dir 방향으로 내려감 (n단, 단높이 rise, 디딤 run)
function stairs(B,axis,e,dir,s0,s1,n,rise,run,yTop,mat,k,fl){ const yb=yTop-n*rise;
  for(let i=0;i<n;i++){ const a=e+dir*i*run, b=e+dir*(i+1)*run, top=yTop-(i+1)*rise; if(top<=yb+1e-4) continue;
    if(axis==='x') B.bx(a,b,yb,top,s0,s1,mat,k,fl); else B.bx(s0,s1,yb,top,a,b,mat,k,fl); } }
// 주랑(기둥 행각) — open: 뜰을 향한 쪽 ('x-','x+','z-','z+')
function portico(B,o){ const {x0,x1,z0,z1,open,h,y=0,rows=2,sp=8,r=1,mat='stoneW',k=null,roofT=2,back=true}=o;
  B.bx(x0,x1,y+h,y+h+roofT,z0,z1,mat,k); B.bx(x0,x1,y+h+roofT,y+h+roofT+.6,z0,z1,'roofT',k);
  const t=2;
  if(back){ if(open==='x-') B.bx(x1-t,x1,y,y+h,z0,z1,mat,k); if(open==='x+') B.bx(x0,x0+t,y,y+h,z0,z1,mat,k);
            if(open==='z-') B.bx(x0,x1,y,y+h,z1-t,z1,mat,k); if(open==='z+') B.bx(x0,x1,y,y+h,z0,z0+t,mat,k); }
  const alongZ=open[0]==='x', D=alongZ?(x1-x0):(z1-z0);
  const a0=alongZ?z0:x0, a1=alongZ?z1:x1, n=Math.max(1,Math.round((a1-a0)/sp));
  for(let q=0;q<rows;q++){ const dd=1.6+q*((D-(back?4.5:3))/Math.max(1,rows-(back?0:1)));
    const dc= open==='x-'?x0+dd : open==='x+'?x1-dd : open==='z-'?z0+dd : z1-dd;
    for(let i=0;i<=n;i++){ const a=a0+(a1-a0)*i/n; const cx=alongZ?dc:a, cz=alongZ?a:dc;
      B.cyl(cx,y+.6,cz,r,h-1.6,mat,k,10);
      B.bx(cx-r*1.25,cx+r*1.25,y,y+.6,cz-r*1.25,cz+r*1.25,mat,k);
      B.bx(cx-r*1.35,cx+r*1.35,y+h-1,y+h,cz-r*1.35,cz+r*1.35,mat,k); } }
}
function person(B,x,y,z,robe,head,R){ const s=.9+R()*.18, h=3.0*s;
  B.cyl(x,y,z,.52*s,h*.9,robe,null,8,.3*s);
  const sh_=new THREE.SphereGeometry(.44*s,8,5); sh_.scale(1,.55,.8); sh_.translate(x,y+h*.88,z); B.add(sh_,robe,null);
  const hd=new THREE.SphereGeometry(.27*s,8,6); hd.translate(x,y+h*.88+.43*s,z); B.add(hd,'skin',null);
  B.cyl(x,y+h*.88+.52*s,z,.29*s,.33*s,head,null,8,.25*s); }
function crowd(B,R,n,x0,x1,z0,z1,y,robes,heads,avoid){
  for(let i=0;i<n;i++){ let x,z,t=0; do{ x=x0+R()*(x1-x0); z=z0+R()*(z1-z0); t++; }while(avoid&&avoid(x,z)&&t<25); if(t>=25) continue;
    const rb=robes[Math.floor(R()*robes.length)]; const hd=heads?heads[Math.floor(R()*heads.length)]:rb;
    person(B,x,typeof y==='function'?y(x,z):y,z,rb,hd,R); } }
const ROBES=['robe1','robe2','robe3','robe4','robe5','robe6','robe7'];
function olive(B,x,y,z,R,mat='leaf'){ B.cyl(x,y-.5,z,.35,3,'trunk',null,6,.25);
  const s=new THREE.IcosahedronGeometry(2+R()*1.3,0); s.scale(1.35,.8,1.35); s.translate(x,y+3.4,z); B.add(s,mat,null); }
function cypress(B,x,y,z,R){ const h=9+R()*6; const g=new THREE.ConeGeometry(1.4,h,7); g.translate(x,y+h/2+.5,z); B.add(g,'cypress',null); }
function palmTree(B,x,y,z,R){ const h=10+R()*4; B.cyl(x,y,z,.4,h,'trunk',null,6,.3);
  for(let i=0;i<7;i++){ const g=new THREE.ConeGeometry(.5,5,4); g.rotateZ(Math.PI/2.6); g.rotateY(i*Math.PI*2/7); g.translate(x,y+h,z); B.add(g,'leaf2',null); } }
function menorah(B,x,y,z,s,k,FX){ const H=3.2*s;
  B.cyl(x,y,z,.5*s,.25*s,'gold',k,12,.35*s); B.cyl(x,y+.25*s,z,.08*s,H-.25*s,'gold',k,8);
  for(let i=1;i<=3;i++){ const t=new THREE.TorusGeometry(.45*s*i,.06*s,6,16,Math.PI); t.rotateZ(Math.PI); t.translate(x,y+H-.25*s,z); B.add(t,'gold',k); }
  for(let i=-3;i<=3;i++){ const px=x+i*.45*s; B.cyl(px,y+H-.25*s,z,.12*s,.22*s,'gold',k,8,.18*s); if(FX) FX.flameAt(px,y+H,z,.16*s); } }
function showTable(B,x,y,z,k,w=2,d=1,h=1.5){ B.bx(x-w/2,x+w/2,y+h-.12,y+h,z-d/2,z+d/2,'gold',k);
  B.bx(x-w/2-.05,x+w/2+.05,y+h-.3,y+h-.12,z-d/2-.05,z+d/2+.05,'gold',k);
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([a,b])=>B.bx(x+a*(w/2-.12)-.06,x+a*(w/2-.12)+.06,y,y+h-.12,z+b*(d/2-.1)-.06,z+b*(d/2-.1)+.06,'gold',k));
  for(let c=0;c<2;c++) for(let i=0;i<6;i++) B.bx(x-w/2+.2+c*(w/2),x-.2+c*(w/2)+.0,y+h+i*.13,y+h+i*.13+.12,z-d/2+.15,z+d/2-.15,'bread',k); }
function incenseAltar(B,x,y,z,k,FX,mat='gold'){ B.bx(x-.5,x+.5,y,y+2,z-.5,z+.5,mat,k); B.bx(x-.58,x+.58,y+1.85,y+2,z-.58,z+.58,mat,k);
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([a,b])=>B.bx(x+a*.42-.08,x+a*.42+.08,y+2,y+2.25,z+b*.42-.08,z+b*.42+.08,mat,k));
  if(FX) FX.smokeAt(x,y+2.1,z,.35,4); }
function lathe(pts,seg=28){ return new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),seg); }

// ─────────── 불 · 연기 · 빛 ───────────
class Effects{
  constructor(root){ this.root=root; this.flames=[]; this.smoke=[]; this.flow=[]; this.glows=[]; }
  flameAt(x,y,z,s){ const ph=Math.random()*6;
    [[.5,1.6,0xe8561a,.82],[.3,1.05,0xffc247,.95]].forEach(([r,h,c,o])=>{
      const m=new THREE.Mesh(new THREE.ConeGeometry(r*s,h*s,7),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,depthWrite:false,toneMapped:false}));
      m.position.set(x,y+h*s*.45,z); m.userData.ph=ph; this.root.add(m); this.flames.push(m); }); }
  fire(x,y,z,s){ for(let i=0;i<7;i++) this.flameAt(x+(Math.random()-.5)*s*1.8,y,z+(Math.random()-.5)*s*1.8,s*(.7+Math.random()*.6));
    const l=new THREE.PointLight(0xff9a3c,40*s*s,s*30,1.6); l.position.set(x,y+s*1.5,z); this.root.add(l); this.smokeAt(x,y+s,z,s*1.4,12); }
  smokeAt(x,y,z,s,n){ const mat=new THREE.SpriteMaterial({map:TEXGLOW,color:0xcfc7bb,transparent:true,opacity:.3,depthWrite:false});
    for(let i=0;i<n;i++){ const sp=new THREE.Sprite(mat.clone()); sp.userData={x,y,z,s,t:i/n}; this.root.add(sp); this.smoke.push(sp); } }
  glow(x,y,z,s,color,op=.5){ const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:TEXGLOW,color,transparent:true,opacity:op,depthWrite:false,blending:THREE.AdditiveBlending}));
    sp.position.set(x,y,z); sp.scale.set(s,s,1); this.root.add(sp); this.glows.push(sp); return sp; }
  update(t){
    for(const f of this.flames){ const k=1+.25*Math.sin(t*9+f.userData.ph)+.12*Math.sin(t*23+f.userData.ph*2); f.scale.set(1,k,1); }
    for(const s of this.smoke){ const u=s.userData; const p=(t*0.09+u.t)%1;
      s.position.set(u.x+Math.sin(p*5+u.t*9)*u.s*.8+p*u.s*3, u.y+p*u.s*14, u.z+Math.cos(p*4+u.t*7)*u.s*.6);
      const sc=u.s*(1+p*4); s.scale.set(sc,sc,1); s.material.opacity=.32*(1-p)*Math.min(1,p*6); }
    for(const m of this.flow) m.map.offset.x=-(t*0.25)%1;
    for(const g of this.glows){ g.material.opacity=g.userData.op0??(g.userData.op0=g.material.opacity); g.material.opacity=g.userData.op0*(0.85+0.15*Math.sin(t*1.3)); }
  }
}

// ─────────── 지형 · 도시 ───────────
function terrain(root,hfn,size=7000,seg=190){
  const g=new THREE.PlaneGeometry(size,size,seg,seg); g.rotateX(-Math.PI/2);
  const p=g.attributes.position; for(let i=0;i<p.count;i++) p.setY(i,hfn(p.getX(i),p.getZ(i)));
  g.computeVertexNormals();
  const n=g.attributes.normal, col=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){ const x=p.getX(i), z=p.getZ(i), slope=1-n.getY(i), q=fbm(x*.004,z*.004,3);
    let r=.93,gg=.84,b=.66;                                  // 마른 흙
    const green=sstep(.45,.75,q)*.55; r-=green*.25; gg-=green*.06; b-=green*.2;  // 풀
    const rk=sstep(.08,.3,slope); r=r*(1-rk)+.78*rk; gg=gg*(1-rk)+.72*rk; b=b*(1-rk)+.62*rk;
    col[i*3]=r; col[i*3+1]=gg; col[i*3+2]=b; }
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const m=new THREE.Mesh(g,M.ground); m.receiveShadow=true; m.matrixAutoUpdate=false; m.updateMatrix(); root.add(m); return m; }
function city(B,R,hfn,n,x0,x1,z0,z1,ok){
  for(let i=0;i<n;i++){ const x=x0+R()*(x1-x0), z=z0+R()*(z1-z0); if(ok&&!ok(x,z)) continue;
    const y=hfn(x,z), w=7+R()*10, d=7+R()*10, h=5+R()*6, m=R()<.5?'house':'house2';
    B.bx(x-w/2,x+w/2,y-5,y+h,z-d/2,z+d/2,m,null);
    if(R()<.35) B.bx(x-w/4,x+w/4,y+h,y+h+4,z-d/4,z+d/4,m,null); } }
function trees(B,R,hfn,n,x0,x1,z0,z1,ok,kind='olive'){
  for(let i=0;i<n;i++){ const x=x0+R()*(x1-x0), z=z0+R()*(z1-z0); if(ok&&!ok(x,z)) continue; const y=hfn(x,z);
    if(kind==='olive') olive(B,x,y,z,R); else if(kind==='cypress') cypress(B,x,y,z,R); else if(kind==='palm') palmTree(B,x,y,z,R); else olive(B,x,y,z,R,'leaf2'); } }
function flatten(h,rect,level,blend){ return (x,z)=>{ const dx=Math.max(rect[0]-x,0,x-rect[1]), dz=Math.max(rect[2]-z,0,z-rect[3]);
  const d=Math.hypot(dx,dz); const t=sstep(0,blend,d); return level*(1-t)+h(x,z)*t; }; }

// ══════════════════════ 솔로몬 성전 ══════════════════════
function buildSolomon(ctx){
  const {B,R,FX,root}=ctx;
  const base=(x,z)=>{ let h=18*(fbm(x*.0028+3,z*.0028)-.5)*2+6;
    h-=75*Math.exp(-1*((x-360)/85)**2);                    // 기드론 골짜기
    h+=70*Math.exp(-1*((x-760)/260)**2)*sstep(250,500,x);    // 감람산
    h-=35*Math.exp(-1*((x+260)/70)**2);                    // 서쪽 골짜기
    h-=.09*Math.max(0,z-160);                            // 다윗 성으로 내려가는 남쪽 비탈
    return h; };
  const hfn=flatten(base,[-130,250,-140,140],-3,70);
  terrain(root,hfn);
  // ── 큰 뜰 ──
  B.bx(-110,230,-3,0,-120,120,'pave','s_outer',{walk:true});
  wallX(B,-113,233,-121.5,3,0,10,'stone',null,[[50,70,null]]); wallX(B,-113,233,121.5,3,0,10,'stone',null,[[50,70,null]]);
  wallZ(B,-120,120,-111.5,3,0,10,'stone',null); wallZ(B,-120,120,231.5,3,0,10,'stone',null,[[-10,10,null]]);
  const gate=(axis,wp,c,w,inDir)=>{ const d=6;
    if(axis==='x'){ B.bx(wp-d,wp+d,0,16,c-w/2-6,c-w/2,'stone','s_gate'); B.bx(wp-d,wp+d,0,16,c+w/2,c+w/2+6,'stone','s_gate');
      B.bx(wp-d,wp+d,12,16,c-w/2,c+w/2,'stone','s_gate'); B.bx(wp-d-.5,wp+d+.5,16,17,c-w/2-6.5,c+w/2+6.5,'stone','s_gate');
      B.bx(wp+inDir*d,wp+inDir*(d+w/2),0,12,c-w/2,c-w/2+.35,'bronze','s_gate'); B.bx(wp+inDir*d,wp+inDir*(d+w/2),0,12,c+w/2-.35,c+w/2,'bronze','s_gate');
      B.bx(wp-d,wp+d,-.02,.02,c-w/2,c+w/2,'pave','s_outer',{walk:true}); }
    else { B.bx(c-w/2-6,c-w/2,0,16,wp-d,wp+d,'stone','s_gate'); B.bx(c+w/2,c+w/2+6,0,16,wp-d,wp+d,'stone','s_gate');
      B.bx(c-w/2,c+w/2,12,16,wp-d,wp+d,'stone','s_gate'); B.bx(c-w/2-6.5,c+w/2+6.5,16,17,wp-d-.5,wp+d+.5,'stone','s_gate');
      B.bx(c-w/2,c-w/2+.35,0,12,wp+inDir*d,wp+inDir*(d+w/2),'bronze','s_gate'); B.bx(c+w/2-.35,c+w/2,0,12,wp+inDir*d,wp+inDir*(d+w/2),'bronze','s_gate'); } };
  gate('x',231.5,0,20,-1); gate('z',-121.5,60,20,1); gate('z',121.5,60,20,-1);
  // ── 안뜰 (높은 뜰) ──
  B.bx(-80,110,0,2,-60,60,'paveW','s_inner',{walk:true});
  [[2,6.2,'stone'],[6.2,7,'cedar']].forEach(([a,b,m])=>{
    wallX(B,-82,112,-61,2,a,b,m,null,[[30,50,null]]); wallX(B,-82,112,61,2,a,b,m,null,[[30,50,null]]);
    wallZ(B,-60,60,-81,2,a,b,m,null); wallZ(B,-60,60,111,2,a,b,m,null,[[-10,10,null]]); });
  B.bx(110,112,0,2,-10,10,'paveW','s_inner',{walk:true}); stairs(B,'x',112,1,-10,10,4,.5,1.3,2,'paveW','s_inner',{walk:true});
  B.bx(109.5,112.5,2,11,-12,-10,'stone','s_gate'); B.bx(109.5,112.5,2,11,10,12,'stone','s_gate'); B.bx(109.5,112.5,9,11,-10,10,'stone','s_gate');
  [-1,1].forEach(s=>{ B.bx(30,50,0,2,s*60,s*62,'paveW','s_inner',{walk:true}); stairs(B,'z',s*62,s,30,50,4,.5,1.3,2,'paveW','s_inner',{walk:true});
    B.bx(28,30,2,11,s*59.5,s*62.5,'stone','s_gate'); B.bx(50,52,2,11,s*59.5,s*62.5,'stone','s_gate'); B.bx(30,50,9,11,s*59.5,s*62.5,'stone','s_gate'); });
  // ── 성전 기단 · 계단 ──
  B.bx(-64,29,2,6,-24,24,'stoneDk','s_porch',{walk:true});
  stairs(B,'x',29,1,-9,9,8,.5,1,6,'stoneDk','s_porch',{walk:true});
  // ── 본채 벽 ──
  B.bx(-55,12,6,36,-13,-10,'stone','s_house'); B.bx(-55,12,6,36,10,13,'stone','s_house'); B.bx(-55,-52,6,36,-10,10,'stone','s_house');
  wallZ(B,-10,10,11,2,6,36,'stone','s_house',[[-2.5,2.5,12]]);
  wallZ(B,-10,10,-31,2,6,36,'stone','s_house',[[-2,2,8]]);
  B.bx(-52,-32,26,27,-10,10,'goldCarved','s_mhk');
  B.bx(-56,13,36,37.2,-14,14,'stone','s_house');
  wallX(B,-56,13,-13.6,.8,37.2,38.6,'stone','s_house'); wallX(B,-56,13,13.6,.8,37.2,38.6,'stone','s_house');
  for(let x=-50;x<8;x+=6){ B.bx(x,x+1.4,27,32.5,-13.08,-13,'dark',null,{ns:true}); B.bx(x,x+1.4,27,32.5,13,13.08,'dark',null,{ns:true}); }
  // 성소 내부 — 금으로 입힌 백향목, 새김 무늬
  B.bx(-30,10,35.4,36,-10,10,'cedar','s_holy');
  B.bx(-30,10,6,35.4,-10,-9.85,'goldCarved','s_holy'); B.bx(-30,10,6,35.4,9.85,10,'goldCarved','s_holy');
  wallZ(B,-10,10,9.93,.14,6,35.4,'goldCarved','s_holy',[[-2.5,2.5,12]]);
  wallZ(B,-10,10,-29.93,.14,6,35.4,'goldCarved','s_holy',[[-2,2,8]]);
  B.bx(-30,10,6,6.05,-10,10,'gold','s_holy',{walk:true});
  // 지성소 내부 — 순금
  B.bx(-52,-32,6,26,-10,-9.85,'goldCarved','s_mhk'); B.bx(-52,-32,6,26,9.85,10,'goldCarved','s_mhk');
  B.bx(-52,-51.85,6,26,-10,10,'goldCarved','s_mhk'); wallZ(B,-10,10,-32.07,.14,6,26,'goldCarved','s_mhk',[[-2,2,8]]);
  B.bx(-52,-32,6,6.05,-10,10,'gold','s_mhk',{walk:true});
  // 문
  B.bx(12,14.5,6,18,-2.7,-2.5,'goldCarved','s_doors'); B.bx(12,14.5,6,18,2.5,2.7,'goldCarved','s_doors');
  B.bx(-30,-28,6,14,-2.2,-2,'goldCarved','s_doors'); B.bx(-30,-28,6,14,2,2.2,'goldCarved','s_doors');
  { const v=new THREE.PlaneGeometry(4,8); v.rotateY(Math.PI/2); v.translate(-31,10,0); B.add(v,'veilS','s_doors',{ns:true}); }
  [14.6,15.6].forEach(y=>{ const c=new THREE.CylinderGeometry(.06,.06,20,6); c.rotateX(Math.PI/2); c.translate(-29.6,y,0); B.add(c,'gold','s_doors'); });
  // ── 낭실 ──
  B.bx(12,23,6,46,-13,-10,'stone','s_porch'); B.bx(12,23,6,46,10,13,'stone','s_porch');
  wallZ(B,-13,13,22,2,6,46,'stone','s_porch',[[-7,7,30]]);
  B.bx(11,24,46,47.5,-14,14,'stone','s_porch'); wallX(B,11,24,-13.6,.8,47.5,49,'stone','s_porch'); wallX(B,11,24,13.6,.8,47.5,49,'stone','s_porch');
  B.bx(12,21,6,45.9,-10,-9.85,'gold','s_porch'); B.bx(12,21,6,45.9,9.85,10,'gold','s_porch'); B.bx(12,21,6,6.05,-10,10,'gold','s_porch',{walk:true});
  // ── 골방 (3층) ──
  B.bx(-62,10,6,24,-22,-13,'stone','s_side'); B.bx(-62,10,6,24,13,22,'stone','s_side'); B.bx(-62,-55,6,24,-22,22,'stone','s_side');
  B.bx(-63,11,24,25,-23,-13,'stone','s_side'); B.bx(-63,11,24,25,13,23,'stone','s_side'); B.bx(-63,-55,24,25,-23,23,'stone','s_side');
  [12,18].forEach(y=>{ B.bx(-62,10,y,y+.6,-22.3,-22,'cedar','s_side'); B.bx(-62,10,y,y+.6,22,22.3,'cedar','s_side'); B.bx(-62.3,-62,y,y+.6,-22,22,'cedar','s_side'); });
  for(let x=-58;x<8;x+=8) [8,14,20].forEach(y=>{ B.bx(x,x+1.2,y,y+2,-22.06,-22,'dark',null,{ns:true}); B.bx(x,x+1.2,y,y+2,22,22.06,'dark',null,{ns:true}); });
  // ── 성소 기구 ──
  [-24,-17,-10,-3,4].forEach(x=>{ [-1,1].forEach(s=>{ menorah(B,x,6.05,s*6.3,1,'s_lamps',FX); showTable(B,x+3.5,6.05,s*8.4,'s_tables'); }); });
  incenseAltar(B,-27,6.05,0,'s_incense',FX);
  [[-18,0],[2,0]].forEach(([x,z])=>{ const l=new THREE.PointLight(0xffc27a,90,40,1.4); l.position.set(x,14,z); root.add(l); });
  { const l=new THREE.PointLight(0xffe6a8,60,26,1.3); l.position.set(-42,16,0); root.add(l); }
  // ── 지성소: 두 그룹 · 언약궤 ──
  // 그룹: 옷자락 모양 몸, 어깨, 얼굴, 양쪽으로 펼친 날개 (한 날개 5규빗)
  const cherub=(x,z,H,k,span)=>{ const y=6.05, sh=y+H*.66;
    B.cyl(x,y,z,1.05,H*.66,'gold',k,16,.62);
    const so=new THREE.SphereGeometry(.95,14,8); so.scale(.8,.62,1.15); so.translate(x,sh,z); B.add(so,'gold',k);
    const nk=new THREE.CylinderGeometry(.3,.36,.6,10); nk.translate(x,sh+.6,z); B.add(nk,'gold',k);
    const hd=new THREE.SphereGeometry(.6,14,10); hd.scale(1,1.12,.95); hd.translate(x+.08,sh+1.25,z); B.add(hd,'gold',k);
    [-1,1].forEach(s=>{ const p=new THREE.Shape(); p.moveTo(0,-.2); p.lineTo(span*.3,1.1); p.lineTo(span*.72,2.1); p.lineTo(span,2.5);
      p.lineTo(span*.9,1.5); p.lineTo(span*.95,.9); p.lineTo(span*.72,.2); p.lineTo(span*.78,-.4); p.lineTo(span*.5,-.9); p.lineTo(span*.22,-1.2); p.lineTo(0,-1); p.lineTo(0,-.2);
      const g=new THREE.ExtrudeGeometry(p,{depth:.22,bevelEnabled:false}); g.rotateY(s>0?-Math.PI/2:Math.PI/2); g.translate(x+(s>0?.35:-.35)*0,sh+.1,z); B.add(g,'goldCarved',k); }); };
  cherub(-45,-5,10,'s_cherubim',5); cherub(-45,5,10,'s_cherubim',5);
  B.bx(-43.25,-40.75,6.05,7.55,-.75,.75,'gold','s_ark'); B.bx(-43.35,-40.65,7.55,7.75,-.85,.85,'gold','s_ark');
  [-1,1].forEach(s=>{ const p=new THREE.CylinderGeometry(.09,.09,13,6); p.rotateZ(Math.PI/2); p.translate(-40.5,6.6,s*.9); B.add(p,'gold','s_ark');
    const c=new THREE.ConeGeometry(.28,.9,6); c.translate(-42+s*.8,8.2,0); B.add(c,'gold','s_ark'); });
  FX.glow(-42,10,0,9,0xffe2a0,.18);
  // ── 야긴과 보아스 ──
  [-7,7].forEach(z=>{ const x=26.5, y=6;
    B.cyl(x,y,z,1.91,18,'bronze','s_pillars',20); B.cyl(x,y,z,2.4,.8,'bronze','s_pillars',20);
    const cap=lathe([[1.91,0],[2.4,.6],[2.6,1.8],[2.25,3],[2.75,4.2],[3.05,5]],24); cap.translate(x,y+18,z); B.add(cap,'bronze2','s_pillars');
    B.cyl(x,y+22.9,z,3.05,.2,'bronze','s_pillars',24);
    [19.4,21.1].forEach(yy=>{ const t=new THREE.TorusGeometry(2.55,.14,6,28); t.rotateX(Math.PI/2); t.translate(x,y+yy,z); B.add(t,'bronze','s_pillars'); });
    [18.9,21.7].forEach(yy=>{ for(let i=0;i<22;i++){ const a=i/22*Math.PI*2; const g=new THREE.SphereGeometry(.3,6,5); g.translate(x+Math.cos(a)*2.5,y+yy,z+Math.sin(a)*2.5); B.add(g,'bronze','s_pillars'); } }); });
  // ── 놋 제단 ──
  B.bx(50,70,2,5,-10,10,'bronze','s_altar'); B.bx(51,69,5,8.5,-9,9,'bronze','s_altar'); B.bx(52,68,8.5,12,-8,8,'bronze','s_altar');
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([a,b])=>B.bx(60+a*7.4-.65,60+a*7.4+.65,12,13.4,b*7.4-.65,b*7.4+.65,'bronze','s_altar'));
  B.bx(53,67,12,12.08,-7,7,'ash','s_altar');
  for(let i=0;i<9;i++){ const l=new THREE.CylinderGeometry(.35,.35,6,6); l.rotateZ(Math.PI/2); l.rotateY(R()*3); l.translate(60+(R()-.5)*6,12.4+(i%3)*.5,(R()-.5)*6); B.add(l,'cedar','s_altar'); }
  B.add(prismX([[8,2],[34,2],[8,12]],57,63),'stoneDk','s_altar');
  FX.fire(60,12.1,0,2);
  // ── 놋 바다 ──
  { const cx=38, cz=34, y=2;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dz])=>{ for(let j=-1;j<=1;j++){ const px=cx+dx*3.2+(dz?j*1.9:0), pz=cz+dz*3.2+(dx?j*1.9:0);
      const L=dx?3:1.3, W=dx?1.3:3; B.bx(px-L/2,px+L/2,y+1.3,y+3,pz-W/2,pz+W/2,'bronze','s_sea');
      [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([a,b])=>B.bx(px+a*(L/2-.3)-.2,px+a*(L/2-.3)+.2,y,y+1.3,pz+b*(W/2-.3)-.2,pz+b*(W/2-.3)+.2,'bronze','s_sea'));
      B.bx(px+dx*(L/2)-.1+dx*.45,px+dx*(L/2)+.1+dx*.45+(dz?.4:0),y+2.4,y+3.4,pz+dz*(W/2)+dz*.45-.4,pz+dz*(W/2)+dz*.45+.4,'bronze','s_sea'); } });
    const bs=lathe([[.01,0],[2.5,.05],[3.9,.8],[4.6,2.2],[4.9,3.6],[5.1,4.6],[5.5,5]],36); bs.translate(cx,y+3.1,cz); B.add(bs,'bronze2','s_sea');
    const rim=new THREE.TorusGeometry(5.45,.16,6,40); rim.rotateX(Math.PI/2); rim.translate(cx,y+8.1,cz); B.add(rim,'bronze','s_sea');
    for(let i=0;i<40;i++){ const a=i/40*Math.PI*2; [5.2,6.3].forEach(yy=>{ const g=new THREE.SphereGeometry(.2,5,4); g.translate(cx+Math.cos(a)*(yy<6?4.75:4.95),y+yy,cz+Math.sin(a)*(yy<6?4.75:4.95)); B.add(g,'bronze','s_sea'); }); }
    const w=new THREE.CircleGeometry(4.95,36); w.rotateX(-Math.PI/2); w.translate(cx,y+7.6,cz); B.add(w,'water','s_sea',{ns:true}); }
  // ── 받침 수레 열 개 ──
  [-1,1].forEach(s=>{ for(let i=0;i<5;i++){ const x=-44+i*12, z=s*29, y=2;
    B.bx(x-2,x+2,y+.8,y+3.4,z-2,z+2,'bronze','s_carts'); B.bx(x-2.1,x+2.1,y+3.2,y+3.5,z-2.1,z+2.1,'bronze','s_carts');
    [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([a,b])=>{ const wl=new THREE.CylinderGeometry(.75,.75,.25,14); wl.rotateX(Math.PI/2); wl.translate(x+a*1.3,y+.75,z+b*2.15); B.add(wl,'bronze','s_carts'); });
    const bs=lathe([[.01,0],[1,.05],[1.7,.5],[2,1.4]],20); bs.translate(x,y+3.5,z); B.add(bs,'bronze2','s_carts'); } });
  // ── 사람들 ──
  for(let i=0;i<16;i++){ const a=R()*Math.PI*2, r=12+R()*5; const x=60+Math.cos(a)*r, z=Math.sin(a)*r; if(z>8&&x>55&&x<65) continue; person(B,x,2,z,'linen','linen',R); }
  for(let i=0;i<8;i++) person(B,34+R()*14,2,26+R()*16,'linen','linen',R);
  for(let r=0;r<3;r++) for(let i=0;i<10;i++) person(B,74+r*3,2,-38+i*2.6,'linen','linen',R);
  crowd(B,R,170,118,226,-116,116,0,ROBES,[...ROBES,'linen']);
  crowd(B,R,80,-100,108,-116,-66,0,ROBES,[...ROBES,'linen']); crowd(B,R,80,-100,108,66,116,0,ROBES,[...ROBES,'linen']);
  // ── 예루살렘 ──
  city(B,R,hfn,520,-260,220,170,720,(x,z)=>hfn(x,z)>-80);
  city(B,R,hfn,420,-760,-170,-420,520,(x,z)=>Math.abs(x+260)>60);
  trees(B,R,hfn,420,470,1150,-650,650,null,'olive');
  trees(B,R,hfn,60,-150,260,-380,-160,null,'cypress');
  // ── 이름표 · 시점 ──
  const L=[
    {k:'s_outer',p:[175,1,-70],o:1,f:1}, {k:'s_inner',p:[92,3,-44],o:1,f:1}, {k:'s_gate',p:[231,18,0],o:1,f:1},
    {k:'s_altar',p:[60,15,0],o:1,f:1}, {k:'s_sea',p:[38,11,34],o:1,f:1}, {k:'s_carts',p:[-16,7,29],o:1,f:1},
    {k:'s_pillars',t:'보아스',p:[26.5,30,-7],o:0,f:1}, {k:'s_pillars',t:'야긴',p:[26.5,30,7],o:0,f:1}, {k:'s_pillars',p:[26.5,30,7],o:1,f:0},
    {k:'s_porch',p:[17.5,50,0],o:1,f:1}, {k:'s_house',p:[-20,39,0],o:1,f:0}, {k:'s_side',p:[-25,26,-18],o:1,f:1},
    {k:'s_holy',p:[-10,37.5,0],o:1,f:0}, {k:'s_mhk',p:[-42,39,0],o:1,f:0},
    {k:'s_lamps',p:[-10,10,-6.3],room:1,f:1}, {k:'s_tables',p:[-13.5,8.3,8.4],room:1,f:1}, {k:'s_incense',p:[-27,8.8,0],room:1,f:1},
    {k:'s_doors',p:[-31,15.5,0],room:1,f:1}, {k:'s_cherubim',p:[-45,17,-5],room:1,f:1}, {k:'s_ark',p:[-42,8.6,0],room:1,f:1},
  ];
  const V=[
    {id:'outer',k:'s_outer',name:'큰 뜰',pos:[185,0,26],look:[20,22,0]},
    {id:'inner',k:'s_inner',name:'안뜰',pos:[98,2,-12],look:[18,19,6]},
    {id:'porch',k:'s_pillars',name:'야긴과 보아스 앞',pos:[42,2,0],look:[24,22,0]},
    {id:'holy',k:'s_holy',name:'성소 안',pos:[8,6.05,0],look:[-40,10,0]},
    {id:'mhk',k:'s_mhk',name:'지성소 안',pos:[-32.6,6.05,3],look:[-46,11.5,-1]},
  ];
  return {labels:L,vps:V,center:[40,12,0],radius:270,orbit:{th:.95,ph:1.0,d:430},focus:[15,26,0],inside:['s_holy','s_mhk'],hfn};
}

// ══════════════════════ 헤롯 성전 ══════════════════════
function buildHerod(ctx){
  const {B,R,FX,root}=ctx;
  const base=(x,z)=>{ let h=20*(fbm(x*.0026+7,z*.0026+2)-.5)*2;
    h+= -20 + 30*sstep(-150,-600,x);                        // 서쪽 윗도시는 높다
    h-= 95*Math.exp(-1*((x-420)/95)**2);                       // 기드론
    h+= 115*Math.exp(-1*((x-830)/280)**2)*sstep(300,560,x);     // 감람산
    h-= 45*Math.exp(-1*((x+240)/60)**2)*sstep(-100,250,z);      // 두로베온 골짜기
    h-= .1*Math.max(0,z-340);                                // 남쪽 오벨·다윗 성
    h+= 12*sstep(-300,-700,z);                               // 북쪽 베데스다 언덕
    return h; };
  const hfn=flatten(base,[-205,305,-335,345],-46,90);
  terrain(root,hfn);
  // ── 성전산 기단 ──
  B.bx(-200,300,-62,-.5,-260,300,'stoneH',null);
  B.bx(-200,300,-.5,0,-260,300,'pave','h_gentiles',{walk:true});
  // 주랑
  portico(B,{x0:-200,x1:300,z0:258,z1:300,open:'z-',h:30,rows:4,sp:9,r:1.1,k:'h_royal'});
  B.bx(-200,300,32.6,46,268,286,'stoneW','h_royal'); B.bx(-201,301,46,47.5,267,287,'roofT','h_royal');
  for(let x=-196;x<300;x+=12) B.bx(x,x+3,36,42,267.9,268,'dark',null,{ns:true});
  portico(B,{x0:270,x1:300,z0:-235,z1:258,open:'x-',h:24,rows:2,sp:8,r:1,k:'h_solomon'});
  portico(B,{x0:-170,x1:270,z0:-260,z1:-235,open:'z+',h:24,rows:2,sp:8,r:1});
  portico(B,{x0:-200,x1:-170,z0:-260,z1:258,open:'x+',h:24,rows:2,sp:8,r:1});
  B.bx(283,300,0,70,283,300,'stoneW','h_pinnacle'); B.bx(282,301,70,72,282,301,'stoneW','h_pinnacle');
  // 안토니아 요새
  B.bx(-200,-95,-50,38,-332,-262,'stoneH','h_antonia');
  [[-200,-332],[-109,-332],[-200,-276]].forEach(([x,z])=>B.bx(x,x+14,-50,54,z,z+14,'stoneH','h_antonia'));
  B.bx(-109,-95,-50,72,-276,-262,'stoneH','h_antonia');
  for(let x=-196;x<-95;x+=6) B.bx(x,x+3,38,40.5,-332,-330,'stoneH','h_antonia');
  // 훌다 문 · 남쪽 계단
  B.bx(-60,-40,-46,-34,300,300.3,'dark','h_hulda',{ns:true}); B.bx(40,72,-46,-34,300,300.3,'dark','h_hulda',{ns:true});
  B.bx(-120,130,-52,-46,300,345,'pave','h_hulda');
  stairs(B,'z',300,1,-110,110,12,.7,2.2,-37.6,'stoneH','h_hulda');
  // ── 헬 · 소렉 ──
  B.bx(-135,221,0,1,-85,85,'paveW','h_soreg',{walk:true});
  const sx0=-142,sx1=228,sz0=-92,sz1=92, gapsX=[[-65,-55],[15,25],[115,125],[175,185]], gapsZ=[[-8,8]];
  const fenceX=(z)=>{ let c=sx0; const run=(a,b)=>{ for(let x=a;x<=b;x+=1.6) B.bx(x-.12,x+.12,0,2.1,z-.12,z+.12,'stoneW','h_soreg'); B.bx(a,b,1.9,2.2,z-.2,z+.2,'stoneW','h_soreg'); B.bx(a,b,.9,1.1,z-.15,z+.15,'stoneW','h_soreg'); };
    gapsX.forEach(([a,b])=>{ run(c,a); c=b; }); run(c,sx1); };
  const fenceZ=(x,gaps)=>{ let c=sz0; const run=(a,b)=>{ for(let z=a;z<=b;z+=1.6) B.bx(x-.12,x+.12,0,2.1,z-.12,z+.12,'stoneW','h_soreg'); B.bx(x-.2,x+.2,1.9,2.2,a,b,'stoneW','h_soreg'); B.bx(x-.15,x+.15,.9,1.1,a,b,'stoneW','h_soreg'); };
    gaps.forEach(([a,b])=>{ run(c,a); c=b; }); run(c,sz1); };
  fenceX(sz0); fenceX(sz1); fenceZ(sx0,[]); fenceZ(sx1,gapsZ);
  [[-10.6,-8.6],[8.6,10.6]].forEach(([a,b])=>B.bx(sx1-.4,sx1+.4,0,3.4,a,b,'inscr','h_soreg'));
  // ── 여인의 뜰 ──
  B.bx(67,207,1,6,-67,67,'paveW','h_women',{walk:true});
  wallX(B,67,207,-64.5,5,1,31,'stoneW','h_women',[[128,146,20]]); wallX(B,67,207,64.5,5,1,31,'stoneW','h_women',[[128,146,20]]);
  wallZ(B,-67,67,204.5,5,1,31,'stoneW','h_women',[[-7,7,null]]);
  // 미문
  B.bx(200,212,1,38,-16,-7,'stoneW','h_beautiful'); B.bx(200,212,1,38,7,16,'stoneW','h_beautiful'); B.bx(200,212,24,38,-7,7,'stoneW','h_beautiful');
  B.bx(199,213,38,39.5,-17,17,'stoneW','h_beautiful');
  B.bx(192,200,6,24,-7,-6.6,'bronzeC','h_beautiful'); B.bx(192,200,6,24,6.6,7,'bronzeC','h_beautiful');
  B.bx(200,212,1,6,-7,7,'paveW','h_beautiful',{walk:true}); stairs(B,'x',212,1,-12,12,10,.5,.9,6,'paveW','h_beautiful',{walk:true});
  // 네 모퉁이 방
  [[72,110],[164,202]].forEach(([a,b])=>[[-62,-24],[24,62]].forEach(([c,d])=>{ const t=1.2, y0=6, y1=18, door=[[ (c+d)/2-4,(c+d)/2+4,10 ]];
    wallX(B,a,b,c+t/2,t,y0,y1,'stoneW','h_women'); wallX(B,a,b,d-t/2,t,y0,y1,'stoneW','h_women');
    wallZ(B,c,d,a+t/2,t,y0,y1,'stoneW','h_women',a>100?door:[]); wallZ(B,c,d,b-t/2,t,y0,y1,'stoneW','h_women',a<100?door:[]); }));
  [-1,1].forEach(s=>portico(B,{x0:110,x1:164,z0:s<0?-62:54,z1:s<0?-54:62,open:s<0?'z+':'z-',h:12,y:6,rows:1,sp:6,r:.6,k:'h_women',back:false}));
  [-1,1].forEach(s=>{ for(let i=0;i<(s<0?7:6);i++){ const x=115+i*7.5, z=s*51.5; B.bx(x-.8,x+.8,6,6.6,z-.8,z+.8,'bronze','h_treasury');
    const c=new THREE.ConeGeometry(.75,2.4,10); c.translate(x,6.6+1.2,z); B.add(c,'bronze','h_treasury'); } });
  [[118,-32],[156,-32],[118,32],[156,32]].forEach(([x,z])=>{ B.cyl(x,6,z,.9,50,'gold','h_lamps4',10); B.bx(x-4,x+4,55.2,55.8,z-.4,z+.4,'gold','h_lamps4'); B.bx(x-.4,x+.4,55.2,55.8,z-4,z+4,'gold','h_lamps4');
    [[3.5,0],[-3.5,0],[0,3.5],[0,-3.5]].forEach(([a,b])=>{ const bw=lathe([[.01,0],[.8,.1],[1.3,.8]],12); bw.translate(x+a,55.8,z+b); B.add(bw,'bronze2','h_lamps4'); }); });
  // ── 니가노르 문 · 열다섯 계단 ──
  B.bx(58,70,6,52,-18,-6,'stoneW','h_nicanor'); B.bx(58,70,6,52,6,18,'stoneW','h_nicanor'); B.bx(58,70,33.5,52,-6,6,'stoneW','h_nicanor');
  B.bx(57,71,52,54,-19,19,'stoneW','h_nicanor');
  B.bx(52,58,13.5,33.5,-6,-5.6,'bronzeC','h_nicanor'); B.bx(52,58,13.5,33.5,5.6,6,'bronzeC','h_nicanor');
  B.bx(58,70,6,13.5,-6,6,'paveW','h_nicanor',{walk:true});
  for(let i=0;i<14;i++){ const top=13.5-.5*(i+1), r=12+i; const g=new THREE.CylinderGeometry(r,r,top-6,48,1,false,0,Math.PI); g.translate(70,6+(top-6)/2,0); B.add(g,'paveW','h_nicanor',{walk:true}); }
  // ── 성전 안뜰 (아자라) ──
  B.bx(-125,67,1,13.5,-67,67,'stoneW',null);
  B.bx(51,62,13.45,13.5,-62,62,'paveW','h_israel',{walk:true});
  B.bx(50.2,51,13.5,14,-60,60,'paveW','h_israel',{walk:true});
  B.bx(49,50.2,13.5,14.5,-60,60,'paveW','h_priests',{walk:true});
  B.bx(-120,49,13.5,14.5,-62,62,'paveW','h_priests',{walk:true});
  wallX(B,-125,62,-64.5,5,1,45,'stoneW',null); wallX(B,-125,62,64.5,5,1,45,'stoneW',null); wallZ(B,-67,67,-122.5,5,1,45,'stoneW',null);
  wallZ(B,-67,67,64.5,5,13.5,40,'stoneW',null,[[-6,6,null]]);
  [-70,-20,30].forEach(x=>[-1,1].forEach(s=>{ B.bx(x-9,x+9,1,50,s>0?62:-75,s>0?75:-62,'stoneW',null); B.bx(x-9.5,x+9.5,50,51.5,s>0?61.5:-75.5,s>0?75.5:-61.5,'stoneW',null);
    B.bx(x-4,x+4,1,20,s>0?75:-75.1,s>0?75.1:-75,'dark',null,{ns:true}); }));
  [-1,1].forEach(s=>{ B.bx(-115,40,13.5,26,s>0?55:-62,s>0?62:-55,'stoneW',null); for(let x=-110;x<38;x+=14) B.bx(x,x+3,14.5,20,s>0?54.95:-55,s>0?55:-54.95,'dark',null,{ns:true}); });
  // ── 성전 기단 · 현관 ──
  B.bx(-111,-16,14.5,20.5,-50,50,'stoneW','h_house');
  stairs(B,'x',-16,1,-30,30,12,.5,.667,20.5,'paveW','h_porch',{walk:true});
  B.bx(-27,-18,20.5,20.55,-46,46,'paveW','h_porch',{walk:true});
  wallZ(B,-50,50,-17,2,20.5,120.5,'stoneW','h_porch',[[-10,10,40]]);
  B.bx(-27,-18,20.5,120.5,-50,-48,'stoneW','h_porch'); B.bx(-27,-18,20.5,120.5,48,50,'stoneW','h_porch');
  B.bx(-28,-15,118.5,121,-51,51,'stoneW','h_porch');
  wallZ(B,-50,50,-30,6,20.5,110.5,'stoneW','h_house',[[-5,5,20]]);
  [-34,-22,22,34].forEach(z=>{ B.cyl(-15.2,20.5,z,1.6,78,'stoneW','h_porch',16); B.bx(-17.2,-13.3,98.5,101,z-2.2,z+2.2,'gold','h_porch'); B.bx(-17,-13.4,20.5,22,z-2,z+2,'stoneW','h_porch'); });
  B.bx(-16,-15.3,101,103.5,-50,50,'gold','h_porch'); B.bx(-16.5,-15,112,113.2,-50.5,50.5,'gold','h_porch');
  B.bx(-16,-15.6,20.5,62.5,-12.5,-10,'gold','h_porch'); B.bx(-16,-15.6,20.5,62.5,10,12.5,'gold','h_porch'); B.bx(-16,-15.6,60.5,63,-12.5,12.5,'gold','h_porch');
  for(let z=-50;z<=50;z+=2.5){ const c=new THREE.ConeGeometry(.22,2,5); c.translate(-15.5,122,z); B.add(c,'gold',null); }
  for(let x=-110;x<=-28;x+=3){ [-35.5,35.5].forEach(z=>{ const c=new THREE.ConeGeometry(.22,2,5); c.translate(x,113,z); B.add(c,'gold',null); }); }
  // 금 포도나무
  B.bx(-27.3,-27,44,58,-12,12,'gold','h_porch');
  for(let i=0;i<70;i++){ const g=new THREE.SphereGeometry(.55+R()*.35,6,5); g.translate(-27.6,44+R()*14,-12+R()*24); B.add(g,'gold','h_porch'); }
  B.bx(-27,-22,20.5,40.5,-5.2,-5,'gold','h_house'); B.bx(-27,-22,20.5,40.5,5,5.2,'gold','h_house');
  // ── 본채 ──
  B.bx(-111,-33,20.5,110.5,-35,-10,'stoneW','h_house'); B.bx(-111,-33,20.5,110.5,10,35,'stoneW','h_house');
  B.bx(-111,-94,20.5,110.5,-10,10,'stoneW','h_house'); B.bx(-94,-33,60.5,110.5,-10,10,'stoneW','h_house');
  B.bx(-112,-27,110.5,112,-36,36,'stoneW','h_house');
  for(let x=-104;x<-36;x+=9) [72,92].forEach(y=>{ B.bx(x,x+2,y,y+8,-35.08,-35,'dark',null,{ns:true}); B.bx(x,x+2,y,y+8,35,35.08,'dark',null,{ns:true}); });
  // 성소 내부
  B.bx(-73,-33,20.5,60.3,-10,-9.85,'goldCarved','h_holy'); B.bx(-73,-33,20.5,60.3,9.85,10,'goldCarved','h_holy');
  wallZ(B,-10,10,-33.07,.14,20.5,60.3,'goldCarved','h_holy',[[-5,5,20]]);
  B.bx(-73,-33,60.3,60.5,-10,10,'cedar','h_holy'); B.bx(-73,-33,20.5,20.55,-10,10,'paveW','h_holy',{walk:true});
  [-73.25,-73.8].forEach(x=>{ const v=new THREE.PlaneGeometry(20,39.8); v.rotateY(Math.PI/2); v.translate(x,40.45,0); B.add(v,'veilH','h_veil',{ns:true}); });
  B.bx(-94,-74,20.5,60.3,-10,-9.85,'goldCarved','h_mhk'); B.bx(-94,-74,20.5,60.3,9.85,10,'goldCarved','h_mhk');
  B.bx(-94,-93.85,20.5,60.3,-10,10,'goldCarved','h_mhk'); B.bx(-94,-74,60.3,60.5,-10,10,'goldCarved','h_mhk');
  B.bx(-94,-74,20.5,20.55,-10,10,'paveW','h_mhk',{walk:true});
  { const g=new THREE.IcosahedronGeometry(1.9,0); g.scale(1.4,.35,1); g.translate(-84,20.7,0); B.add(g,'rock','h_mhk'); }
  menorah(B,-50,20.55,7.5,1.4,'h_lamp',FX); showTable(B,-50,20.55,-7.5,'h_table'); incenseAltar(B,-66,20.55,0,'h_incense',FX);
  { const l=new THREE.PointLight(0xffc27a,110,46,1.4); l.position.set(-52,30,2); root.add(l); }
  { const l=new THREE.PointLight(0xd8c8ff,20,24,1.4); l.position.set(-84,32,0); root.add(l); }
  // ── 번제단 ──
  B.bx(6,38,14.5,15.5,-16,16,'stoneW','h_altar'); B.bx(7,37,15.5,20.5,-15,15,'stoneW','h_altar');
  B.bx(6.95,37.05,18.6,18.95,-15.05,15.05,'red','h_altar'); B.bx(8,36,20.5,23.5,-14,14,'stoneW','h_altar');
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([a,b])=>B.bx(22+a*13.4-.6,22+a*13.4+.6,23.5,24.7,b*13.4-.6,b*13.4+.6,'stoneW','h_altar'));
  B.bx(12,32,23.5,23.6,-10,10,'ash','h_altar');
  for(let i=0;i<12;i++){ const l=new THREE.CylinderGeometry(.4,.4,7,6); l.rotateZ(Math.PI/2); l.rotateY(R()*3); l.translate(22+(R()-.5)*8,24+(i%3)*.55,(R()-.5)*8); B.add(l,'cedar','h_altar'); }
  B.add(prismX([[16,14.5],[48,14.5],[16,23.5]],14,30),'stoneW','h_altar');
  FX.fire(22,23.7,0,2.4); FX.fire(16,23.7,-6,1.2);
  // 물두멍
  B.cyl(-3,14.5,20,1.2,3.4,'bronze','h_laver',14); { const b=lathe([[.01,0],[1.8,.1],[2.8,.9],[3.2,2]],24); b.translate(-3,17.9,20); B.add(b,'bronze2','h_laver'); }
  for(let i=0;i<12;i++){ const a=i/12*Math.PI*2; const g=new THREE.CylinderGeometry(.1,.1,.8,5); g.rotateZ(Math.PI/2); g.rotateY(-a); g.translate(-3+Math.cos(a)*2.6,18.3,20+Math.sin(a)*2.6); B.add(g,'bronze','h_laver'); }
  // 도살장
  for(let i=0;i<4;i++) for(let j=0;j<6;j++){ const t=new THREE.TorusGeometry(.4,.09,5,10); t.rotateX(Math.PI/2); t.translate(9+j*5,14.55,-48+i*5); B.add(t,'bronze','h_slaughter'); }
  [[10,-28],[18,-28],[26,-28],[34,-28]].forEach(([x,z])=>{ B.bx(x-.5,x+.5,14.5,21,z-.5,z+.5,'stoneW','h_slaughter'); B.bx(x-2.5,x+2.5,21,21.6,z-.4,z+.4,'cedar','h_slaughter');
    [-1.8,0,1.8].forEach(d=>B.bx(x+d-.08,x+d+.08,19.6,21,z-.08,z+.08,'bronze','h_slaughter')); });
  for(let i=0;i<8;i++){ const x=8+i*4; B.bx(x-1.2,x+1.2,14.5,16,-21.5,-20,'stoneW','h_slaughter'); }
  // ── 사람들 ──
  for(let i=0;i<26;i++){ const a=R()*Math.PI*2, r=19+R()*6, x=22+Math.cos(a)*r, z=Math.sin(a)*r; if(z>14&&x>12&&x<32) continue; person(B,x,14.5,z,'linen','linen',R); }
  for(let i=0;i<6;i++){ const z=19+i*4.8; person(B,17+R()*10,23.5-(z-16)*9/32,z,'linen','linen',R); }
  for(let i=0;i<8;i++) person(B,6+R()*30,14.5,-30-R()*18,'linen','linen',R);
  for(let i=0;i<20;i++) person(B,49.6,14.5,(i<10?-40:12)+(i%10)*2.9,'linen','linen',R);
  crowd(B,R,32,52,61,-58,58,13.5,ROBES,[...ROBES,'linen'],(x,z)=>Math.abs(z-31)<7);
  crowd(B,R,95,74,198,-60,60,6,ROBES,[...ROBES,'linen'],(x,z)=>(x<112&&Math.abs(z)>22)||(x>162&&Math.abs(z)>22)||(x<98&&Math.abs(z)<26)||(x>174&&Math.abs(z-8)<10));
  crowd(B,R,330,-195,268,-232,256,0,ROBES,[...ROBES,'linen'],(x,z)=>x>-148&&x<234&&z>-98&&z<98);
  crowd(B,R,60,-190,265,262,294,0,ROBES,[...ROBES,'linen']);
  for(let i=0;i<14;i++){ const x=-150+i*28; B.bx(x-2,x+2,0,1.6,244,246.5,'cedar','h_royal'); }
  for(let i=0;i<46;i++){ const x=-160+R()*80, z=230+R()*22; B.bx(x-.6,x+.6,.35,1.25,z-.35,z+.35,'wool','h_royal'); B.bx(x+.5,x+.95,.9,1.4,z-.2,z+.2,'wool','h_royal'); }
  for(let i=0;i<10;i++){ const x=-40+R()*40, z=232+R()*18; B.bx(x-1.2,x+1.2,.9,2.4,z-.55,z+.55,'cattle','h_royal'); }
  // ── 예루살렘 ──
  city(B,R,hfn,700,-980,-240,-620,820);
  city(B,R,hfn,520,-420,260,360,1000,(x,z)=>hfn(x,z)>-150);
  city(B,R,hfn,260,-520,220,-900,-370);
  trees(B,R,hfn,520,500,1250,-700,700,null,'olive');
  trees(B,R,hfn,80,-240,-210,-300,300,null,'cypress');
  const L=[
    {k:'h_gentiles',p:[150,1,-150],o:1,f:1}, {k:'h_royal',p:[40,49,280],o:1,f:1}, {k:'h_solomon',p:[285,28,-110],o:1,f:1},
    {k:'h_pinnacle',p:[291.5,73,291.5],o:1,f:1}, {k:'h_antonia',p:[-150,58,-298],o:1,f:1}, {k:'h_hulda',p:[5,-30,303],o:1,f:0},
    {k:'h_soreg',p:[228,4,-40],o:1,f:1}, {k:'h_beautiful',p:[206,41,0],o:1,f:1}, {k:'h_women',p:[135,8,-36],o:1,f:1},
    {k:'h_treasury',p:[137,10,-51.5],o:0,f:1}, {k:'h_lamps4',p:[137,58,32],o:1,f:1}, {k:'h_nicanor',p:[64,56,0],o:1,f:1},
    {k:'h_israel',p:[56,16,44],o:1,f:1}, {k:'h_priests',p:[-4,16,-44],o:1,f:1}, {k:'h_altar',p:[22,27,0],o:1,f:1},
    {k:'h_laver',p:[-3,21.5,20],o:0,f:1}, {k:'h_slaughter',p:[22,22.5,-28],o:0,f:1},
    {k:'h_porch',p:[-17,124,0],o:1,f:1}, {k:'h_porch',t:'금 포도나무',p:[-27.4,59,0],o:0,f:1}, {k:'h_house',p:[-70,114,0],o:1,f:0},
    {k:'h_lamp',p:[-50,26,7.5],room:1,f:1}, {k:'h_table',p:[-50,23.5,-7.5],room:1,f:1}, {k:'h_incense',p:[-66,23.6,0],room:1,f:1},
    {k:'h_veil',p:[-73.5,46,0],room:1,f:1}, {k:'h_mhk',p:[-84,24,0],room:1,f:1},
  ];
  const V=[
    {id:'gentiles',k:'h_gentiles',name:'이방인의 뜰',pos:[252,0,118],look:[-20,55,0]},
    {id:'solomon',k:'h_solomon',name:'솔로몬 행각',pos:[277,0,-60],look:[100,30,-10]},
    {id:'women',k:'h_women',name:'여인의 뜰',pos:[186,6,8],look:[58,38,0]},
    {id:'israel',k:'h_israel',name:'이스라엘의 뜰',pos:[61,13.5,31],look:[-8,40,-4]},
    {id:'priests',k:'h_priests',name:'제사장의 뜰',pos:[-6,14.5,38],look:[-20,64,0]},
    {id:'holy',k:'h_holy',name:'성소 안',pos:[-37,20.55,0],look:[-80,32,0]},
    {id:'pinnacle',k:'h_pinnacle',name:'성전 꼭대기',pos:[292,72,292],look:[430,-40,250]},
  ];
  return {labels:L,vps:V,center:[40,20,0],radius:390,orbit:{th:.9,ph:.95,d:720},focus:[-20,70,0],inside:['h_holy','h_mhk'],hfn};
}

// ══════════════════════ 에스겔 성전 ══════════════════════
function buildEzekiel(ctx){
  const {B,R,FX,root}=ctx;
  const riverZ=x=>18+Math.max(0,x-260)*.03;
  const base=(x,z)=>{ const r=Math.hypot(x,z);
    let h=-3.5-300*sstep(330,1500,r)+26*(fbm(x*.003+11,z*.003)-.5)*2*sstep(300,700,r);
    h+=230*sstep(1900,3000,r)*(.55+fbm(x*.0012,z*.0012,3));
    const w=16+Math.max(0,x-250)*.06; h-=16*Math.exp(-1*((z-riverZ(x))/w)**2)*sstep(250,330,x);
    return h; };
  const hfn=flatten(base,[-275,275,-275,275],-3.5,60);
  terrain(root,hfn);
  // ── 바깥뜰 ──
  B.bx(-250,250,-3.5,-.05,-250,250,'stoneDk',null);
  B.bx(-200,200,-.05,0,-200,200,'paveW','e_oc',{walk:true});
  B.bx(-244,244,-.05,0,-244,-200,'paveDk','e_p',{walk:true}); B.bx(-244,244,-.05,0,200,244,'paveDk','e_p',{walk:true});
  B.bx(-244,-200,-.05,0,-200,200,'paveDk','e_p',{walk:true}); B.bx(200,244,-.05,0,-200,200,'paveDk','e_p',{walk:true});
  wallX(B,-250,250,-247,6,-3.5,6,'stone','e_ow',[[-12.5,12.5,null]]); wallX(B,-250,250,247,6,-3.5,6,'stone','e_ow',[[-12.5,12.5,null]]);
  wallZ(B,-244,244,247,6,-3.5,6,'stone','e_ow',[[-12.5,12.5,null]]); wallZ(B,-244,244,-247,6,-3.5,6,'stone','e_ow');
  // 문 (길이 50 · 너비 25 · 문통 10 · 문간 방 셋씩)
  const gate=(o)=>{ const {orient,edge,center,k,yIn,yOut,nSteps,porch,closed}=o;
    const W=(u0,u1,y0,y1,v0,v1,m,kk,fl)=>{ let x0,x1,z0,z1;
      if(orient==='E'){ x0=edge-u1; x1=edge-u0; z0=center+v0; z1=center+v1; }
      else if(orient==='W'){ x0=edge+u0; x1=edge+u1; z0=center+v0; z1=center+v1; }
      else if(orient==='N'){ z0=edge+u0; z1=edge+u1; x0=center+v0; x1=center+v1; }
      else { z0=edge-u1; z1=edge-u0; x0=center+v0; x1=center+v1; }
      B.bx(x0,x1,y0,y1,z0,z1,m,kk??k,fl); };
    const H=yIn+18;
    W(0,50,yIn,H,-12.5,-5,'stone'); W(0,50,yIn,H,5,12.5,'stone'); W(0,50,H,H+1.5,-13,13,'stone');
    W(0,50,yIn-.05,yIn,-5,5,'paveW',null,{walk:true});
    W(0,50,yOut,yIn-.05,-12.5,12.5,'stoneDk');
    [[3,9],[14,20],[25,31]].forEach(([a,b])=>{ W(a,b,yIn+.5,yIn+8,-5.06,-5,'dark',null,{ns:true}); W(a,b,yIn+.5,yIn+8,5,5.06,'dark',null,{ns:true});
      W(a+2,b-2,yIn+10,yIn+12,-12.56,-12.5,'dark',null,{ns:true}); W(a+2,b-2,yIn+10,yIn+12,12.5,12.56,'dark',null,{ns:true}); });
    const pu = porch==='in'?[42,50]:[0,8];
    W(pu[0],pu[1],yIn,yIn+30,-13.5,-8,'stone'); W(pu[0],pu[1],yIn,yIn+30,8,13.5,'stone'); W(pu[0],pu[1],yIn+24,yIn+30,-8,8,'stone');
    W(pu[0]-.5,pu[1]+.5,yIn+30,yIn+31.2,-14,14,'stone');
    [[-12.8,-8.7],[8.7,12.8]].forEach(([a,b])=>{ const f=porch==='in'?pu[1]:pu[0]; W(f-(porch==='in'?0:.12),f+(porch==='in'?.12:0),yIn+3,yIn+20,a,b,'goldCarved'); });
    const sDir = 1; for(let i=1;i<=nSteps;i++){ const top=yIn-i*((yIn-yOut)/nSteps); if(top<=yOut+1e-3) break; W(-(i)*1.1,-(i-1)*1.1,yOut,top,-6,6,'stoneDk',null,{walk:true}); }
    W(-nSteps*1.1,0,yOut-.02,yOut,-6,6,'stoneDk',null,{walk:true});
    if(closed){ W(-.2,.9,yIn,yIn+15,-5,5,'bronzeC'); }
  };
  gate({orient:'E',edge:250,center:0,k:'e_g1',yIn:0,yOut:-3.5,nSteps:7,porch:'in',closed:true});
  gate({orient:'N',edge:-250,center:0,k:'e_g2',yIn:0,yOut:-3.5,nSteps:7,porch:'in'});
  gate({orient:'S',edge:250,center:0,k:'e_g3',yIn:0,yOut:-3.5,nSteps:7,porch:'in'});
  // 바깥뜰의 방 30개
  const room=(x0,x1,z0,z1,door)=>{ B.bx(x0,x1,0,11,z0,z1,'stone','e_c'); B.bx(x0-.4,x1+.4,11,12,z0-.4,z1+.4,'stone','e_c');
    const [dx,dz]=door; const cx=(x0+x1)/2, cz=(z0+z1)/2;
    if(dx) B.bx(dx>0?x1:x0-.06,dx>0?x1+.06:x0,0,6,cz-2,cz+2,'dark',null,{ns:true}); else B.bx(cx-2,cx+2,0,6,dz>0?z1:z0-.06,dz>0?z1+.06:z0,'dark',null,{ns:true}); };
  for(let i=0;i<5;i++){ const a=-195+i*30;
    room(228,244,a,a+25,[-1,0]); room(228,244,-a-25,-a,[-1,0]);
    room(a,a+25,-244,-228,[0,1]); room(-a-25,-a,-244,-228,[0,1]);
    room(a,a+25,228,244,[0,-1]); room(-a-25,-a,228,244,[0,-1]); }
  // 부엌 (네 모퉁이)
  [[204,244],[-244,-204]].forEach(([a,b])=>[[-244,-214],[214,244]].forEach(([c,d])=>{ const t=1.2;
    wallX(B,a,b,c+t/2,t,0,8,'stone','e_k'); wallX(B,a,b,d-t/2,t,0,8,'stone','e_k');
    wallZ(B,c,d,a+t/2,t,0,8,'stone','e_k',a>0?[[(c+d)/2-3,(c+d)/2+3,null]]:[]); wallZ(B,c,d,b-t/2,t,0,8,'stone','e_k',a<0?[[(c+d)/2-3,(c+d)/2+3,null]]:[]);
    for(let i=0;i<4;i++){ const x=a+6+i*8.5, z=c<0?c+4:d-4; B.bx(x-2,x+2,0,1.5,z-1.8,z+1.8,'stoneDk','e_k'); B.bx(x-1.2,x+1.2,1.5,1.55,z-1,z+1,'ash','e_k'); } }));
  // ── 안뜰 (8계단 위) ──
  B.bx(-50,50,0,4,-50,50,'paveW','e_ic',{walk:true});
  B.bx(-170,-50,0,4,-50,50,'paveW','e_cy',{walk:true});
  wallX(B,-172,52,-51,2,4,12,'stone','e_iw',[[-12.5,12.5,null]]); wallX(B,-172,52,51,2,4,12,'stone','e_iw',[[-12.5,12.5,null]]);
  wallZ(B,-50,50,51,2,4,12,'stone','e_iw',[[-12.5,12.5,null]]); wallZ(B,-50,50,-171,2,4,12,'stone','e_iw');
  wallX(B,-172,52,-51,2,0,4,'stone','e_iw'); wallX(B,-172,52,51,2,0,4,'stone','e_iw'); wallZ(B,-50,50,51,2,0,4,'stone','e_iw',[[-12.5,12.5,null]]); wallZ(B,-50,50,-171,2,0,4,'stone','e_iw');
  gate({orient:'E',edge:100,center:0,k:'e_g6',yIn:4,yOut:0,nSteps:8,porch:'out'});
  gate({orient:'N',edge:-100,center:0,k:'e_g4',yIn:4,yOut:0,nSteps:8,porch:'out'});
  gate({orient:'S',edge:100,center:0,k:'e_g5',yIn:4,yOut:0,nSteps:8,porch:'out'});
  [-1,1].forEach(s=>{ B.bx(20,34,4,14,s>0?40:-50,s>0?50:-40,'stone','e_sp'); B.bx(19.5,34.5,14,15,s>0?39.5:-50.5,s>0?50.5:-39.5,'stone','e_sp');
    B.bx(25,29,4,10,s>0?39.94:-40,s>0?40:-39.94,'dark',null,{ns:true}); });
  [-24,-20,-16,16,20,24].forEach(x=>[-106,-103].forEach(z=>{ B.bx(x-1,x+1,0,1.1,z-.75,z+.75,'stoneW','e_t'); B.bx(x-1.05,x+1.05,1.1,1.25,z-.8,z+.8,'bronze','e_t'); }));
  [-30,30].forEach(x=>{ B.bx(x-.75,x+.75,0,1,-104.75,-103.25,'stoneW','e_t'); B.bx(x-.75,x+.75,0,1,-108.75,-107.25,'stoneW','e_t'); });
  // 제단 (계단식, 동쪽 층계)
  B.bx(-9,9,4,5,-9,9,'stone','e_a'); B.bx(-8,8,5,7,-8,8,'stone','e_a'); B.bx(-7,7,7,11,-7,7,'stone','e_a'); B.bx(-6,6,11,15,-6,6,'stone','e_a');
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([a,b])=>B.bx(a*5.4-.6,a*5.4+.6,15,16.2,b*5.4-.6,b*5.4+.6,'stone','e_a'));
  B.bx(-5,5,15,15.08,-5,5,'ash','e_a'); stairs(B,'x',6,1,-3,3,22,.5,.9,15,'stone','e_a');
  FX.fire(0,15.1,0,1.8);
  // ── 성전 본채 ──
  B.bx(-148,-55,4,10,-25,25,'stoneDk','e_e');
  stairs(B,'x',-55,1,-10,10,12,.5,.66,10,'stoneDk','e_v',{walk:true});
  B.bx(-67,-55,10,45,-12,-10,'stone','e_v'); B.bx(-67,-55,10,45,10,12,'stone','e_v');
  wallZ(B,-12,12,-56,2,10,45,'stone','e_v',[[-7,7,28]]); B.bx(-68,-54,45,46.5,-13,13,'stone','e_v');
  B.bx(-67,-57,10,10.05,-10,10,'paveW','e_v',{walk:true});
  [-8,8].forEach(z=>{ B.cyl(-52.5,10,z,1.4,22,'stone','e_v',16); B.bx(-54.3,-50.7,32,33.5,z-1.8,z+1.8,'stone','e_v'); B.bx(-54,-51,10,10.8,z-1.6,z+1.6,'stone','e_v'); });
  B.bx(-139,-67,10,40,-16,-10,'stone','e_s'); B.bx(-139,-67,10,40,10,16,'stone','e_s');
  wallZ(B,-10,10,-70,6,10,40,'stone','e_s',[[-5,5,16]]);
  wallZ(B,-10,10,-114,2,10,40,'stone','e_h',[[-3,3,12]]); B.bx(-139,-133,10,40,-10,10,'stone','e_h');
  B.bx(-140,-66,40,41.5,-17,17,'stone','e_s');
  B.bx(-148,-67,10,30,-25,-16,'stone','e_sc'); B.bx(-148,-67,10,30,16,25,'stone','e_sc'); B.bx(-148,-139,10,30,-25,25,'stone','e_sc');
  B.bx(-149,-66,30,31,-26,-16,'stone','e_sc'); B.bx(-149,-66,30,31,16,26,'stone','e_sc'); B.bx(-149,-139,30,31,-26,26,'stone','e_sc');
  for(let x=-144;x<-70;x+=7) [13,19,25].forEach(y=>{ B.bx(x,x+1.2,y,y+2,-25.06,-25,'dark',null,{ns:true}); B.bx(x,x+1.2,y,y+2,25,25.06,'dark',null,{ns:true}); });
  // 성소 · 지성소 내부 (그룹과 종려나무를 새긴 나무판)
  B.bx(-113,-73,10,39.8,-10,-9.85,'woodCarved','e_s'); B.bx(-113,-73,10,39.8,9.85,10,'woodCarved','e_s');
  wallZ(B,-10,10,-73.07,.14,10,39.8,'woodCarved','e_s',[[-5,5,16]]); wallZ(B,-10,10,-112.93,.14,10,39.8,'woodCarved','e_s',[[-3,3,12]]);
  B.bx(-113,-73,39.8,40,-10,10,'cedar','e_s'); B.bx(-113,-73,10,10.05,-10,10,'cedar','e_s',{walk:true});
  B.bx(-133,-115,10,39.8,-10,-9.85,'woodCarved','e_h'); B.bx(-133,-115,10,39.8,9.85,10,'woodCarved','e_h'); B.bx(-133,-132.85,10,39.8,-10,10,'woodCarved','e_h');
  B.bx(-133,-115,39.8,40,-10,10,'cedar','e_h'); B.bx(-133,-115,10,10.05,-10,10,'cedar','e_h',{walk:true});
  B.bx(-78,-73,10,26,-5.2,-5,'woodCarved','e_s'); B.bx(-78,-73,10,26,5,5.2,'woodCarved','e_s');
  B.bx(-119,-115,10,22,-3.2,-3,'woodCarved','e_h'); B.bx(-119,-115,10,22,3,3.2,'woodCarved','e_h');
  B.bx(-109,-107,10.05,13.05,-1,1,'cedar','e_table'); B.bx(-109.2,-106.8,13,13.25,-1.2,1.2,'cedar','e_table');
  { const l=new THREE.PointLight(0xffe7b0,160,40,1.2); l.position.set(-124,24,0); root.add(l); }
  { const l=new THREE.PointLight(0xffd9a0,50,30,1.3); l.position.set(-95,24,0); root.add(l); }
  FX.glow(-124,25,0,26,0xfff0c0,.55); FX.glow(-110,60,0,120,0xffe9b0,.28);
  // 분리하는 뜰 · 서쪽 건물 · 제사장의 방 · 삶는 곳
  B.bx(-244,-170,0,22,-50,50,'stone','e_b'); B.bx(-245,-169,22,23.5,-51,51,'stone','e_b'); B.bx(-170.06,-170,0,9,-4,4,'dark',null,{ns:true});
  [-1,1].forEach(s=>{ const z0=s<0?-100:60, z1=s<0?-60:100, inner=s<0?z1:z0;
    B.bx(-160,-60,0,8,z0,z1,'stone','e_pc');
    B.bx(-160,-60,8,16,s<0?z0:z0+6,s<0?z1-6:z1,'stone','e_pc'); B.bx(-160,-60,16,24,s<0?z0:z0+12,s<0?z1-12:z1,'stone','e_pc');
    B.bx(-161,-59,24,25,s<0?z0-1:z0+11,s<0?z1-11:z1+1,'stone','e_pc');
    for(let x=-155;x<-62;x+=10) B.bx(x,x+3,0,5,s<0?inner:inner-.06,s<0?inner+.06:inner,'dark',null,{ns:true});
    const cz0=s<0?-90:55, cz1=s<0?-55:90; wallX(B,-244,-204,cz0,1.2,0,8,'stone','e_cp'); wallX(B,-244,-204,cz1,1.2,0,8,'stone','e_cp');
    wallZ(B,cz0,cz1,-204,1.2,0,8,'stone','e_cp',[[(cz0+cz1)/2-3,(cz0+cz1)/2+3,null]]);
    for(let i=0;i<3;i++) B.bx(-238+i*10,-234+i*10,0,1.4,(cz0+cz1)/2-2,(cz0+cz1)/2+2,'stoneDk','e_cp'); });
  // ── 성전에서 흐르는 강 ──
  { const pts=[]; const P=(x,z,y,w)=>pts.push({x,z,y,w});
    P(-55,6,10.1,2.2); P(-47,7,4.06,2.4); P(-9,11,4.06,2.6); P(40,12,4.06,2.8); P(51,13,4.06,3); P(56,14,.06,3.2); P(120,17,.06,3.4); P(244,19,.06,3.6); P(250,19,-.3,3.6); P(256,19,-3.4,3.8);
    for(let x=262;x<=1500;x+=12){ const z=riverZ(x); P(x,z,hfn(x,z)+.4,4+(x-262)*.045); }
    const pos=[],uv=[]; let acc=0;
    for(let i=0;i<pts.length;i++){ const p=pts[i], q=pts[Math.min(i+1,pts.length-1)], o=pts[Math.max(i-1,0)];
      let dx=q.x-o.x, dz=q.z-o.z; const l=Math.hypot(dx,dz)||1; dx/=l; dz/=l; const nx=-dz, nz=dx;
      if(i>0) acc+=Math.hypot(p.x-pts[i-1].x,p.z-pts[i-1].z);
      pos.push(p.x+nx*p.w,p.y,p.z+nz*p.w, p.x-nx*p.w,p.y,p.z-nz*p.w); uv.push(acc/10,0, acc/10,1); }
    const idx=[]; for(let i=0;i<pts.length-1;i++){ const a=i*2; idx.push(a,a+2,a+1, a+1,a+2,a+3); }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals();
    const tx=waterTex(); const mat=new THREE.MeshStandardMaterial({map:tx,color:0xbfe2f5,roughness:.12,metalness:.15,transparent:true,opacity:.9,side:THREE.DoubleSide});
    const m=new THREE.Mesh(g,mat); m.userData.k='e_river'; m.receiveShadow=true; root.add(m); ctx.extraPick.push(m); FX.flow.push(mat);
    for(let x=280;x<1400;x+=17){ const z=riverZ(x), w=4+(x-262)*.045+6; [-1,1].forEach(s=>{ const tz=z+s*(w+R()*8); olive(B,x+R()*6,hfn(x,tz),tz,R,'leaf2'); }); } }
  // ── 사람들 ──
  for(let i=0;i<14;i++){ const a=R()*Math.PI*2, r=12+R()*6, x=Math.cos(a)*r, z=Math.sin(a)*r; if(x>5&&Math.abs(z)<4) continue; person(B,x,4,z,'linen','linen',R); }
  crowd(B,R,150,-190,190,-190,190,0,ROBES,[...ROBES,'linen'],(x,z)=>(x>-175&&x<106&&Math.abs(z)<106)||(Math.abs(z)<16&&x>100));
  const L=[
    {k:'e_ow',p:[247,8,-130],o:1,f:1}, {k:'e_g1',p:[225,33,0],o:1,f:1}, {k:'e_g2',p:[0,33,-225],o:1,f:1}, {k:'e_g3',p:[0,33,225],o:1,f:1},
    {k:'e_g4',p:[0,37,-75],o:1,f:1}, {k:'e_g5',p:[0,37,75],o:1,f:1}, {k:'e_g6',p:[75,37,0],o:1,f:1},
    {k:'e_oc',p:[130,2,-120],o:1,f:1}, {k:'e_c',p:[236,14,-120],o:1,f:1}, {k:'e_p',p:[222,1,150],o:1,f:1}, {k:'e_k',p:[224,10,-229],o:1,f:1},
    {k:'e_ic',p:[30,6,-30],o:1,f:1}, {k:'e_a',p:[0,18,0],o:1,f:1}, {k:'e_t',p:[20,3,-104.5],o:0,f:1}, {k:'e_sp',p:[27,17,-45],o:1,f:1},
    {k:'e_v',p:[-61,49,0],o:1,f:1}, {k:'e_s',p:[-93,43,0],o:1,f:0}, {k:'e_h',p:[-124,43,0],o:1,f:0}, {k:'e_sc',p:[-100,33,-21],o:1,f:1},
    {k:'e_e',p:[-120,11,25],o:0,f:1}, {k:'e_cy',p:[-160,6,36],o:1,f:1}, {k:'e_b',p:[-207,25,0],o:1,f:1}, {k:'e_pc',p:[-110,27,-80],o:1,f:1},
    {k:'e_iw',p:[-100,14,-51],o:1,f:1}, {k:'e_cp',p:[-222,10,-72],o:1,f:1},
    {k:'e_river',p:[160,2,17],o:1,f:1}, {k:'e_river',p:[520,hfn(520,riverZ(520))+6,riverZ(520)],o:1,f:1}, {k:'e_glory',p:[-124,62,0],o:1,f:1},
    {k:'e_table',p:[-108,15.5,0],room:1,f:1}, {k:'e_h',p:[-124,20,0],room:1,f:1}, {k:'e_s',p:[-92,30,0],room:1,f:1},
  ];
  const V=[
    {id:'north',k:'e_g2',name:'북문으로 들어서며',pos:[0,0,-192],look:[-20,24,0]},
    {id:'outer',k:'e_oc',name:'바깥뜰',pos:[150,0,-62],look:[-60,28,0]},
    {id:'inner',k:'e_ic',name:'안뜰 (제단 앞)',pos:[38,4,27],look:[-60,28,0]},
    {id:'porch',k:'e_v',name:'성전 현관 앞',pos:[-38,4,8],look:[-70,30,0]},
    {id:'holy',k:'e_s',name:'성소 안',pos:[-76,10.05,0],look:[-122,18,0]},
    {id:'river',k:'e_river',name:'동문 밖 강가',pos:[300,hfn(300,riverZ(300)+22),riverZ(300)+22],look:[150,12,0]},
  ];
  return {labels:L,vps:V,center:[0,12,0],radius:370,orbit:{th:.88,ph:.95,d:720},focus:[-60,32,0],inside:['e_s','e_h'],hfn};
}

const BUILDERS={solomon:buildSolomon, herod:buildHerod, ezekiel:buildEzekiel};

// ══════════════════════ 하늘 ══════════════════════
function skyMaterial(){ return new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{top:{value:new THREE.Color('#4f82c4')},mid:{value:new THREE.Color('#a9c3de')},hor:{value:new THREE.Color('#f1cf9c')},sunDir:{value:SUN.clone()},sunCol:{value:new THREE.Color('#ffe2b0')}},
  vertexShader:`varying vec3 vD; void main(){ vD=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; }`,
  fragmentShader:`uniform vec3 top,mid,hor,sunCol,sunDir; varying vec3 vD;
    void main(){ vec3 d=normalize(vD); float h=d.y;
      vec3 c=mix(hor,mid,smoothstep(0.0,0.22,h)); c=mix(c,top,smoothstep(0.18,0.85,h)); if(h<0.) c=mix(hor,hor*0.78,smoothstep(0.,-.3,h));
      float s=max(dot(d,normalize(sunDir)),0.); c+=sunCol*(pow(s,700.)*2.5+pow(s,24.)*.28+pow(s,4.)*.08);
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`}); }

// ══════════════════════ 컨트롤러 ══════════════════════
let renderer=null, camera=null, host=null, canvas=null, labelLayer=null, hooks={}, envTex=null;
const recs={};
const st={tid:null,rec:null,mode:'orbit',orb:{th:.9,ph:1,d:500,tgt:new THREE.Vector3()},fp:{pos:new THREE.Vector3(),yaw:0,pitch:0,fov:62},anim:null,visible:false,zone:null,shadowAt:null};
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2(), tmpV=new THREE.Vector3();
let raf=null;

function buildRec(tid){
  materials();
  const scene=new THREE.Scene();
  scene.fog=new THREE.Fog(0xe7cfa6,tid==='ezekiel'?900:650,tid==='ezekiel'?5200:3900);
  const root=new THREE.Group(); scene.add(root);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(4000,32,16),skyMaterial()); sky.renderOrder=-1; sky.frustumCulled=false; scene.add(sky);
  const hemi=new THREE.HemisphereLight(0xdbe7f5,0x8c6d4a,1.15); scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffe2b8,2.9); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
  sun.shadow.bias=-.0004; sun.shadow.normalBias=.18; scene.add(sun); scene.add(sun.target);
  if(envTex){ scene.environment=envTex; scene.environmentIntensity=.75; }
  const B=new Bld(), R=RNG(tid.length*977+13), FX=new Effects(root);
  const ctx={B,R,FX,root,extraPick:[]};
  const info=BUILDERS[tid](ctx);
  const {pick,walk}=B.finish(root);
  const rec={tid,scene,root,sky,sun,FX,pick:[...pick,...ctx.extraPick],walk,...info};
  rec.center=new THREE.Vector3(...info.center);
  rec.labels=info.labels.map(L=>({...L,p:new THREE.Vector3(...L.p),el:null}));
  return rec;
}
function makeLabels(rec){
  labelLayer.innerHTML='';
  rec.labels.forEach(L=>{ const b=document.createElement('button'); b.className='t3l'+(L.room?' in':'');
    b.innerHTML=`<span class="t3t">${L.t||hooks.nameOf(L.k)}</span><i></i>`; b.style.display='none';
    b.addEventListener('click',e=>{ e.stopPropagation(); hooks.onPick&&hooks.onPick(L.k); });
    labelLayer.appendChild(b); L.el=b; L.w=0; });
}
function fitShadow(c,half){ const cam=st.rec.sun.shadow.camera; cam.left=-half; cam.right=half; cam.top=half; cam.bottom=-half; cam.near=10; cam.far=2400; cam.updateProjectionMatrix();
  st.rec.sun.position.copy(c).addScaledVector(SUN,1000); st.rec.sun.target.position.copy(c); st.rec.sun.target.updateMatrixWorld(); st._sh=c.clone(); st._shh=half; }
function floorAt(x,z,fromY=600){ ray.set(tmpV.set(x,fromY,z),new THREE.Vector3(0,-1,0)); ray.far=2000;
  const h=ray.intersectObjects(st.rec.walk,false); ray.far=Infinity; return h.length?h[0]:null; }
function zoneAt(p){ ray.set(tmpV.set(p.x,p.y+.5,p.z),new THREE.Vector3(0,-1,0)); ray.far=12; const h=ray.intersectObjects(st.rec.walk,false); ray.far=Infinity; return h.length?h[0].object.userData.k:null; }
function yawPitchTo(from,to){ const dx=to.x-from.x, dy=to.y-from.y, dz=to.z-from.z; return [Math.atan2(-dx,-dz), Math.atan2(dy,Math.hypot(dx,dz))]; }
function orbitPos(o,out){ return out.set(o.tgt.x+o.d*Math.sin(o.ph)*Math.sin(o.th), o.tgt.y+o.d*Math.cos(o.ph), o.tgt.z+o.d*Math.sin(o.ph)*Math.cos(o.th)); }
function applyCam(){ if(st.mode==='orbit'){ orbitPos(st.orb,camera.position); camera.lookAt(st.orb.tgt); camera.fov=45; }
  else { camera.position.copy(st.fp.pos); camera.rotation.set(st.fp.pitch,st.fp.yaw,0,'YXZ'); camera.fov=st.fp.fov; }
  camera.updateProjectionMatrix(); }
function flyTo(pos,quat,fov,dur,done,arc=0){ const p0=camera.position.clone(), q0=camera.quaternion.clone(), f0=camera.fov;
  st.anim={t0:performance.now(),dur,step:k=>{ const e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
    camera.position.lerpVectors(p0,pos,e); if(arc) camera.position.y+=Math.sin(Math.PI*e)*arc;
    camera.quaternion.slerpQuaternions(q0,quat,e); camera.fov=f0+(fov-f0)*e; camera.updateProjectionMatrix(); },done}; }
const qFrom=(yaw,pitch)=>new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));

function setZone(){ const z=zoneAt(st.fp.pos); st.zone=z; hooks.onZone&&hooks.onZone(z); }
function enterFP(pos,look,dur=1700,maxPitch=.6){
  const [yaw,p0]=yawPitchTo(pos,look); const pitch=Math.min(p0,maxPitch); const fov=62;
  const from=st.mode;
  flyTo(pos.clone(),qFrom(yaw,pitch),fov,dur,()=>{ st.mode='fp'; st.fp.pos.copy(pos); st.fp.yaw=yaw; st.fp.pitch=pitch; st.fp.fov=fov;
    fitShadow(pos,160); st.shadowAt=pos.clone(); setZone(); }, from==='orbit'?0:Math.min(18,pos.distanceTo(camera.position)*.05));
  if(from!=='fp'){ st.mode='fly'; hooks.onMode&&hooks.onMode('fp'); }
}
export function enterAt(x,z,y){
  if(y==null){ const h=floorAt(x,z); y=h?h.point.y:0; }
  const pos=new THREE.Vector3(x,y+EYE,z); const f=st.rec.focus; const look=new THREE.Vector3(f[0],f[1],f[2]);
  if(Math.hypot(look.x-x,look.z-z)<20) look.set(x-40,y+EYE+4,z);
  enterFP(pos,look,1700,.26);
}
export function goVP(id){ const v=st.rec.vps.find(v=>v.id===id); if(!v) return;
  const pos=new THREE.Vector3(v.pos[0],v.pos[1]+EYE,v.pos[2]); const look=new THREE.Vector3(...v.look);
  const d=camera.position.distanceTo(pos); enterFP(pos,look,st.mode==='fp'?Math.min(3200,Math.max(900,d*9)):1700); }
function walkTo(pt){ const pos=new THREE.Vector3(pt.x,pt.y+EYE,pt.z); const d=pos.distanceTo(st.fp.pos); if(d<1) return;
  const dur=Math.min(3500,Math.max(600,d*28));
  flyTo(pos,qFrom(st.fp.yaw,st.fp.pitch),st.fp.fov,dur,()=>{ st.mode='fp'; st.fp.pos.copy(pos); if(!st.shadowAt||st.shadowAt.distanceTo(pos)>40){ fitShadow(pos,160); st.shadowAt=pos.clone(); } setZone(); });
  st.mode='fly'; }
export function exitFP(){ if(!st.rec) return; const p=orbitPos(st.orb,new THREE.Vector3()); const m=new THREE.Matrix4().lookAt(p,st.orb.tgt,new THREE.Vector3(0,1,0));
  const q=new THREE.Quaternion().setFromRotationMatrix(m); fitShadow(st.rec.center,st.rec.radius*1.15);
  flyTo(p,q,45,1400,()=>{ st.mode='orbit'; st.zone=null; }); st.mode='fly'; hooks.onMode&&hooks.onMode('orbit'); }
export function orbitReset(){ if(!st.rec) return; const o=st.rec.orbit; st.orb.th=o.th; st.orb.ph=o.ph;
  const a=camera.aspect||1; st.orb.d=o.d*Math.max(1,Math.pow(1.25/a,.85)); st.orb.tgt.copy(st.rec.center); }
// 화면 위 한 점이 가리키는 땅(목표 높이 평면) 위치
const _pl=new THREE.Plane(new THREE.Vector3(0,1,0),0), _gp=new THREE.Vector3();
function groundAt(cx,cy){ const r=canvas.getBoundingClientRect(); ndc.set(((cx-r.left)/r.width)*2-1,-((cy-r.top)/r.height)*2+1);
  ray.setFromCamera(ndc,camera); _pl.constant=-st.orb.tgt.y; return ray.ray.intersectPlane(_pl,_gp); }
function clampTarget(){ const c=st.rec.center, R=st.rec.radius*1.5, dx=st.orb.tgt.x-c.x, dz=st.orb.tgt.z-c.z, l=Math.hypot(dx,dz);
  if(l>R){ st.orb.tgt.x=c.x+dx/l*R; st.orb.tgt.z=c.z+dz/l*R; } }
function panOrbit(dx,dy){ const s=2*st.orb.d*Math.tan(camera.fov*Math.PI/360)/Math.max(1,canvas.clientHeight), th=st.orb.th;
  const k=1/Math.max(.35,Math.cos(st.orb.ph)*.6+.4);
  st.orb.tgt.x+=(-Math.cos(th)*dx - Math.sin(th)*dy*k)*s; st.orb.tgt.z+=(Math.sin(th)*dx - Math.cos(th)*dy*k)*s; clampTarget(); }
function zoomOrbit(f,cx,cy){ const R0=st.rec.radius, nd=Math.max(R0*.05,Math.min(R0*4,st.orb.d*f)), real=nd/st.orb.d;
  if(cx!=null){ applyCam(); const g=groundAt(cx,cy); if(g){ st.orb.tgt.x+=(g.x-st.orb.tgt.x)*(1-real); st.orb.tgt.z+=(g.z-st.orb.tgt.z)*(1-real); clampTarget(); } }
  st.orb.d=nd; }
function zoomFP(f){ st.fp.fov=Math.max(24,Math.min(112,st.fp.fov*f)); }
export function zoomStep(f){ if(!st.rec||st.anim) return;
  if(st.mode==='orbit'){ const r=canvas.getBoundingClientRect(); zoomOrbit(f,r.left+r.width/2,r.top+r.height/2); } else if(st.mode==='fp') zoomFP(f); }
export function spin(d){ if(st.mode!=='orbit') return; const a=st.orb.th, b=a+d, t0=performance.now();
  st.anim={t0,dur:380,step:k=>{ const e=1-Math.pow(1-k,3); st.orb.th=a+(b-a)*e; applyCam(); },done:()=>{}}; }
export function lookTurn(d){ if(st.mode!=='fp') return; const a=st.fp.yaw, t0=performance.now();
  st.anim={t0,dur:380,step:k=>{ const e=1-Math.pow(1-k,3); st.fp.yaw=a+d*e; applyCam(); },done:()=>{}}; }

function tap(cx,cy){ if(st.anim) return; const r=canvas.getBoundingClientRect();
  ndc.set(((cx-r.left)/r.width)*2-1,-((cy-r.top)/r.height)*2+1); ray.setFromCamera(ndc,camera);
  const hits=ray.intersectObjects(st.rec.pick,false); if(!hits.length) return; const h=hits[0], o=h.object;
  if(o.userData.walk){ if(st.mode==='orbit') enterAt(h.point.x,h.point.z,h.point.y); else if(st.mode==='fp') walkTo(h.point); return; }
  if(o.userData.k) hooks.onPick&&hooks.onPick(o.userData.k); }

function updLabels(){
  const W=canvas.clientWidth, H=canvas.clientHeight, placed=[], list=[];
  const inside=st.mode!=='orbit' && st.rec.inside.includes(st.zone);
  for(const L of st.rec.labels){ let show=st.mode==='orbit'?L.o:L.f;
    if(st.mode!=='orbit' && !!L.room!==inside) show=false;
    if(st.mode==='fly') show=false;
    if(!show){ if(L.el.style.display!=='none') L.el.style.display='none'; continue; }
    tmpV.copy(L.p).project(camera);
    if(tmpV.z>1||tmpV.z<-1||Math.abs(tmpV.x)>1.02||Math.abs(tmpV.y)>1.02){ L.el.style.display='none'; continue; }
    const dist=camera.position.distanceTo(L.p); if(st.mode==='fp'&&dist>(L.room?60:420)){ L.el.style.display='none'; continue; }
    list.push({L,x:(tmpV.x+1)/2*W,y:(1-tmpV.y)/2*H,dist}); }
  list.sort((a,b)=>a.dist-b.dist);
  for(const it of list){ const L=it.L; if(L.el.style.display==='none'){ L.el.style.display=''; }
    if(!L.w) L.w=(L.el.firstChild&&L.el.firstChild.offsetWidth)||80; const w=L.w, h=30;
    const rc=[it.x-w/2-3,it.y-h-18,it.x+w/2+3,it.y];
    if(placed.some(p=>!(rc[2]<p[0]||rc[0]>p[2]||rc[3]<p[1]||rc[1]>p[3]))){ L.el.style.display='none'; continue; }
    placed.push(rc); L.el.style.transform=`translate(${it.x.toFixed(1)}px,${it.y.toFixed(1)}px)`; }
}
function loop(t){
  if(!st.visible){ raf=null; return; } raf=requestAnimationFrame(loop);
  if(st.anim){ const k=Math.min(1,(t-st.anim.t0)/st.anim.dur); st.anim.step(k); if(k>=1){ const d=st.anim.done; st.anim=null; d&&d(); applyCam(); } }
  else applyCam();
  if(st.mode==='orbit'&&!st.anim){ const half=Math.min(st.rec.radius*1.15,Math.max(120,st.orb.d*1.1));
    if(!st._sh||st._sh.distanceTo(st.orb.tgt)>half*.25||Math.abs(st._shh-half)>half*.3) fitShadow(st.orb.tgt.clone(),half); }
  st.rec.sky.position.copy(camera.position);
  st.rec.FX.update(t/1000); updLabels();
  renderer.render(st.rec.scene,camera);
}
function resize(){ if(!renderer||!host) return; const w=host.clientWidth, h=host.clientHeight; if(!w||!h) return;
  renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); }

export function init(container,hk){
  if(renderer) return; host=container; hooks=hk||{};
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.02;
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  canvas=renderer.domElement; canvas.className='t3canvas'; host.appendChild(canvas);
  labelLayer=document.createElement('div'); labelLayer.className='t3labels'; host.appendChild(labelLayer);
  camera=new THREE.PerspectiveCamera(45,1,.3,9000);
  // 금속 반사용 하늘 환경맵
  const pm=new THREE.PMREMGenerator(renderer); const es=new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(100,32,16),skyMaterial())); const gnd=new THREE.Mesh(new THREE.CircleGeometry(100,24),new THREE.MeshBasicMaterial({color:0x9c8566}));
  gnd.rotation.x=-Math.PI/2; gnd.position.y=-2; es.add(gnd);
  envTex=pm.fromScene(es,.03).texture;
  new ResizeObserver(resize).observe(host);
  // 입력
  // 3D 구조: 한 손가락 = 돌리기, 두 손가락 = 확대·축소 + 옆으로 옮기기 (마우스는 오른쪽 버튼이나 Shift+끌기로 옮기기)
  // 1인칭: 한 손가락 = 둘러보기, 두 손가락 = 확대·축소(넓게 보기)
  const ptrs=new Map(); let down=null, pinch=null;
  const pts=()=>[...ptrs.values()];
  const dist2=()=>{ const a=pts(); return Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y); };
  const mid=()=>{ const a=pts(); return [(a[0].x+a[1].x)/2,(a[0].y+a[1].y)/2]; };
  canvas.addEventListener('pointerdown',e=>{ try{canvas.setPointerCapture(e.pointerId);}catch(_){}
    ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptrs.size===1) down={x:e.clientX,y:e.clientY,t:performance.now(),moved:false,pan:e.button===2||e.shiftKey||e.ctrlKey};
    if(ptrs.size===2){ const m=mid(); pinch={d:dist2(),mx:m[0],my:m[1]}; if(down) down.moved=true; } });
  canvas.addEventListener('pointermove',e=>{ const p=ptrs.get(e.pointerId); if(!p) return; e.preventDefault();
    const dx=e.clientX-p.x, dy=e.clientY-p.y; p.x=e.clientX; p.y=e.clientY;
    if(st.anim) return;
    if(ptrs.size===1&&down){ if(Math.abs(e.clientX-down.x)+Math.abs(e.clientY-down.y)>6) down.moved=true;
      if(!down.moved) return;
      if(st.mode==='orbit'){ if(down.pan) panOrbit(dx,dy); else { st.orb.th-=dx*.006; st.orb.ph=Math.max(.08,Math.min(1.54,st.orb.ph-dy*.005)); } }
      else if(st.mode==='fp'){ const s=st.fp.fov/62; st.fp.yaw+=dx*.0045*s; st.fp.pitch=Math.max(-.85,Math.min(.95,st.fp.pitch+dy*.0045*s)); } }
    else if(ptrs.size===2&&pinch){ const d=Math.max(10,dist2()), f=pinch.d/d, m=mid();
      if(st.mode==='orbit'){ zoomOrbit(f,m[0],m[1]); panOrbit(m[0]-pinch.mx,m[1]-pinch.my); }
      else if(st.mode==='fp') zoomFP(f);
      pinch.d=d; pinch.mx=m[0]; pinch.my=m[1]; } },{passive:false});
  const up=e=>{ const had=ptrs.has(e.pointerId); ptrs.delete(e.pointerId); if(ptrs.size<2) pinch=null;
    if(had&&ptrs.size===0&&down&&!down.moved&&performance.now()-down.t<550) tap(e.clientX,e.clientY);
    if(ptrs.size===0) down=null; };
  canvas.addEventListener('pointerup',up); canvas.addEventListener('pointercancel',e=>{ ptrs.delete(e.pointerId); pinch=null; down=null; });
  canvas.addEventListener('wheel',e=>{ e.preventDefault(); if(st.anim) return; const f=Math.exp(e.deltaY*.0012);
    if(st.mode==='orbit') zoomOrbit(f,e.clientX,e.clientY); else if(st.mode==='fp') zoomFP(f); },{passive:false});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
}
export function show(tid,opt={}){
  if(!recs[tid]) recs[tid]=buildRec(tid);
  const rec=recs[tid], changed=st.rec!==rec; st.rec=rec; st.tid=tid; st.anim=null;
  st.visible=true; resize();
  if(changed){ makeLabels(rec); orbitReset(); st.orb.tgt.copy(rec.center); st.mode='orbit'; st.zone=null; }
  if(opt.vp){ if(st.mode!=='fp'){ st.mode='orbit'; applyCam(); } fitShadow(rec.center,rec.radius*1.15); goVP(opt.vp); }
  else if(opt.at){ st.mode='orbit'; applyCam(); fitShadow(rec.center,rec.radius*1.15); enterAt(opt.at[0],opt.at[1]); }
  else { if(changed||st.mode!=='orbit'){ st.mode='orbit'; st.zone=null; } fitShadow(rec.center,rec.radius*1.15); applyCam(); hooks.onMode&&hooks.onMode('orbit'); }
  if(!raf) raf=requestAnimationFrame(loop);
}
export function hide(){ st.visible=false; }
export function vps(tid){ return (recs[tid]||{}).vps||null; }
export function mode(){ return st.mode; }
export { resize };
