const page = document.body.dataset.page;
let lang = 'en';

const pages = {
  "about": {
    "en": {
      "label": "ABOUT INTRON",
      "title": "A trading partner<br>connecting global markets.",
      "intro": "INTRON GLOBAL is a trading company specializing in the import, export and distribution of high-performance fibers, engineering plastics, functional additives, and water treatment equipment and components.",
      "lead": "We source products from domestic and international manufacturers and connect them with customers through import, export and distribution.",
      "facts": [
        [
          "QUALITY-LED SOURCING",
          "Products sourced to meet global quality standards"
        ],
        [
          "MANUFACTURER NETWORK",
          "OCF, Lotte Chem, Samyang EP, Formosa, Nan Ya and more"
        ],
        [
          "GLOBAL REACH",
          "EU, UK, Turkey, Middle East and Korea"
        ]
      ],
      "sectionTitle": "Your trading partner,<br>from sourcing to supply.",
      "copy": "Our global manufacturer network supports product sourcing, import, export and distribution. We help customers select products, check quality and maintain reliable supply for domestic and international trade."
    },
    "ko": {
      "label": "회사소개",
      "title": "국내외 제조사와 시장을 잇는<br>무역 파트너",
      "intro": "인트론글로벌은 고성능 섬유, 엔지니어링 플라스틱, 기능성 첨가제와 수처리 설비·부품을 취급하는 수출입·유통 전문 무역회사입니다.",
      "lead": "고객이 필요한 제품을 국내외 제조사에서 찾아 조달하고, 수출입과 유통을 통해 시장에 공급합니다.",
      "facts": [
        [
          "품질을 확인한 제품 공급",
          "글로벌 품질 기준에 맞는 제품 조달"
        ],
        [
          "국내외 제조사 네트워크",
          "OCF, 롯데케미칼, 삼양EP, 포모사, 난야 등"
        ],
        [
          "글로벌 네트워크",
          "EU, 영국, 튀르키예, 중동, 한국"
        ]
      ],
      "sectionTitle": "제품 조달부터 공급까지<br>무역 파트너로 함께합니다.",
      "copy": "글로벌 제조사 네트워크를 바탕으로 제품 소싱과 수출입·유통을 지원합니다. 제품 선정과 품질 확인부터 안정적인 공급까지, 국내외 거래가 이어질 수 있도록 돕습니다."
    }
  },
  "materials": {
    "en": {
      "label": "PRODUCTS WE TRADE",
      "title": "Sourcing products.<br>Connecting markets.",
      "intro": "Explore the industrial materials and water treatment equipment and components we import, export and distribute.",
      "groups": [
        [
          "01",
          "GLASS & CARBON FIBERS",
          "We source and distribute high-strength reinforcement materials for engineering plastics and composites.",
          [
            "OCF glass fiber chopped strands made in Korea",
            "Carbon fiber chopped strands for thermoplastics",
            "OCF quality control technology and FTA certified export"
          ]
        ],
        [
          "02",
          "ENGINEERING RESINS",
          "We source and supply base, specialty and recycled resins suited to application requirements.",
          [
            "PA, PP, PC, POM and EVA",
            "Liquid & solid epoxy resins and HHPA curing agent",
            "Medical & food-contact PC, PC/ABS alloy",
            "rPC, rPA6/66, rPBT, rABS, rASA, PCR & PIR"
          ]
        ],
        [
          "03",
          "PERFORMANCE ADDITIVES",
          "We source and supply functional additives and custom masterbatch from domestic and international manufacturers.",
          [
            "Supply of custom masterbatch from Woosung Chemical",
            "Impact modifiers from Formosa and LG Chem",
            "Songwon antioxidants and UV stabilizers",
            "PFAS-free heat stabilizers and anti-dripping agent"
          ]
        ],
        [
          "04",
          "WATER TREATMENT EQUIPMENT",
          "We trade and supply water treatment equipment and components for underwater operating conditions.",
          [
            "High-durability water treatment frame cassettes",
            "Sourcing of application-specific industrial water treatment components",
            "Corrosion resistance, structural stability and long lifecycle"
          ]
        ]
      ],
      "afterTitle": "From product sourcing<br>to international trade.",
      "after": "We source products through domestic and international manufacturers and support import, export and distribution. Share your product and application requirements so we can help identify suitable suppliers and products."
    },
    "ko": {
      "label": "주요 취급품목",
      "title": "필요한 제품을 찾아<br>국내외에 공급합니다.",
      "intro": "인트론글로벌이 수출입·유통하는 산업용 소재와 수처리 설비·부품을 소개합니다.",
      "groups": [
        [
          "01",
          "유리섬유·탄소섬유",
          "엔지니어링 플라스틱과 복합소재에 사용하는 고강도 보강 소재를 소싱·유통합니다.",
          [
            "국내 생산 OCF 유리섬유 촙드 스트랜드",
            "열가소성 수지용 탄소섬유 촙드 스트랜드",
            "OCF 품질관리 기술 및 FTA 인증 수출"
          ]
        ],
        [
          "02",
          "엔지니어링 레진",
          "제품의 용도와 요구 성능에 맞는 범용·특수·재생 레진을 조달·공급합니다.",
          [
            "PA, PP, PC, POM 및 EVA",
            "액상·고상 에폭시 레진 및 HHPA 경화제",
            "의료·식품 접촉용 PC, PC/ABS 알로이",
            "rPC, rPA6/66, rPBT, rABS, rASA, PCR & PIR"
          ]
        ],
        [
          "03",
          "기능성 첨가제",
          "국내외 제조사의 기능성 첨가제와 맞춤형 마스터배치를 조달·공급합니다.",
          [
            "우성케미칼 맞춤형 마스터배치 공급",
            "포모사·LG화학 충격보강제",
            "송원 산화방지제 및 UV 안정제",
            "PFAS-free 열안정제 및 난연 보조제"
          ]
        ],
        [
          "04",
          "수처리 설비·부품",
          "수중 환경에 사용하는 수처리 설비·부품을 취급하고, 요구 조건에 맞는 제품을 조달합니다.",
          [
            "내구성이 높은 수처리용 프레임 카세트",
            "사용 용도에 맞는 산업용 수처리 부품 조달",
            "우수한 내식성, 안정적인 구조, 오랜 사용 수명"
          ]
        ]
      ],
      "afterTitle": "제품 소싱부터 수출입까지,<br>거래를 이어갑니다.",
      "after": "국내외 제조사 네트워크를 통해 제품을 조달하고 수출입·유통을 지원합니다. 필요한 제품과 사용 조건을 알려주시면 적합한 공급처와 제품을 찾는 데 도움을 드립니다."
    }
  },
  "contact": {
    "en": {
      "label": "TRADE INQUIRIES",
      "title": "Let’s discuss your<br>sourcing and trade needs.",
      "intro": "Contact us about product sourcing, import, export and domestic or international distribution.",
      "cards": [
        [
          "EMAIL",
          "intron1101@gmail.com"
        ],
        [
          "FAX",
          "0504-423-5748"
        ],
        [
          "ADDRESS",
          "1, DONGBAEK 1-RO 37BEON-GIL, GIHEUNG-GU,<br>17012 YONGIN-SI, KOREA"
        ]
      ],
      "helper": "Share your company, required products, quantities and applications so we can discuss suitable sourcing and supply options.",
      "button": "Send an email <span>↗</span>"
    },
    "ko": {
      "label": "제품·무역 문의",
      "title": "제품 소싱과 수출입,<br>편하게 문의해 주세요.",
      "intro": "제품 조달, 수출입, 국내외 유통에 관한 문의를 남겨 주세요.",
      "cards": [
        [
          "이메일",
          "intron1101@gmail.com"
        ],
        [
          "팩스",
          "0504-423-5748"
        ],
        [
          "주소",
          "경기도 용인시 기흥구 동백1로37번길 1<br>(우) 17012"
        ]
      ],
      "helper": "회사명과 필요한 제품, 수량, 사용 용도를 알려주시면 거래와 공급에 관해 안내해 드리겠습니다.",
      "button": "이메일 문의하기 <span>↗</span>"
    }
  }
};

