import Reveal from 'reveal.js';
import Notes from 'reveal.js/plugin/notes/notes.esm.js';
import { gsap } from 'gsap';
import { createLiquidGlass } from 'liquid-glass-web';
import { createArchitectureAnimation } from './animations/architecture.js';
import team from './data/team.js';
import 'reveal.js/dist/reveal.css';
import 'liquid-glass-web/style.css';
import './style.css';

const A = '/assets/';
const icon = `<img class="icon" src="${A}icon.png" alt="Study Agent">`;
const note = '<aside class="notes">Короткая техническая заметка. Полный текст выступления можно добавить позже.</aside>';
const section = (n, k, title, body) => `<section><div class="eyebrow">STUDY AGENT <span>${k}</span></div><h2>${title}</h2>${body}<div class="page">${String(n).padStart(2, '0')} / 09</div>${note}</section>`;
const card = (label, sub, idx) => `<div class="card glass-card fragment" data-fragment-index="${idx}"><strong>${label}</strong><small>${sub}</small></div>`;

const archNode = (stage, x, y, title, detail, iconText, extra = '') => {
  const lines = Array.isArray(detail) ? detail : [detail];
  return `<g transform="translate(${x} ${y})"><g class="arch-node glass-node" data-stage="${stage}"><rect width="260" height="110" rx="22"/><text class="node-icon" x="20" y="38">${iconText}</text><text class="node-title" x="54" y="41">${title}</text>${lines.map((line, i) => `<text class="node-detail" x="20" y="${76 + i * 19}">${line}</text>`).join('')}${extra}</g></g>`;
};
const edge = (id, stage, d, label = '') => `<path id="${id}" class="arch-edge" data-stage="${stage}" d="${d}" marker-end="url(#arrow)"/>${label}`;
const packet = (stage, path) => `<circle class="arch-packet" data-stage="${stage}" data-path="${path}" r="7"/>`;
const architecture = `<div class="architecture" data-architecture>
  <div class="arch-phase-head"><span><i>01</i> Подготовка материалов</span><span><i>02</i> Поиск и ответ</span></div>
  <svg class="arch-svg" viewBox="0 0 1720 500" role="img" aria-label="Схема подготовки учебных материалов и поиска с локальной генерацией ответа">
    <defs><linearGradient id="nodeFill" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".98"/><stop offset="1" stop-color="#e5e6e1" stop-opacity=".58"/></linearGradient><marker id="arrow" markerUnits="userSpaceOnUse" markerWidth="26" markerHeight="20" refX="24" refY="10" orient="auto"><path d="M1 1 L24 10 L1 19"/></marker></defs>
    ${edge('e-doc-extract', 2, 'M290 115 H350')}
    ${edge('e-extract-chunk', 4, 'M610 115 H670')}
    ${edge('e-extract-ocr', 3, 'M480 170 V230')}
    ${edge('e-ocr-chunk', 4, 'M610 285 H628 Q640 285 640 273 V212 Q640 200 652 200 H690 Q710 200 710 180 V170')}
    ${edge('e-chunk-db', 5, 'M930 115 H990')}
    ${edge('e-chunk-embed', 6, 'M850 170 V230')}
    ${edge('e-query-retrieve', 7, 'M290 415 H350')}
    ${edge('e-retrieve-context', 8, 'M610 415 H670')}
    ${edge('e-context-llm', 9, 'M930 415 H990')}
    ${edge('e-llm-answer', 10, 'M1250 415 H1330')}
    ${archNode(1, 30, 60, 'Материалы', 'PDF · DOCX · MD · TXT', '▤')}
    ${archNode(2, 350, 60, 'Извлечение', 'цифровой текст и структура', '◉')}
    ${archNode(3, 350, 230, 'Chandra OCR', 'сканы · фото · рукопись', '⌕', '<text class="node-tag" x="20" y="103">НЕОБЯЗАТЕЛЬНО</text>')}
    ${archNode(4, 670, 60, 'Фрагменты', ['текстовые блоки', '+ метаданные'], '≡')}
    ${archNode(5, 990, 60, 'SQLite + FTS5', 'локальный текстовый индекс', '▦')}
    ${archNode(6, 720, 230, 'Эмбеддинги', 'для семантического поиска', '◈')}
    ${archNode(7, 30, 360, 'Вопрос', 'запрос пользователя', '?')}
    <g transform="translate(350 360)"><g class="arch-node arch-retrieval" data-stage="8"><rect width="260" height="110" rx="22"/><text class="node-icon" x="20" y="38">⌕</text><text class="node-title" x="54" y="41">Режим поиска</text><text class="node-detail" x="20" y="76">Лексический · семантический</text><text class="node-detail" x="20" y="95">или гибридный</text></g></g>
    ${archNode(8, 670, 360, 'Контекст', 'подходящие фрагменты', '▧')}
    ${archNode(9, 990, 360, 'Ollama', 'локальная языковая модель', '✦')}
    ${archNode(10, 1330, 360, 'Ответ + источники', ['ссылки на использованные', 'фрагменты'], '↗')}
    ${packet(2, 'e-doc-extract')}${packet(3, 'e-extract-ocr')}${packet(4, 'e-extract-chunk')}${packet(5, 'e-chunk-db')}${packet(6, 'e-chunk-embed')}${packet(7, 'e-query-retrieve')}${packet(8, 'e-retrieve-context')}${packet(9, 'e-context-llm')}${packet(10, 'e-llm-answer')}
  </svg>
  <div class="arch-runtime"><span>Индекс материалов: Python · SQLite</span><b>JSON Lines</b><span>Приложение macOS: SwiftUI</span></div>
  <div class="arch-step-label" aria-live="polite">Материалы поступают в локальную библиотеку</div>
  <div class="arch-triggers" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<span class="fragment" data-fragment-index="${i}"></span>`).join('')}</div>
