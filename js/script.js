import { imgUrlArray, shuffledIndexesArray, processImages } from "./loadImg.js";

/**
 * Setup
 */
const debugEl = document.getElementById("debug"),
  iconMap = ["ma_80.png", "mi_80.png", "mu_80.png", "me_80.png", "mo_80.png"],
  icon_size = 80, // icon_width and icon_heightをまとめました。
  num_icons = 5,
  time_per_reel = 300,
  indexes = [0, 0, 0],
  audio = new Audio("sounds/rolling.mp3");

audio.loop = true;

let reelsStopped = [false, false, false],
  timeoutId;

function startAnimation() {
  const reelsList = document.querySelectorAll(".slots > .reel");
  const stopButtons = document.querySelectorAll(".btn > .stopbtn");
  const startButton = document.getElementById("startButton");
  audio.play();

  reelsList.forEach(
    (reel) =>
      (reel.style.animation = `slide ${time_per_reel}ms linear infinite`)
  );

  stopButtons.forEach((btn) => (btn.disabled = false));
  startButton.disabled = true;

  reelsStopped = [false, false, false];
}

function stopAnimation(reel, btn) {
  const audio = document.getElementById(`stopSound${btn.dataset.num}`);
  audio.currentTime = 0;
  audio.play();

  const computedStyle = getComputedStyle(reel);
  let positionY = parseInt(computedStyle.backgroundPositionY);
  const speed = time_per_reel / (icon_size * num_icons);
  const distanceToCenter = icon_size - (positionY % icon_size);
  const timeToCenter = distanceToCenter * speed;

  reel.style.animation = `none`;
  reel.style.transition = `background-position-y ${Math.abs(timeToCenter)}ms`;
  reel.style.backgroundPositionY = `${positionY + distanceToCenter}px`;

  setTimeout(() => {
    reel.style.transition = "none";
  }, Math.abs(timeToCenter));

  btn.disabled = true;

  const reelId = reel.getAttribute("id");
  const number = extractNumber(reelId);
  indexes[number - 1] =
    shuffledIndexesArray[number - 1][
      parseInt(reel.style.backgroundPositionY) / icon_size - 1
    ];
  reelsStopped[number - 1] = true;

  checkResult();
}

function extractNumber(str) {
  const match = str.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

function checkResult() {
  if (reelsStopped.every((state) => state)) {
    const startButton = document.getElementById("startButton");
    startButton.disabled = false;
    audio.pause();
    audio.currentTime = 0;

    resultAnimation();

    if (indexes.every((val) => val === indexes[0])) {
    }
  }
}

function resultAnimation() {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  const startButton = document.getElementById("startButton");
  startButton.disabled = true;
  const overlayEl = document.getElementById("overlay");
  overlayEl.style.opacity = 1;
  overlayEl.style.pointerEvents = "auto";

  const resEl = document.getElementById("result");
  resEl.style.opacity = 1;

  for (let i = 0; i < 3; i++) {
    const imgEl = document.createElement("img");
    imgEl.src = `img/${iconMap[indexes[i]]}`;
    imgEl.classList.add("overlay-img");
    imgEl.style.opacity = 0;
    resEl.appendChild(imgEl);
  }

  setTimeout(() => {
    scaleImage(0); // 1秒待ってから1枚目の拡大を開始
  }, 200);

  // ここでイベントリスナーを追加
  const endAnimationHandler = function () {
    // 以下の処理で演出を終了させる
    resEl.style.opacity = 0;
    overlayEl.style.opacity = 0;
    overlayEl.style.pointerEvents = "none";
    while (resEl.firstChild) {
      resEl.removeChild(resEl.firstChild);
    }
    startButton.disabled = false;

    // イベントリスナーを削除
    overlayEl.removeEventListener("click", endAnimationHandler);
  };

  overlayEl.addEventListener("click", endAnimationHandler);

  timeoutId = setTimeout(() => {
    // 通常の演出終了処理も行う
    resEl.style.opacity = 0;
    overlayEl.style.opacity = 0;
    overlayEl.style.pointerEvents = "none";
    while (resEl.firstChild) {
      resEl.removeChild(resEl.firstChild);
    }
    startButton.disabled = false;

    // イベントリスナーを削除
    overlayEl.removeEventListener("click", endAnimationHandler);
  }, 2000);
}

function scaleImage(index) {
  const imgEls = document.querySelectorAll(".overlay-img");
  if (index >= imgEls.length) {
    return; // インデックスが範囲外の場合は何もしない
  }

  const imgEl = imgEls[index];
  if (!imgEl) {
    console.error("imgEl is undefined");
    return;
  }

  imgEl.style.opacity = 1; // 表示
  imgEl.style.transform = "scale(2)";
  imgEl.style.transition = "transform 0.5s ease-in-out, opacity 1s ease-in-out";

  setTimeout(() => {
    const effectEndSound = document.getElementById(`effectSound${index}`);
    effectEndSound.play();
    imgEl.style.transform = "scale(1)"; // 元のサイズに戻す
  }, 500);

  if (index < 2) {
    setTimeout(() => {
      scaleImage(index + 1);
    }, 300);
  }
}

window.addEventListener("load", function () {
  processImages().then(() => {
    const reels = document.querySelectorAll(".slots > .reel");
    reels.forEach((reel, index) => {
      reel.style.backgroundImage = `url(${imgUrlArray[index]})`;
    });
  });

  const reelsList = document.querySelectorAll(".slots > .reel");
  const stopButtons = document.querySelectorAll(".btn > .stopbtn");

  stopButtons.forEach((btn, i) => {
    btn.disabled = true; // 初期状態でボタンを無効にする
    btn.addEventListener("click", function () {
      if (!btn.disabled) {
        stopAnimation(reelsList[i], btn);
      }
    });
  });

  document
    .getElementById("startButton") // この部分を修正
    .addEventListener("click", function () {
      const startButtonSound = document.getElementById("startSound");
      startButtonSound.play();
      const lever = document.getElementById("lever");
      const handle = document.getElementById("handle");

      lever.classList.add("pulled");
      handle.classList.add("pulled");

      setTimeout(() => {
        startAnimation();
      }, 400);

      setTimeout(() => {
        lever.classList.remove("pulled");
        handle.classList.remove("pulled");
      }, 200);
    });
});
