export function bezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number;
export const arrive: (x: number) => number;
export const easeOut: (x: number) => number;
export function stages(p: number, n: number): { k: number; f: number };
export interface FirstRun {
  /** Seconds, 1.6 to 2.6. */
  duration: number;
  /** Draw the start state: controls and drawing together. Called once, before the figure shows. */
  start(): void;
  /** Draw linear progress p, 0 to 1; the last call is exactly 1. Touch only what changes. */
  frame(p: number): void;
  /** The run is over, finished or cut short by the visitor. Called once. */
  end(cancelled: boolean): void;
}
export interface Player { replay(): void }
export function firstRun(root: HTMLElement, run: FirstRun): Player;
