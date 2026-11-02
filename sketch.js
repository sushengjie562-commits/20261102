// 設定各動畫圖片的路徑、影格數與播放速度。
const animations = {
  // 設定走路動畫，共 9 格。
  walk: { path: '1/走1246 198/all.png', frames: 9, speed: 10 },
  // 設定特效動畫，共 15 格。
  effect: { path: '1/特效4050 190/all.png', frames: 15, speed: 12 },
  // 設定停止動畫，共 12 格。
  idle: { path: '1/停1663 212/all.png', frames: 12, speed: 8 },
  // 設定發功動畫，共 11 格。
  attack: { path: '1/發功2866 165/all.png', frames: 11, speed: 12 },
  // 設定跑步動畫，共 12 格。
  run: { path: '1/跑2323 168/all.png', frames: 12, speed: 14 },
  // 設定跳躍動畫，共 13 格。
  jump: { path: '1/跳1776 188/all.png', frames: 13, speed: 12 }
};

// 設定角色顯示高度。
const characterHeight = 140;
// 設定角色走路速度。
const walkSpeed = 3;
// 設定角色跑步速度。
const runSpeed = 6;
// 設定連按判斷時間，單位為毫秒。
const doubleTapTime = 300;
// 設定跳躍持續時間，單位為毫秒。
const jumpDuration = 700;
// 設定角色跳躍高度。
const jumpHeight = 120;

// 保存載入完成的精靈圖。
let spriteSheets = {};
// 保存角色目前的水平位置。
let characterX = 0;
// 保存角色跳躍時的垂直偏移。
let jumpOffset = 0;
// 保存角色面向，1 代表右方，-1 代表左方。
let facing = 1;
// 保存目前播放的動畫名稱。
let currentAnimation = '';
// 保存目前動畫的開始時間。
let animationStartTime = 0;
// 保存左右方向鍵上次按下的時間。
let lastDirectionTap = { left: -Infinity, right: -Infinity };
// 保存空白鍵上次按下的時間。
let lastSpaceTapTime = -Infinity;
// 保存角色是否正在跑步。
let isRunning = false;
// 保存角色是否正在跳躍。
let isJumping = false;
// 保存跳躍開始時間。
let jumpStartTime = 0;
// 保存目前按住的方向，1 代表右方，-1 代表左方，0 代表停止。
let directionHeld = 0;
// 保存目前按住的按鍵，避免長按時重複觸發。
let pressedKeys = {};

// 在畫布開始繪圖前載入所有精靈圖。
function preload() {
  // 逐一載入動畫設定中的圖片。
  for (const name in animations) {
    // 取得目前動畫的設定。
    const animation = animations[name];

    // 載入目前動畫的圖片。
    spriteSheets[name] = loadImage(
      animation.path,
      // 圖片載入成功時不需額外處理。
      () => {},
      // 圖片載入失敗時在主控台顯示路徑。
      () => console.error(`無法載入圖片：${animation.path}`)
    );
  }
}

// 建立全螢幕畫布並設定角色初始狀態。
function setup() {
  // 建立符合視窗大小的畫布。
  createCanvas(windowWidth, windowHeight);
  // 將角色放在畫布水平中央。
  characterX = width / 2;
  // 設定畫面每秒更新 60 次。
  frameRate(60);
  // 設定角色初始動畫為停止動畫。
  setAnimation('idle');
}

