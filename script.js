(function () {
  "use strict";

  const SIZE = 8;
  const MIN_MATCH = 5;
  const INITIAL_STEPS = 15;
  const OBJECTIVE_TARGET = 10;

  const COLORS = ["red", "blue", "green", "yellow"];

  function freshErased() {
    return Object.fromEntries(COLORS.map((c) => [c, 0]));
  }

  const boardEl = document.getElementById("board");
  const stepsEl = document.getElementById("steps-count");
  const objectivesEl = document.getElementById("objectives-list");
  const modalWin = document.getElementById("modal-win");
  const modalLose = document.getElementById("modal-lose");
  const btnPlayAgain = document.getElementById("btn-play-again");
  const btnTryAgain = document.getElementById("btn-try-again");

  let board = [];
  let stepsLeft = INITIAL_STEPS;
  let erased = freshErased();
  let selected = null;
  let locked = false;
  let dragStart = null;

  const cellEls = [];
  const pieceEls = [];
  let pieceIdCounter = 0;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Works on LAN HTTP (crypto.randomUUID needs a secure context). */
  function newPieceId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    pieceIdCounter += 1;
    return `p-${Date.now()}-${pieceIdCounter}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function cssMs(varName, fallback) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function createPiece() {
    return {
      color: randomItem(COLORS),
      id: newPieceId(),
    };
  }

  function cellKey(r, c) {
    return `${r},${c}`;
  }

  function parseKey(key) {
    const [r, c] = key.split(",").map(Number);
    return { r, c };
  }

  function isAdjacent(a, b) {
    const dr = Math.abs(a.r - b.r);
    const dc = Math.abs(a.c - b.c);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  }

  function swapData(r1, c1, r2, c2) {
    const tmp = board[r1][c1];
    board[r1][c1] = board[r2][c2];
    board[r2][c2] = tmp;
  }

  function findMatches(grid) {
    const matched = new Set();

    for (let r = 0; r < SIZE; r++) {
      let c = 0;
      while (c < SIZE) {
        const piece = grid[r][c];
        if (!piece) {
          c++;
          continue;
        }
        const color = piece.color;
        const start = c;
        while (c < SIZE && grid[r][c]?.color === color) c++;
        if (c - start >= MIN_MATCH) {
          for (let i = start; i < c; i++) matched.add(cellKey(r, i));
        }
      }
    }

    for (let c = 0; c < SIZE; c++) {
      let r = 0;
      while (r < SIZE) {
        const piece = grid[r][c];
        if (!piece) {
          r++;
          continue;
        }
        const color = piece.color;
        const start = r;
        while (r < SIZE && grid[r][c]?.color === color) r++;
        if (r - start >= MIN_MATCH) {
          for (let i = start; i < r; i++) matched.add(cellKey(i, c));
        }
      }
    }

    return matched;
  }

  function hasAnyMatch(grid) {
    return findMatches(grid).size > 0;
  }

  function wouldCreateMatchAt(grid, r, c) {
    const color = grid[r][c].color;

    let count = 1;
    for (let cc = c - 1; cc >= 0 && grid[r][cc]?.color === color; cc--) count++;
    for (let cc = c + 1; cc < SIZE && grid[r][cc]?.color === color; cc++) count++;
    if (count >= MIN_MATCH) return true;

    count = 1;
    for (let rr = r - 1; rr >= 0 && grid[rr][c]?.color === color; rr--) count++;
    for (let rr = r + 1; rr < SIZE && grid[rr][c]?.color === color; rr++) count++;
    return count >= MIN_MATCH;
  }

  function swapWouldCreateMatch(grid, r1, c1, r2, c2) {
    const a = grid[r1][c1];
    const b = grid[r2][c2];
    if (!a || !b) return false;
    grid[r1][c1] = b;
    grid[r2][c2] = a;
    const matched = findMatches(grid).size > 0;
    grid[r1][c1] = a;
    grid[r2][c2] = b;
    return matched;
  }

  function hasPossibleMove(grid) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (c + 1 < SIZE && swapWouldCreateMatch(grid, r, c, r, c + 1)) return true;
        if (r + 1 < SIZE && swapWouldCreateMatch(grid, r, c, r + 1, c)) return true;
      }
    }
    return false;
  }

  function generateBoard() {
    let grid;
    let attempts = 0;
    do {
      grid = Array.from({ length: SIZE }, () =>
        Array.from({ length: SIZE }, () => createPiece())
      );
      attempts++;
    } while (hasAnyMatch(grid) && attempts < 200);

    if (hasAnyMatch(grid)) {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          for (let tries = 0; tries < 40; tries++) {
            grid[r][c] = createPiece();
            if (!wouldCreateMatchAt(grid, r, c)) break;
          }
        }
      }
    }
    return grid;
  }

  function generatePlayableBoard() {
    for (let attempt = 0; attempt < 600; attempt++) {
      const grid = generateBoard();
      if (hasPossibleMove(grid)) return grid;
    }
    return generateBoard();
  }

  function buildDOM() {
    boardEl.innerHTML = "";
    cellEls.length = 0;
    pieceEls.length = 0;

    for (let r = 0; r < SIZE; r++) {
      const rowCells = [];
      const rowPieces = [];
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        cell.setAttribute("role", "gridcell");
        boardEl.appendChild(cell);
        rowCells.push(cell);

        const piece = document.createElement("div");
        piece.className = "piece";
        cell.appendChild(piece);
        rowPieces.push(piece);
      }
      cellEls.push(rowCells);
      pieceEls.push(rowPieces);
    }
  }

  function renderPiece(r, c) {
    const piece = board[r][c];
    const el = pieceEls[r][c];
    if (!piece) {
      el.className = "piece";
      el.innerHTML = "";
      el.style.transform = "";
      el.removeAttribute("data-piece-id");
      return;
    }
    el.className = `piece piece--${piece.color}`;
    el.innerHTML = "";
    el.dataset.pieceId = piece.id;
    if (!el.style.transform) el.style.transform = "";
  }

  function renderAll() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) renderPiece(r, c);
    }
  }

  function updateHUD() {
    stepsEl.textContent = String(stepsLeft);
    objectivesEl.innerHTML = COLORS.map((color) => {
      const count = Math.min(erased[color], OBJECTIVE_TARGET);
      const done = count >= OBJECTIVE_TARGET;
      return `
        <li class="objective${done ? " objective--done" : ""}">
          <span class="objective__icon piece piece--${color}" aria-hidden="true"></span>
          <span class="objective__count">${capitalize(color)}: ${count}/${OBJECTIVE_TARGET}</span>
        </li>`;
    }).join("");
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function allObjectivesMet() {
    return COLORS.every((c) => erased[c] >= OBJECTIVE_TARGET);
  }

  function setLocked(value) {
    locked = value;
    boardEl.classList.toggle("board--locked", value);
  }

  function clearSelection() {
    if (selected) {
      const { r, c } = selected;
      cellEls[r][c].classList.remove("cell--selected");
      selected = null;
    }
  }

  function selectCell(r, c) {
    clearSelection();
    selected = { r, c };
    cellEls[r][c].classList.add("cell--selected");
  }

  function getCellFromEventTarget(target) {
    const cell = target.closest(".cell");
    if (!cell) return null;
    return {
      r: Number(cell.dataset.row),
      c: Number(cell.dataset.col),
    };
  }

  function cellStride() {
    const rect = cellEls[0][0].getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(boardEl).gap) || 4;
    return rect.height + gap;
  }

  async function animateSwap(r1, c1, r2, c2) {
    const el1 = pieceEls[r1][c1];
    const el2 = pieceEls[r2][c2];
    const cell1 = cellEls[r1][c1].getBoundingClientRect();
    const cell2 = cellEls[r2][c2].getBoundingClientRect();
    const dx = cell2.left - cell1.left;
    const dy = cell2.top - cell1.top;

    el1.style.transform = `translate(${dx}px, ${dy}px)`;
    el2.style.transform = `translate(${-dx}px, ${-dy}px)`;

    await wait(cssMs("--swap-duration", 220));

    el1.style.transform = "";
    el2.style.transform = "";
    renderPiece(r1, c1);
    renderPiece(r2, c2);
  }

  async function animatePop(keys) {
    for (const key of keys) {
      const { r, c } = parseKey(key);
      pieceEls[r][c].classList.add("piece--popping");
    }
    await wait(cssMs("--pop-duration", 280));
    for (const key of keys) {
      const { r, c } = parseKey(key);
      pieceEls[r][c].classList.remove("piece--popping");
    }
  }

  function applyGravity() {
    for (let c = 0; c < SIZE; c++) {
      const stack = [];
      for (let r = SIZE - 1; r >= 0; r--) {
        if (board[r][c]) stack.push(board[r][c]);
      }
      const missing = SIZE - stack.length;
      const newcomers = Array.from({ length: missing }, () => createPiece());
      const column = [...newcomers, ...stack.reverse()];

      for (let r = 0; r < SIZE; r++) {
        board[r][c] = column[r];
      }
    }
  }

  async function animateGravity(beforeIds) {
    const stride = cellStride();
    const fallMs = cssMs("--fall-duration", 320);

    applyGravity();

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        let fromRow = -1;
        for (let rr = 0; rr < SIZE; rr++) {
          if (beforeIds[rr][c] === piece.id) {
            fromRow = rr;
            break;
          }
        }

        renderPiece(r, c);
        const el = pieceEls[r][c];
        const startRow = fromRow >= 0 ? fromRow : -1;
        const offsetRows = startRow < 0 ? -(r + 1) : startRow - r;

        if (offsetRows !== 0) {
          el.style.transition = "none";
          el.style.transform = `translateY(${offsetRows * stride}px)`;
          void el.offsetHeight;
          el.style.transition = "";
          requestAnimationFrame(() => {
            el.style.transform = "";
          });
        }
      }
    }

    await wait(fallMs);
    renderAll();
  }

  function countErased(keys) {
    for (const key of keys) {
      const { r, c } = parseKey(key);
      const piece = board[r][c];
      if (piece) erased[piece.color]++;
    }
    updateHUD();
  }

  function removeMatched(keys) {
    for (const key of keys) {
      const { r, c } = parseKey(key);
      board[r][c] = null;
    }
  }

  function snapshotIds() {
    return board.map((row) => row.map((p) => p?.id ?? null));
  }

  async function resolveBoard() {
    let matched = findMatches(board);
    while (matched.size > 0) {
      countErased(matched);
      await animatePop(matched);
      removeMatched(matched);
      const before = snapshotIds();
      await animateGravity(before);
      matched = findMatches(board);
    }
  }

  async function refreshBoardIfStuck() {
    if (hasPossibleMove(board)) return;

    boardEl.classList.add("board--refreshing");
    await wait(280);
    board = generatePlayableBoard();
    renderAll();
    boardEl.classList.remove("board--refreshing");
  }

  async function attemptSwap(r1, c1, r2, c2) {
    if (locked) return;
    setLocked(true);
    clearSelection();

    swapData(r1, c1, r2, c2);
    await animateSwap(r1, c1, r2, c2);

    const matches = findMatches(board);
    if (matches.size === 0) {
      await animateSwap(r1, c1, r2, c2);
      swapData(r1, c1, r2, c2);
      renderPiece(r1, c1);
      renderPiece(r2, c2);
      pieceEls[r1][c1].classList.add("piece--invalid");
      pieceEls[r2][c2].classList.add("piece--invalid");
      await wait(350);
      pieceEls[r1][c1].classList.remove("piece--invalid");
      pieceEls[r2][c2].classList.remove("piece--invalid");
      setLocked(false);
      return;
    }

    stepsLeft--;
    updateHUD();
    await resolveBoard();
    await refreshBoardIfStuck();

    if (allObjectivesMet()) {
      showModal(modalWin);
      return;
    }

    if (stepsLeft <= 0) {
      showModal(modalLose);
      return;
    }

    setLocked(false);
  }

  function showModal(el) {
    el.hidden = false;
    setLocked(true);
  }

  function hideModals() {
    modalWin.hidden = true;
    modalLose.hidden = true;
  }

  function onPointerDown(e) {
    if (locked) return;
    const pos = getCellFromEventTarget(e.target);
    if (!pos) return;
    dragStart = { ...pos, x: e.clientX, y: e.clientY };
    selectCell(pos.r, pos.c);
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (locked || !dragStart) return;

    const pos = getCellFromEventTarget(e.target) || dragStart;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const threshold = 14;

    let target = null;
    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      target = { r: dragStart.r, c: dragStart.c };
      if (Math.abs(dx) > Math.abs(dy)) {
        target.c += dx > 0 ? 1 : -1;
      } else {
        target.r += dy > 0 ? 1 : -1;
      }
    } else if (!(pos.r === dragStart.r && pos.c === dragStart.c)) {
      target = pos;
    }

    const start = { r: dragStart.r, c: dragStart.c };
    dragStart = null;

    if (target && isAdjacent(start, target)) {
      clearSelection();
      attemptSwap(start.r, start.c, target.r, target.c);
      return;
    }

    if (pos.r === start.r && pos.c === start.c) {
      clearSelection();
    } else if (selected && isAdjacent(selected, pos)) {
      const { r: r1, c: c1 } = selected;
      clearSelection();
      attemptSwap(r1, c1, pos.r, pos.c);
    } else {
      selectCell(pos.r, pos.c);
    }
  }

  function initGame() {
    hideModals();
    pieceIdCounter = 0;
    board = generatePlayableBoard();
    stepsLeft = INITIAL_STEPS;
    erased = freshErased();
    selected = null;
    dragStart = null;
    setLocked(false);
    clearSelection();
    buildDOM();
    renderAll();
    updateHUD();
  }

  boardEl.addEventListener("pointerdown", onPointerDown);
  boardEl.addEventListener("pointerup", onPointerUp);
  boardEl.addEventListener("pointercancel", () => {
    dragStart = null;
  });

  btnPlayAgain.addEventListener("click", initGame);
  btnTryAgain.addEventListener("click", initGame);

  initGame();
})();
