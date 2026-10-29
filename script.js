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

resumeFile.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    if (extension === 'txt') {
      const content = await file.text();
      resumeText.value = content.trim();
      return;
    }

    if (extension === 'pdf') {
      const pdfjs = await import('./node_modules/pdfjs-dist/build/pdf.mjs');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let extractedText = '';

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        extractedText += `${pageText}\n`;
      }

      resumeText.value = extractedText.trim();
      return;
    }

    throw new Error('Unsupported file type');
  } catch (error) {
    console.error('Unable to read uploaded resume:', error);
    errorMessage.textContent = 'Unable to read the selected resume file. Please upload a TXT file or paste the text manually.';
    setState('error');
  }
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

function renderExtendedResults(data) {
  const skillGroups = data?.skillGroups || {};
  const summary = data?.summary || '';
  const source = data?.source || 'basic fallback';

  jobRecommendationsBadge.textContent = source === 'AI model' ? 'AI Model' : 'Basic Fallback';
  missingSkillsBadge.textContent = source === 'AI model' ? 'AI Model' : 'Basic Fallback';

  const recommendations = buildRoleRecommendations(summary, targetRole.value.trim(), skillGroups);
  const missingSkills = buildMissingSkillsLists(summary, targetRole.value.trim(), skillGroups);

  jobRecommendationsContent.innerHTML = renderRecommendations(recommendations);
  missingSkillsContent.innerHTML = renderMissingSkills(missingSkills);
}

const originalRenderAnalysisResults = window.renderAnalysisResults;
window.renderAnalysisResults = function (data) {
  if (typeof originalRenderAnalysisResults === 'function') {
    originalRenderAnalysisResults(data);
  }
  renderExtendedResults(data);
};

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
    errorMessage.textContent = 'Please provide resume text or upload a readable resume file.';
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

  if (!validateResumeInput()) {
    return;
  }

  const text = getTrimmedResumeText();
  const role = getTrimmedTargetRole();

  setState('loading');

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
    errorMessage.textContent = 'Unable to analyze the resume. Please check the content and try again.';
    setState('error');
  }
}
