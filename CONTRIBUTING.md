# Contributing
Thank you for your interest in contributing to Perspective!

## Table of Contents
- [Branch](#branch)
  - [Branch Naming Convention](#branch-naming-convention)
  - [Branch Naming Guidelines](#branch-naming-guidelines)
  - [Branch Examples](#branch-examples)
- [Pull Request](#pull-request)
  - [PR Title Guidelines](#pr-title-guidelines)
  - [PR Title Examples](#pr-title-examples)
  - [PR Description Guidelines](#pr-description-guidelines)
  - [PR Description Examples](#pr-description-examples)

## Branch

### Branch Naming Convention
We follow a specific naming convention for branches to maintain clarity and organization

|Prefix|Purpose|
|:-:|:--|
|`bugs/`|Bug fixes|
|`features/`|New features|
|`refactor/`|Code refactoring|
|`hotfix/`|Urgent critical fixes|

### Branch Naming Guidelines
- Specify what feature or bug is being addressed
- Use lowercase with hyphens to separate words
- Clearly identify the specific component, feature, or issue
- Avoid using issue numbers in branch names

### Branch Examples
Here are some examples of properly named branches

|Type|Branch Name|
|:-:|:--|
|Bug fix|`bugs/login-timeout`|
|New feature|`features/peer-connection`|
|Refactoring|`refactor/state-management`|
|Hotfix|`hotfix/session-hijacking`|

## Pull Request

### PR Title Guidelines
- Focus on the main functionality being modified
- Briefly mention other modified features
- Do not use parentheses
- Include issue number only for significant changes like bug fixes or new feature proposals

### PR Title Examples
Here are some examples of properly formatted PR titles

|Type|PR Title|
|:-:|:--|
|Feature with refinements|Add session password protection and refine overall style and code|
|Feature removal|Remove auto-approval for reconnecting peers|
|Bug fix with issue|Fix login timeout and optimize loading performance (#123)|

### PR Description Guidelines
- Describe the impact of the changes
- Explain the reasoning behind the modifications
- Mention issue numbers for bug/issue fixes
- Provide clear context without unnecessary fluff

### PR Description Examples
Here are some examples of well-written PR descriptions

Example : Feature Change
> Eliminated logic that automatically approves peers who reconnect if they were previously approved. This change ensures all participants go through the password protection flow, even on reconnection. Closes #45.