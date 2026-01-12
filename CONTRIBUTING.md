# Contributing
Thank you for your interest in contributing to Perspective!

## Table of Contents
- [Branch](#branch)
  - [Branch Naming Convention](#branch-naming-convention)
  - [Branch Naming Guidelines](#branch-naming-guidelines)
  - [Reserved Branches](#reserved-branches)
  - [Branch Examples](#branch-examples)
- [Pull Request](#pull-request)
  - [PR Title Guidelines](#pr-title-guidelines)
  - [PR Description Guidelines](#pr-description-guidelines)
  - [PR Template Sections](#pr-template-sections)
  - [PR Examples](#pr-examples)

## Branch

### Branch Naming Convention
We follow a specific naming convention for branches to maintain clarity and organization

|Prefix|Purpose|
|:-:|:--|
|`bugs/`|Bug fixes|
|`features/`|New features|
|`refactor/`|Code refactoring|
|`hotfix/`|Urgent critical fixes|
|`chore/`|Maintenance tasks and items not covered by the categories above|
|`agents/`|Mostly AI-agent-driven contributions; please use `agents/Prefix/...`|

### Branch Naming Guidelines
- Specify what feature or bug is being addressed
- Use lowercase with hyphens to separate words
- Clearly identify the specific component, feature, or issue
- Avoid using issue numbers in branch names
- If most of the work came from an AI Agent (often called Vibe Coding), please use `agents/Prefix/...` where `Prefix` matches the change category (for example, `features`, `bugs`, `refactor`, `hotfix`, `chore`)

### Reserved Branches
- `develop` is reserved for maintainers and is not available for external contributors
- It is used for integration testing and small development-stage changes

### Branch Examples
Here are some examples of properly named branches

|Type|Branch Name|
|:-:|:--|
|Bug fix|`bugs/login-timeout`|
|New feature|`features/peer-connection`|
|Refactoring|`refactor/state-management`|
|Hotfix|`hotfix/session-hijacking`|
|Chore|`chore/update-dependencies`|
|AI agent contribution|`agents/features/qr-share-panel`|

## Pull Request

### PR Title Guidelines
- Focus on the main functionality being modified
- Briefly mention other modified features
- Do not use parentheses
- Include issue number only for significant changes like bug fixes or new feature proposals

### PR Description Guidelines
- Describe the impact of the changes
- Explain the reasoning behind the modifications
- Mention issue numbers for bug/issue fixes
- Provide clear context without unnecessary fluff

### AI Agent Usage
- We love AI-assisted contributions
- If you used an AI Agent, please add a short note in the PR message `Additional Notes`; if possible, include the tool and model you used. Some models can be genuinely impressive, and we'd love to know what helped you!

### PR Template Sections
Follow the PR template and fill in each section

Template (copy/paste):
```markdown
## Description
<!-- Describe the impact of the changes and explain the reasoning behind the modifications -->

## Type of Change
- [ ] Bug fix (bugs/)
- [ ] New feature (features/)
- [ ] Refactoring (refactor/)
- [ ] Hotfix (hotfix/)

## Related Issues
<!-- Mention issue numbers for bug/issue fixes using 'Closes #123' or 'Fixes #123' -->

## Changes Made
<!-- List the main changes made in this PR -->
-
-
-

## Screenshots/Videos
<!-- If applicable, add screenshots or videos to demonstrate the changes -->

## Checklist
- [ ] Code follows the project's coding style
- [ ] Self-review completed
- [ ] Documentation updated (if necessary)

## Additional Notes
<!-- Any additional information that reviewers should know (mention AI Agent usage here, including tool/model if applicable). Thanks! -->
```

### PR Examples
See real PRs:
- [#6 : Add focus handlers to PasswordInput component](https://github.com/BackGwa/Perspective/pull/6)
- [#7 : Enhance video degradation preference handling](https://github.com/BackGwa/Perspective/pull/7)
- [#8 : Improve stream quality handling and increase max participants to 128](https://github.com/BackGwa/Perspective/pull/8)