</div>`;

document.querySelector('#slides').innerHTML = `
<section class="cover"><div class="cover-glow"></div><div class="cover-content glass-hero">${icon}<h1>Study Agent</h1><p>Локальный интеллектуальный агент<br>для поиска и анализа учебных материалов</p><div class="university">МГТУ им. Н. Э. Баумана</div></div><div class="page">01 / 09</div>${note}</section>
${section(2, 'ЛЮДИ', 'Команда разработки', `<p class="lead">Участники проекта</p><div class="team-grid">${team.map(p => `<div class="card glass-card team-member"><img class="team-avatar" src="${A}${p.avatar}" alt="Аватар: ${p.fullName}"><div class="team-info"><strong>${p.fullName}</strong><small>@${p.github}<br>Группа: ${p.academicGroup}<br>Роль: ${p.github === 'gregkorneev' ? p.role.replace(', ', ',<br>') : p.role}</small></div></div>`).join('')}</div>`)}
${section(3, 'ЗАДАЧА', 'Учебные материалы есть.<br><em>Найти нужное — сложно.</em>', `<div class="problem"><div class="file-cloud">${['PDF', 'DOCX', 'MD', 'TXT', 'Изображения'].map(x => `<div class="file glass-pill">${x}</div>`).join('')}</div><div class="problem-arrow fragment" data-fragment-index="1">→</div><div class="solution glass-spotlight fragment" data-fragment-index="1">${icon}<strong>Единая локальная библиотека</strong><small>Материалы из разных папок</small></div></div><p class="conclusion fragment" data-fragment-index="1">Поиск по тексту и смыслу. Ответы — по найденным материалам.</p><p class="footnote">Источники помогают проверить ответ, но не гарантируют фактическую истинность текста модели.</p>`)}
${section(4, 'АРХИТЕКТУРА', 'От документа к ответу', architecture)}
${section(5, 'СТЕК', 'Технологический стек', `<div class="tech-layout"><div class="tech-center glass-hero">${icon}<strong>Study Agent</strong></div><div class="tech-grid">${[['Python','Локальный backend'],['SQLite · FTS5','Локальный индекс'],['Embeddings','Семантический поиск'],['Ollama','Локальная LLM'],['Chandra OCR','Распознавание по настройке'],['SwiftUI','Поддерживаемое приложение macOS'],['WinUI 3','Beta 6.1 · предварительная версия'],['GitHub Actions','Автоматизированные проверки']].map((x,i)=>card(x[0],x[1],i)).join('')}</div></div>`)}
${section(6, 'РАЗРАБОТКА', 'От концепции к работающему приложению', `<div class="timeline">${['Основа и интерфейс','SA-01<br>Индекс','SA-02<br>DOCX / OCR','SA-03<br>Поиск / RAG','SA-04<br>Источники','SA-05 / SA-06<br>Windows / релизы'].map((x,i)=>`<div class="milestone fragment" data-fragment-index="${i}"><i></i><strong>${x}</strong></div>`).join('')}</div><div class="challenges">${[['PDF и OCR','Chandra подключается отдельно и распознаёт визуальный текст при необходимости.'],['Инкрементальная индексация','Неизменённые документы не извлекаются повторно при синхронизации.'],['Проверяемые источники','Ссылки строятся по метаданным найденных фрагментов; модель может ошибаться.'],['Упаковка','Python backend и нативный интерфейс интегрируются отдельно для платформ.']].map((x,i)=>card(x[0],x[1],i+2)).join('')}</div>`)}
${section(7, 'ИНТЕРФЕЙС', 'Библиотека учебных материалов', `<div class="interface library-interface"><div class="screen glass-spotlight"><img src="${A}macos-beta-6.1-library.png" alt="Настоящий экран библиотеки Study Agent"></div><div class="callouts">${[['01','Подключение папок'],['02','Прогресс индексации'],['03','Документы и фрагменты'],['04','Статусы и предупреждения']].map((x,i)=>`<div class="callout fragment" data-fragment-index="${i}"><b>${x[0]}</b> ${x[1]}</div>`).join('')}</div><div class="settings-screen glass-card fragment" data-fragment-index="4"><img src="${A}macos-beta-6.1-settings.png" alt="Настройки Study Agent"><small>Локальная модель и OCR</small></div></div>`)}
${section(8, 'ИНТЕРФЕЙС', 'От вопроса к ответу по источникам', `<div class="interface"><div class="screen glass-spotlight"><img src="${A}macos-beta-6.1-search.png" alt="Настоящий экран поиска Study Agent"></div><div class="callouts">${[['01','Раздел «Поиск»'],['02','Поле вопроса'],['03','Кнопка запуска запроса']].map((x,i)=>`<div class="callout fragment" data-fragment-index="${i}"><b>${x[0]}</b> ${x[1]}</div>`).join('')}<p class="workflow-note">После запроса приложение показывает найденные фрагменты и ответ локальной модели.</p><p class="footnote">На снимке — начальное состояние до запроса. Поиск доступен и без генерации; модель может ошибаться.</p></div></div>`)}
${section(9, 'РЕЗУЛЬТАТ', 'Study Agent', `<div class="final"><div><p class="lead">Локальная работа с учебными материалами</p><div class="result-list"><p>Документы и OCR <span>↗</span></p><p>Локальный индекс и поиск <span>↗</span></p><p>Ответы модели с источниками <span>↗</span></p><p>Приложение для macOS <span>↗</span></p></div><p class="footnote">Windows: Beta 6.1 — предварительный выпуск, приёмка продолжается.</p></div><div class="final-brand">${icon}<img class="qr" src="${A}github-qr.svg" alt="QR-код репозитория"><a href="https://github.com/gregkorneev-BMSTU/study-agent">github.com/gregkorneev-BMSTU/study-agent</a></div></div><div class="thanks fragment">Спасибо за внимание!</div>`)}
`;

const deck = new Reveal({ width: 1920, height: 1080, margin: 0.04, hash: true, controls: false, progress: true, transition: 'fade', transitionSpeed: 'fast', pdfSeparateFragments: false, plugins: [Notes] });
await deck.initialize();
window.deck = deck;

const architectureRoot = document.querySelector('[data-architecture]');
const architectureAnimation = createArchitectureAnimation(architectureRoot);
const archCaptions = [
  'Материалы поступают в локальную библиотеку', 'Извлекается цифровой текст и структура документа',
  'Визуальное содержимое распознаётся при необходимости', 'Текст делится на фрагменты с метаданными',
  'Фрагменты сохраняются в локальном индексе SQLite', 'Для семантического поиска подготавливаются локальные эмбеддинги',
  'Пользователь задаёт вопрос',
  'Выбирается лексический, семантический или гибридный режим',
  'Из найденных фрагментов собирается контекст', 'Локальная модель формирует ответ по контексту',
  'Ответ сопровождается ссылками на найденные источники',
];
const architectureTriggers = [...architectureRoot.querySelectorAll('.arch-triggers .fragment')];
let activeAnimation;

function updateArchitecture() {
  const count = architectureTriggers.filter(el => el.classList.contains('visible')).length;
  architectureAnimation.setProgress(count, false);
  architectureRoot.querySelector('.arch-step-label').textContent = archCaptions[count];
}

function animateLibraryLayout(interfaceElement, expanded) {
  const moving = [...interfaceElement.querySelectorAll('.screen,.callouts')];
  const before = moving.map(element => element.getBoundingClientRect());
  interfaceElement.classList.toggle('is-expanded', expanded);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const after = moving.map(element => element.getBoundingClientRect());
  const timeline = gsap.timeline();
  moving.forEach((element, index) => {
    const from = before[index];
    const to = after[index];
    timeline.fromTo(element, {
      x: from.left - to.left, y: from.top - to.top,
      scaleX: from.width / to.width, scaleY: from.height / to.height,
      transformOrigin: 'top left',
    }, {
      x: 0, y: 0, scaleX: 1, scaleY: 1,
      duration: 0.7, ease: 'power2.inOut', clearProps: 'transform',
    }, 0);
  });
  if (expanded) {
    timeline.fromTo(interfaceElement.querySelector('.settings-screen'),
      { autoAlpha: 0, y: 16 },
      { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.inOut' }, 0);
  }
  return timeline;
}

for (const element of document.querySelectorAll('.glass-hero,.glass-spotlight,.settings')) {
  try { createLiquidGlass(element, { radius: 26, refraction: 82, blur: 3, light: 18, resolution: 0.65, pointer: false }); }
  catch (error) { console.warn('Liquid Glass CSS fallback active', error); }
}
deck.on('fragmentshown', event => {
  if (event.fragment.closest('[data-architecture]')) updateArchitecture();
  if (event.fragment.matches('.callout')) event.fragment.closest('section').querySelector('.screen').dataset.focus = event.fragment.dataset.fragmentIndex;
  if (event.fragment.matches('.settings-screen')) {
    activeAnimation?.kill();
    const interfaceElement = event.fragment.closest('.interface');
    activeAnimation = animateLibraryLayout(interfaceElement, true);
    return;
  }
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const fragmentIndex = event.fragment.dataset.fragmentIndex;
    const group = event.fragment.closest('section').querySelector('.problem')
      ? [...event.fragment.closest('section').querySelectorAll('.fragment')].filter(fragment => fragment.dataset.fragmentIndex === fragmentIndex)
      : [event.fragment];
    if (group[0] !== event.fragment) return;
    activeAnimation?.kill();
    activeAnimation = gsap.fromTo(group, { y: 16, scale: 0.985 }, { y: 0, scale: 1, duration: 0.42, ease: 'power2.out', clearProps: 'transform' });
  }
});
deck.on('fragmenthidden', event => {
  if (event.fragment.closest('[data-architecture]')) updateArchitecture();
  if (event.fragment.matches('.settings-screen')) {
    activeAnimation?.kill();
    activeAnimation = animateLibraryLayout(event.fragment.closest('.interface'), false);
  }
});
deck.on('slidechanged', event => {
  activeAnimation?.kill();
  gsap.set('.fragment', { clearProps: 'transform' });
  document.querySelectorAll('.screen').forEach(screen => delete screen.dataset.focus);
  if (event.previousSlide?.matches('.cover')) {
    gsap.set('.cover-content', { clearProps: 'all' });
  }
  if (event.currentSlide?.querySelector('.problem') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    activeAnimation = gsap.fromTo(event.currentSlide.querySelectorAll('.file'), { y: 16, scale: 0.985 }, { y: 0, scale: 1, duration: 0.42, ease: 'power2.out', clearProps: 'transform' });
  }
  if (event.currentSlide?.querySelector('.team-grid') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    activeAnimation = gsap.fromTo(event.currentSlide.querySelectorAll('.team-grid .card'),
      { autoAlpha: 0, y: 20, scale: 0.985 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, stagger: 0.14, ease: 'power2.out', clearProps: 'transform,opacity,visibility' });
  }
  if (event.currentSlide?.querySelector('[data-architecture]')) updateArchitecture();
});
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && deck.getCurrentSlide()?.matches('.cover')) {
  gsap.fromTo('.cover-content > *', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.65, stagger: 0.16, ease: 'power2.out', clearProps: 'transform,opacity,visibility' });
}
if (deck.getCurrentSlide()?.querySelector('[data-architecture]')) updateArchitecture();
