```markdown
# Neureuther Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development conventions and patterns used in the Neureuther repository, a TypeScript project built with the Vite framework. You'll learn about file naming, import/export styles, commit message conventions, and how to structure and run tests. This guide also provides suggested commands for common workflows.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - **Example:**  
    `userProfile.ts`  
    `dataFetcher.ts`

### Import Style
- Use **absolute imports** for all modules.
  - **Example:**
    ```typescript
    import userService from 'services/userService';
    ```

### Export Style
- Use **default exports** for modules.
  - **Example:**
    ```typescript
    const userProfile = { /* ... */ };
    export default userProfile;
    ```

### Commit Message Conventions
- Use **Conventional Commits** with the `feat` prefix for new features.
- Keep commit messages concise (average ~34 characters).
  - **Example:**  
    `feat: add user authentication flow`

## Workflows

### Creating a New Feature
**Trigger:** When adding a new feature to the codebase  
**Command:** `/new-feature`

1. Create a new file using camelCase naming.
2. Write your TypeScript code, using absolute imports and default exports.
3. Add or update corresponding test files (`*.test.ts`).
4. Commit your changes using the conventional commit format with the `feat` prefix.
    - Example: `feat: implement user login`
5. Push your branch and open a pull request.

### Adding a Test
**Trigger:** When writing or updating tests  
**Command:** `/add-test`

1. Create a test file with the `.test.` infix (e.g., `userProfile.test.ts`).
2. Write your test cases according to the project's testing framework (see Testing Patterns).
3. Ensure tests cover the relevant functionality.
4. Run the test suite to verify correctness.

## Testing Patterns

- **Test File Naming:**  
  Use the `.test.` infix in filenames, e.g., `myModule.test.ts`.
- **Framework:**  
  The testing framework is not specified; check the project for a `package.json` or documentation to confirm.
- **Test Example:**
  ```typescript
  import userProfile from 'components/userProfile';

  describe('userProfile', () => {
    it('should render correctly', () => {
      // test implementation
    });
  });
  ```

## Commands
| Command        | Purpose                                 |
|----------------|-----------------------------------------|
| /new-feature   | Scaffold and commit a new feature       |
| /add-test      | Add or update a test file               |
```
