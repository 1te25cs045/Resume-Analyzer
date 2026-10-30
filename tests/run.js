const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const fc = require('fast-check');
const { JSDOM } = require('jsdom');

process.env.AI_API_KEY = '';
const {
  app,
  extractResumeSections,
  buildRoleRecommendations,
  buildMissingSkills,
  buildFallbackAnalysis
} = require('../server');

const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

function assertProperty(property) {
  fc.assert(property, { numRuns: 100, seed: 20261029 });
}

function createBrowser(fetchHandler = async () => {
  throw new Error('Unexpected request');
}) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(__dirname, '..', 'public', 'script.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/' });
  dom.window.fetch = fetchHandler;
  dom.window.console.error = () => {};
  dom.window.eval(script);
  return dom;
}

function submitForm(window) {
  window.document.getElementById('resumeForm').dispatchEvent(
    new window.Event('submit', { bubbles: true, cancelable: true })
  );
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  assert.fail('Timed out waiting for the UI state to update.');
}

function postJson(server, body) {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1',
      port: server.address().port,
      path: '/api/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (response) => {
      let responseBody = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { responseBody += chunk; });
      response.on('end', () => {
        try {
          resolve({ status: response.statusCode, body: JSON.parse(responseBody) });
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', reject);
    request.end(payload);
  });
}

test('resume extraction normalizes text and detects skills by category', () => {
  const result = extractResumeSections(
    '  B.Tech in Computer Science.\n\nBuilt a React application with JavaScript and PostgreSQL.  '
  );

  assert.match(result.summary, /B\.Tech in Computer Science/);
  assert.deepStrictEqual(result.skillGroups.programmingLanguages, ['javascript']);
  assert.deepStrictEqual(result.skillGroups.frameworks, ['react']);
  assert.deepStrictEqual(result.skillGroups.databases, ['postgresql']);
  assert.strictEqual(result.source, 'basic fallback');
  assert.deepStrictEqual(result.uncertainSkills, []);
});

test('empty resumes return an explicit fallback summary', () => {
  const result = extractResumeSections(' \n\t ');
  assert.strictEqual(result.summary, 'No resume text was provided.');
  assert.deepStrictEqual(result.skillGroups, {});
});

test('recommendations and missing-skill results are bounded and well-formed', () => {
  const recommendations = buildRoleRecommendations('Python and SQL projects', 'Data Analyst');
  const missing = buildMissingSkills('Python and SQL projects', 'Data Analyst');

  assert(recommendations.length >= 1 && recommendations.length <= 3);
  assert(recommendations.every(({ title, reason, type }) => title && reason && ['entry', 'growth'].includes(type)));
  assert(missing.length <= 5);
  assert(missing.every(({ level, item }) => ['important', 'useful', 'optional'].includes(level) && item));
});

test('property: extracted skills are case-insensitive and preserve result shape', () => {
  assertProperty(fc.property(fc.array(fc.constantFrom(' ', '\n', '\t'), { maxLength: 4 }), (spaces) => {
    const result = extractResumeSections(`${spaces.join('')}PyThOn${spaces.join('')}`);
    assert(result.skillGroups.programmingLanguages.includes('python'));
    assert.strictEqual(typeof result.summary, 'string');
    assert.strictEqual(result.source, 'basic fallback');
  }));
});

test('property: analysis outputs stay within documented limits for arbitrary input', () => {
  assertProperty(fc.property(fc.string(), fc.string(), (resumeText, targetRole) => {
    const result = buildFallbackAnalysis(resumeText, targetRole);
    assert.strictEqual(result.source, 'basic fallback');
    assert(result.jobRecommendations.length >= 1 && result.jobRecommendations.length <= 3);
    assert(result.missingSkills.length <= 5);
    assert(result.learningSuggestions.length >= 1 && result.learningSuggestions.length <= 4);
    assert(result.resumeImprovementSuggestions.length >= 1);
    assert(result.jobRecommendations.every((item) => item.title && item.reason));
    assert(result.missingSkills.every((item) => item.item && ['important', 'useful', 'optional'].includes(item.level)));
  }));
});

