# Contributing to Tempo

Thank you for your interest in contributing to Tempo! This guide will help you get started.

---

## How to Contribute

### Bug Reports

Found a bug? Please create an issue with:
- **What happened** — Clear description of the problem
- **Expected behavior** — What should happen instead
- **Steps to reproduce** — How to replicate the issue
- **Environment** — Browser, OS, Python version, etc.

### Feature Requests

Have an idea? Open an issue with:
- **What** — Clear description of the feature
- **Why** — Problem it solves or value it adds
- **How** — Suggested implementation (optional)

### Code Contributions

Want to code? Follow these steps:

1. **Fork** the repository
2. **Create a branch** — `git checkout -b feature/your-feature`
3. **Make changes** — See guidelines below
4. **Test** — Ensure it works and doesn't break existing features
5. **Commit** — `git commit -m "feat: add your feature"`
6. **Push** — `git push origin feature/your-feature`
7. **Create Pull Request** — Describe your changes

---

## Development Setup

### Clone the Repo

```bash
git clone https://github.com/yourusername/tempo.git
cd tempo
```

### Backend Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies (including dev)
pip install -r requirements.txt

# Run with hot-reload
python server.py

# Run tests
python -m pytest tests/
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start dev server with hot-reload
npm run dev

# Run lint
npm run lint

# Build for production
npm run build
```

---

## Code Standards

### Frontend (React/JavaScript)

- **Style**: ESLint configuration in `eslint.config.js`
- **Formatting**: Use 2-space indentation
- **Naming**: 
  - Components: PascalCase (`CoachChat.jsx`)
  - Utils: camelCase (`patternMatcher.js`)
  - Constants: UPPER_SNAKE_CASE (`KEYBOARD_MAP`)
- **Comments**: Use `//` for single line, `/* */` for blocks
- **Performance**: 
  - Use `useMemo` for expensive computations
  - Use `useCallback` for event handlers
  - Avoid unnecessary re-renders

```javascript
// ✅ Good
export function CoachChat({ messages }) {
  const recentMessages = useMemo(() => 
    messages.slice(-10), [messages]
  );
  
  const handleSend = useCallback((msg) => {
    dispatchMessage(msg);
  }, []);

  return <div>...</div>;
}

// ❌ Avoid
function coachChat(messages) {
  // Creates new array on every render
  let recent = messages.slice(-10);
  
  return <div>...</div>;
}
```

### Backend (Python)

- **Style**: PEP 8 — Use `black` or `autopep8`
- **Formatting**: 2-space indentation consistently
- **Type hints**: Use throughout for clarity
- **Docstrings**: Add for functions and classes

```python
# ✅ Good
async def get_coach_response(session_json: str) -> str:
    """Generate coaching feedback for the session.
    
    Args:
        session_json: JSON string with session performance data
        
    Returns:
        Coaching response text
        
    Raises:
        ValueError: If session_json is invalid JSON
    """
    data = json.loads(session_json)
    # ...
    return feedback

# ❌ Avoid
def getCoachResponse(s):
    # No type hints, unclear purpose
    d = json.loads(s)
    return r
```

### CSS

- **Organization**: Group by component/section
- **Naming**: Use BEM-like convention with `kf-` prefix
- **Variables**: Use CSS custom properties for colors/spacing
- **Responsive**: Mobile-first approach

```css
/* ✅ Good */
.kf-coach-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--spacing-md);
}

.kf-msg-bubble {
  max-width: 85%;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
}

/* ❌ Avoid */
.messages {
  flex: 1; overflow-y: auto; padding: 0 16px;
}

#tmp { color: #ff0000; }
```

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting, no code change
- `refactor:` Code restructure
- `perf:` Performance improvement
- `test:` Adding tests
- `chore:` Dependencies, config, etc.

**Examples:**
```
feat: add stream-based coach responses
fix: resolve WebSocket connection timeout
docs: update keyboard mapping guide
refactor: extract pattern matcher to separate module
perf: optimize waterfall note rendering
```

---

## Pull Request Guidelines

1. **Title** — Use Conventional Commits format
2. **Description** — Explain what and why
3. **Related Issues** — Link with "Fixes #123"
4. **Testing** — How to test your changes
5. **Screenshots** — For UI changes

**Template:**
```markdown
## Description
Briefly describe what this PR does.

## Related Issue
Fixes #123

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## How Has This Been Tested?
Describe testing steps:
1. Load Happy Birthday
2. Play first 5 notes
3. Check AI Coach feedback

## Screenshots
[Add screenshots for UI changes]

## Checklist
- [ ] My code follows the code standards
- [ ] I've tested locally
- [ ] No new warnings generated
- [ ] PR title uses Conventional Commits
```

---

## Areas for Contribution

### High Priority
- [ ] Unit tests for `patternMatcher.js`
- [ ] Error recovery for network failures
- [ ] Performance optimization for 1000+ note files
- [ ] Mobile responsive design

### Medium Priority
- [ ] Additional practice modes (metronome, ear training)
- [ ] User authentication system
- [ ] Song library improvements
- [ ] Cloud sync infrastructure

### Low Priority (Nice to Have)
- [ ] Multiple language support
- [ ] Dark/light theme toggle
- [ ] Accessibility improvements
- [ ] Video lesson integration

---

## Questions?

- **Discord**: Join our community for live chat
- **GitHub Issues**: Ask in issue threads
- **Email**: hello@tempo-music.dev

---

## Code of Conduct

Please note we have a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to abide by its terms.

---

## License

By contributing to Tempo, you agree that your contributions will be licensed under the MIT License.

