const fs = require('fs');
const path = require('path');

const sourceDirectory = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build');
const destinationDirectory = path.join(__dirname, '..', 'public', 'vendor', 'pdfjs-dist', 'build');

fs.mkdirSync(destinationDirectory, { recursive: true });

for (const fileName of ['pdf.mjs', 'pdf.worker.mjs']) {
  fs.copyFileSync(
    path.join(sourceDirectory, fileName),
    path.join(destinationDirectory, fileName)
  );
}
