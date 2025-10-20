import "./style.css";

/* ---- Header ------------------------------------------------- */
const header = document.createElement("h1");
header.textContent = "Canvas";

/* ---- Toolbar (build with DOM, not innerHTML) ---------------- */
const toolbar = document.createElement("div");
toolbar.className = "toolbar";

const btnPen = document.createElement("button");
btnPen.className = "tool-btn selectedTool";
btnPen.dataset.tool = "pen";
btnPen.dataset.width = "2";
btnPen.dataset.color = "#222";
btnPen.title = "Pen (thin)";
btnPen.textContent = "Pen";

const btnMarker = document.createElement("button");
btnMarker.className = "tool-btn";
btnMarker.dataset.tool = "marker";
btnMarker.dataset.width = "8";
btnMarker.dataset.color = "#222";
btnMarker.title = "Marker (thick)";
btnMarker.textContent = "Marker";

toolbar.append(btnPen, btnMarker);

/* ---- Drawable Interfaces ----------------------------------- */
export interface Displayable {
  display(ctx: CanvasRenderingContext2D): void;
}
export interface Draggable {
  drag(x: number, y: number): void;
}
export type DrawableThing = Displayable & Draggable;

/* ---- MarkerLine --------------------------------------------- */
export class MarkerLine implements DrawableThing {
  private points: { x: number; y: number }[] = [];
  private strokeStyle: string;
  private lineWidth: number;
  private lineCap: CanvasLineCap;

  constructor(
    x0: number,
    y0: number,
    opts?: {
      strokeStyle?: string;
      lineWidth?: number;
      lineCap?: CanvasLineCap;
    },
  ) {
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

/* ---- Preview (Command-like) -------------------------------- */
interface PreviewRenderable {
  draw(ctx: CanvasRenderingContext2D): void;
  setPos(x: number, y: number): void;
}

class CirclePreview implements PreviewRenderable {
  private x = 0;
  private y = 0;

  constructor(
    private radius: number,
    private strokeStyle: string = "#666",
    private lineWidth: number = 1,
  ) {}

  setPos(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!Number.isFinite(this.x) || !Number.isFinite(this.y)) return;
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = this.lineWidth;
    ctx.strokeStyle = this.strokeStyle;
    ctx.setLineDash([4, 4]); // dashed outline preview
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/* ---- History + Display List -------------------------------- */
const displayList: Displayable[] = [];
const undoStack: Displayable[] = [];
const redoStack: Displayable[] = [];

/* ---- Canvas ------------------------------------------------- */
function ensureCanvas(): HTMLCanvasElement {
  const found = document.querySelector<HTMLCanvasElement>("canvas#paint");
  if (found) return found;
  const c = document.createElement("canvas");
  c.id = "paint";
  c.classList.add("canvas-screen"); // CSS Controls the style
  c.style.touchAction = "none";
  return c;
}
const canvas = ensureCanvas();
const ctx = canvas.getContext("2d")!;

/* ---- Rendering --------------------------------------------- */
function clearCanvas() {
  // use clientWidth/Height (CSS pixels) because we scaled the context
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
}
function renderAll() {
  clearCanvas();
  // draw committed shapes
  for (const thing of displayList) thing.display(ctx);

  // draw preview only when the user is NOT dragging a live shape
  if (!currentShape && preview) {
    preview.draw(ctx);
  }
}

/* ---- Tool Style State -------------------------------------- */
type ToolStyle = {
  name: string;
  lineWidth: number;
  strokeStyle: string;
  lineCap?: CanvasLineCap;
};
let currentToolStyle: ToolStyle = {
  name: "pen",
  lineWidth: 2,
  strokeStyle: "#222",
  lineCap: "round",
};

let preview: PreviewRenderable | null = null;

// Helper to rebuild preview when tool changes (width/color etc.)
function rebuildPreviewFromTool() {
  // radius is half the stroke width so it visually matches the marker’s footprint
  const radius = Math.max(1, currentToolStyle.lineWidth / 2);
  // Make the outline similar to the tool color but lighter
  preview = new CirclePreview(radius, currentToolStyle.strokeStyle, 1);
}

/* ---- Hook up toolbar (now that buttons exist) --------------- */
function initToolButtons() {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>(".tool-btn"),
  );
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.tool ?? "custom";
      const width = Number(btn.dataset.width ?? "3");
      const color = btn.dataset.color ?? "#222";
      currentToolStyle = {
        name,
        lineWidth: Number.isFinite(width) ? width : 3,
        strokeStyle: color,
        lineCap: "round",
      };
      buttons.forEach((b) => b.classList.remove("selectedTool"));
      btn.classList.add("selectedTool");
      rebuildPreviewFromTool();
    });
  });
}

/* ---- Input -------------------------------------------------- */
let currentShape: DrawableThing | null = null;

function toLocal(evt: PointerEvent) {
  const r = canvas.getBoundingClientRect();
  return { x: evt.clientX - r.left, y: evt.clientY - r.top };
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  const { x, y } = toLocal(e);

  currentShape = new MarkerLine(x, y, {
    strokeStyle: currentToolStyle.strokeStyle,
    lineWidth: currentToolStyle.lineWidth,
    lineCap: currentToolStyle.lineCap ?? "round",
  });

  // show while dragging
  displayList.push(currentShape);
  renderAll();
});

canvas.addEventListener("pointermove", (e) => {
  const { x, y } = toLocal(e);

  if (currentShape) {
    // drawing in progress -> grow the line
    currentShape.drag(x, y);
    renderAll();
    return;
  }

  // Not drawing -> broadcast a tool-moved event for preview
  canvas.dispatchEvent(
    new CustomEvent("tool-moved", {
      detail: { x, y, tool: currentToolStyle },
    }),
  );
});

canvas.addEventListener("pointerup", () => {
  if (!currentShape) return;
  undoStack.push(currentShape); // commit for undo
  redoStack.length = 0; // invalidate redo
  currentShape = null;
  renderAll();
});

canvas.addEventListener("tool-moved", (e: Event) => {
  const ev = e as CustomEvent<{ x: number; y: number }>;
  if (!preview) return;
  preview.setPos(ev.detail.x, ev.detail.y);
  renderAll(); // re-paint to show the preview
});

/* ---- Undo / Redo / Clear ----------------------------------- */
export function undo() {
  if (!undoStack.length) return;
  const shape = undoStack.pop()!;
  const i = displayList.lastIndexOf(shape);
  if (i !== -1) displayList.splice(i, 1);
  redoStack.push(shape);
  renderAll();
}
export function redo() {
  if (!redoStack.length) return;
  const shape = redoStack.pop()!;
  displayList.push(shape);
  undoStack.push(shape);
  renderAll();
}
function makeClearButton(ctx: CanvasRenderingContext2D) {
  const button = document.createElement("button");
  button.textContent = "Clear";
  button.addEventListener("click", () => {
    displayList.length = 0; // clear shapes too
    undoStack.length = 0;
    redoStack.length = 0;
    clearCanvas();
  });
  return button;
}
const undoButton = document.createElement("button");
undoButton.textContent = "Undo";
undoButton.addEventListener("click", () => undo());

const redoButton = document.createElement("button");
redoButton.textContent = "Redo";
redoButton.addEventListener("click", () => redo());

/* ---- Attach to DOM in the right order ---------------------- */
document.body.innerHTML = ""; // reset ONCE at the top
document.body.append(
  header,
  toolbar,
  canvas,
  makeClearButton(ctx),
  undoButton,
  redoButton,
);

/* Now that toolbar exists in DOM, init its handlers */
initToolButtons();
rebuildPreviewFromTool();
