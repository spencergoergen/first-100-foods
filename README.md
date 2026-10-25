# First 100 Foods

A mobile-first tracker for a baby's first 100 foods. Tap **Try** the first time a food is tasted and **+1** each time it comes back. Every entry can have a reaction and a comment.

**Live:** https://spencergoergen.github.io/first-100-foods/

## Features

- A starter list of 100 common first foods in 7 categories, with common allergens flagged
- One-tap tallies (with Undo), shown as classic tally marks
- Each try can have a reaction (Loved, Liked, Unsure, Disliked, Reaction), a comment and a date. Entries can be edited or deleted
- Progress ring toward 100, plus filters (Not yet, Tried, Allergens, category) and search
- A journal of every entry, newest first, with a "With comments" filter
- Add your own foods
- Data stays on the device in `localStorage`. JSON backup and restore are in Settings

## Local development

```sh
npm install
npm run dev      # start dev server
npm run build    # production build to dist/
npm run preview  # serve the build
```

No environment variables or API keys are required. Deploys to GitHub Pages via `.github/workflows/deploy.yml` on every push to the default branch.
