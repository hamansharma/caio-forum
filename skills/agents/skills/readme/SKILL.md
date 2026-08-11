---
name: readme
description: Generate a project-specific, comprehensive README.md by analyzing repository structure, package manifests, and source files.
---
## Purpose
This skill allows the agent to analyze an existing project's repository structure, codebase, and package configuration files to generate a comprehensive, professional, and clear `README.md` file tailored to the project's exact technology stack.

## When to Use
* When an existing project lacks a root `README.md`.
* When a project's architecture, dependencies, or setup instructions have evolved significantly, making the current documentation stale.

## Prerequisites
* Accessible project workspace containing the source code.
* Presence of standard dependency manifests (e.g., `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `pom.xml`).

## Workflow Steps

### 1. Analyze Project Architecture
* Scan the repository root and map out the core directory structure.
* Read key configuration files to identify the programming languages, framework versions, core dependencies, and available build/start/test scripts.
* Inspect main entry points (e.g., `index.js`, `main.py`, `src/App.tsx`) to deduce the primary objective and entry flow of the application.

### 2. Gather Context and Evidence
* Avoid guessing or introducing promotional language. 
* Rely entirely on evidence found in docstrings, source code comments, and project setup logs to accurately summarize what the software accomplishes.

### 3. Generate the README File
Generate a root `README.md` file using strict **GitHub Flavored Markdown (GFM)** formatting. Structure the document using the following exact layout, filling in data derived from the analysis phase:

```markdown
# [Project Name]
<!-- If a local logo asset or icon exists in the project workspace, embed it here as a centered image header -->

A clear, concise, single-sentence high-impact value proposition describing what this project accomplishes.

## ✨ Features
* **[Feature 1 Name]**: Short fragment explaining this core functional aspect.
* **[Feature 2 Name]**: Short fragment explaining this core functional aspect.

## 🛠️ Tech Stack
* **Language/Runtime**: [e.g., Node.js, Python 3.11, Rust]
* **Frameworks/Libraries**: [List key frameworks discovered during step 1]

## 🚀 Getting Started

### Prerequisites
List specific software or engine requirements required to boot the workspace (e.g., Docker, Python version, specific CLI tools).

### Installation
```bash
# Provide exact command blocks needed to clone, install dependencies, and configure environment variables
```

### Usage
```bash
# Provide exact command blocks to run, build, or deploy the application
```
Include a brief, contextual breakdown of the primary CLI command parameters or interface entry-points if applicable.
```

### 4. Quality Rules and Constraints
* **Omit Redundant Sections**: Do **NOT** include sections like "LICENSE", "CONTRIBUTING", or "CHANGELOG" directly in the `README.md` if those files already exist natively in the root directory.
* **Maintain Strict Readability**: Keep sentences simple, direct, and actionable. Use GitHub-specific markdown callouts (e.g., `> [!NOTE]`, `> [!IMPORTANT]`) to draw focus to critical technical edge cases.
* **No Placeholders**: Ensure that final generated files contain zero unresolved bracketed values (e.g., `<insert-here>` or `[TODO]`).

## Self-Verification Loop
1. Review the generated `README.md` file against the current workspace status.
2. Execute a lightweight syntax check or verify that all documented initialization commands strictly align with the `scripts` or instructions parsed from the configuration manifests.