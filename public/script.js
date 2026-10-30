const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.page-section');
const resumeForm = document.getElementById('resumeForm');
const resumeText = document.getElementById('resumeText');
const targetRole = document.getElementById('targetRole');
const resumeFile = document.getElementById('resumeFile');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const resultsContainer = document.getElementById('resultsContainer');
const clearFormBtn = document.getElementById('clearForm');
const summaryBadge = document.getElementById('summaryBadge');
const skillsBadge = document.getElementById('skillsBadge');
const resumeSummaryContent = document.getElementById('resumeSummaryContent');
const skillsAnalysisContent = document.getElementById('skillsAnalysisContent');
const jobRecommendationsBadge = document.getElementById('jobRecommendationsBadge');
const missingSkillsBadge = document.getElementById('missingSkillsBadge');
const jobRecommendationsContent = document.getElementById('jobRecommendationsContent');
const missingSkillsContent = document.getElementById('missingSkillsContent');
const learningSuggestionsBadge = document.getElementById('learningSuggestionsBadge');
const resumeImprovementBadge = document.getElementById('resumeImprovementBadge');
const learningSuggestionsContent = document.getElementById('learningSuggestionsContent');
const resumeImprovementContent = document.getElementById('resumeImprovementContent');
let resumeReadPromise = Promise.resolve();
let resumeReadError = null;

function showSection(sectionId) {
  sections.forEach((section) => {
    const isMatch = section.id === sectionId;
    section.classList.toggle('active', isMatch);
  });

  navItems.forEach((item) => {
    const isMatch = item.dataset.target === sectionId;
    item.classList.toggle('active', isMatch);
  });
}

function setState(mode) {
  const states = [emptyState, loadingState, errorState, resultsContainer];
  states.forEach((state) => state.classList.add('hidden'));

  if (mode === 'empty') {
    emptyState.classList.remove('hidden');
  }

  if (mode === 'loading') {
    loadingState.classList.remove('hidden');
  }

  if (mode === 'error') {
    errorState.classList.remove('hidden');
  }

  if (mode === 'success') {
    resultsContainer.classList.remove('hidden');
  }
}

function handleNavigationClick(event) {
  const targetId = event.currentTarget.dataset.target;
  showSection(targetId);
}

navItems.forEach((item) => item.addEventListener('click', handleNavigationClick));

const analyzeButton = document.querySelector('.primary-btn[data-target="analyze"]');
if (analyzeButton) {
  analyzeButton.addEventListener('click', () => {
    showSection('analyze');
    resumeText.focus();
  });
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('The text file could not be read.'));
    reader.readAsText(file);
  });
}

async function extractPdfText(file) {
  const pdfjs = await import('/vendor/pdfjs-dist/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs-dist/build/pdf.worker.mjs';
  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str || '').join(' '));
  }

  return pages.join('\n').trim();
}

resumeText.addEventListener('input', () => {
  if (resumeText.value.trim()) {
    resumeFile.value = '';
    resumeReadError = null;
    resumeReadPromise = Promise.resolve();
  }
});

resumeFile.addEventListener('change', (event) => {
  const file = event.currentTarget.files?.[0];
  resumeReadError = null;

  if (!file) {
    resumeReadPromise = Promise.resolve();
    return;
  }

  resumeReadPromise = (async () => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    let extractedText;

    if (extension === 'txt' || file.type === 'text/plain') {
      extractedText = await readTextFile(file);
    } else if (extension === 'pdf' || file.type === 'application/pdf') {
      extractedText = await extractPdfText(file);
    } else {
      throw new Error('Unsupported file type. Choose a TXT or PDF resume.');
    }

    if (!extractedText.trim()) {
      throw new Error('No readable text was found in the selected file. Scanned PDFs require OCR or pasted text.');
    }

    if (resumeFile.files?.[0] === file) {
      resumeText.value = extractedText.trim();
    }
  })().catch((error) => {
    resumeReadError = error;
    console.error('Unable to read uploaded resume:', error);
    if (!getTrimmedResumeText()) {
      errorMessage.textContent = error.message || 'Unable to read the selected resume file. Choose a TXT or text-based PDF.';
      setState('error');
    }
  });
});

