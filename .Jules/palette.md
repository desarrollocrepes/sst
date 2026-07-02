## 2025-05-15 - [Optimizing Numeric Identifiers for Mobile UX]
**Learning:** Using `type="number"` for numeric identifiers (like document IDs) can cause unwanted browser behaviors like spin buttons and number mangling. A better pattern for mobile UX and accessibility is `type="text"` combined with `inputMode="numeric"` and `pattern="[0-9]*"`. This triggers the numeric keypad on mobile devices while maintaining standard text input behavior.
**Action:** Use `type="text"` + `inputMode="numeric"` for document/ID fields instead of `type="number"`.

## 2025-05-15 - [Native Form Submission vs. KeyPress Handlers]
**Learning:** Favoring native `<form>` submission over manual `onKeyPress` handlers for "Enter to submit" logic provides better accessibility and reduces code complexity. It allows browsers to use native accessibility features and standardizes behavior across devices.
**Action:** Always wrap interactive input groups in a `<form>` and use `onSubmit` with a `type="submit"` button.
