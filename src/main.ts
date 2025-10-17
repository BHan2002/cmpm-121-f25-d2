import "./style.css";

document.body.innerHTML = `  
`;
/*----Header Creation-------------------------------------------*/
const header = document.createElement("h1");
header.textContent = "Canvas";
/*----Canvas Creation-------------------------------------------*/
const canvas = document.createElement("canvas");
canvas.classList.add("canvas-screen");
/*----Recording Mouse Positions---------------------------------*/
type Point = { x: number; y: number };
const strokes: Point[][] = []; // Each stroke is a list of points
const redo_stack: Point[][] = []; // Stack for redo functionality
let currentStroke: Point[] | null = null;
/*----Canvas Drawable-------------------------------------------*/
const ctx = canvas.getContext("2d")!; // Context for drawing
let isDrawing = false; // Track drawing state

canvas.addEventListener("mousemove", (e) => {
  if (!isDrawing) return;
  requestAnimationFrame(() => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    currentStroke?.push({ x, y });
    ctx.lineTo(x, y);
    ctx.stroke();
  });
});
canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  currentStroke = [{ x, y }];
  ctx.lineWidth = .5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
});
canvas.addEventListener("mouseup", () => {
  if (!isDrawing) return;
  isDrawing = false;
  if (currentStroke) {
    strokes.push(currentStroke);
    currentStroke = null;
  }
  redraw();
});
/*----Redraw Function-------------------------------------------*/
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Replay all completed strokes
  strokes.forEach((stroke) => {
    if (stroke.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.lineWidth = .5;
    ctx.lineCap = "round";
    ctx.shadowBlur = .5;
    ctx.shadowColor = "black";
    ctx.stroke();
  });

  // Draw current stroke
  if (currentStroke && currentStroke.length >= 2) {
    ctx.beginPath();
    ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
    for (let i = 1; i < currentStroke.length; i++) {
      ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
    }
    ctx.lineWidth = .5;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}
/*----Clear Button-------------------------------------------*/
const makeClearButton = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) => {
  const button = document.createElement("button");
  button.textContent = "Clear";
  button.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Clear the recorded strokes
    strokes.length = 0;
  });
  return button;
};
/*---Redo Button-------------------------------------------*/
const redoButton = document.createElement("button");
redoButton.textContent = "Redo";
redoButton.addEventListener("click", () => {
  if (redo_stack.length === 0) return;
  const stroke = redo_stack.pop();
  if (stroke) {
    strokes.push(stroke);
  }
  redraw();
});
/*---Undo Button-------------------------------------------*/
const undoButton = document.createElement("button");
undoButton.textContent = "Undo";
undoButton.addEventListener("click", () => {
  const stroke = strokes.pop();
  if (stroke) {
    redo_stack.push(stroke);
  }
  redraw();
});

/*---Appending---*/
document.body.appendChild(header);
document.body.appendChild(canvas);
document.body.appendChild(makeClearButton(canvas, ctx));
document.body.appendChild(undoButton);
document.body.appendChild(redoButton);
