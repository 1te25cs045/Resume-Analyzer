const express = require('express');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const apiKey = process.env.AI_API_KEY;
const model = process.env.AI_MODEL || 'gpt-4o-mini';

app.use(express.static(path.join(__dirname)));
app.use(express.json({ limit: '1mb' }));

function extractResumeSections(resumeText) {
  const cleaned = (resumeText || '').replace(/\s+/g, ' ').trim();

  if (!cleaned) {
    return {
      summary: 'No resume text was provided.',
      skillGroups: {},
      source: 'basic fallback',
      uncertainSkills: []
    };
  }

  const lowerText = cleaned.toLowerCase();
  const skillCategories = {
    programmingLanguages: ['javascript', 'python', 'java', 'c++', 'c#', 'sql', 'typescript', 'html', 'css', 'php', 'ruby', 'swift', 'kotlin', 'go', 'rust', 'scala'],
    frameworks: ['react', 'node.js', 'nodejs', 'express', 'django', 'flask', 'angular', 'vue', 'spring', 'bootstrap', 'tailwind', 'next.js', 'redux'],
    databases: ['mysql', 'postgresql', 'mongodb', 'sqlite', 'oracle', 'firebase', 'redis'],
    tools: ['git', 'github', 'docker', 'kubernetes', 'aws', 'azure', 'linux', 'figma', 'postman', 'jira', 'jenkins'],
    softSkills: ['leadership', 'communication', 'teamwork', 'problem solving', 'time management', 'analytical thinking', 'adaptability', 'collaboration', 'presentation', 'critical thinking']
  };

  const skillGroups = {};
  for (const [category, skills] of Object.entries(skillCategories)) {
    skillGroups[category] = skills.filter((skill) => lowerText.includes(skill));
  }

  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  const educationSentence = sentences.find((sentence) => /b\.tech|b\.e|bachelor|master|degree|engineering|computer science|m\.tech|education|college/i.test(sentence)) || '';
  const experienceSentence = sentences.find((sentence) => /experience|intern|internship|worked|software engineer|developer|analyst|associate|role/i.test(sentence)) || '';
  const projectSentence = sentences.find((sentence) => /project|projects|built|developed|implemented|portfolio|application/i.test(sentence)) || '';
  const certificationSentence = sentences.find((sentence) => /certification|certified|course|training|aws|google cloud|microsoft|azure/i.test(sentence)) || '';
  const strengthSentence = sentences.find((sentence) => /strong|excellent|good|skilled|proficient|organized|analytical|communication|teamwork|leadership/i.test(sentence)) || '';

  const summaryParts = [educationSentence, experienceSentence, projectSentence, certificationSentence, strengthSentence].filter(Boolean);
  const summary = summaryParts.length
    ? summaryParts.slice(0, 3).join(' ')
    : 'The submitted resume is too brief or does not clearly describe education, experience, projects, certifications, or strengths.';

  const uncertainSkills = [];

  return {
    summary,
    skillGroups,
    source: 'basic fallback',
    uncertainSkills
  };
}

function buildRoleRecommendations(resumeText, targetRole) {
  const lowerText = (resumeText || '').toLowerCase();
  const role = (targetRole || '').toLowerCase();
  const skills = [];

  if (lowerText.includes('javascript') || lowerText.includes('react')) skills.push('JavaScript');
  if (lowerText.includes('python')) skills.push('Python');
  if (lowerText.includes('mysql')) skills.push('MySQL');
  if (lowerText.includes('git')) skills.push('Git');
  if (lowerText.includes('communication') || lowerText.includes('teamwork')) skills.push('Communication');

  const recommendations = [];

  if (role.includes('frontend') || role.includes('web') || lowerText.includes('react') || lowerText.includes('javascript')) {
    recommendations.push({
      title: 'Frontend Developer (Entry-level)',
      reason: 'Your resume has front-end project and JavaScript-related experience, which fits early-stage UI and web development work.',
      type: 'entry'
    });
  }

  if (role.includes('developer') || lowerText.includes('python') || lowerText.includes('java') || lowerText.includes('sql')) {
    recommendations.push({
      title: 'Software Developer (Entry-level)',
      reason: 'The resume shows technical education, project work, and coding skills that could support a junior software role.',
      type: 'entry'
    });
  }

  if (lowerText.includes('mysql') || lowerText.includes('sql') || lowerText.includes('python')) {
    recommendations.push({
      title: 'Junior Data Analyst',
      reason: 'Analytical work and data-related skills may align with a growing role that benefits from strong research and reporting ability.',
      type: 'growth'
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      title: 'Junior Analyst / Support Intern',
      reason: 'This role may be suitable when the student has foundational technical and communication skills but has not yet shown a specialized stack.',
      type: 'entry'
    });
  }

  return recommendations.slice(0, 3);
}

