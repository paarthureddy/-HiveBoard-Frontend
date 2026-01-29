# Contributing to HiveBoard

Thank you for your interest in contributing to HiveBoard! This document provides guidelines and instructions for contributing to the project.

## 🤝 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/HiveBoard.git
   cd HiveBoard
   ```
3. **Add the upstream repository**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/HiveBoard.git
   ```
4. **Create a new branch** for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bugfix-name
   ```

## 📝 Development Workflow

### 1. Keep Your Fork Updated

Before starting work, sync your fork with the upstream repository:

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### 2. Make Your Changes

- Write clean, readable code
- Follow the existing code style
- Add comments for complex logic
- Update documentation if needed

### 3. Test Your Changes

Before submitting, ensure:

```bash
# Run linting
npm run lint

# Run tests
npm test

# Test both servers are working
# Terminal 1
cd server
npm run dev

# Terminal 2
npm run dev
```

### 4. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add user profile page"
# or
git commit -m "fix: resolve socket connection issue"
```

**Commit Message Format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Create a Pull Request

1. Go to your fork on GitHub
2. Click "Pull Request" button
3. Select your branch and provide a clear description:
   - What changes you made
   - Why you made them
   - Any relevant issue numbers (e.g., "Fixes #123")
4. Submit the pull request

## 🎯 Pull Request Guidelines

### Before Submitting

- ✅ Code follows the project's style guidelines
- ✅ All tests pass
- ✅ No console errors or warnings
- ✅ Documentation is updated (if applicable)
- ✅ Commit messages are clear and descriptive
- ✅ Branch is up-to-date with main

### PR Description Should Include

- **Summary**: Brief description of changes
- **Motivation**: Why this change is needed
- **Changes**: List of specific changes made
- **Testing**: How you tested the changes
- **Screenshots**: For UI changes (before/after)
- **Related Issues**: Link to related issues

### Example PR Template

```markdown
## Summary
Added user profile editing functionality

## Motivation
Users need to be able to update their profile information

## Changes
- Added profile edit form component
- Created API endpoint for profile updates
- Added validation for profile fields
- Updated user model to include new fields

## Testing
- Tested form validation with various inputs
- Verified API endpoint with Postman
- Tested on Chrome, Firefox, and Safari

## Screenshots
[Before/After screenshots]

## Related Issues
Closes #45
```

## 🐛 Reporting Bugs

### Before Reporting

1. Check if the bug has already been reported
2. Verify it's reproducible in the latest version
3. Check if it's a known issue in the documentation

### Bug Report Should Include

- **Description**: Clear description of the bug
- **Steps to Reproduce**: Detailed steps to reproduce
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**:
  - OS (Windows/Mac/Linux)
  - Node.js version
  - Browser (if applicable)
- **Screenshots/Logs**: If applicable
- **Possible Solution**: If you have ideas

## 💡 Suggesting Features

### Feature Request Should Include

- **Problem**: What problem does this solve?
- **Solution**: Proposed solution
- **Alternatives**: Alternative solutions considered
- **Additional Context**: Any other relevant information

## 📋 Code Style Guidelines

### JavaScript/TypeScript

- Use **ES6+** syntax
- Use **const** and **let**, avoid **var**
- Use **arrow functions** for callbacks
- Use **async/await** over promises when possible
- Add **JSDoc comments** for functions
- Keep functions **small and focused**

### React Components

- Use **functional components** with hooks
- Keep components **small and reusable**
- Use **TypeScript** for type safety
- Follow **single responsibility principle**
- Extract **complex logic into custom hooks**

### CSS/Styling

- Use **Tailwind CSS** utility classes
- Follow **mobile-first** approach
- Keep **custom CSS minimal**
- Use **CSS variables** for theming

### File Naming

- Components: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Hooks: `useCamelCase.ts` (e.g., `useAuth.ts`)
- Constants: `UPPER_SNAKE_CASE.ts` (e.g., `API_ENDPOINTS.ts`)

## 🔍 Code Review Process

1. **Automated Checks**: CI/CD will run tests and linting
2. **Peer Review**: At least one maintainer will review
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, PR will be merged
5. **Cleanup**: Delete your branch after merge

## 🏷️ Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `priority: high` - High priority
- `priority: low` - Low priority
- `wontfix` - This will not be worked on

## 🎓 Resources

### Learning Resources
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Socket.io Documentation](https://socket.io/docs/)

### Project-Specific
- [Architecture Overview](./docs/architecture.md) *(if available)*
- [API Documentation](./docs/api.md) *(if available)*

## ❓ Questions?

If you have questions:
1. Check existing issues and discussions
2. Read the documentation
3. Ask in the issue comments
4. Create a new discussion

## 🙏 Thank You!

Your contributions make HiveBoard better for everyone. We appreciate your time and effort!

---

**Happy Coding! 🚀**
