# CBLE Practice Environment

These are the past exams given over the last years with 160 questions, source exhibits, saved browser progress, flags, scoring, and explanations after submission.

## Adding future exams

The conversion should append a new exam to exams.json and add any images to assets/. Existing exams stay available. Upload the updated exams.json and new images, commit, and GitHub Pages republishes the same address.

The menu and question counts update automatically. Keep each existing exam's ID and question order unchanged so its saved browser progress remains compatible. Use a new unique ID for each new exam, and unique filenames for its exhibits.

## Data format for future conversions

exams.json is an array of objects with id, title, and questions. Each question has number, category, stem, options (four strings), accepted (zero-based answer indexes: A=0 through D=3), creditAll (boolean), scoringNote, reason, and exhibits (array of objects with src and label). Optional referenceText holds shared facts. Preserve key corrections, multiple accepted answers, and automatic-credit decisions from the supplied source.

## Progress and access

Answers are stored only in the current browser on the current website address. Moving from the original hosted site to GitHub Pages starts separate progress. Answers do not sync between devices.
