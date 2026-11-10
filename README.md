# CBLE Practice

October 2025 and April 2026 practice exams with 160 questions, source exhibits, saved browser progress, flags, scoring, and explanations after submission.

## Publish on GitHub Pages

1. Unzip this package.
2. Open your `cble` repository and choose Add file → Upload files.
3. Upload the CONTENTS of this folder, including the assets folder. `index.html` must be at the repository root, not inside a cble folder. Do not upload the ZIP itself.
4. Commit to main.
5. Open Settings → Pages. Select Deploy from a branch, main, and /(root), then Save.
6. Open the published URL shown in Pages after deployment completes.

No installation or build is required. The normal address is https://YOUR-USERNAME.github.io/cble/ unless you configure a custom domain.

## Adding future exams

Keep this repository and website. Supply the next exam PDF and answer key for conversion, along with this repository's URL. The conversion should append a new exam to exams.json and add any images to assets/. Existing exams stay available. Upload the updated exams.json and new images, commit, and GitHub Pages republishes the same address.

The menu and question counts update automatically. Keep each existing exam's ID and question order unchanged so its saved browser progress remains compatible. Use a new unique ID for each new exam, and unique filenames for its exhibits.

## Data format for future conversions

exams.json is an array of objects with id, title, and questions. Each question has number, category, stem, options (four strings), accepted (zero-based answer indexes: A=0 through D=3), creditAll (boolean), scoringNote, reason, and exhibits (array of objects with src and label). Optional referenceText holds shared facts. Preserve key corrections, multiple accepted answers, and automatic-credit decisions from the supplied source.

## Progress and access

Answers are stored only in the current browser on the current website address. Moving from the original hosted site to GitHub Pages starts separate progress. Answers do not sync between devices. GitHub Pages publishes the site publicly; source files include the answer keys, although the practice interface hides answers until submission.