function buildRoleRecommendations(resumeText, targetRole, skillGroups = {}) {
  const lowerText = resumeText.toLowerCase();
  const skills = Object.values(skillGroups).flat().map((skill) => skill.toLowerCase());
  const allSkills = new Set(skills);
  const roleName = (targetRole || '').toLowerCase();

  const recommendations = [];

  if (roleName.includes('frontend') || roleName.includes('web') || roleName.includes('ui') || allSkills.has('react') || allSkills.has('javascript')) {
    recommendations.push({
      title: 'Frontend Developer (Entry-level)',
      reason: 'Your resume shows JavaScript, React, and front-end project experience, which strongly aligns with entry-level UI and web development work.',
      type: 'entry'
    });
  }

  if (roleName.includes('developer') || roleName.includes('software') || allSkills.has('java') || allSkills.has('python') || allSkills.has('sql')) {
    recommendations.push({
      title: 'Software Developer (Entry-level)',
      reason: 'The combination of education, technical projects, and practical coding experience makes this a realistic early-career path.',
      type: 'entry'
    });
  }

  if (allSkills.has('mysql') || allSkills.has('git') || allSkills.has('aws') || allSkills.has('docker')) {
    recommendations.push({
      title: 'Junior Full-Stack Developer',
      reason: 'Skills in core web technologies, databases, and Git suggest potential fit for a role that blends front-end and back-end responsibilities.',
      type: 'entry'
    });
  }

  if (roleName.includes('data') || allSkills.has('sql') || allSkills.has('python')) {
    recommendations.push({
      title: 'Data Analyst (Growing role)',
      reason: 'Strong analytical and SQL-oriented skills can support analysis work, especially when paired with a clear project portfolio and communication strengths.',
      type: 'growth'
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      title: 'General IT Support / Junior Analyst',
      reason: 'This role can suit a student with foundational technical and communication skills when the resume does not clearly show a specialized stack.',
      type: 'entry'
    });
  }

  return recommendations.slice(0, 3);
}

function buildMissingSkillsLists(resumeText, targetRole, skillGroups = {}) {
  const lowerText = resumeText.toLowerCase();
  const role = (targetRole || '').toLowerCase();
  const commonRequirements = {
    important: [],
    useful: [],
    optional: []
  };

  const targetRoleMap = {
    'frontend developer': {
      important: ['rest api', 'css', 'responsive design', 'version control', 'testing'],
      useful: ['typescript', 'redux', 'accessibility', 'performance optimization'],
      optional: ['tailwind', 'webpack', 'seo basics']
    },
    'software developer': {
      important: ['data structures', 'algorithms', 'debugging', 'version control', 'testing'],
      useful: ['system design', 'database design', 'api integration'],
      optional: ['cloud basics', 'ci/cd']
    },
    'data analyst': {
      important: ['excel', 'statistics', 'data cleaning', 'dashboarding'],
      useful: ['python', 'power bi', 'etl'],
      optional: ['machine learning basics']
    },
    'ui developer': {
      important: ['design systems', 'responsive design', 'accessibility', 'prototyping'],
      useful: ['figma', 'css animations', 'wireframing'],
      optional: ['motion design']
    }
  };

  const matchedRequirements = targetRoleMap[role] || {
    important: ['role-related technical skills', 'project experience', 'clear communication'],
    useful: ['team collaboration', 'problem solving', 'documentation'],
    optional: ['portfolio quality', 'domain knowledge']
  };

  Object.entries(matchedRequirements).forEach(([level, list]) => {
    list.forEach((item) => {
      const cleanItem = item.trim();
      const found = cleanItem.split(' ').every((word) => lowerText.includes(word));
      if (!found) {
        commonRequirements[level].push(cleanItem);
      }
    });
  });

  const existingSkills = Object.values(skillGroups).flat().map((s) => s.toLowerCase());
  const possibleMissing = Object.entries(commonRequirements)
    .flatMap(([level, items]) => items.map((item) => ({ level, item })))
    .filter(({ item }) => !existingSkills.some((existing) => existing.includes(item.toLowerCase()) || item.toLowerCase().includes(existing)));

  return possibleMissing.slice(0, 5);
}

