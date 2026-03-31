# CI/CD Pipeline for Frontend Engineers

## The Full Flow

```
Code Change → Git Push → PR Created → Jenkins Triggered → Build/Test → Merge → Deploy
```

---

## 1. How Jenkins Knows You Committed

Jenkins doesn't "watch" your repo. It's notified via **webhooks**.

```
Your Git Push
     ↓
GitHub/Bitbucket/GitLab
     ↓  (fires HTTP POST to Jenkins URL)
Jenkins Webhook Endpoint
     ↓
Jenkins starts the pipeline
```

**Webhook setup:** In your repo settings (GitHub → Settings → Webhooks), a URL like `https://jenkins.company.com/github-webhook/` is registered. On every push/PR event, GitHub POSTs a payload to that URL.

---

## 2. How the PR Process Works

```
1. Developer pushes branch
         ↓
2. Creates Pull Request (PR)
         ↓
3. Webhook fires → Jenkins picks up PR event
         ↓
4. Jenkins runs pipeline on that branch:
   - npm install
   - lint (ESLint)
   - unit tests (Jest/Vitest)
   - build (webpack/vite)
   - maybe visual regression tests
         ↓
5. Jenkins reports back: ✅ or ❌ (shown as status check on PR)
         ↓
6. Reviewers approve code
         ↓
7. Merge button unlocks (if required checks pass)
```

---

## 3. Jenkinsfile — The Pipeline Definition

The pipeline steps live in a `Jenkinsfile` at the root of your repo:

```groovy
pipeline {
  agent any

  triggers {
    githubPush()          // triggers on push
    pullRequestReview()   // triggers on PR events
  }

  stages {
    stage('Install') {
      steps { sh 'npm ci' }
    }
    stage('Lint') {
      steps { sh 'npm run lint' }
    }
    stage('Test') {
      steps { sh 'npm test -- --ci' }
    }
    stage('Build') {
      steps { sh 'npm run build' }
    }
    stage('Deploy to Staging') {
      when { branch 'main' }   // only runs after merge to main
      steps { sh './deploy.sh staging' }
    }
  }
}
```

---

## 4. How Jira Fits In

Jira is linked to Git via **branch naming conventions** and **commit messages**:

```
Branch name:  feature/PROJ-123-add-login-button
Commit msg:   "PROJ-123: Add login button component"
PR title:     "[PROJ-123] Add login button"
```

- Jira detects the ticket key (`PROJ-123`) in the branch/commit
- It auto-updates the ticket: "In Review" when PR is opened, "Done" when merged
- Some setups use **Jira + Bitbucket** natively (both Atlassian), so it's even tighter

---

## 5. Branch Protection Rules

What enforces the PR steps:

```
main branch settings:
  ✅ Require PR before merging
  ✅ Require status checks to pass (Jenkins build)
  ✅ Require N approvals
  ✅ No direct pushes to main
```

So even if reviewers approve, **you can't merge until Jenkins passes**.

---

## Summary

| Question | Answer |
|---|---|
| How does Jenkins know you pushed? | **Webhook** from GitHub/GitLab fires on push/PR events |
| Where are build steps defined? | **Jenkinsfile** in the repo root |
| How does Jira auto-update? | Reads **ticket ID** from branch name or commit message |
| What blocks the merge? | **Branch protection rules** requiring passing Jenkins checks |