function nav(d) {
  return `<header class="header sub-header"><a class="brand" href="index.html"><img class="brand-logo brand-logo-dark" src="assets/intron-logo-vertical-black.jpeg" alt="INTRON logo"><span class="brand-wordmark"><b>INTRON</b><small>GLOBAL</small></span></a><nav class="nav"><a href="about.html">${d.navAbout}</a><a href="materials.html">${d.navMaterials}</a><a href="index.html#network">${d.navNetwork}</a><a href="contact.html">${d.navContact}</a></nav><div class="header-actions"><button class="language-toggle" type="button" aria-label="${lang === 'ko' ? '언어 변경' : 'Change language'}"><span class="${lang === 'en' ? 'active' : ''}">EN</span><span>/</span><span class="${lang === 'ko' ? 'active' : ''}">KR</span></button><button class="menu-toggle" type="button" aria-label="${lang === 'ko' ? '메뉴 열기' : 'Open menu'}" aria-expanded="false"><span></span><span></span></button></div></header>`;
}

function footer(d) {
  const footerCta = page === 'contact' ? '' : `<div class="footer-top"><div><p class="eyebrow light">${d.footerEyebrow}</p><h2>${d.footerTitle}</h2></div><a class="button button-primary" href="contact.html">${d.footerButton} <span>↗</span></a></div>`;
  return `<footer class="footer footer-rich" id="footer-contact">${footerCta}<div class="footer-bottom"><a class="brand footer-brand" href="index.html"><img class="brand-logo brand-logo-light" src="assets/intron-logo-white.png" alt="INTRON logo"><span class="brand-wordmark"><b>INTRON</b><small>GLOBAL</small></span></a><div class="footer-company"><strong>INTRON GLOBAL CO., LTD.</strong><br>${d.footerBusiness}<br>${d.footerAddress}</div><div class="footer-contact"><a href="mailto:intron1101@gmail.com">intron1101@gmail.com</a><br>FAX. 0504-423-5748<br>© ${new Date().getFullYear()} INTRON GLOBAL CO., LTD.</div><a href="#top" class="to-top">${d.toTop}</a></div></footer>`;
}

