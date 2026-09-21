/* 焦信達實驗室網站 — 資料驅動前端
   所有內容來自 data/*.json，修改 JSON 即可更新網頁，不需改動此檔。 */

const DATA = {};
const PUB_TYPES = {
  journal_intl: '國際期刊',
  conf_intl: '國際研討會',
  standard: '國際標準提案',
  journal_zh: '國內期刊與專書',
  conf_zh: '國內研討會',
  report: '技術報告與法規',
  patent: '專利'
};

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const hl = (text, q) => {
  const t = esc(text);
  if (!q) return t;
  try {
    return t.replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`);
  } catch (e) { return t; }
};

async function loadAll() {
  const files = ['profile', 'publications', 'projects', 'patents', 'site', 'research'];
  const res = await Promise.all(files.map(f =>
    fetch(`data/${f}.json`, { cache: 'no-store' }).then(r => {
      if (!r.ok) throw new Error(`data/${f}.json 讀取失敗 (${r.status})`);
      return r.json();
    })
  ));
  files.forEach((f, i) => DATA[f] = res[i]);
}

/* ---------- 各頁面 ---------- */

function pageHome() {
  const p = DATA.profile, s = DATA.site;
  const pubs = DATA.publications;
  const n = t => pubs.filter(x => x.type === t).length;

  return `
  <div class="hero">
    <div>
      <h1>${esc(p.tagline).replace(/\n/g, '<br>')}</h1>
      <p class="lead">${esc(p.intro)}</p>
      <div class="pills">${p.expertise.map(x => `<span>${esc(x)}</span>`).join('')}</div>
    </div>
    <aside class="panel">
      <h2>最新消息</h2>
      ${s.news.map(x => `<div class="news-item"><b>${esc(x.date)}</b><p>${esc(x.text)}</p></div>`).join('')}
    </aside>
  </div>

  <section class="block">
    <h2 class="sec">研究主題</h2>
    <p class="sec-note">實驗室目前的三條主要研究線。</p>
    <div class="cards">
      ${p.research_areas.map(a => `<div><h3>${esc(a.title)}</h3><p>${esc(a.desc)}</p></div>`).join('')}
    </div>
  </section>

  <section class="block">
    <h2 class="sec">研究成果概況</h2>
    <p class="sec-note">累計至今的發表與技術產出。</p>
    <div class="numbers">
      <div><b>${n('journal_intl')}</b><span>國際期刊論文</span></div>
      <div><b>${n('conf_intl')}</b><span>國際研討會論文</span></div>
      <div><b>${DATA.patents.length}</b><span>已獲證專利</span></div>
      <div><b>${DATA.projects.length}</b><span>執行研究計畫</span></div>
    </div>
  </section>

  <section class="block">
    <h2 class="sec">近期研究計畫</h2>
    <p class="sec-note">執行中與近年完成的計畫。<a href="#/projects">查看全部 →</a></p>
    <div class="simple">
      ${DATA.projects.slice(0, 6).map(x => `
        <div class="row">
          <div class="k">${esc(x.start)} – ${esc(x.end)}</div>
          <p class="v">${esc(x.title)}<small>${esc(x.funder)}　${esc(x.role)}</small></p>
        </div>`).join('')}
    </div>
  </section>
  ${awardsBlock()}
  ${talksBlock()}`;
}

let pubState = { type: 'all', q: '' };

/* 專利轉成與著作相同的欄位格式，方便一起篩選、搜尋、排序 */
function allWorks() {
  const patents = DATA.patents.map(p => ({
    type: 'patent', year: p.year, title: p.title, authors: p.inventors,
    venue: `${p.country}專利　${p.number}　· ${p.date}`, note: '', corresponding: false
  }));
  return DATA.publications.concat(patents);
}

function pagePublications() {
  const types = Object.keys(PUB_TYPES);
  return `
  <section class="block" style="border-top:none;padding-top:44px">
    <h2 class="sec">發表著作</h2>
    <p class="sec-note">共 ${DATA.publications.length} 筆論文與 ${DATA.patents.length} 件已獲證專利。可依類型篩選或以關鍵字搜尋（標題、作者、期刊名、專利號皆可）。</p>
    <div class="filters">
      <button data-type="all" class="${pubState.type === 'all' ? 'on' : ''}">全部</button>
      ${types.map(t => `<button data-type="${t}" class="${pubState.type === t ? 'on' : ''}">${PUB_TYPES[t]}</button>`).join('')}
      <input class="search" type="search" placeholder="搜尋關鍵字…" value="${esc(pubState.q)}">
    </div>
    <div id="pub-list"></div>
  </section>`;
}

function renderPubs() {
  const box = document.getElementById('pub-list');
  if (!box) return;
  const q = pubState.q.trim().toLowerCase();
  const list = allWorks().filter(p =>
    (pubState.type === 'all' || p.type === pubState.type) &&
    (!q || (p.title + ' ' + p.authors + ' ' + p.venue).toLowerCase().includes(q))
  );
  if (!list.length) { box.innerHTML = `<p class="empty">沒有符合的著作。</p>`; return; }

  const years = [...new Set(list.map(p => p.year))].sort((a, b) => b - a);
  box.innerHTML = years.map(y => `
    <div class="rail">
      <div class="rail-year">${y}</div>
      <div class="rail-items">
        ${list.filter(p => p.year === y).map(p => `
          <div class="entry">
            <p class="t">
              <span class="badge">${PUB_TYPES[p.type] || ''}</span>
              ${p.corresponding ? '<span class="badge corr">通訊作者</span>' : ''}
              ${hl(p.title, pubState.q)}
            </p>
            <p class="a">${hl(p.authors, pubState.q)}</p>
            <p class="v">${hl(p.venue, pubState.q)}${p.note ? '　· ' + esc(p.note) : ''}</p>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

function pageProjects() {
  const cats = [
    ['主持研究計畫', 'host'],
    ['其他參與重要研究計畫', 'other']
  ];
  const orgs = ['東海大學', '工研院資通所'];

  return `
  <section class="block" style="border-top:none;padding-top:44px">
    <h2 class="sec">研究計畫</h2>
    <p class="sec-note">共 ${DATA.projects.length} 項，依主持／參與身分與服務單位分類。</p>
    ${cats.map(([label, cat]) => {
      const inCat = DATA.projects.filter(p => p.category === cat);
      return `
      <h3 class="cat-head">${label}（${inCat.length}）</h3>
      ${orgs.map(org => {
        const list = inCat.filter(p => p.org === org);
        if (!list.length) return '';
        return `
        <h4 class="org-head">${org}</h4>
        <div class="simple">
          ${list.map(x => `
            <div class="row">
              <div class="k">${esc(x.start)} – ${esc(x.end)}</div>
              <p class="v">${esc(x.title)}<small>${esc(x.funder)}　${esc(x.role)}</small></p>
            </div>`).join('')}
        </div>`;
      }).join('')}`;
    }).join('')}
  </section>`;
}

function pageResearch() {
  const r = DATA.research;
  return `
  <section class="block" style="border-top:none;padding-top:44px">
    <h2 class="sec">實驗室研究方向簡介　<span class="year-tag">${esc(r.year)}</span></h2>
    <p class="sec-note">${esc(r.lab_name)}　指導老師：${esc(r.advisor)}</p>
    <p class="lead-text">${esc(r.lead)}</p>
    ${r.pdf && r.pdf.file ? `
      <a class="dl" href="${esc(r.pdf.file)}" download>
        <span class="dl-icon">PDF</span>
        <span><b>${esc(r.pdf.label)}</b><small>${esc(r.pdf.note)}</small></span>
      </a>` : ''}
  </section>

  <section class="block">
    <h2 class="sec">方向與特色</h2>
    <div class="feat">
      ${r.features.map((f, i) => `
        <div class="feat-item">
          <span class="num">${i + 1}</span>
          <div><h3>${esc(f.title)}</h3><p>${esc(f.desc)}</p></div>
        </div>`).join('')}
    </div>
  </section>

  <section class="block">
    <h2 class="sec">研究主題</h2>
    <p class="sec-note">本實驗室目前及近期的研究主題涵蓋以下四個面向。</p>
    ${r.topics.map(t => `
      <h3 class="cat-head">${esc(t.group)}</h3>
      <ul class="plain">${t.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`).join('')}
  </section>

  <section class="block">
    <h2 class="sec">研究成果</h2>
    ${r.achievements.map(a => `
      <h3 class="cat-head">${esc(a.group)}</h3>
      <ul class="plain">${a.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`).join('')}
  </section>`;
}

/* 依年份分組的通用時間軸 */
function yearRail(list, render) {
  const known = list.filter(x => x.year);
  const unknown = list.filter(x => !x.year);
  const years = [...new Set(known.map(x => String(x.year).slice(0, 4)))].sort((a, b) => b - a);
  const block = (label, items) => `
    <div class="rail">
      <div class="rail-year">${label}</div>
      <div class="rail-items">${items.map(render).join('')}</div>
    </div>`;
  return years.map(y => block(y, known.filter(x => String(x.year).startsWith(y)))).join('')
       + (unknown.length ? block('其他', unknown) : '');
}

function awardsBlock(style) {
  const list = DATA.profile.awards;
  return `
  <section class="block" ${style || ''}>
    <h2 class="sec">獲獎</h2>
    <p class="sec-note">共 ${list.length} 項，依時間排列。</p>
    ${yearRail(list, a => `<div class="entry"><p class="t">${esc(a.title)}</p></div>`)}
  </section>`;
}

function talksBlock(style) {
  const list = [...DATA.profile.talks].sort((a, b) => String(b.year).localeCompare(String(a.year)));
  return `
  <section class="block" ${style || ''}>
    <h2 class="sec">對外演講</h2>
    <p class="sec-note">共 ${list.length} 場，依時間排列。</p>
    ${yearRail(list, t => `
      <div class="entry">
        <p class="t">${esc(t.title)}</p>
        <p class="v">${esc(t.host)}　· ${esc(t.year)}</p>
      </div>`)}
  </section>`;
}

const PAGE_TOP = 'style="border-top:none;padding-top:44px"';
function pageAwards() { return awardsBlock(PAGE_TOP); }
function pageTalks() { return talksBlock(PAGE_TOP); }

function pageAbout() {
  const p = DATA.profile, s = DATA.site;
  return `
  <section class="block" style="border-top:none;padding-top:44px">
    <h2 class="sec">${esc(p.name_zh)}　${esc(p.name_en)}</h2>
    <p class="sec-note">${esc(p.dept)}　${esc(p.title)}</p>
    <div class="two-col">
      <div>
        <h3 style="font-family:'Noto Serif TC',serif;color:var(--ink);font-size:16px;margin:0 0 8px">學歷</h3>
        <div class="simple">
          ${p.education.map(e => `<div class="row"><div class="k">${esc(e.year)}</div><p class="v">${esc(e.school)} ${esc(e.dept)}<small>${esc(e.degree)}</small></p></div>`).join('')}
        </div>
        <p style="font-size:14px;color:var(--muted);margin-top:14px">博士論文：${esc(p.dissertation)}</p>
      </div>
      <div>
        <h3 style="font-family:'Noto Serif TC',serif;color:var(--ink);font-size:16px;margin:0 0 8px">聯絡方式</h3>
        <div class="simple">
          <div class="row"><div class="k">電子郵件</div><p class="v"><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></p></div>
          <div class="row"><div class="k">電話</div><p class="v">${esc(p.phone)}</p></div>
        </div>
        <h3 style="font-family:'Noto Serif TC',serif;color:var(--ink);font-size:16px;margin:22px 0 8px">授課科目</h3>
        <ul class="plain">${s.courses.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
      </div>
    </div>
  </section>

  <section class="block">
    <h2 class="sec">經歷</h2>
    <div class="simple">
      ${p.experience.map(e => `<div class="row"><div class="k">${esc(e.period)}</div><p class="v">${esc(e.org)}<small>${esc(e.role)}</small></p></div>`).join('')}
    </div>
  </section>
`;
}

function pagePeople() {
  const groups = [...new Set(DATA.site.members.map(m => m.group))];
  return `
  <section class="block" style="border-top:none;padding-top:44px">
    <h2 class="sec">實驗室成員</h2>
    <p class="sec-note">歡迎對無人機、通訊系統與大型語言模型應用有興趣的同學加入。</p>
    ${groups.map(g => `
      <h3 style="font-family:'Noto Serif TC',serif;color:var(--ink);font-size:17px;margin:26px 0 8px">${esc(g)}</h3>
      <div class="simple">
        ${DATA.site.members.filter(m => m.group === g).map(m => `
          <div class="row"><div class="k">${esc(m.year)}</div><p class="v">${esc(m.name)}<small>${esc(m.topic)}</small></p></div>`).join('')}
      </div>`).join('')}
  </section>`;
}

/* ---------- 路由 ---------- */

const ROUTES = [
  ['#/', '首頁', pageHome],
  ['#/research', '研究方向', pageResearch],
  ['#/publications', '發表著作', pagePublications],
  ['#/projects', '研究計畫', pageProjects],
  ['#/awards', '獲獎', pageAwards],
  ['#/talks', '對外演講', pageTalks],
  ['#/about', '教師簡歷', pageAbout],
  ['#/people', '成員', pagePeople]
];

function render() {
  if (location.hash === '#/patents') { pubState.type = 'patent'; location.replace('#/publications'); return; }
  const hash = location.hash || '#/';
  const route = ROUTES.find(r => r[0] === hash) || ROUTES[0];
  document.getElementById('app').innerHTML = route[2]();
  document.title = `${route[1]} — ${DATA.profile.name_zh} ${DATA.profile.lab_name}`;
  document.querySelectorAll('nav.main a').forEach(a =>
    a.classList.toggle('active', a.getAttribute('href') === route[0]));
  if (hash === '#/publications') {
    renderPubs();
    document.querySelectorAll('.filters button').forEach(b => b.addEventListener('click', () => {
      pubState.type = b.dataset.type;
      document.querySelectorAll('.filters button').forEach(x => x.classList.toggle('on', x === b));
      renderPubs();
    }));
    const box = document.querySelector('.search');
    box.addEventListener('input', () => { pubState.q = box.value; renderPubs(); });
  }
  window.scrollTo(0, 0);
}

function buildChrome() {
  const p = DATA.profile;
  document.getElementById('brand').innerHTML =
    `${esc(p.name_zh)} ${esc(p.lab_name)}<small>${esc(p.dept)}</small>`;
  document.getElementById('nav').innerHTML =
    ROUTES.map(r => `<a href="${r[0]}">${r[1]}</a>`).join('');
  document.getElementById('foot').innerHTML =
    `<div>${esc(p.dept)}　${esc(p.name_zh)} ${esc(p.title)}</div>
     <div><a href="mailto:${esc(p.email)}">${esc(p.email)}</a>　${esc(p.phone)}</div>`;
}

(async function () {
  try {
    await loadAll();
    buildChrome();
    window.addEventListener('hashchange', render);
    render();
  } catch (e) {
    document.getElementById('app').innerHTML =
      `<div class="loading">資料載入失敗：${esc(e.message)}<br><br>
       若是在本機直接開啟檔案，請改用 <code>python -m http.server</code> 啟動後再瀏覽，
       或直接部署到 GitHub Pages。</div>`;
  }
})();