// 每個畫面影格更新角色狀態並繪製畫面。
function draw() {
  // 使用淡藍色填滿畫布背景。
  background('#bde0fe');

  // 取得目前時間。
  const now = millis();

  // 角色跳躍時依時間計算跳躍位置。
  if (isJumping) {
    // 計算跳躍目前進行的比例。
    const jumpProgress = (now - jumpStartTime) / jumpDuration;
    // 依照正弦曲線計算角色跳躍高度。
    jumpOffset = -sin(PI * jumpProgress) * jumpHeight;

    // 跳躍時間結束時讓角色回到地面。
    if (jumpProgress >= 1) {
      // 結束跳躍狀態。
      isJumping = false;
      // 將角色垂直偏移重設為零。
      jumpOffset = 0;
    }
  }

  // 按住左右方向鍵時移動角色。
  if (directionHeld !== 0) {
    // 根據跑步或走路狀態選擇移動速度。
    const speed = isRunning ? runSpeed : walkSpeed;
    // 依照目前方向移動角色。
    characterX += directionHeld * speed;
    // 設定角色朝移動方向面向。
    facing = directionHeld;

    // 跳躍期間播放跳躍動畫。
    if (isJumping) {
      // 切換到跳躍動畫。
      setAnimation('jump');
    } else {
      // 依照移動狀態切換跑步或走路動畫。
      setAnimation(isRunning ? 'run' : 'walk');
    }
  } else if (isJumping) {
    // 沒有水平移動但仍在跳躍時維持跳躍動畫。
    setAnimation('jump');
  } else if (currentAnimation === 'attack' || currentAnimation === 'effect') {
    // 取得目前動作動畫的設定。
    const action = animations[currentAnimation];
    // 計算目前動作動畫播放到第幾格。
    const actionFrame = floor((now - animationStartTime) / 1000 * action.speed);

    // 動作動畫播放完畢時切換到停止動畫。
    if (actionFrame >= action.frames) {
      // 切換到停止動畫。
      setAnimation('idle');
    }
  } else {
    // 沒有移動或跳躍時播放停止動畫。
    setAnimation('idle');
    // 停止時取消跑步狀態。
    isRunning = false;
  }

  // 設定目前要顯示的動畫名稱。
  let displayAnimation = currentAnimation;

  // 停止圖片載入失敗時改用走路圖片，避免角色消失。
  if (
    displayAnimation === 'idle' &&
    (!spriteSheets.idle || !spriteSheets.idle.width)
  ) {
    // 使用走路精靈圖作為停止時的備用圖片。
    displayAnimation = 'walk';
  }

  // 取得目前動畫的設定。
  const animation = animations[displayAnimation];
  // 取得目前動畫的精靈圖。
  const spriteSheet = spriteSheets[displayAnimation];

  // 圖片尚未載入時，在畫面上顯示圖片路徑。
  if (!spriteSheet || !spriteSheet.width || !spriteSheet.height) {
    // 設定錯誤訊息顏色。
    fill('#222222');
    // 設定錯誤訊息大小。
    textSize(18);
    // 顯示目前找不到的圖片路徑。
    text(`找不到圖片：${animation.path}`, 20, 35);
    // 結束本次繪圖。
    return;
  }

  // 使用圖片實際寬度計算每格影格寬度。
  const frameWidth = spriteSheet.width / animation.frames;
  // 使用圖片實際高度作為每格影格高度。
  const frameHeight = spriteSheet.height;
  // 按照影格比例計算角色顯示寬度。
  const characterWidth = characterHeight * frameWidth / frameHeight;

  // 限制角色不會移出畫布左右邊界。
  characterX = constrain(
    characterX,
    characterWidth / 2,
    width - characterWidth / 2
  );

  // 計算目前動畫應顯示的影格。
  let frameIndex = floor((now - animationStartTime) / 1000 * animation.speed);

  // 停止圖片載入失敗時固定顯示走路圖第 0 格。
  if (displayAnimation === 'walk' && currentAnimation === 'idle') {
    // 將影格設為走路圖第 0 格。
    frameIndex = 0;
  } else if (displayAnimation === 'attack' || displayAnimation === 'effect') {
    // 發功或特效動畫停在最後一格，不超出圖片範圍。
    frameIndex = constrain(frameIndex, 0, animation.frames - 1);
  } else {
    // 讓停止、走路、跑步和跳躍動畫循環播放。
    frameIndex %= animation.frames;
  }

  // 計算目前影格在精靈圖中的水平起點。
  const sourceX = frameIndex * frameWidth;

  // 保存目前畫布狀態。
  push();
  // 將繪圖原點移到角色位置和跳躍後的位置。
  translate(characterX, height / 2 + jumpOffset);
  // 角色面向左方時水平翻轉圖片。
  scale(facing, 1);

  // 從精靈圖裁切目前影格並繪製角色。
  image(
    spriteSheet,
    -characterWidth / 2,
    -characterHeight / 2,
    characterWidth,
    characterHeight,
    sourceX,
    0,
    frameWidth,
    frameHeight
  );

  // 還原畫布狀態。
  pop();
}

