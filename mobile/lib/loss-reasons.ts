export function validateLossPrompt(input: { reason: string }) {
  const reason = input.reason.trim();
  if (!reason) {
    return "Enter a loss reason.";
  }
  if (reason.length > 500) {
    return "Loss reason must be 500 characters or less.";
  }
  return null;
}
