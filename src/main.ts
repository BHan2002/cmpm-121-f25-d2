import "./style.css";

document.body.innerHTML = `  
`;
/*----Header Creation-------------------------------------------*/
const header = document.createElement("h1");
header.textContent = "Canvas";
document.body.appendChild(header);
/*----Canvas Creation-------------------------------------------*/
const canvas = document.createElement("canvas");
canvas.classList.add("canvas-screen");
document.body.appendChild(canvas);
/*----Canvas Drawable-------------------------------------------*/
const ctx = canvas.getContext("2d")!;
let isDrawing = false;

canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
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
