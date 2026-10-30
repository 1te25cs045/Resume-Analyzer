# AI-Powered Resume Analyzer

A beginner-friendly college project that demonstrates a professional resume analysis workflow. This version includes a working resume summary and skills analysis with a clear basic fallback when no AI service is configured.

## Tech Stack

- HTML
- CSS
- JavaScript
- Node.js + Express
- dotenv for environment variables

## Project Structure

- `public/index.html` — main UI, served as the homepage by Vercel
- `public/styles.css` — responsive blue-and-white design
- `public/script.js` — form validation, UI state handling, and display logic
- `scripts/copy-pdfjs-assets.js` — copies PDF.js browser assets into Vercel's static directory during build
- `server.js` — backend API and fallback-based analysis
- `package.json` — project scripts and dependencies
- `.env.example` — sample AI configuration

The `npm run build` command publishes the PDF.js browser module and worker under `public/vendor/`, where Vercel can serve them as static assets.

## Deploying to Vercel

Import the repository into Vercel with the project root set to this directory. Vercel serves `public/` assets from its CDN, routes `/` to `public/index.html`, and runs the exported Express app for `/api/analyze`. The configured build command copies the PDF.js files into `public/vendor/`. Add `AI_API_KEY` and `AI_MODEL` as Vercel environment variables only if AI-backed analysis is needed.

## Startup Instructions

1. Install dependencies:

```bash
cd "c:\Users\BMSIT\Documents\resumeeeee"
npm install
```

2. Optional: set up AI configuration.

Copy `.env.example` to `.env` and add values such as:

```env
AI_API_KEY=your_key_here
AI_MODEL=gpt-4o-mini
PORT=3000
```

3. Start the app:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

## Features Included

- Resume text input and TXT/PDF upload placeholder support
- Target role field and validation
- Resume summary generation from submitted content
- Skill grouping by programming languages, frameworks, databases, tools, and soft skills
- Clear basic fallback when no AI API key is configured
- Loading, empty, error, and success states
- No job recommendation logic yet, as requested

## AI and Fallback Notes

- If `AI_API_KEY` is configured, the app attempts to use a real AI model.
- If no API key is configured, the app clearly labels results as a basic fallback and states that the result is not AI-generated.
- The fallback uses only text detected in the submitted resume and does not invent qualifications.
