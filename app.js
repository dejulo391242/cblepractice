'use strict';

const app = document.querySelector('#app');
const confirmDialog = document.querySelector('#confirm-dialog');
const exhibitDialog = document.querySelector('#exhibit-dialog');
const letters = ['A', 'B', 'C', 'D'];
let exams = [];
const states = new Map();
let activeId = null;
let reviewFilter = 'all';
let pendingConfirmation = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function freshState(count) {
  return {answers: Array(count).fill(null), flags: Array(count).fill(false), current: 0, submitted: false};
}

function storageKey(id) { return `customs-practice-v1-${id}`; }

function loadState(id) {
  const count = exams.find(exam => exam.id === id).questions.length;
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (!raw) return freshState(count);
    const state = JSON.parse(raw);
    const valid = Array.isArray(state.answers) && state.answers.length === count &&
      state.answers.every(value => value === null || [0,1,2,3].includes(value)) &&
      Array.isArray(state.flags) && state.flags.length === count &&
      state.flags.every(value => typeof value === 'boolean') &&
      Number.isInteger(state.current) && state.current >= 0 && state.current < count &&
      typeof state.submitted === 'boolean';
    return valid ? state : freshState(count);
  } catch {
    document.querySelector('#save-warning').hidden = false;
    return freshState(count);
  }
}

function saveState(id) {
  try { localStorage.setItem(storageKey(id), JSON.stringify(states.get(id))); }
  catch { document.querySelector('#save-warning').hidden = false; }
}

function answeredCount(state) { return state.answers.filter(value => value !== null).length; }

function grade(question, answer) {
  if (question.creditAll) return 'credited';
  if (answer === null) return 'unanswered';
  return question.accepted.includes(answer) ? 'correct' : 'incorrect';
}

function results(exam, state) {
  const totals = {correct: 0, incorrect: 0, unanswered: 0, credited: 0};
  exam.questions.forEach((question, index) => totals[grade(question, state.answers[index])]++);
  totals.score = totals.correct + totals.credited;
  totals.percentage = Number((totals.score / exam.questions.length * 100).toFixed(1));
  return totals;
}

function selectedExam() { return exams.find(exam => exam.id === activeId); }

function navigate(id, push = true) {
  activeId = id;
  reviewFilter = 'all';
  if (push) {
    const url = new URL(location.href);
    if (id) url.searchParams.set('exam', id);
    else url.searchParams.delete('exam');
    history.pushState({}, '', url);
  }
  render();
  window.scrollTo(0, 0);
}

function homeHtml() {
  return `<section class="home"><div class="hero"><div><p class="eyebrow">CBLE PREP</p><h1>Good luck!</h1><p class="intro">Self-paced practice exams with review, answer keys, and a Reference Desk tool.</p></div><div class="hero-stat"><strong>${exams.reduce((total, exam) => total + exam.questions.length, 0)}</strong><span>questions to work through</span></div></div><div class="exam-cards">${exams.map((exam, index) => {
    const state = states.get(exam.id);
    const count = answeredCount(state);
    const result = state.submitted ? results(exam, state) : null;
    return `<article class="exam-card"><div class="card-top"><span class="card-number">${String(index + 1).padStart(2, '0')}</span><span class="badge ${result ? 'done' : ''}">${result ? 'COMPLETED' : count ? 'IN PROGRESS' : 'READY WHEN YOU ARE'}</span></div><h2>${escapeHtml(exam.title)}</h2><p class="meta">${exam.questions.length} questions · Original order · Self-paced</p><div class="card-progress"><div class="progress-label"><span>${result ? `Score ${result.score} / ${exam.questions.length}` : `${count} of ${exam.questions.length} answered`}</span><span>${result ? `${result.percentage}%` : count ? 'Progress saved' : 'New attempt'}</span></div><div class="progress-track"><div style="width:${result ? result.percentage : count / exam.questions.length * 100}%"></div></div></div><div class="card-actions"><button class="button primary" data-open="${exam.id}">${result ? 'Review results' : count ? 'Continue exam' : 'Start exam'} <span aria-hidden="true">→</span></button>${count || state.submitted ? `<button class="button quiet" data-reset="${exam.id}">Start over</button>` : ''}</div></article>`;
  }).join('')}</div><div class="home-notes"><p>Answer, skip, or flag a question to revisit. Progress is saved in this browser.</p><p>Scoring follows the supplied answer keys, including their notes about multiple accepted answers and credited questions.</p></div></section>`;
}

