import "./style.css";

document.body.innerHTML = `  
`;
/*----Header Creation-------------------------------------------*/
const header = document.createElement("h1");
header.textContent = "Canvas";
/*----Drawable Interfaces---------------------------------------*/
export interface Displayable {
  display(ctx: CanvasRenderingContext2D): void;
}

export interface Draggable {
  drag(x: number, y: number): void;
}

export type DrawableThing = Displayable & Draggable;

/*----MarkerLine------------------------------------------------*/
export class MarkerLine implements DrawableThing {
  private points: { x: number; y: number }[] = [];
  private strokeStyle: string;
  private lineWidth: number;
  private lineCap: CanvasLineCap;

  constructor(x0: number, y0: number, opts?: {
    strokeStyle?: string;
    lineWidth?: number;
    lineCap?: CanvasLineCap;
  }) {
    this.points.push({ x: x0, y: y0 });
    this.strokeStyle = opts?.strokeStyle ?? "#222";
    this.lineWidth = opts?.lineWidth ?? 3;
    this.lineCap = opts?.lineCap ?? "round";
  }

  drag(x: number, y: number): void {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 2) return;

    ctx.save();
    ctx.beginPath();
    ctx.lineCap = this.lineCap;
    ctx.lineWidth = this.lineWidth;
    ctx.strokeStyle = this.strokeStyle;

    const [p0, ...rest] = this.points;
    ctx.moveTo(p0.x, p0.y);
    for (const p of rest) ctx.lineTo(p.x, p.y);

    ctx.stroke();
    ctx.restore();
  }
}
/*----Canvas Creation and functions ----------------------------*/
// const canvas = document.createElement("canvas");
// canvas.classList.add("canvas-screen");
function ensureCanvas(): HTMLCanvasElement {
  const found = document.querySelector<HTMLCanvasElement>("canvas#paint");
  if (found) return found;

  const c = document.createElement("canvas");
  c.id = "paint";
  c.style.width = "250";
  c.style.height = "250";
  document.body.appendChild(c);
  return c;
}
const canvas = ensureCanvas();
canvas.classList.add("canvas-screen");

function clear(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function renderAll() {
  clear(ctx);
  for (const thing of displayList) thing.display(ctx);
}
/*----Recording Mouse Positions---------------------------------*/
const displayList: Displayable[] = [];
const undoStack: Displayable[] = [];
const redoStack: Displayable[] = [];
/*----Canvas Drawable-------------------------------------------*/
const ctx = canvas.getContext("2d")!; // Context for drawing

type Tool = "marker";
let currentTool: Tool = "marker"; // For future use :)
let currentShape: DrawableThing | null = null;

function canvasToLocal(evt: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  return { x, y };
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  const { x, y } = canvasToLocal(e);

  if (currentTool === "marker") {
    currentShape = new MarkerLine(x, y, {
      strokeStyle: "#222",
      lineWidth: 3,
      lineCap: "round",
    });
    // Add to display list immediately so you see it while dragging:
    displayList.push(currentShape!);
  }
  renderAll();
});

canvas.addEventListener("pointermove", (e) => {
  if (!currentShape) return;
  const { x, y } = canvasToLocal(e);
  currentShape.drag(x, y);
  renderAll();
});

canvas.addEventListener("pointerup", () => {
  if (!currentShape) return;
  // Commit shape to history:
  undoStack.push(currentShape);
  // New commit invalidates redo:
  redoStack.length = 0;
  currentShape = null;
  renderAll();
});

/*----Clear Button-------------------------------------------*/
const makeClearButton = (
  //canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) => {
  const button = document.createElement("button");
  button.textContent = "Clear";
  button.addEventListener("click", () => {
    clear(ctx);
  });
  return button;
};
/*---Redo Button-------------------------------------------*/
export function redo() {
  if (redoStack.length === 0) return;
  const shape = redoStack.pop()!;
  displayList.push(shape);
  undoStack.push(shape);
  renderAll();
}
const redoButton = document.createElement("button");
redoButton.textContent = "Redo";
redoButton.addEventListener("click", () => {
  redo();
});

/*---Undo Button-------------------------------------------*/
export function undo() {
  if (undoStack.length === 0) return;
  const shape = undoStack.pop()!;
  // Remove last instance of shape
  const idx = displayList.lastIndexOf(shape);
  if (idx !== -1) displayList.splice(idx, 1);
  redoStack.push(shape);
  renderAll();
}
const undoButton = document.createElement("button");
undoButton.textContent = "Undo";
undoButton.addEventListener("click", () => {
  undo();
});

/*---Appending---*/
document.body.appendChild(header);
document.body.appendChild(canvas);
document.body.appendChild(makeClearButton(ctx));
document.body.appendChild(undoButton);
document.body.appendChild(redoButton);
