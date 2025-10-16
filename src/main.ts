import "./style.css";

document.body.innerHTML = `  
`;
/*----Header Creation-------------------------------------------*/
const header = document.createElement("h1");
header.textContent = "Canvas";
/*----Canvas Creation-------------------------------------------*/
const canvas = document.createElement("canvas");
canvas.classList.add("canvas-screen");
/*----Canvas Drawable-------------------------------------------*/
const ctx = canvas.getContext("2d")!;
let isDrawing = false;

canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  ctx.lineWidth = .33;
  ctx.lineCap = "round";
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  ctx.beginPath();
  ctx.moveTo(x, y);
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDrawing) return;

  /*--Throttle drawing to refresh rate using rAF--*/
  requestAnimationFrame(() => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  });
});

canvas.addEventListener("mouseup", () => {
  isDrawing = false;
  ctx.closePath();
});
/*----Clear Button-------------------------------------------*/
const makeClearButton = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) => {
  const button = document.createElement("button");
  button.textContent = "Clear";
  button.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
  return button;
};

/*---Appending---*/
document.body.appendChild(header);
document.body.appendChild(canvas);
document.body.appendChild(makeClearButton(canvas, ctx));