function navigationHtml(exam, state) {
  const count = answeredCount(state);
  return `<aside class="navigator" aria-label="Question navigation"><h3>${state.submitted ? 'Review questions' : 'Your progress'}</h3><div class="progress-label"><span>${count} / ${exam.questions.length} answered</span><span>${state.flags.filter(Boolean).length} flagged</span></div><div class="progress-track"><div style="width:${count / exam.questions.length * 100}%"></div></div><div class="question-grid">${exam.questions.map((question, index) => {
    const status = state.submitted ? grade(question, state.answers[index]) : state.answers[index] !== null ? 'answered' : 'unanswered';
    const classes = [status === 'correct' ? 'answered' : status, index === state.current ? 'current' : '', state.flags[index] ? 'flagged' : ''].join(' ');
    return `<button class="qnav ${classes}" data-question="${index}" ${index === state.current ? 'aria-current="step"' : ''} aria-label="Question ${index + 1}, ${status}${state.flags[index] ? ', flagged' : ''}">${index + 1}</button>`;
  }).join('')}</div><div class="nav-legend"><span><i class="legend-dot"></i>${state.submitted ? 'Correct' : 'Answered'}</span><span><i class="legend-dot amber"></i>${state.submitted ? 'Credit / flag' : 'Flagged'}</span>${state.submitted ? '<span><i class="legend-dot red"></i>Missed</span>' : ''}</div><p class="nav-counts">Select any number to jump to a question.</p></aside>`;
}

function filteredIndices(exam, state) {
  return exam.questions.map((_, index) => index).filter(index => {
    if (!state.submitted || reviewFilter === 'all') return true;
    if (reviewFilter === 'flagged') return state.flags[index];
    const status = grade(exam.questions[index], state.answers[index]);
    return reviewFilter === 'missed' ? ['incorrect', 'unanswered'].includes(status) : status === reviewFilter;
  });
}

function exhibitsHtml(question) {
  let html = '';
  if (question.referenceText) html += `<details class="exhibits"><summary>Shared facts for this question</summary><div class="reference-text">${escapeHtml(question.referenceText)}</div></details>`;
  if (question.exhibits.length) html += `<details class="exhibits" open><summary>Source documents · select an image to enlarge</summary><div class="exhibit-items">${question.exhibits.map((exhibit, index) => `<button class="exhibit-thumb" data-exhibit="${index}" aria-label="Enlarge ${escapeHtml(exhibit.label)}"><img src="${escapeHtml(exhibit.src)}" alt="${escapeHtml(exhibit.label)}"><span>${escapeHtml(exhibit.label)} ↗</span></button>`).join('')}</div></details>`;
  if (question.sourcePages?.length) html += `<details class="exhibits"><summary>View original question page</summary><div class="exhibit-items">${question.sourcePages.map(exhibit => `<a href="${escapeHtml(exhibit.src)}" target="_blank" rel="noopener"><img style="max-width:100%;height:auto" src="${escapeHtml(exhibit.src)}" alt="${escapeHtml(exhibit.label)}" loading="lazy"><span>${escapeHtml(exhibit.label)} ↗</span></a>`).join('')}</div></details>`;
  return html;
}