test('API rejects missing, blank, and non-string required fields', async () => {
  const server = app.listen(0, '127.0.0.1');
  try {
    const invalidPayloads = [
      {},
      { resumeText: '', targetRole: 'Developer' },
      { resumeText: 'Resume text', targetRole: ' \t ' },
      { resumeText: 123, targetRole: 'Developer' },
      { resumeText: 'Resume text', targetRole: ['Developer'] },
      { resumeText: null, targetRole: 'Developer' }
    ];

    for (const payload of invalidPayloads) {
      const response = await postJson(server, payload);
      assert.strictEqual(response.status, 400);
      assert.match(response.body.error, /required/i);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('API returns fallback analysis for a valid resume and role', async () => {
  const server = app.listen(0, '127.0.0.1');
  try {
    const response = await postJson(server, {
      resumeText: 'B.Tech in Computer Science. Built a Python data analysis project.',
      targetRole: 'Data Analyst'
    });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.source, 'basic fallback');
    assert(response.body.summary.length > 0);
    assert(response.body.skillGroups.programmingLanguages.includes('python'));
    assert(response.body.jobRecommendations.length > 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('navigation switches active sections', () => {
  const dom = createBrowser();
  const { document, MouseEvent } = dom.window;
  document.querySelector('[data-target="about"].nav-item').dispatchEvent(
    new MouseEvent('click', { bubbles: true })
  );
  assert(document.getElementById('about').classList.contains('active'));
  assert(document.querySelector('[data-target="about"].nav-item').classList.contains('active'));
  assert(!document.getElementById('dashboard').classList.contains('active'));
  dom.window.close();
});

test('form displays validation errors without making a request', async () => {
  let requests = 0;
  const dom = createBrowser(async () => { requests += 1; });
  submitForm(dom.window);
  await waitFor(() => dom.window.document.getElementById('errorState').classList.contains('hidden') === false);
  assert.strictEqual(requests, 0);
  assert.match(dom.window.document.getElementById('errorMessage').textContent, /resume text/i);
  dom.window.close();
});

test('form submits valid input and renders results safely', async () => {
  let requestBody;
  const dom = createBrowser(async (url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        source: 'basic fallback',
        summary: '<script>not executable</script>',
        skillGroups: { programmingLanguages: ['<img src=x onerror=alert(1)>Python'] },
        jobRecommendations: [{ title: 'Developer', reason: 'Good fit', type: 'entry' }],
        missingSkills: [{ level: 'important', item: 'testing' }],
        learningSuggestions: [],
        resumeImprovementSuggestions: []
      })
    };
  });
  dom.window.document.getElementById('resumeText').value = ' Valid resume ';
  dom.window.document.getElementById('targetRole').value = ' Developer ';
  submitForm(dom.window);
  await waitFor(() => !dom.window.document.getElementById('resultsContainer').classList.contains('hidden'));

  assert.deepStrictEqual(requestBody, { resumeText: 'Valid resume', targetRole: 'Developer' });
  assert.strictEqual(dom.window.document.getElementById('resumeSummaryContent').textContent, '<script>not executable</script>');
  assert.strictEqual(dom.window.document.querySelector('#skillsAnalysisContent img'), null);
  assert.match(dom.window.document.getElementById('skillsAnalysisContent').textContent, /<img src=x/);
  dom.window.close();
});

test('clear resets form fields, upload state, analysis results, badges, and messages', () => {
  const dom = createBrowser();
  const { document } = dom.window;
  const fileInput = document.getElementById('resumeFile');
  let selectedFile = { name: 'resume.txt' };
  Object.defineProperty(fileInput, 'files', {
    configurable: true,
    get: () => selectedFile ? [selectedFile] : []
  });
  Object.defineProperty(fileInput, 'value', {
    configurable: true,
    get: () => selectedFile ? 'C:\\fakepath\\resume.txt' : '',
    set: (value) => {
      if (!value) selectedFile = null;
    }
  });
  document.getElementById('resumeText').value = 'Resume';
  document.getElementById('targetRole').value = 'Developer';
  document.getElementById('errorMessage').textContent = 'Old error';
  document.getElementById('summaryBadge').textContent = 'AI model';
  document.getElementById('skillsBadge').textContent = 'AI model';
  document.getElementById('resultsContainer').classList.remove('hidden');
  document.getElementById('resumeSummaryContent').textContent = 'Old result';
  document.getElementById('clearForm').click();

  assert.strictEqual(document.getElementById('resumeText').value, '');
  assert.strictEqual(document.getElementById('targetRole').value, '');
  assert.strictEqual(fileInput.value, '');
  assert.strictEqual(fileInput.files.length, 0);
  assert(document.getElementById('resultsContainer').classList.contains('hidden'));
  assert(!document.getElementById('emptyState').classList.contains('hidden'));
  assert.strictEqual(document.getElementById('resumeSummaryContent').textContent, '');
  assert.strictEqual(document.getElementById('skillsBadge').textContent, 'Basic Fallback');
  assert.strictEqual(document.getElementById('errorMessage').textContent, 'Please provide resume text and a target job role.');
  dom.window.close();
});

test('clear prevents an in-flight analysis from restoring stale results', async () => {
  let resolveResponse;
  const dom = createBrowser(() => new Promise((resolve) => {
    resolveResponse = resolve;
  }));
  const { document } = dom.window;
  document.getElementById('resumeText').value = 'Resume';
  document.getElementById('targetRole').value = 'Developer';
  submitForm(dom.window);
  await waitFor(() => typeof resolveResponse === 'function');

  document.getElementById('clearForm').click();
  resolveResponse({
    ok: true,
    json: async () => ({ source: 'AI model', summary: 'Stale analysis' })
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert(document.getElementById('resultsContainer').classList.contains('hidden'));
  assert(!document.getElementById('emptyState').classList.contains('hidden'));
  assert.strictEqual(document.getElementById('resumeSummaryContent').textContent, '');
  dom.window.close();
});

test('property: arbitrary result text is rendered as text, not executable markup', () => {
  const dom = createBrowser();
  const { window } = dom;
  assertProperty(fc.property(fc.string(), (text) => {
    const payload = `<img src=x onerror=alert(1)>${text}`;
    window.renderAnalysisResults({
      source: 'AI model',
      summary: payload,
      skillGroups: { unknown: [payload] },
      jobRecommendations: [],
      missingSkills: [],
      learningSuggestions: [],
      resumeImprovementSuggestions: []
    });
    assert.strictEqual(window.document.getElementById('resumeSummaryContent').textContent, payload);
    assert.strictEqual(window.document.querySelector('#skillsAnalysisContent img'), null);
    assert.strictEqual(window.document.getElementById('skillsAnalysisContent').textContent.includes(payload), true);
  }));
  window.close();
});

async function run() {
  let failures = 0;
  const selectedTests = process.env.TEST_FILTER
    ? tests.filter(({ name }) => new RegExp(process.env.TEST_FILTER, 'i').test(name))
    : tests;

  for (const { name, run: runTest } of selectedTests) {
    try {
      await runTest();
      console.log(`PASS ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${name}`);
      console.error(error.stack || error);
    }
  }

  console.log(`\n${selectedTests.length - failures}/${selectedTests.length} tests passed.`);
  if (failures) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
