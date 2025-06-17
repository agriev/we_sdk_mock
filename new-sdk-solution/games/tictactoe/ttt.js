/* globals wx */
const board = document.getElementById('board');
const status = document.getElementById('status');
let cells = Array(9).fill(null);
let turn = 'X';

function checkWin() {
  const wins = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  return wins.some(([a, b, c]) => cells[a] && cells[a] === cells[b] && cells[a] === cells[c]);
}

function clickCell(e) {
  const idx = +e.target.dataset.idx;
  if (cells[idx] || checkWin()) return;
  cells[idx] = turn;
  e.target.textContent = turn;
  if (checkWin()) {
    status.textContent = turn + ' wins!';
  } else if (!cells.includes(null)) {
    status.textContent = 'Draw!';
  } else {
    turn = turn === 'X' ? 'O' : 'X';
  }
}

for (let i = 0; i < 9; i++) {
  const div = document.createElement('div');
  div.className = 'cell';
  div.dataset.idx = i;
  div.addEventListener('click', clickCell);
  board.appendChild(div);
}
(async () => { try { await wx.login(); } catch (e) { } })(); 