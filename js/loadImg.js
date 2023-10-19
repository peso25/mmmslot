export function concatenateImagesVertically(imgUrls) {
  return new Promise((resolve, reject) => {
    let loadedImages = [];
    let totalHeight = 0;
    let shuffledImgUrls = shuffleArray([...imgUrls]);

    const shuffledIndexes = shuffledImgUrls.map((url) => imgUrls.indexOf(url));

    let indexes = [shuffledIndexes.shift(), ...shuffledIndexes.reverse()];

    shuffledImgUrls.forEach((url, index) => {
      let img = new Image();

      img.onload = function () {
        loadedImages[index] = img;
        totalHeight += img.height;

        if (
          loadedImages.length === shuffledImgUrls.length &&
          !loadedImages.includes(undefined)
        ) {
          let canvas = document.createElement("canvas");
          let ctx = canvas.getContext("2d");

          canvas.width = img.width;
          canvas.height = totalHeight;

          let yPos = 0;
          loadedImages.forEach((loadedImg) => {
            ctx.drawImage(
              loadedImg,
              0,
              yPos,
              loadedImg.width,
              loadedImg.height
            );
            yPos += loadedImg.height;
          });
          resolve({ canvas, indexes });
        }
      };

      img.onerror = function () {
        reject(new Error(`Image loading failed for url: ${url}`));
      };

      img.src = url;
    });
  });
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export let imgUrlArray = [];
export let shuffledIndexesArray = [];

const imgUrls = [
  "img/ma_80.png",
  "img/mi_80.png",
  "img/mu_80.png",
  "img/me_80.png",
  "img/mo_80.png",
];

export async function processImages(i = 0) {
  if (i < 3) {
    try {
      const { canvas, indexes } = await concatenateImagesVertically([
        ...imgUrls,
      ]);
      imgUrlArray.push(canvas.toDataURL("image/png"));
      shuffledIndexesArray.push(indexes);
      await processImages(i + 1); // ここで次の呼び出しを待ちます
    } catch (error) {
      console.error("Error processing images:", error);
    }
  }
}
