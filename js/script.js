import { imgUrlArray, shuffledIndexesArray, processImages } from "./loadImg.js";

let audioContext;
let isAudioContextStarted = false;
let buffers = {};
let bufferPromises = [];
let reelsStopped = [false, false, false]; //リールの停止状態を管理
let tweetText; //ツイートの文字
let loopSoundSource;

const reelMap = ["ma", "mi", "mu", "me", "mo"];
const reelValMap = ["ま", "み", "む", "め", "も"];
const iconMap = [
  "ma_80.png",
  "mi_80.png",
  "mu_80.png",
  "me_80.png",
  "mo_80.png",
];
const icon_size = 80;
const num_icons = 5;
const time_per_reel = 300; //リールの回転速度
const rollingSoundSpeed = 1.0; //リール回転音の再生速度
const waitScaleAnimTime = 200; //結果アニメーションの速度
const scaleMagnification = 2; //結果アニメーションの画像の拡大倍率
const scaleAnimeSpeed = 0.5; //結果アニメーションの画像拡大->縮小の速度
const startSoundWaitTime = 200; //スタート音が鳴るまでの待ち時間
const startAnimeWaiteTime = 400; //リール回転までの待ち時間
const leverAnimeTime = 200; //レバーを下げるアニメーションの時間
const indexes = [0, 0, 0]; //停止時のリールの目を管理
const hashtags = "#mmmslot"; //ツイートのハッシュタグ
const url = encodeURIComponent(location.href); //現在表示しているページのURL

/**
 * AudioContextの初期化
 */
function startAudioContext() {
  if (!audioContext && !isAudioContextStarted) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    isAudioContextStarted = true;
    loadAllSounds();
  }
}

/**
 * サウンドの読み込み
 */
function loadSound(name, url) {
  const promise = fetch(url)
    .then((response) => response.arrayBuffer())
    .then((data) => {
      if (audioContext) {
        return new Promise((resolve) => {
          audioContext.decodeAudioData(data, (decodedData) => {
            buffers[name] = decodedData;
            resolve();
          });
        });
      } else {
        console.error("AudioContext is not initialized.");
        return Promise.reject("AudioContext is not initialized.");
      }
    })
    .catch((error) => {
      console.error(`Error loading sound ${name}:`, error);
      return Promise.reject(error);
    });

  bufferPromises.push(promise);
}

/**
 * 全てのサウンドを読み込み
 */
function loadAllSounds() {
  //レバーを押した時の音
  loadSound("start", "sounds/start.mp3");
  //リール回転中の音
  loadSound("rolling", "sounds/rolling.mp3");
  //停止ボタンを押した時の音
  loadSound("stop0", "sounds/stop.mp3");
  loadSound("stop1", "sounds/stop.mp3");
  loadSound("stop2", "sounds/stop.mp3");
  //結果アニメーションで使用
  loadSound("effect0", "sounds/effect.mp3");
  loadSound("effect1", "sounds/effect.mp3");
  loadSound("effect2", "sounds/effect.mp3");
  //当たりの時の音
  loadSound("win", "sounds/win.mp3");
  //まみむめもの音声
  loadSound("ma", "sounds/ma.wav");
  loadSound("mi", "sounds/mi.wav");
  loadSound("mu", "sounds/mu.wav");
  loadSound("me", "sounds/me.wav");
  loadSound("mo", "sounds/mo.wav");
}

/**
 * サウンドの停止
 */
function stopSound(source) {
  if (source) {
    source.stop();
  }
}

/**
 * サウンドの再生
 */
function playSound(name, rate = 1.0, loop = false) {
  return new Promise((resolve, reject) => {
    Promise.all(bufferPromises).then(() => {
      const buffer = buffers[name];
      if (buffer) {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;
        source.playbackRate.value = rate;
        source.connect(audioContext.destination);
        source.start(0);
        resolve(source);
      } else {
        console.error(`Buffer for sound ${name} is not ready.`);
        reject(`Buffer for sound ${name} is not ready.`);
      }
    });
  });
}

/**
 * リールを回すアニメーションの開始
 */
function startAnimation() {
  const reelsList = document.querySelectorAll(".slots > .reel");
  const stopButtons = document.querySelectorAll(".btn > .stopbtn");
  const startButton = document.getElementById("startButton");

  playSound("rolling", rollingSoundSpeed, true).then((source) => {
    loopSoundSource = source;
  });

  reelsList.forEach(
    (reel) =>
      (reel.style.animation = `slide ${time_per_reel}ms linear infinite`)
  );

  stopButtons.forEach((btn) => (btn.disabled = false));
  startButton.disabled = true;

  reelsStopped = [false, false, false];
}

