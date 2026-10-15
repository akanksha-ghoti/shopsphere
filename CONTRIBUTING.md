# Contributing to ShopSphere

## Branch Naming Convention

Use descriptive, task-specific branches.

Format:

`day-XX/task-XX-short-description`

Example:

`day-01/task-01-project-architecture-and-repository-setup`

Create task branches from the latest `main` branch.

## Commit Message Convention

Use the following format:

`type(scope): short description`

Example for this task:

`feat(day-01): project architecture & repository setup`

Common types:

* `feat`: New functionality
* `fix`: Bug fixes
* `docs`: Documentation changes
* `refactor`: Code restructuring
* `test`: Tests
* `chore`: Maintenance tasks

## Pull Request Guidelines

* Keep changes focused on the assigned task.
* Verify the application before submitting.
* Describe the changes and testing performed.
* Do not commit credentials, API keys, passwords, or local `.env` files.
* Keep generated directories such as `node_modules` out of Git.

## Before Submission

1. Review `git status`.
2. Run the relevant frontend and backend checks.
3. Confirm the required files are present.
4. Commit using the agreed convention.
5. Push the task branch to GitHub.
6. Record the repository URL, branch name, and commit hash.
