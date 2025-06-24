// Utility helpers for tests can be added here
export function getByTestId(container: HTMLElement, testId: string): HTMLElement | null {
  return container.querySelector(`[data-testid="${testId}"]`);
}