function questionHtml(exam, state) {
  const indices = filteredIndices(exam, state);
  if (!indices.length) return '<div class="review-empty"><h2>No questions in this view</h2><button class="button secondary" id="show-all">Show all questions</button></div>';
  const index = state.current;
  const question = exam.questions[index];
  const answer = state.answers[index];
  const status = grade(question, answer);
  const position = indices.indexOf(index);
  const statusText = {correct:'Correct', incorrect:'Incorrect', unanswered:'Unanswered', credited:'Credit granted by the source key'};
  const accepted = question.accepted.map(value => letters[value]).join(' or ');
  return `<article class="question-card"><div class="question-heading"><div><h2 id="question-title" tabindex="-1">Question ${question.number}</h2><p class="question-category">${escapeHtml(question.category)}</p></div><button id="flag-button" class="button flag-button ${state.flags[index] ? 'active' : ''}" aria-pressed="${state.flags[index]}">${state.flags[index] ? '⚑ Flagged' : '⚐ Flag for review'}</button></div>${state.submitted ? `<div class="status-line ${status}">${statusText[status]}${question.creditAll ? '' : ` · Accepted answer ${accepted}`}</div>` : ''}<div class="stem">${escapeHtml(question.stem)}</div>${exhibitsHtml(question)}<fieldset class="options"><legend class="sr-only">Choose one answer for question ${question.number}</legend>${question.options.map((option, optionIndex) => {
    const selected = answer === optionIndex;
    const correct = state.submitted && !question.creditAll && question.accepted.includes(optionIndex);
    const wrong = state.submitted && selected && !correct && !question.creditAll;
    const tags = state.submitted ? [selected ? 'Your answer' : '', correct ? 'Accepted answer' : ''].filter(Boolean).join(' · ') : '';
    return `<label class="option ${selected ? 'selected' : ''} ${correct ? 'correct' : ''} ${wrong ? 'wrong' : ''}"><input id="answer-${optionIndex}" name="answer" type="radio" value="${optionIndex}" ${selected ? 'checked' : ''} ${state.submitted ? 'disabled' : ''}><span class="option-letter">${letters[optionIndex]}</span><span class="option-text">${escapeHtml(option)}${tags ? `<span class="option-tags">${tags}</span>` : ''}</span></label>`;
  }).join('')}</fieldset>${state.submitted ? `<section class="explanation"><h3>${escapeHtml(exam.explanationLabel || 'Source explanation')}</h3>${question.scoringNote ? `<p>${escapeHtml(question.scoringNote)}</p><br>` : ''}<p>${escapeHtml(question.reason)}</p></section>` : ''}<div class="question-footer"><div>${!state.submitted ? `<button id="clear-answer" class="button quiet clear-answer" ${answer === null ? 'disabled' : ''}>Clear answer</button>` : `<span class="question-position">${position + 1} of ${indices.length} in this view</span>`}</div><div><button id="previous" class="button secondary" ${position <= 0 ? 'disabled' : ''}>← Previous</button>${position < indices.length - 1 ? '<button id="next" class="button primary">Next →</button>' : state.submitted ? '<button id="back-to-results" class="button primary">Results ↑</button>' : '<button id="finish" class="button primary">Finish exam</button>'}</div></div></article>`;
}

function resultHtml(exam, state) {
  const result = results(exam, state);
  return `<section class="result-banner" aria-label="Exam results"><div><p>EXAM COMPLETE</p><div class="result-score">${result.percentage}% <small>${result.score} / ${exam.questions.length}</small></div></div><div><h2>Your results</h2><p>Review each answer and the explanation from your source key.</p><div class="result-stats"><p><strong>${result.correct}</strong>Correct</p><p><strong>${result.incorrect + result.unanswered}</strong>Missed / blank</p><p><strong>${result.credited}</strong>Auto-credited</p></div></div><button class="button" data-reset="${exam.id}">New attempt</button></section>`;
}

function examHtml(exam, state) {
  const indices = filteredIndices(exam, state);
  if (indices.length && !indices.includes(state.current)) state.current = indices[0];
  return `<section class="workspace"><div class="exam-topbar"><div class="topbar-left"><button class="button quiet" id="back-home" aria-label="Back to exams">←</button><h1 class="exam-title">${escapeHtml(exam.title)}<span>${state.submitted ? 'Results and answer review' : `Practice exam · ${exam.questions.length} questions`}</span></h1></div><div class="topbar-right"><span class="saved">Saved on this browser</span>${state.submitted ? '' : '<button id="submit-exam" class="button primary">Submit exam</button>'}</div></div>${state.submitted ? resultHtml(exam, state) : ''}<div class="exam-layout">${navigationHtml(exam, state)}<div class="question-panel">${state.submitted ? `<div class="review-filter"><label for="review-filter">Review</label><select id="review-filter">${[['all','All questions'],['missed','Incorrect and unanswered'],['correct','Correct answers'],['credited','Credited questions'],['flagged','Flagged questions']].map(([value,label]) => `<option value="${value}" ${reviewFilter === value ? 'selected' : ''}>${label}</option>`).join('')}</select></div>` : ''}${questionHtml(exam, state)}</div></div></section>`;
}

function render(focusId = null) {
  const exam = selectedExam();
  app.innerHTML = exam ? examHtml(exam, states.get(exam.id)) : homeHtml();
  if (focusId) document.getElementById(focusId)?.focus({preventScroll: true});
}

function jumpTo(index, resetFilter = false) {
  if (resetFilter) reviewFilter = 'all';
  const state = states.get(activeId);
  state.current = index;
  saveState(activeId);
  render();
  document.querySelector('#question-title')?.focus({preventScroll: true});
  document.querySelector('.question-panel')?.scrollIntoView({block:'start', behavior:'instant'});
}