function render() {
  const common = lang === 'en' ? { navAbout:'About',navMaterials:'Products',navNetwork:'Network',navContact:'Contact',footerEyebrow:'TRADE INQUIRIES',footerTitle:'Discuss your sourcing<br>and trade requirements.',footerButton:'Contact our trading team',footerBusiness:'Import · Export · Wholesale · Distribution',footerAddress:'1, DONGBAEK 1-RO 37BEON-GIL, GIHEUNG-GU, 17012 YONGIN-SI, KOREA',toTop:'BACK TO TOP ↑' } : { navAbout:'회사소개',navMaterials:'취급품목',navNetwork:'글로벌 네트워크',navContact:'문의',footerEyebrow:'무역·거래 문의',footerTitle:'제품 소싱·수출입 문의를<br>편하게 남겨 주세요.',footerButton:'제품·거래 문의하기',footerBusiness:'수출입·도매·유통',footerAddress:'경기도 용인시 기흥구 동백1로37번길 1 (우) 17012',toTop:'맨 위로 ↑' };
  const d = pages[page][lang];
  const content = page === 'materials' ? `<section class="sub-content portfolio-grid">${d.groups.map(g => `<article class="portfolio-card"><span>${g[0]}</span><p class="eyebrow">${g[1]}</p><h2>${g[2]}</h2><ul>${g[3].map(i=>`<li>${i}</li>`).join('')}</ul></article>`).join('')}</section><section class="sub-closing"><p class="eyebrow">INTRON GLOBAL</p><h2>${d.afterTitle}</h2><p>${d.after}</p><a class="button button-primary" href="contact.html">${common.footerButton} <span>↗</span></a></section>` : page === 'contact' ? `<section class="sub-content contact-page"><p class="contact-helper">${d.helper}</p><div class="contact-page-cards">${d.cards.map((c,i)=>`<article><span>${c[0]}</span>${i === 0 ? `<a href="mailto:${c[1]}">${c[1]}</a>` : `<p>${c[1]}</p>`}</article>`).join('')}</div><a class="button button-primary" href="mailto:intron1101@gmail.com">${d.button}</a></section>` : `<section class="sub-content about-page"><p class="about-page-lead">${d.lead}</p><div class="fact-grid">${d.facts.map((f,i)=>`<article><span>0${i+1}</span><h3>${f[0]}</h3><p>${f[1]}</p></article>`).join('')}</div><div class="about-statement"><p class="eyebrow">INTRON GLOBAL</p><h2>${d.sectionTitle}</h2><p>${d.copy}</p><a class="button button-primary" href="materials.html">${common.navMaterials} <span>↗</span></a></div></section>`;
  document.documentElement.lang = lang;
  document.title = `${page === 'about' ? common.navAbout : page === 'materials' ? common.navMaterials : common.navContact} | INTRON GLOBAL`;
  document.getElementById('app').innerHTML = `<div class="site-shell sub-shell" id="top">${nav(common)}<main><section class="sub-hero"><div><p class="eyebrow light">${d.label}</p><h1>${d.title}</h1><p>${d.intro}</p></div><span class="sub-page-index">0${['about','materials','contact'].indexOf(page)+1}</span></section>${content}</main>${footer(common)}</div>`;
  document.querySelector(`.nav a[href="${page}.html"]`)?.setAttribute('aria-current', 'page');
  document.querySelector('.language-toggle').addEventListener('click', () => { lang = lang === 'en' ? 'ko' : 'en'; render(); });
  const menu = document.querySelector('.menu-toggle'); const menuNav = document.querySelector('.nav');
  menu.addEventListener('click', () => { const open = menuNav.classList.toggle('open'); menu.setAttribute('aria-expanded', open); });
  const closeMenu = () => { menuNav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); };
  menuNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  window.matchMedia('(min-width: 1101px)').addEventListener('change', closeMenu);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuNav.classList.contains('open')) { closeMenu(); menu.focus(); }
  });
  if (page === 'contact') renderInquiryForm(lang);
}
render();


function renderInquiryForm(locale) {
  window.IntronContactForm.render(locale);
}