// 按下鍵盤時判斷角色要執行的動作。
function keyPressed() {
  // 取得目前按下的按鍵代碼。
  const pressedCode = keyCode;
  // 取得目前時間。
  const now = millis();

  // 忽略已經按住的按鍵，避免長按時重複觸發。
  if (pressedKeys[pressedCode]) {
    // 阻止方向鍵或空白鍵的預設行為。
    return false;
  }

  // 記錄目前按鍵已按下。
  pressedKeys[pressedCode] = true;

  // 按下右方向鍵時讓角色往右移動。
  if (pressedCode === RIGHT_ARROW) {
    // 設定角色往右移動。
    directionHeld = 1;
    // 計算這次是否為右方向鍵連按。
    isRunning = now - lastDirectionTap.right < doubleTapTime;
    // 記錄這次右方向鍵按下時間。
    lastDirectionTap.right = now;
    // 設定角色面向右方。
    facing = 1;
    // 播放走路或跑步動畫。
    setAnimation(isRunning ? 'run' : 'walk');
    // 阻止方向鍵捲動瀏覽器畫面。
    return false;
  }

  // 按下左方向鍵時讓角色往左移動。
  if (pressedCode === LEFT_ARROW) {
    // 設定角色往左移動。
    directionHeld = -1;
    // 計算這次是否為左方向鍵連按。
    isRunning = now - lastDirectionTap.left < doubleTapTime;
    // 記錄這次左方向鍵按下時間。
    lastDirectionTap.left = now;
    // 設定角色面向左方。
    facing = -1;
    // 播放走路或跑步動畫。
    setAnimation(isRunning ? 'run' : 'walk');
    // 阻止方向鍵捲動瀏覽器畫面。
    return false;
  }

  // 按下上方向鍵且角色尚未跳躍時開始跳躍。
  if (pressedCode === UP_ARROW && !isJumping) {
    // 設定角色正在跳躍。
    isJumping = true;
    // 記錄跳躍開始時間。
    jumpStartTime = now;
    // 播放跳躍動畫。
    setAnimation('jump');
    // 阻止方向鍵捲動瀏覽器畫面。
    return false;
  }

  // 按下空白鍵時播放發功或特效動畫。
  if (pressedCode === 32) {
    // 連按空白鍵時播放特效動畫。
    if (now - lastSpaceTapTime < doubleTapTime) {
      // 切換到特效動畫。
      setAnimation('effect');
    } else {
      // 單按空白鍵時播放發功動畫。
      setAnimation('attack');
    }

    // 記錄這次空白鍵按下時間。
    lastSpaceTapTime = now;
    // 阻止空白鍵捲動瀏覽器畫面。
    return false;
  }
}

// 放開按鍵時停止移動並清除按鍵狀態。
function keyReleased() {
  // 取得放開的按鍵代碼。
  const releasedCode = keyCode;

  // 清除該按鍵的按住狀態。
  pressedKeys[releasedCode] = false;

  // 放開左右方向鍵時停止移動。
  if (releasedCode === LEFT_ARROW || releasedCode === RIGHT_ARROW) {
    // 清除目前移動方向。
    directionHeld = 0;
    // 停止跑步狀態。
    isRunning = false;

    // 沒有跳躍或動作動畫時切換到停止動畫。
    if (
      !isJumping &&
      currentAnimation !== 'attack' &&
      currentAnimation !== 'effect'
    ) {
      // 播放停止動畫。
      setAnimation('idle');
    }

    // 阻止方向鍵捲動瀏覽器畫面。
    return false;
  }

  // 放開空白鍵時阻止瀏覽器捲動頁面。
  if (releasedCode === 32) {
    // 取消空白鍵的預設行為。
    return false;
  }
}

// 切換目前播放的動畫。
function setAnimation(name) {
  // 動畫名稱相同時不重設播放進度。
  if (currentAnimation === name) {
    // 結束這次動畫切換。
    return;
  }

  // 更新目前動畫名稱。
  currentAnimation = name;
  // 記錄新動畫開始時間。
  animationStartTime = millis();
}

// 視窗尺寸改變時重新調整畫布。
function windowResized() {
  // 讓畫布符合新的視窗大小。
  resizeCanvas(windowWidth, windowHeight);
}