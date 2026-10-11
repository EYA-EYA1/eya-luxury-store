/* EYA palace: Three.js hall with 4 boutique doorways. Falls back to a photo if WebGL is unavailable. */
(function(){
const sec=document.getElementById("palaceSec"),cv=document.getElementById("palace");
if(!sec||!window.THREE)return;
const T=THREE,reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
let R;try{R=new T.WebGLRenderer({canvas:cv,antialias:true})}catch(e){}
if(!R){cv.style.display="none";return}
document.getElementById("palaceFb").style.display="none";
R.setPixelRatio(Math.min(devicePixelRatio,1.75));R.outputEncoding=T.sRGBEncoding;R.toneMapping=T.ACESFilmicToneMapping;R.toneMappingExposure=.85;
const S=new T.Scene();S.background=new T.Color(0x2a1d12);S.fog=new T.Fog(0x3a2815,18,48);
const cam=new T.PerspectiveCamera(58,1,.1,80);
const GOLD=new T.MeshStandardMaterial({color:0xd4a64a,metalness:.85,roughness:.28});
const IVORY=new T.MeshStandardMaterial({color:0xf3e9d4,roughness:.6});
// marble floor texture
const mc=document.createElement("canvas");mc.width=mc.height=512;const g=mc.getContext("2d");
g.fillStyle="#f4ead6";g.fillRect(0,0,512,512);
for(let i=0;i<40;i++){g.strokeStyle="rgba(150,120,80,"+(.05+Math.random()*.12)+")";g.lineWidth=.5+Math.random()*1.6;g.beginPath();let x=Math.random()*512,y=Math.random()*512;g.moveTo(x,y);for(let k=0;k<6;k++){x+=(Math.random()-.5)*160;y+=(Math.random()-.2)*120;g.lineTo(x,y)}g.stroke()}
const mt=new T.CanvasTexture(mc);mt.wrapS=mt.wrapT=T.RepeatWrapping;mt.repeat.set(4,10);mt.anisotropy=4;
const floor=new T.Mesh(new T.PlaneGeometry(20,60),new T.MeshStandardMaterial({map:mt,roughness:.18,metalness:.12}));
floor.rotation.x=-Math.PI/2;floor.position.z=-12;S.add(floor);
const ceil=new T.Mesh(new T.PlaneGeometry(20,60),new T.MeshStandardMaterial({color:0xefe0c0,roughness:.9,emissive:0x3a2c18}));
ceil.rotation.x=Math.PI/2;ceil.position.set(0,11,-12);S.add(ceil);
[-10,10].forEach(x=>{const w=new T.Mesh(new T.PlaneGeometry(60,11),IVORY);w.rotation.y=x<0?Math.PI/2:-Math.PI/2;w.position.set(x,5.5,-12);S.add(w)});
const back=new T.Mesh(new T.PlaneGeometry(20,11),new T.MeshStandardMaterial({color:0xe9d9b8,roughness:.7}));back.position.set(0,5.5,-27);S.add(back);
// colonnade + arches
const cg=new T.CylinderGeometry(.34,.38,8,20),bg=new T.CylinderGeometry(.55,.6,.4,20),pg=new T.CylinderGeometry(.6,.4,.5,20),ag=new T.TorusGeometry(2.5,.13,8,36,Math.PI);
for(let z=10;z>=-20;z-=5){[-6.5,6.5].forEach(x=>{
 const c=new T.Mesh(cg,IVORY);c.position.set(x,4,z);S.add(c);
 const b=new T.Mesh(bg,GOLD);b.position.set(x,.2,z);S.add(b);
 const p=new T.Mesh(pg,GOLD);p.position.set(x,8.2,z);S.add(p);
 if(z>-20){const a=new T.Mesh(ag,GOLD);a.rotation.y=Math.PI/2;a.position.set(x,8.4,z-2.5);S.add(a)}})}
// chandelier
const ch=new T.Group();ch.position.set(0,8.2,0);S.add(ch);
const chain=new T.Mesh(new T.CylinderGeometry(.08,.08,3,8),GOLD);chain.position.y=1.5;ch.add(chain);
const gem=new T.MeshStandardMaterial({color:0xfff2cc,emissive:0xffd98a,emissiveIntensity:1.6});
[[1,0],[1.8,-.7],[2.6,-1.4]].forEach(([r,y])=>{const t=new T.Mesh(new T.TorusGeometry(r,.05,8,40),GOLD);t.rotation.x=Math.PI/2;t.position.y=y;ch.add(t);
 for(let i=0;i<Math.round(r*9);i++){const a=i/Math.round(r*9)*Math.PI*2,s=new T.Mesh(new T.SphereGeometry(.09,8,8),gem);s.position.set(Math.cos(a)*r,y-.12,Math.sin(a)*r);ch.add(s)}});
const cl=new T.PointLight(0xffd9a0,.9,34,1.6);cl.position.set(0,7,0);S.add(cl);
const cl2=cl.clone();cl2.position.set(0,7,-16);cl2.intensity=.8;S.add(cl2);
S.add(new T.HemisphereLight(0xfff0d0,0x5a3d22,.55));
// doorways
const D=[{n:"Jewelry",c:0xffd79a},{n:"Bags",c:0xffc9a0},{n:"Accessories",c:0xfff0c0},{n:"Fashion",c:0xf5d0c0}];
const pick=[],DX=[-8.25,-2.75,2.75,8.25];
D.forEach((d,i)=>{const gp=new T.Group();gp.position.set(DX[i],0,-26.8);
 const glow=new T.Mesh(new T.PlaneGeometry(3.2,5),new T.MeshBasicMaterial({color:d.c,fog:false}));glow.position.y=2.5;glow.userData.door=i;gp.add(glow);pick.push(glow);
 const top=new T.Mesh(new T.CircleGeometry(1.6,32,0,Math.PI),new T.MeshBasicMaterial({color:d.c,fog:false}));top.position.y=5;top.userData.door=i;gp.add(top);pick.push(top);
 [-1.75,1.75].forEach(x=>{const p=new T.Mesh(new T.BoxGeometry(.2,5,.25),GOLD);p.position.set(x,2.5,.05);gp.add(p)});
 const ar=new T.Mesh(new T.TorusGeometry(1.75,.1,8,32,Math.PI),GOLD);ar.position.set(0,5,.05);gp.add(ar);
 const lc=document.createElement("canvas");lc.width=512;lc.height=96;const l=lc.getContext("2d");l.font="700 60px 'Cormorant Garamond',Georgia,serif";l.textAlign="center";l.fillStyle="#3a2410";l.fillText(d.n.toUpperCase().split("").join(" "),256,62);
 const sp=new T.Mesh(new T.PlaneGeometry(4.6,.86),new T.MeshBasicMaterial({map:new T.CanvasTexture(lc),transparent:true,fog:false}));sp.position.set(0,7.2,.08);gp.add(sp);
 S.add(gp)});
// gold dust
const N=reduce?60:220,pa=new Float32Array(N*3);for(let i=0;i<N;i++){pa[i*3]=(Math.random()-.5)*16;pa[i*3+1]=Math.random()*10;pa[i*3+2]=Math.random()*-36+10}
const pg2=new T.BufferGeometry();pg2.setAttribute("position",new T.BufferAttribute(pa,3));
const dust=new T.Points(pg2,new T.PointsMaterial({color:0xffe3a0,size:.07,transparent:true,opacity:.75,depthWrite:false}));S.add(dust);
// camera control
let yaw=0,pitch=0,ty=0,tp=0,cx=0,cz=14,tx=0,tz=14,sel=-1,entering=-1,inside=false,drag=false,lx=0,ly=0,moved=0,vis=true;
const home=()=>{tx=0;tz=inside?-4:14;sel=-1};
function select(i){sel=(i+4)%4;tx=DX[sel]*.55;tz=inside?-8:2;if(reduce){cx=tx;cz=tz}}
function enter(i){if(entering>=0)return;entering=i;setTimeout(()=>{if(entering===i){entering=-2;arrive(i)}},3200);tx=DX[i];tz=-21;if(reduce){cx=tx;cz=tz}}
const ray=new T.Raycaster(),m=new T.Vector2();
function hit(e){const r=cv.getBoundingClientRect();m.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(m,cam);const h=ray.intersectObjects(pick)[0];return h?h.object.userData.door:-1}
cv.addEventListener("pointerdown",e=>{drag=true;moved=0;lx=e.clientX;ly=e.clientY;cv.style.cursor="grabbing";cv.setPointerCapture(e.pointerId)});
cv.addEventListener("pointermove",e=>{if(drag){const dx=e.clientX-lx,dy=e.clientY-ly;moved+=Math.abs(dx)+Math.abs(dy);ty=Math.max(-.6,Math.min(.6,ty-dx*.004));tp=Math.max(-.2,Math.min(.2,tp-dy*.002));lx=e.clientX;ly=e.clientY}else{cv.style.cursor=hit(e)>=0?"pointer":"grab";ty=ty*.9;}});
cv.addEventListener("pointerup",e=>{drag=false;cv.style.cursor="grab";if(moved<6){const d=hit(e);if(d>=0)enter(d)}});
addEventListener("keydown",e=>{if(!vis||/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;if(e.key==="ArrowRight"){select(sel+1)}else if(e.key==="ArrowLeft"){select(sel<0?3:sel-1)}else if(e.key==="Enter"&&sel>=0&&document.activeElement===document.body){enter(sel)}});
sec.querySelectorAll("[data-door]").forEach(b=>b.addEventListener("click",()=>enter(+b.dataset.door)));
const tour=document.getElementById("pTour");
tour.addEventListener("click",()=>{inside=!inside;tour.textContent=inside?"Step back":"Explore the palace";home();if(reduce){cz=tz;cx=tx}});
function arrive(i){window.setCat&&setCat(D[i].n);document.getElementById("shop").scrollIntoView({behavior:reduce?"auto":"smooth"});setTimeout(()=>{entering=-1;home();if(reduce){cx=tx;cz=tz}},900)}
function size(){const w=sec.clientWidth,h=sec.clientHeight;R.setSize(w,h,false);cam.aspect=w/h;cam.fov=w<700?72:58;cam.updateProjectionMatrix()}
new ResizeObserver(size).observe(sec);size();
new IntersectionObserver(a=>{vis=a[0].isIntersecting;if(vis)loop()}).observe(sec);
const clock=new T.Clock();let raf=0;
function loop(){cancelAnimationFrame(raf);if(!vis)return;raf=requestAnimationFrame(loop);
 const t=clock.getElapsedTime(),dt=Math.min(clock.getDelta?0:0,0)||0,k=reduce?1:1-Math.exp(-Math.min(t-(loop.t||t),.5)*2.6);loop.t=t;
 cx+=(tx-cx)*k;cz+=(tz-cz)*k;yaw+=(ty-yaw)*Math.min(1,k*1.8);pitch+=(tp-pitch)*Math.min(1,k*1.8);
 if(!drag&&!reduce){ty*=.985;tp*=.95}
 cam.position.set(cx,2.3+Math.sin(t*.6)*(reduce?0:.03),cz);
 cam.rotation.set(pitch,yaw+(entering<0&&!reduce?Math.sin(t*.2)*.03:0),0,"YXZ");
 if(entering>=0&&Math.abs(cz-tz)<.8)arrive(entering),entering=-2;
 if(!reduce){const p=pg2.attributes.position.array;for(let i=0;i<N;i++){p[i*3+1]+=.004;if(p[i*3+1]>10)p[i*3+1]=0}pg2.attributes.position.needsUpdate=true;ch.rotation.y=t*.08;cl.intensity=.9+Math.sin(t*2)*.04}
 R.render(S,cam)}
loop();
})();