function buildMissingSkills(resumeText, targetRole) {
  const lowerText = (resumeText || '').toLowerCase();
  const role = (targetRole || '').toLowerCase();
  const generalRequirements = {
    important: [],
    useful: [],
    optional: []
  };

  if (role.includes('frontend') || role.includes('web') || role.includes('ui')) {
    generalRequirements.important = ['rest api', 'responsive design', 'version control', 'testing'];
    generalRequirements.useful = ['typescript', 'accessibility', 'performance optimization'];
    generalRequirements.optional = ['tailwind', 'webpack'];
  } else if (role.includes('software') || role.includes('developer')) {
    generalRequirements.important = ['data structures', 'debugging', 'version control', 'testing'];
    generalRequirements.useful = ['system design', 'database design', 'api integration'];
    generalRequirements.optional = ['ci/cd', 'cloud basics'];
  } else if (role.includes('data')) {
    generalRequirements.important = ['statistics', 'data cleaning', 'dashboarding'];
    generalRequirements.useful = ['excel', 'power bi', 'etl'];
    generalRequirements.optional = ['machine learning basics'];
  } else {
    generalRequirements.important = ['role-related technical skills', 'project experience', 'clear communication'];
    generalRequirements.useful = ['team collaboration', 'problem solving'];
    generalRequirements.optional = ['portfolio quality', 'domain knowledge'];
  }

  const missing = [];
  Object.entries(generalRequirements).forEach(([level, items]) => {
    items.forEach((item) => {
      const normalized = item.toLowerCase();
      const hasPhrase = lowerText.includes(normalized);
      if (!hasPhrase) {
        missing.push({ level, item });
      }
    });
  });

  return missing.slice(0, 5);
}