function renderRecommendations(recommendations) {
  if (!recommendations.length) {
    return '<p class="muted-copy">No role recommendations could be generated from the submitted resume text.</p>';
  }

  return recommendations.map((item) => `
    <div class="recommendation-item">
      <div class="recommendation-topline">
        <strong>${item.title}</strong>
        <span class="recommendation-badge ${item.type === 'entry' ? 'entry' : 'growth'}">${item.type === 'entry' ? 'Entry-level' : 'More experience'}</span>
      </div>
      <p>${item.reason}</p>
    </div>
  `).join('');
}

function renderMissingSkills(skills) {
  if (!skills.length) {
    return '<p class="muted-copy">No clear missing skills were identified for this target role from the current resume content.</p>';
  }

  const grouped = {
    important: [],
    useful: [],
    optional: []
  };

  skills.forEach(({ level, item }) => {
    grouped[level].push(item);
  });

  const html = Object.entries(grouped).map(([level, items]) => {
    if (!items.length) return '';
    return `
      <div class="gap-group">
        <h4>${level.charAt(0).toUpperCase() + level.slice(1)}</h4>
        <ul>
          ${items.map((item) => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `;
  }).join('');

  return `
    ${html}
    <p class="info-note">A skill missing from the resume may still be known by the student. This list highlights general role-based gaps only when a clear job description is unavailable.</p>
  `;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function renderAnalysisResults(data) {
  const source = data?.source === 'AI model' ? 'AI Model' : 'Basic Fallback';
  const skillGroups = data?.skillGroups || {};
  const recommendations = data?.jobRecommendations || [];
  const missingSkills = data?.missingSkills || [];
  const learningSuggestions = data?.learningSuggestions || [];
  const improvements = data?.resumeImprovementSuggestions || [];

  summaryBadge.textContent = source;
  skillsBadge.textContent = source;
  jobRecommendationsBadge.textContent = source;
  missingSkillsBadge.textContent = source;
  learningSuggestionsBadge.textContent = source;
  resumeImprovementBadge.textContent = source;
  resumeSummaryContent.textContent = data?.summary || 'No summary could be generated from the submitted resume.';

  const categoryLabels = {
    programmingLanguages: 'Programming Languages',
    frameworks: 'Frameworks / Libraries',
    databases: 'Databases',
    tools: 'Tools / Platforms',
    softSkills: 'Soft Skills'
  };
  const categories = Object.entries(skillGroups).filter(([, values]) => Array.isArray(values) && values.length);
  skillsAnalysisContent.innerHTML = categories.length
    ? categories.map(([category, values]) => `<div class="skill-category"><h4>${escapeHtml(categoryLabels[category] || category)}</h4><div class="skill-badges">${values.map((skill) => `<span class="skill-badge">${escapeHtml(skill)}</span>`).join('')}</div></div>`).join('')
    : '<p class="muted-copy">No explicit skills were identified from the submitted resume.</p>';

  if (data?.uncertainSkills?.length) {
    skillsAnalysisContent.insertAdjacentHTML('beforeend', `<div class="skill-category"><h4>Uncertain Inferences</h4><div class="skill-badges">${data.uncertainSkills.map((skill) => `<span class="skill-badge uncertain">${escapeHtml(skill)}</span>`).join('')}</div></div>`);
  }
  if (data?.source !== 'AI model') {
    skillsAnalysisContent.insertAdjacentHTML('beforeend', '<p class="info-note">Basic fallback analysis is not AI-generated and may miss context.</p>');
  }

  jobRecommendationsContent.innerHTML = recommendations.length
    ? recommendations.map((item) => `<div class="recommendation-item"><div class="recommendation-topline"><strong>${escapeHtml(item.title)}</strong><span class="recommendation-badge ${item.type === 'entry' ? 'entry' : 'growth'}">${item.type === 'entry' ? 'Entry-level' : 'More experience'}</span></div><p>${escapeHtml(item.reason)}</p></div>`).join('')
    : '<p class="muted-copy">No role recommendations were returned.</p>';

  const groupedGaps = { important: [], useful: [], optional: [] };
  missingSkills.forEach(({ level, item }) => {
    if (groupedGaps[level]) groupedGaps[level].push(item);
  });
  missingSkillsContent.innerHTML = missingSkills.length
    ? Object.entries(groupedGaps).map(([level, items]) => items.length ? `<div class="gap-group"><h4>${level}</h4><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>` : '').join('')
    : '<p class="muted-copy">No clear skill gaps were identified.</p>';

  learningSuggestionsContent.innerHTML = learningSuggestions.length
    ? learningSuggestions.map((item) => `<div class="recommendation-item"><div class="recommendation-topline"><strong>${escapeHtml(item.topic)}</strong><span class="recommendation-badge entry">${escapeHtml(item.level)}</span></div><p>${escapeHtml(item.why)}</p>${(item.resources || []).map((resource) => `<a href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(resource.title)}</a>`).join(' · ')}</div>`).join('')
    : '<p class="muted-copy">No learning suggestions were returned.</p>';

  resumeImprovementContent.innerHTML = improvements.length
    ? `<ol>${improvements.map((item) => `<li><strong>${escapeHtml(item.priority)}: ${escapeHtml(item.section)}</strong> ${escapeHtml(item.advice)}${item.example ? `<p>Example: ${escapeHtml(item.example)}</p>` : ''}</li>`).join('')}</ol>`
    : '<p class="muted-copy">No resume improvement suggestions were returned.</p>';
}

