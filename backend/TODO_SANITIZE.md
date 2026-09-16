Dependency change required:

The code uses sanitize-html to sanitize rich text before saving descriptionHtml in vacancies.

Please run the following in backend/ to add the dependency and install:

  cd backend
  npm install --save sanitize-html

Also update backend/package.json dependencies to include sanitize-html if your package manager does not update it automatically.