/**
 * リールを回すアニメーションの停止
 */
function stopAnimation(reel, btn) {
  playSound(`stop${btn.dataset.num}`);

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

/**
 * 数字の抽出
 */
function extractNumber(str) {
  const match = str.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

/**
 * スロットの結果のチェック
 */
function checkResult() {
  if (reelsStopped.every((state) => state)) {
    const startButton = document.getElementById("startButton");
    startButton.disabled = false;
    stopSound(loopSoundSource);

    // if (indexes.every((val) => val === indexes[0])) {
    tweetText = encodeURIComponent(
      "＿人人人人人＿\n＞" +
        `　${reelValMap[indexes[0]]}${reelValMap[indexes[1]]}${
          reelValMap[indexes[2]]
        }　` +
        "＜\n￣Y^Y^ Y^Y^￣\n" +
        hashtags +
        "\n"
    );
    // }
    resultAnimation();
  }
}

/**
 * 結果のアニメーション
 */
function resultAnimation() {
  return new Promise((resolve) => {
    const overlayEl = document.getElementById("overlay");
    const resEl = document.getElementById("result");
    const closeButton = document.getElementById("closeButton");
    const tweetButton = document.getElementById("twitter-button");

    // オーバーレイと結果エリアを表示
    overlayEl.style.opacity = 1;
    overlayEl.style.pointerEvents = "auto";
    resEl.style.opacity = 1;

    // 結果画像を表示
    for (let i = 0; i < 3; i++) {
      const imgEl = document.createElement("img");
      imgEl.src = `img/${iconMap[indexes[i]]}`;
      imgEl.classList.add("overlay-img");
      imgEl.style.opacity = 0;
      resEl.appendChild(imgEl);
    }

    // 結果画像の拡大アニメーションを開始
    setTimeout(() => {
      scaleImage(0);
    }, waitScaleAnimTime);

    // ツイートボタンを表示
    tweetButton.style.display = "block";

    // 閉じるボタンを表示
    closeButton.style.display = "block";

    // 閉じるボタンのクリックイベントリスナーを追加
    const closeClickHandler = () => {
      // オーバーレイと結果エリアを非表示
      resEl.style.opacity = 0;
      overlayEl.style.opacity = 0;
      overlayEl.style.pointerEvents = "none";

      // 画像要素を削除
      while (resEl.firstChild) {
        resEl.removeChild(resEl.firstChild);
      }

      // ツイートボタンを非表示
      tweetButton.style.display = "none";

      // 閉じるボタンを非表示
      closeButton.style.display = "none";

      // イベントリスナーを削除
      closeButton.removeEventListener("click", closeClickHandler);

      // Promiseを解決して演出終了を通知
      resolve();
    };

    //ツイートボタンが押された時にリンクを生成
    document.getElementById("twitter-button").onclick = function () {
      window.open(
        "https://twitter.com/share?text=" + tweetText + "&url=" + url
      );
    };

    // 閉じるボタンのクリックイベントリスナーを設定
    closeButton.addEventListener("click", closeClickHandler);
  });
}

/**
 * 画像の拡大アニメーション
 */
function scaleImage(index) {
  const imgEls = document.querySelectorAll(".overlay-img");
  if (index >= imgEls.length) {
    return;
  }

  const imgEl = imgEls[index];
  if (!imgEl) {
    console.error("imgEl is undefined");
    return;
  }

  imgEl.style.opacity = 1;
  imgEl.style.transform = `scale(${scaleMagnification})`;
  imgEl.style.transition = `transform ${scaleAnimeSpeed}s ease-in-out, opacity 1s ease-in-out`;

  setTimeout(() => {
    playSound(`${reelMap[indexes[index]]}`);
    imgEl.style.transform = "scale(1)"; // 元のサイズに戻す
  }, 500);

  if (index < 2) {
    setTimeout(() => {
      scaleImage(index + 1);
    }, 300);
  }
}

/**
 * イベントリスナの設定
 */
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

  document.getElementById("startButton").addEventListener("click", function () {
    startAudioContext();

    const lever = document.getElementById("lever");
    const handle = document.getElementById("handle");

    setTimeout(() => {
      playSound("start");
    }, startSoundWaitTime);

    lever.classList.add("pulled");
    handle.classList.add("pulled");

    setTimeout(() => {
      startAnimation();
    }, startAnimeWaiteTime);

    setTimeout(() => {
      lever.classList.remove("pulled");
      handle.classList.remove("pulled");
    }, leverAnimeTime);
  });
});
