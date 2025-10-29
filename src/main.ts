import "./style.css";

/* ---- Header ------------------------------------------------- */
const header = document.createElement("h1");
header.textContent = "Canvas";

/* ---- Toolbar (DOM) ---------------- */
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

const stickerBar = document.createElement("div");
stickerBar.className = "toolbar stickers";

const stickers: Array<{ name: string; emoji: string; size: number }> = [
  { name: "Warwick", emoji: "🐺", size: 36 },
  { name: "Vi", emoji: "🥊", size: 36 },
  { name: "Jinx", emoji: "🎆", size: 36 },
  { name: "Ekko", emoji: "⏱️", size: 36 },
  { name: "Yasuo", emoji: "🌬️", size: 36 },
  { name: "Ahri", emoji: "🦊", size: 36 },
  { name: "Blitzcrank", emoji: "🤖", size: 36 },
  { name: "Teemo", emoji: "🍄", size: 36 },
  { name: "Illaoi", emoji: "🐙", size: 36 },
  { name: "Darius", emoji: "🪓", size: 36 },
];

/** ---- Sticker button creation / data-driven render ---- **/
function createStickerButton(
  entry: { name: string; emoji: string; size: number },
) {
  const { name, emoji, size } = entry;
  const b = document.createElement("button");
  b.className = "tool-btn sticker-btn";
  b.title = `${name} sticker`;
  // Button label: show emoji (or user text). If emoji equals name, keep single label.
  b.textContent = emoji === name ? `${emoji}` : `${emoji} ${name}`;
  b.addEventListener("click", () => {
    // activate sticker tool + style
    currentTool = "sticker";
    currentStickerStyle = { emoji, fontSize: size };

    // update selected visual
    document.querySelectorAll(".tool-btn").forEach((el) =>
      el.classList.remove("selectedTool")
    );
    b.classList.add("selectedTool");

    rebuildPreviewFromTool();
  });
  return b;
}

function createCustomStickerButton() {
  const add = document.createElement("button");
  add.className = "tool-btn sticker-btn";
  add.title = "Add a custom sticker";
  add.textContent = "➕ Custom";
  add.addEventListener("click", () => {
    const input = prompt("Enter a sticker (emoji or short text):", "⭐");
    if (!input) return;
    const value = input.trim();
    if (value.length === 0) return;
    const newSticker = { name: value, emoji: value, size: 36 };
    stickers.push(newSticker);
    renderStickerButtons();
    // auto-select the newly added sticker
    currentTool = "sticker";
    currentStickerStyle = { emoji: value, fontSize: 36 };
    rebuildPreviewFromTool();
    // Highlight the last sticker button
    const btns = stickerBar.querySelectorAll<HTMLButtonElement>(".sticker-btn");
    const last = btns[btns.length - 2]; // -1 is the Custom button itself
    if (last) {
      document.querySelectorAll(".tool-btn").forEach((el) =>
        el.classList.remove("selectedTool")
      );
      last.classList.add("selectedTool");
    }
  });
  return add;
}

function renderStickerButtons() {
  // Clear and rebuild: all stickers + "Custom" button
  stickerBar.innerHTML = "";
  stickers.forEach((entry) => {
    stickerBar.appendChild(createStickerButton(entry));
  });
  stickerBar.appendChild(createCustomStickerButton());
}

// Build initial sticker buttons
renderStickerButtons();

function makeExportButton() {
  const button = document.createElement("button");
  button.textContent = "Export (1024×1024)";
  button.addEventListener("click", () => {
    const out = document.createElement("canvas");
    out.width = 1024;
    out.height = 1024;
    const outCtx = out.getContext("2d")!;

    const sx = 1024 / canvas.clientWidth;
    const sy = 1024 / canvas.clientHeight;
    outCtx.save();
    outCtx.scale(sx, sy);

    for (const thing of displayList) thing.display(outCtx);

    outCtx.restore();

    const anchor = document.createElement("a");
    anchor.href = out.toDataURL("image/png");
    anchor.download = "sketchpad.png";
    anchor.click();
  });
  return button;
}

const exportButton = makeExportButton();

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
/* ---- Sticker (Drawable Thing) ------------------------------ */
class StickerShape implements DrawableThing {
  private x: number;
  private y: number;
  constructor(
    x: number,
    y: number,
    private emoji: string,
    private fontSize: number,
  ) {
    this.x = x;
    this.y = y;
  }
  drag(x: number, y: number) { // <— MOVE, don’t keep a path
    this.x = x;
    this.y = y;
  }
  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font =
      `${this.fontSize}px system-ui, "Apple Color Emoji", "Segoe UI Emoji"`;
    ctx.fillText(this.emoji, this.x, this.y);
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
    private strokeStyle = "#666",
    private lineWidth = 1,
  ) {}
  setPos(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = this.lineWidth;
    ctx.strokeStyle = this.strokeStyle;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class StickerPreview implements PreviewRenderable {
  private x = 0;
  private y = 0;
  constructor(private emoji: string, private fontSize: number) {}
  setPos(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = 0.6; // translucent preview
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font =
      `${this.fontSize}px system-ui, "Apple Color Emoji", "Segoe UI Emoji"`;
    ctx.fillText(this.emoji, this.x, this.y);
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
  for (const thing of displayList) thing.display(ctx);
  if (!currentShape && preview) preview.draw(ctx);
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
type ToolKind = "marker" | "sticker";

type StickerStyle = {
  emoji: string; // the sticker glyph (emoji)
  fontSize: number; // px
};

let currentTool: ToolKind = "marker";

let currentStickerStyle: StickerStyle = {
  emoji: "🦊", // default Ahri
  fontSize: 36,
};

let preview: PreviewRenderable | null = null;

// Helper to rebuild preview when tool changes (width/color etc.)
function rebuildPreviewFromTool() {
  if (currentTool === "marker") {
    const radius = Math.max(1, currentToolStyle.lineWidth / 2);
    preview = new CirclePreview(radius, currentToolStyle.strokeStyle, 1);
  } else { // sticker
    preview = new StickerPreview(
      currentStickerStyle.emoji,
      currentStickerStyle.fontSize,
    );
  }
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

      // Allows to switch back to pen/marker after using sticker
      if (name === "pen" || name === "marker") {
        currentTool = "marker";
      }

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

  if (currentTool === "marker") {
    currentShape = new MarkerLine(x, y, {
      strokeStyle: currentToolStyle.strokeStyle,
      lineWidth: currentToolStyle.lineWidth,
      lineCap: currentToolStyle.lineCap ?? "round",
    });
  } else { // sticker
    currentShape = new StickerShape(
      x,
      y,
      currentStickerStyle.emoji,
      currentStickerStyle.fontSize,
    );
  }

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
  undoStack.push(currentShape);
  redoStack.length = 0;
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
function makeClearButton() {
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
  stickerBar,
  canvas,
  makeClearButton(),
  undoButton,
  redoButton,
  exportButton,
);

/* Appendings */
toolbar.append(btnPen, btnMarker);

/* Now that toolbar exists in DOM, init its handlers */
initToolButtons();
rebuildPreviewFromTool();
