/* Placeholder Flappy Bird */
/* globals wx */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let y = canvas.height / 2;
let velocity = 0;
const gravity = 0.5;
const pipes = [];
let frame = 0;

function loop() {
  velocity += gravity;
  y += velocity;
  if (y > canvas.height) { y = canvas.height; velocity = 0; }
  ctx.fillStyle = '#4ec0ca';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // pipes
  if (frame % 100 === 0) {
    const gap = 120;
    const top = Math.random() * (canvas.height - gap - 40) + 20;
    pipes.push({ x: canvas.width, top });
  }
  pipes.forEach(p => { p.x -= 2; });
  pipes.filter(p => p.x > -50);
  ctx.fillStyle = '#0f0';
  pipes.forEach(p => {
    ctx.fillRect(p.x, 0, 40, p.top);
    ctx.fillRect(p.x, p.top + 120, 40, canvas.height);
    // collision
    if (p.x < canvas.width / 3 + 12 && p.x + 40 > canvas.width / 3 - 12) {
      if (y - 12 < p.top || y + 12 > p.top + 120) {
        y = canvas.height / 2; velocity = 0; pipes.length = 0; frame = 0; // reset
      }
    }
  });
  ctx.fillStyle = '#ff0';
  ctx.beginPath();
  ctx.arc(canvas.width / 3, y, 12, 0, Math.PI * 2);
  ctx.fill();
  requestAnimationFrame(loop);
  frame++;
}
loop();

document.addEventListener('keydown', e => { if (e.code === 'Space') { velocity = -8; } });
(async () => { try { await wx.login(); } catch (e) { } })(); 