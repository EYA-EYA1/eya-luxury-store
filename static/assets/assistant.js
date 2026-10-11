/* EYA Concierge: a rule-based shopping helper (no external AI service). Edit FAQ answers below. */
(function(){
const L=(document.documentElement.lang||"en").slice(0,2),$=s=>document.querySelector(s);
const TX={
 en:{h:"EYA Concierge",open:"Need help?",sub:"We're here!",hi:"Welcome to EYA. Ask me about jewelry, bags, watches or fashion, a budget (for example \"under 100\"), or a gift idea.",ph:"Type your question…",send:"Send",none:"I could not find a match. Try \"necklace\", \"handbag\", \"watch\" or \"under 80\".",found:"Here is what I found:",left:"left",in:"In stock",out:"Sold out",
  skin:"Our skincare and fragrance boutiques are opening soon.",pay:"Checkout currently records your order without taking any real payment.",ship:"Delivery and returns details will be confirmed with your order.",hello:"Hello! What are you looking for today?",close:"Close"},
 fr:{h:"Conciergerie EYA",open:"Besoin d'aide ?",sub:"Nous sommes là !",hi:"Bienvenue chez EYA. Interrogez-moi sur les bijoux, sacs, montres ou la mode, un budget (par exemple « moins de 100 ») ou une idée cadeau.",ph:"Votre question…",send:"Envoyer",none:"Aucun résultat. Essayez « collier », « sac », « montre » ou « moins de 80 ».",found:"Voici ce que j'ai trouvé :",left:"restants",in:"En stock",out:"Épuisé",
  skin:"Nos boutiques de soins et de parfums ouvrent bientôt.",pay:"Le paiement enregistre actuellement votre commande sans prélever d'argent réel.",ship:"Les détails de livraison et de retour seront confirmés avec votre commande.",hello:"Bonjour ! Que cherchez-vous aujourd'hui ?",close:"Fermer"},
 ar:{h:"كونسيرج EYA",open:"تحتاج مساعدة؟",sub:"نحن هنا!",hi:"مرحباً بك في EYA. اسألني عن المجوهرات أو الحقائب أو الساعات أو الأزياء، أو عن ميزانية (مثلاً «أقل من 100») أو فكرة هدية.",ph:"اكتب سؤالك…",send:"إرسال",none:"لم أجد نتيجة. جرّب «عقد» أو «حقيبة» أو «ساعة» أو «أقل من 80».",found:"هذا ما وجدته:",left:"متبقٍ",in:"متوفر",out:"نفد",
  skin:"سيتم افتتاح بوتيك العناية بالبشرة والعطور قريباً.",pay:"يسجّل الدفع حالياً طلبك دون سحب أي مبلغ حقيقي.",ship:"ستُؤكَّد تفاصيل التوصيل والإرجاع مع طلبك.",hello:"مرحباً! عمّ تبحث اليوم؟",close:"إغلاق"}};
const CAT={Jewelry:/jewel|ring|necklace|earring|bracelet|bangle|pearl|pendant|bijou|bague|collier|boucle|bracelet|عقد|خاتم|خواتم|أقراط|سوار|مجوهر/i,
 Bags:/\bbags?\b|handbag|purse|\bsacs?\b|حقيب/i,Accessories:/watch|sunglass|scarf|accessor|montre|lunette|foulard|ساعة|نظارة|وشاح|إكسسوار/i,
 Fashion:/dress|gown|robe|fashion|\bmode\b|فستان|أزياء/i};
let P=null;const tr=()=>TX[L]||TX.en;
async function prods(){if(!P){try{P=await (await fetch("/api/products")).json()}catch(e){P=[]}}return P}
const nm=p=>(L==="fr"&&p.name_fr)||(L==="ar"&&p.name_ar)||p.name;
const esc=s=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const root=document.createElement("div");root.id="cg";
root.innerHTML=`<button id="cgBtn" type="button" aria-expanded="false" aria-controls="cgPanel"><b aria-hidden="true">♛</b><span>${tr().open}<small>${tr().sub}</small></span></button>`;
document.body.appendChild(root);
let panel=null;
function msg(html,who){const d=document.createElement("div");d.className="cm "+who;d.innerHTML=html;$("#cgLog").appendChild(d);$("#cgLog").scrollTop=1e9;return d}
function build(){panel=document.createElement("div");panel.id="cgPanel";panel.setAttribute("role","dialog");panel.setAttribute("aria-label",tr().h);
 panel.innerHTML=`<div class="cgh"><span>${tr().h}</span><button type="button" id="cgX" class="lnk" style="color:#F1D9A0" aria-label="${tr().close}">✕</button></div><div id="cgLog" aria-live="polite"></div><form id="cgForm"><input id="cgIn" autocomplete="off" placeholder="${tr().ph}" aria-label="${tr().ph}"><button class="btn sm solid" type="submit">${tr().send}</button></form>`;
 root.appendChild(panel);msg(tr().hi,"b");
 $("#cgX").onclick=toggle;
 $("#cgForm").onsubmit=async e=>{e.preventDefault();const q=$("#cgIn").value.trim();if(!q)return;$("#cgIn").value="";msg(esc(q),"u");await answer(q)};
 $("#cgLog").addEventListener("click",e=>{const b=e.target.closest("[data-pid]");if(b&&window.openProd)openProd(+b.dataset.pid)})}
function toggle(){if(!panel)build();else panel.hidden=!panel.hidden;const o=!panel.hidden;$("#cgBtn").setAttribute("aria-expanded",o);if(o)$("#cgIn").focus()}
$("#cgBtn").onclick=toggle;
async function answer(q){const T=tr(),all=await prods();let r=all.slice(),hit=false;
 if(/skin|beauty|perfume|fragrance|soin|parfum|cosm|عناية|عطر/i.test(q))return void msg(T.skin,"b");
 if(/pay|checkout|card|paiement|دفع/i.test(q))return void msg(T.pay,"b");
 if(/ship|deliver|return|livraison|retour|توصيل|إرجاع/i.test(q))return void msg(T.ship,"b");
 if(/^(hi|hello|hey|bonjour|salut|مرحبا|أهلا)\b/i.test(q))return void msg(T.hello,"b");
 for(const c in CAT)if(CAT[c].test(q)){r=r.filter(p=>p.category===c);hit=true;break}
 const w=q.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(x=>x.length>3&&!/under|below|moins|than|show|want|need|with/.test(x));
 if(!hit&&w.length){const m=r.filter(p=>w.some(x=>(p.name+" "+p.description+" "+(p.name_fr||"")+" "+(p.name_ar||"")).toLowerCase().includes(x)));if(m.length){r=m;hit=true}}
 const n=q.match(/(\d+)/);if(n&&/under|below|less|max|moins|أقل|<|\$/i.test(q)){r=r.filter(p=>p.price_cents<=n[1]*100);hit=true}
 if(/cheap|affordable|budget|moins cher|أرخص|رخيص/i.test(q)){r.sort((a,b)=>a.price_cents-b.price_cents);hit=true}
 if(/luxur|expensive|premium|best|gift|cadeau|هدية|فاخر/i.test(q)){r.sort((a,b)=>b.price_cents-a.price_cents);hit=true}
 if(!hit||!r.length)return void msg(T.none,"b");
 const top=r.slice(0,4);
 msg(T.found+top.map(p=>`<button class="cp" type="button" data-pid="${p.id}"><span>${esc(nm(p))}</span><span>$${(p.price_cents/100).toFixed(2)} · ${p.stock>0?(p.stock<=5?p.stock+" "+T.left:T.in):T.out}</span></button>`).join(""),"b")}
// Skincare "opening soon" card
const sk=document.getElementById("btSkin");
if(sk)sk.addEventListener("click",()=>{window.showInfo&&showInfo(tr().h&&(typeof t==="function"?t("sk_t"):"Skincare"),`<p>${esc(typeof t==="function"?t("sk_x"):tr().skin)}</p>`)});
})();