function getTrimmedResumeText() {
  return (resumeText?.value || '').trim();
}

function getTrimmedTargetRole() {
  return (targetRole?.value || '').trim();
}

function validateResumeInput() {
  const text = getTrimmedResumeText();
  const role = getTrimmedTargetRole();

  if (!text) {
    errorMessage.textContent = resumeReadError?.message || 'Please provide resume text or upload a readable resume file.';
    setState('error');
    return false;
  }

  if (!role) {
    errorMessage.textContent = 'Please provide a target job role.';
    setState('error');
    return false;
  }

  return true;
}

function clearResultContent() {
  resumeSummaryContent.textContent = '';
  skillsAnalysisContent.innerHTML = '';
  jobRecommendationsContent.innerHTML = '';
  missingSkillsContent.innerHTML = '';
  learningSuggestionsContent.innerHTML = '';
  resumeImprovementContent.innerHTML = '';
}

async function handleAnalysisRequest(event) {
  event.preventDefault();

  setState('loading');

  try {
    await resumeReadPromise;
  } catch (error) {
    resumeReadError = error;
  }

  if (!validateResumeInput()) {
    return;
  }

  const text = getTrimmedResumeText();
  const role = getTrimmedTargetRole();

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText: text, targetRole: role })
    });

    if (!response.ok) {
      throw new Error('Request failed');
    }

    const data = await response.json();
    renderAnalysisResults(data);
    setState('success');
  } catch (error) {
    console.error('Resume analysis failed:', error);
    errorMessage.textContent = error.message || 'Unable to analyze the resume. Please try again.';
    setState('error');
  }
}

resumeForm.addEventListener('submit', handleAnalysisRequest);