function askConfirmation(title, message, label, callback, cancelLabel = 'Keep working') {
  document.querySelector('#confirm-title').textContent = title;
  document.querySelector('#confirm-message').textContent = message;
  document.querySelector('#confirm-yes').textContent = label;
  document.querySelector('#confirm-cancel').textContent = cancelLabel;
  pendingConfirmation = callback;
  confirmDialog.showModal();
  document.querySelector('#confirm-cancel').focus();
}

function submitExam() {
  const state = states.get(activeId);
  if (state.submitted) return;
  const remaining = selectedExam().questions.length - answeredCount(state);
  askConfirmation('Ready to submit?', remaining ? `You have ${remaining} unanswered question${remaining === 1 ? '' : 's'}. Submitting ends this attempt and reveals your score and answer explanations.` : 'All questions are answered. Submit to see your score and review the answer explanations.', 'Submit exam', () => {
    state.submitted = true;
    state.current = 0;
    saveState(activeId);
    reviewFilter = 'all';
    render();
    window.scrollTo(0, 0);
  });
}

function restartExam(id) {
  const exam = exams.find(item => item.id === id);
  askConfirmation('Start a new attempt?', `This will clear your saved ${exam.title} answers, flags, and score in this browser.`, 'Start new attempt', () => {
    states.set(id, freshState(exam.questions.length));
    saveState(id);
    navigate(id);
  }, 'Cancel');
}

app.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.open) { navigate(button.dataset.open); return; }
  if (button.dataset.reset) { restartExam(button.dataset.reset); return; }
  if (button.id === 'back-home') { navigate(null); return; }
  if (!activeId) return;
  const exam = selectedExam();
  const state = states.get(activeId);
  if (button.dataset.question !== undefined) { jumpTo(Number(button.dataset.question), true); return; }
  if (button.dataset.exhibit !== undefined) {
    const exhibit = exam.questions[state.current].exhibits[Number(button.dataset.exhibit)];
    document.querySelector('#exhibit-image').src = exhibit.src;
    document.querySelector('#exhibit-image').alt = exhibit.label;
    document.querySelector('#exhibit-title').textContent = exhibit.label;
    document.querySelector('#exhibit-original').href = exhibit.src;
    exhibitDialog.showModal();
    return;
  }
  if (button.id === 'flag-button') {
    state.flags[state.current] = !state.flags[state.current];
    saveState(activeId); render('flag-button'); return;
  }
  if (button.id === 'clear-answer' && !state.submitted) {
    state.answers[state.current] = null; saveState(activeId); render('answer-0'); return;
  }
  if (button.id === 'submit-exam' || button.id === 'finish') { submitExam(); return; }
  if (button.id === 'show-all') { reviewFilter = 'all'; render(); return; }
  if (button.id === 'back-to-results') { window.scrollTo(0, 0); return; }
  const indices = filteredIndices(exam, state);
  const position = indices.indexOf(state.current);
  if (button.id === 'next' && position < indices.length - 1) jumpTo(indices[position + 1]);
  if (button.id === 'previous' && position > 0) jumpTo(indices[position - 1]);
});

app.addEventListener('change', event => {
  const state = states.get(activeId);
  if (event.target.name === 'answer' && state && !state.submitted) {
    state.answers[state.current] = Number(event.target.value);
    saveState(activeId);
    render(event.target.id);
  }
  if (event.target.id === 'review-filter') {
    reviewFilter = event.target.value;
    render('review-filter');
    saveState(activeId);
  }
});

document.querySelector('#confirm-cancel').addEventListener('click', () => { pendingConfirmation = null; confirmDialog.close(); });
document.querySelector('#confirm-yes').addEventListener('click', () => {
  const action = pendingConfirmation;
  pendingConfirmation = null;
  confirmDialog.close();
  action?.();
});
confirmDialog.addEventListener('cancel', () => { pendingConfirmation = null; });
document.querySelector('#exhibit-close').addEventListener('click', () => exhibitDialog.close());
document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); navigate(null); });
window.addEventListener('popstate', () => { navigate(new URL(location.href).searchParams.get('exam'), false); });

async function initialize() {
  try {
    const response = await fetch('exams.json');
    if (!response.ok) throw new Error('Question file unavailable');
    exams = await response.json();
    for (const exam of exams) states.set(exam.id, loadState(exam.id));
    navigate(new URL(location.href).searchParams.get('exam'), false);
  } catch {
    app.innerHTML = '<div class="loading"><h2>The exams could not load.</h2><p>Check your connection and reload this page.</p><button class="button primary" onclick="location.reload()">Try again</button></div>';
  }
}
initialize();