function buildLearningSuggestions(resumeText, targetRole, skillGroups) {
  const role = (targetRole || '').toLowerCase();
  const text = (resumeText || '').toLowerCase();
  const allSkills = Object.values(skillGroups || {}).flat().map((skill) => String(skill).toLowerCase());
  const suggestions = [];

  if (role.includes('frontend') || role.includes('web') || role.includes('ui') || allSkills.includes('react') || allSkills.includes('javascript')) {
    suggestions.push({
      level: 'Beginner',
      topic: 'HTML, CSS, and JavaScript fundamentals',
      why: 'These foundations support most front-end tasks and help you build reliable UI work for internship or junior roles.',
      resources: [
        { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Learn' },
        { title: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/' }
      ]
    });

    suggestions.push({
      level: 'Intermediate',
      topic: 'React and state management',
      why: 'React is a common skill for front-end roles, and working with state helps you build interactive learner-focused projects.',
      resources: [
        { title: 'React Documentation', url: 'https://react.dev/learn' },
        { title: 'Frontend Mentor', url: 'https://www.frontendmentor.io/' }
      ]
    });
  }

  if (role.includes('developer') || role.includes('software') || allSkills.includes('python') || allSkills.includes('java') || allSkills.includes('sql')) {
    suggestions.push({
      level: 'Beginner',
      topic: 'Programming basics and problem solving',
      why: 'Strong core logic skills help students adapt to many software roles and are useful in interviews and campus projects.',
      resources: [
        { title: 'Python for Everybody', url: 'https://www.py4e.com/' },
        { title: 'HackerRank', url: 'https://www.hackerrank.com/' }
      ]
    });

    suggestions.push({
      level: 'Intermediate',
      topic: 'Data structures, APIs, and debugging',
      why: 'These topics improve your ability to build and troubleshoot real projects, which matters for junior developer roles.',
      resources: [
        { title: 'GeeksforGeeks DSA', url: 'https://www.geeksforgeeks.org/data-structures/' },
        { title: 'Postman Learning Center', url: 'https://learning.postman.com/' }
      ]
    });
  }

  if (role.includes('data') || allSkills.includes('sql') || allSkills.includes('excel') || allSkills.includes('python')) {
    suggestions.push({
      level: 'Beginner',
      topic: 'Excel and spreadsheet analysis',
      why: 'This helps build reporting and analysis habits that are useful in data-focused work and student projects.',
      resources: [
        { title: 'Excel Easy', url: 'https://www.excel-easy.com/' },
        { title: 'Coursera: Excel Skills for Business', url: 'https://www.coursera.org/specializations/excel-skills-for-business' }
      ]
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      level: 'Beginner',
      topic: 'Portfolio project and role-aligned fundamentals',
      why: 'A focused portfolio project can help a student prove practical skills even when the resume is still developing.',
      resources: [
        { title: 'freeCodeCamp', url: 'https://www.freecodecamp.org/' },
        { title: 'The Odin Project', url: 'https://www.theodinproject.com/' }
      ]
    });
  }

  return suggestions.slice(0, 4);
}

function buildResumeImprovementSuggestions(resumeText) {
  const text = (resumeText || '').trim();
  const suggestions = [];

  if (!/education|degree|b\.tech|b\.e|college|university/i.test(text)) {
    suggestions.push({
      priority: 'High',
      section: 'Education',
      advice: 'Add your degree, specialization, institution, and graduation year clearly at the top or in a dedicated education section.',
      example: 'B.Tech in Computer Science, ABC College of Engineering, 2025'
    });
  }

  if (!/skills|javascript|python|react|sql|communication|teamwork/i.test(text)) {
    suggestions.push({
      priority: 'High',
      section: 'Skills',
      advice: 'Create a dedicated skills section with technical tools and soft skills separated clearly.',
      example: 'Technical Skills: JavaScript, React, SQL, Git | Soft Skills: Communication, Teamwork'
    });
  }

  if (!/project|developed|built|implemented|portfolio/i.test(text)) {
    suggestions.push({
      priority: 'High',
      section: 'Projects',
      advice: 'Add 2-3 project entries using action verbs and a short result-focused summary.',
      example: 'Developed a student management web app using React and Node.js to reduce manual registration effort.'
    });
  }

  suggestions.push({
    priority: 'Medium',
    section: 'Experience',
    advice: 'Use concise bullet points that describe responsibilities and impact, not just task lists.',
    example: 'Built a responsive dashboard using React and REST APIs to improve data visibility for end users.'
  });

  suggestions.push({
    priority: 'Medium',
    section: 'Formatting and readability',
    advice: 'Keep consistent spacing, short bullet points, and clear section headings to improve scanability.',
    example: 'Use one-page or two-page formatting with strong margins and consistent fonts.'
  });

  suggestions.push({
    priority: 'Low',
    section: 'Achievements',
    advice: 'Only include measurable outcomes when they are genuinely supported by the student’s project or work experience.',
    example: 'Improved application workflow efficiency by reducing manual steps in a campus project.'
  });

  return suggestions;
}

function buildFallbackAnalysis(resumeText, targetRole) {
  const base = extractResumeSections(resumeText);
  return {
    ...base,
    jobRecommendations: buildRoleRecommendations(resumeText, targetRole),
    missingSkills: buildMissingSkills(resumeText, targetRole),
    learningSuggestions: buildLearningSuggestions(resumeText, targetRole, base.skillGroups),
    resumeImprovementSuggestions: buildResumeImprovementSuggestions(resumeText),
    source: 'basic fallback'
  };
}

async function callAiAnalysis(resumeText, targetRole) {
  if (!apiKey) {
    return null;
  }

  const endpoint = `https://api.openai.com/v1/chat/completions`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a resume analysis assistant. Use only the submitted resume and selected target role. Do not invent qualifications or job eligibility. Return valid JSON with keys: summary, skillGroups, source, uncertainSkills, jobRecommendations, missingSkills, learningSuggestions, resumeImprovementSuggestions. jobRecommendations should be arrays of objects with title, reason, type. missingSkills should be arrays of objects with level and item. learningSuggestions should be arrays of objects with level, topic, why, resources (title and url). resumeImprovementSuggestions should be arrays of objects with priority, section, advice, example. source should be "AI model".'
        },
        {
          role: 'user',
          content: `Target role: ${targetRole}\n\nResume text:\n${resumeText}`
        }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const parsed = JSON.parse(content);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid AI response');
  }

  return {
    summary: parsed.summary || 'No summary generated.',
    skillGroups: parsed.skillGroups || {},
    source: 'AI model',
    uncertainSkills: parsed.uncertainSkills || [],
    jobRecommendations: parsed.jobRecommendations || [],
    missingSkills: parsed.missingSkills || [],
    learningSuggestions: parsed.learningSuggestions || [],
    resumeImprovementSuggestions: parsed.resumeImprovementSuggestions || []
  };
}

app.post('/api/analyze', async (req, res) => {
  const { resumeText = '', targetRole = '' } = req.body || {};

  if (!resumeText || !resumeText.trim() || !targetRole || !targetRole.trim()) {
    return res.status(400).json({
      error: 'Resume text and target role are required.',
      summary: '',
      skillGroups: {},
      source: 'basic fallback',
      uncertainSkills: [],
      jobRecommendations: [],
      missingSkills: [],
      learningSuggestions: [],
      resumeImprovementSuggestions: []
    });
  }

  try {
    const aiResult = await callAiAnalysis(resumeText, targetRole);
    if (aiResult) {
      return res.json(aiResult);
    }

    return res.json(buildFallbackAnalysis(resumeText, targetRole));
  } catch (error) {
    return res.json({
      ...buildFallbackAnalysis(resumeText, targetRole),
      error: 'AI service unavailable. Fallback analysis was used instead.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
