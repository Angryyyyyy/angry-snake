// 获取DOM元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const musicToggle = document.getElementById('musicToggle');

// 背景音乐设置控件
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const waveTypeSelect = document.getElementById('waveType');
const musicPatternSelect = document.getElementById('musicPattern');
const musicSourceSelect = document.getElementById('musicSource');
const generatedMusicSettings = document.getElementById('generatedMusicSettings');
const uploadMusicSettings = document.getElementById('uploadMusicSettings');
const musicFileInput = document.getElementById('musicFile');
const musicFileInfo = document.getElementById('musicFileInfo');

// 用户上传的音乐文件
let uploadedMusicBuffer = null;
let uploadedMusicSource = null;

// 创建AudioContext用于生成音效
let audioContext = null;

// 音乐模式的音符序列定义
const musicPatterns = {
    default: [261.63, 329.63, 392.00, 329.63], // C4, E4, G4, E4
    happy: [329.63, 392.00, 440.00, 392.00], // E4, G4, A4, G4
    adventure: [293.66, 349.23, 392.00, 440.00], // D4, F4, G4, A4
    mystery: [220.00, 261.63, 329.63, 293.66] // A3, C4, E4, D4
};

// 游戏配置
const config = {
    gridSize: 25, // 调整网格大小以适应更大的画布
    snakeColor: '#4a148c',
    foodColor: '#e53935',
    speed: 150,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    isMusicOn: true, // 音乐开关状态
    bgMusicPlaying: false,
    bgMusicOscillator: null,
    bgMusicGain: null,
    uploadedMusicSource: null,
    volume: 0.03, // 默认音量
    musicSpeed: 0.5, // 默认音乐速度（每个音符持续时间）
    waveType: 'sawtooth', // 默认波形类型
    musicPattern: 'default', // 默认音乐模式
    musicSource: 'generated' // 音乐来源：generated 或 upload
};

// 游戏状态
let gameState = {
    snake: [],
    food: {},
    direction: 'right',
    nextDirection: 'right',
    score: 0,
    isRunning: false,
    gameLoop: null
};

// 初始化游戏
function initGame() {
    // 重置游戏状态
    gameState.snake = [
        { x: 5, y: 10 },
        { x: 4, y: 10 },
        { x: 3, y: 10 }
    ];
    gameState.direction = 'right';
    gameState.nextDirection = 'right';
    gameState.score = 0;
    scoreElement.textContent = '0';
    
    // 生成第一个食物
    generateFood();
    
    // 绘制初始画面
    draw();
    
    // 初始化背景音乐设置控件
    if (volumeSlider && volumeValue) {
        const volumePercent = Math.round(config.volume * 1000);
        volumeSlider.value = volumePercent;
        volumeValue.textContent = volumePercent + '%';
    }
    
    // 计算速度滑块的初始值
    if (speedSlider && speedValue) {
        const speedPercentage = Math.round((1 - config.musicSpeed) * 200);
        speedSlider.value = speedPercentage;
        speedValue.textContent = speedPercentage + '%';
    }
    
    if (waveTypeSelect) {
        waveTypeSelect.value = config.waveType;
    }
    
    if (musicPatternSelect) {
        musicPatternSelect.value = config.musicPattern;
    }
    
    // 如果有音乐来源选择器，初始化其值
    if (musicSourceSelect) {
        musicSourceSelect.value = config.musicSource;
    }
    
    // 尝试加载本地存储的音乐文件
    if (musicFileInfo) {
        tryLoadSavedMusic();
    }
}

// 生成食物
function generateFood() {
    let newFood;
    let onSnake;
    
    do {
        onSnake = false;
        // 在画布范围内随机生成食物位置
        newFood = {
            x: Math.floor(Math.random() * (config.canvasWidth / config.gridSize)),
            y: Math.floor(Math.random() * (config.canvasHeight / config.gridSize))
        };
        
        // 检查食物是否生成在蛇身上
        for (let segment of gameState.snake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
                onSnake = true;
                break;
            }
        }
    } while (onSnake);
    
    gameState.food = newFood;
}

// 移动蛇
function moveSnake() {
    const head = { ...gameState.snake[0] };
    gameState.direction = gameState.nextDirection;
    
    // 根据方向移动蛇头
    switch (gameState.direction) {
        case 'up':
            head.y -= 1;
            break;
        case 'down':
            head.y += 1;
            break;
        case 'left':
            head.x -= 1;
            break;
        case 'right':
            head.x += 1;
            break;
    }
    
    // 将新的头部添加到蛇的身体
    gameState.snake.unshift(head);
    
    // 检查是否吃到食物
    if (head.x === gameState.food.x && head.y === gameState.food.y) {
        // 吃到食物，增加分数并生成新食物
        gameState.score += 10;
        scoreElement.textContent = gameState.score;
        
        // 播放吃食物音效
        playEatSound();
        
        generateFood();
    } else {
        // 没有吃到食物，移除尾部
        gameState.snake.pop();
    }
}

// 检查碰撞
function checkCollision() {
    const head = gameState.snake[0];
    
    // 检查是否撞到墙壁
    if (
        head.x < 0 ||
        head.x >= config.canvasWidth / config.gridSize ||
        head.y < 0 ||
        head.y >= config.canvasHeight / config.gridSize
    ) {
        return true;
    }
    
    // 检查是否撞到自己的身体
    for (let i = 1; i < gameState.snake.length; i++) {
        if (head.x === gameState.snake[i].x && head.y === gameState.snake[i].y) {
            return true;
        }
    }
    
    return false;
}

// 绘制游戏画面
function draw() {
    // 清空画布
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);
    
    // 绘制蛇身体
    ctx.fillStyle = '#4a148c'; // 蛇身体的深紫色
    for (let i = 1; i < gameState.snake.length; i++) {
        const segment = gameState.snake[i];
        // 使用圆角矩形绘制蛇的身体
        const x = segment.x * config.gridSize;
        const y = segment.y * config.gridSize;
        const radius = config.gridSize / 4;
        
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + config.gridSize, y, x + config.gridSize, y + config.gridSize, radius);
        ctx.arcTo(x + config.gridSize, y + config.gridSize, x, y + config.gridSize, radius);
        ctx.arcTo(x, y + config.gridSize, x, y, radius);
        ctx.arcTo(x, y, x + config.gridSize, y, radius);
        ctx.closePath();
        ctx.fill();
    }
    
    // 绘制蛇头
    if (gameState.snake.length > 0) {
        const head = gameState.snake[0];
        const x = head.x * config.gridSize;
        const y = head.y * config.gridSize;
        
        // 蛇头颜色稍微不同
        ctx.fillStyle = '#6a1b9a';
        
        // 根据方向绘制不同形状的蛇头
        ctx.beginPath();
        switch (gameState.direction) {
            case 'right':
                // 向右的蛇头
                ctx.moveTo(x + config.gridSize, y + config.gridSize / 2);
                ctx.lineTo(x + config.gridSize * 0.7, y);
                ctx.lineTo(x, y);
                ctx.lineTo(x, y + config.gridSize);
                ctx.lineTo(x + config.gridSize * 0.7, y + config.gridSize);
                break;
            case 'left':
                // 向左的蛇头
                ctx.moveTo(x, y + config.gridSize / 2);
                ctx.lineTo(x + config.gridSize * 0.3, y);
                ctx.lineTo(x + config.gridSize, y);
                ctx.lineTo(x + config.gridSize, y + config.gridSize);
                ctx.lineTo(x + config.gridSize * 0.3, y + config.gridSize);
                break;
            case 'up':
                // 向上的蛇头
                ctx.moveTo(x + config.gridSize / 2, y);
                ctx.lineTo(x, y + config.gridSize * 0.3);
                ctx.lineTo(x, y + config.gridSize);
                ctx.lineTo(x + config.gridSize, y + config.gridSize);
                ctx.lineTo(x + config.gridSize, y + config.gridSize * 0.3);
                break;
            case 'down':
                // 向下的蛇头
                ctx.moveTo(x + config.gridSize / 2, y + config.gridSize);
                ctx.lineTo(x, y + config.gridSize * 0.7);
                ctx.lineTo(x, y);
                ctx.lineTo(x + config.gridSize, y);
                ctx.lineTo(x + config.gridSize, y + config.gridSize * 0.7);
                break;
        }
        ctx.closePath();
        ctx.fill();
        
        // 绘制眼睛
        ctx.fillStyle = 'white';
        const eyeSize = config.gridSize / 6;
        const eyeOffset = config.gridSize / 4;
        
        switch (gameState.direction) {
            case 'right':
                ctx.beginPath();
                ctx.arc(x + config.gridSize * 0.75, y + config.gridSize * 0.35, eyeSize, 0, Math.PI * 2);
                ctx.arc(x + config.gridSize * 0.75, y + config.gridSize * 0.65, eyeSize, 0, Math.PI * 2);
                ctx.fill();
                // 黑色瞳孔
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(x + config.gridSize * 0.8, y + config.gridSize * 0.35, eyeSize / 2, 0, Math.PI * 2);
                ctx.arc(x + config.gridSize * 0.8, y + config.gridSize * 0.65, eyeSize / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'left':
                ctx.beginPath();
                ctx.arc(x + config.gridSize * 0.25, y + config.gridSize * 0.35, eyeSize, 0, Math.PI * 2);
                ctx.arc(x + config.gridSize * 0.25, y + config.gridSize * 0.65, eyeSize, 0, Math.PI * 2);
                ctx.fill();
                // 黑色瞳孔
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(x + config.gridSize * 0.2, y + config.gridSize * 0.35, eyeSize / 2, 0, Math.PI * 2);
                ctx.arc(x + config.gridSize * 0.2, y + config.gridSize * 0.65, eyeSize / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'up':
                ctx.beginPath();
                ctx.arc(x + config.gridSize * 0.35, y + config.gridSize * 0.25, eyeSize, 0, Math.PI * 2);
                ctx.arc(x + config.gridSize * 0.65, y + config.gridSize * 0.25, eyeSize, 0, Math.PI * 2);
                ctx.fill();
                // 黑色瞳孔
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(x + config.gridSize * 0.35, y + config.gridSize * 0.2, eyeSize / 2, 0, Math.PI * 2);
                ctx.arc(x + config.gridSize * 0.65, y + config.gridSize * 0.2, eyeSize / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'down':
                ctx.beginPath();
                ctx.arc(x + config.gridSize * 0.35, y + config.gridSize * 0.75, eyeSize, 0, Math.PI * 2);
                ctx.arc(x + config.gridSize * 0.65, y + config.gridSize * 0.75, eyeSize, 0, Math.PI * 2);
                ctx.fill();
                // 黑色瞳孔
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(x + config.gridSize * 0.35, y + config.gridSize * 0.8, eyeSize / 2, 0, Math.PI * 2);
                ctx.arc(x + config.gridSize * 0.65, y + config.gridSize * 0.8, eyeSize / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        
        // 绘制舌头（仅向右和向左方向显示）
        if (gameState.direction === 'right' || gameState.direction === 'left') {
            ctx.fillStyle = '#e53935';
            ctx.beginPath();
            const tongueLength = config.gridSize * 0.3;
            const tongueOffset = config.gridSize * 0.15;
            
            if (gameState.direction === 'right') {
                ctx.moveTo(x + config.gridSize, y + config.gridSize / 2);
                ctx.lineTo(x + config.gridSize + tongueLength, y + config.gridSize / 2 - tongueOffset);
                ctx.moveTo(x + config.gridSize, y + config.gridSize / 2);
                ctx.lineTo(x + config.gridSize + tongueLength, y + config.gridSize / 2 + tongueOffset);
            } else {
                ctx.moveTo(x, y + config.gridSize / 2);
                ctx.lineTo(x - tongueLength, y + config.gridSize / 2 - tongueOffset);
                ctx.moveTo(x, y + config.gridSize / 2);
                ctx.lineTo(x - tongueLength, y + config.gridSize / 2 + tongueOffset);
            }
            ctx.strokeStyle = '#e53935';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    
    // 绘制食物
    ctx.fillStyle = config.foodColor;
    ctx.beginPath();
    ctx.arc(
        gameState.food.x * config.gridSize + config.gridSize / 2,
        gameState.food.y * config.gridSize + config.gridSize / 2,
        config.gridSize / 2 - 1,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

// 游戏主循环
function gameLoop() {
    moveSnake();
    
    if (checkCollision()) {
        endGame();
        return;
    }
    
    draw();
}

// 初始化AudioContext（延迟到用户交互后）
function initAudioContext() {
    if (!audioContext) {
        try {
            // 使用标准API创建AudioContext
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error('Web Audio API 不支持:', e);
        }
    }
    return audioContext;
}

// 音乐控制函数
function toggleMusic() {
    config.isMusicOn = !config.isMusicOn;
    musicToggle.textContent = config.isMusicOn ? '关闭音乐' : '打开音乐';
    
    if (config.isMusicOn && gameState.isRunning) {
        playBackgroundMusic();
    } else {
        stopBackgroundMusic();
    }
}

// 更新音量
function updateVolume(value) {
    const volume = value / 1000; // 将0-100转换为0-0.1范围（适合游戏背景音乐）
    config.volume = volume;
    volumeValue.textContent = value + '%';
    
    // 如果背景音乐正在播放，立即更新音量
    if (config.bgMusicPlaying && config.bgMusicGain && audioContext) {
        config.bgMusicGain.gain.setValueAtTime(volume, audioContext.currentTime);
    }
}

// 更新音乐速度
function updateMusicSpeed(value) {
    config.musicSpeed = 1 - (value / 200); // 将20-200范围映射到0.9-0.1
    speedValue.textContent = value + '%';
    
    // 重新启动音乐以应用新速度
    if (config.bgMusicPlaying) {
        stopBackgroundMusic();
        playBackgroundMusic();
    }
}

// 更新波形类型
function updateWaveType(type) {
    config.waveType = type;
    
    // 重新启动音乐以应用新波形
    if (config.bgMusicPlaying) {
        stopBackgroundMusic();
        playBackgroundMusic();
    }
}

// 更新音乐模式
function updateMusicPattern(pattern) {
    config.musicPattern = pattern;
    
    // 重新启动音乐以应用新模式
    if (config.bgMusicPlaying) {
        stopBackgroundMusic();
        playBackgroundMusic();
    }
}

// 播放背景音乐
function playBackgroundMusic() {
    if (!config.isMusicOn || !gameState.isRunning) return;
    
    // 停止当前正在播放的背景音乐
    stopBackgroundMusic();
    
    try {
        const ctx = initAudioContext();
        if (!ctx) return;
        
        // 创建Gain节点控制音量
        config.bgMusicGain = ctx.createGain();
        config.bgMusicGain.gain.setValueAtTime(config.volume, ctx.currentTime);
        config.bgMusicGain.connect(ctx.destination);
        
        if (config.musicSource === 'generated') {
            // 游戏生成音乐
            config.bgMusicOscillator = ctx.createOscillator();
            config.bgMusicOscillator.type = config.waveType;
            config.bgMusicOscillator.frequency.setValueAtTime(musicPatterns[config.musicPattern][0], ctx.currentTime);
            config.bgMusicOscillator.connect(config.bgMusicGain);
            config.bgMusicOscillator.start();
            config.bgMusicPlaying = true;
            createBackgroundMusicPattern();
        } else if (config.musicSource === 'upload' && uploadedMusicBuffer) {
            // 播放上传的音乐
            config.uploadedMusicSource = ctx.createBufferSource();
            config.uploadedMusicSource.buffer = uploadedMusicBuffer;
            config.uploadedMusicSource.connect(config.bgMusicGain);
            config.uploadedMusicSource.loop = true; // 循环播放
            config.uploadedMusicSource.start();
            config.bgMusicPlaying = true;
        }
    } catch (error) {
        console.log('背景音乐播放异常:', error);
    }
}

// 创建背景音乐模式
function createBackgroundMusicPattern() {
    if (!config.bgMusicPlaying || !config.bgMusicOscillator) return;
    
    const ctx = audioContext;
    const now = ctx.currentTime;
    const notes = musicPatterns[config.musicPattern] || musicPatterns.default;
    const duration = config.musicSpeed; // 使用用户设置的速度
    
    // 设置音符序列
    for (let i = 0; i < notes.length; i++) {
        config.bgMusicOscillator.frequency.setValueAtTime(notes[i], now + i * duration);
    }
    
    // 循环播放
    setTimeout(() => {
        if (config.bgMusicPlaying) {
            createBackgroundMusicPattern();
        }
    }, duration * notes.length * 1000);
}

// 停止背景音乐
function stopBackgroundMusic() {
    if (config.bgMusicPlaying) {
        try {
            if (config.bgMusicOscillator) {
                config.bgMusicOscillator.stop();
                config.bgMusicOscillator.disconnect();
            }
            if (config.uploadedMusicSource) {
                config.uploadedMusicSource.stop();
                config.uploadedMusicSource.disconnect();
            }
            if (config.bgMusicGain) {
                config.bgMusicGain.disconnect();
            }
        } catch (e) {
            console.log('停止背景音乐时出错:', e);
        }
        config.bgMusicPlaying = false;
        config.bgMusicOscillator = null;
        config.uploadedMusicSource = null;
        config.bgMusicGain = null;
    }
}

// 播放吃食物音效
function playEatSound() {
    if (!config.isMusicOn) return;
    
    try {
        const ctx = initAudioContext();
        if (!ctx) return;
        
        // 创建两个Oscillator节点以产生更丰富的声音
        const oscillator1 = ctx.createOscillator();
        const oscillator2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        // 设置音色和频率
        oscillator1.type = 'sine';
        oscillator2.type = 'triangle';
        oscillator1.frequency.setValueAtTime(880, ctx.currentTime); // A5
        oscillator2.frequency.setValueAtTime(1318.51, ctx.currentTime); // E6
        
        // 设置音量包络
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        
        // 连接节点
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        // 开始播放
        oscillator1.start();
        oscillator2.start();
        
        // 设置停止时间
        oscillator1.stop(ctx.currentTime + 0.3);
        oscillator2.stop(ctx.currentTime + 0.3);
        
        // 清理节点
        oscillator1.onended = () => {
            oscillator1.disconnect();
        };
        oscillator2.onended = () => {
            oscillator2.disconnect();
        };
    } catch (error) {
        console.log('吃食物音效播放异常:', error);
    }
}

// 切换音乐来源
function switchMusicSource(source) {
    config.musicSource = source;
    
    // 显示对应的设置区域
    if (source === 'generated') {
        generatedMusicSettings.style.display = 'block';
        uploadMusicSettings.style.display = 'none';
    } else {
        generatedMusicSettings.style.display = 'none';
        uploadMusicSettings.style.display = 'block';
    }
    
    // 如果音乐正在播放，重新启动以应用新设置
    if (config.bgMusicPlaying) {
        stopBackgroundMusic();
        playBackgroundMusic();
    }
}

// 加载上传的音乐文件
function loadUploadedMusic(file) {
    if (!file) {
        musicFileInfo.textContent = '请选择一个音乐文件';
        uploadedMusicBuffer = null;
        localStorage.removeItem('snakeGameMusic');
        localStorage.removeItem('snakeGameMusicName');
        return;
    }
    
    // 显示文件名
    musicFileInfo.textContent = '已选择: ' + file.name;
    
    // 检查文件类型
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!validTypes.includes(file.type)) {
        musicFileInfo.textContent = '不支持的文件类型，请上传MP3、WAV或OGG格式';
        uploadedMusicBuffer = null;
        localStorage.removeItem('snakeGameMusic');
        localStorage.removeItem('snakeGameMusicName');
        return;
    }
    
    // 读取文件并解码
    const reader = new FileReader();
    reader.onload = function(e) {
        const ctx = initAudioContext();
        if (!ctx) return;
        
        // 先存储文件到localStorage，这样刷新页面后不需要重新上传
        try {
            const fileData = {
                name: file.name,
                type: file.type,
                data: e.target.result
            };
            // 注意：LocalStorage有大小限制，大文件可能无法存储
            localStorage.setItem('snakeGameMusic', JSON.stringify(fileData));
            localStorage.setItem('snakeGameMusicName', file.name);
        } catch (error) {
            console.error('存储音频文件失败:', error);
            musicFileInfo.textContent = '文件过大，无法保存到本地存储';
        }
        
        ctx.decodeAudioData(e.target.result)
            .then(buffer => {
                uploadedMusicBuffer = buffer;
                musicFileInfo.textContent = '文件已加载: ' + file.name;
                
                // 如果当前是上传模式且音乐应该播放，则立即播放
                if (config.musicSource === 'upload' && config.isMusicOn && gameState.isRunning) {
                    playBackgroundMusic();
                }
            })
            .catch(error => {
                console.error('音频解码错误:', error);
                musicFileInfo.textContent = '文件解码失败，请尝试其他文件';
                uploadedMusicBuffer = null;
            });
    };
    reader.onerror = function() {
        musicFileInfo.textContent = '文件读取失败';
        uploadedMusicBuffer = null;
        localStorage.removeItem('snakeGameMusic');
        localStorage.removeItem('snakeGameMusicName');
    };
    reader.readAsArrayBuffer(file);
}

// 尝试从localStorage加载已保存的音乐文件
function tryLoadSavedMusic() {
    try {
        const musicDataStr = localStorage.getItem('snakeGameMusic');
        const musicName = localStorage.getItem('snakeGameMusicName');
        
        if (musicDataStr && musicName) {
            const musicData = JSON.parse(musicDataStr);
            
            musicFileInfo.textContent = '从本地加载: ' + musicName;
            
            const ctx = initAudioContext();
            if (!ctx) return;
            
            ctx.decodeAudioData(musicData.data)
                .then(buffer => {
                    uploadedMusicBuffer = buffer;
                    musicFileInfo.textContent = '本地文件已加载: ' + musicName;
                    
                    // 如果当前是上传模式且音乐应该播放，则立即播放
                    if (config.musicSource === 'upload' && config.isMusicOn && gameState.isRunning) {
                        playBackgroundMusic();
                    }
                })
                .catch(error => {
                    console.error('加载本地音频文件失败:', error);
                    musicFileInfo.textContent = '本地文件已过期，请重新上传';
                    localStorage.removeItem('snakeGameMusic');
                    localStorage.removeItem('snakeGameMusicName');
                });
        }
    } catch (error) {
        console.error('尝试加载保存的音乐文件失败:', error);
    }
}

// 播放游戏结束音效
function playGameOverSound() {
    if (!config.isMusicOn) return;
    
    try {
        const ctx = initAudioContext();
        if (!ctx) return;
        
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        // 设置音色和频率
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(329.63, ctx.currentTime); // E4
        oscillator.frequency.exponentialRampToValueAtTime(130.81, ctx.currentTime + 1); // C3
        
        // 设置音量包络
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        
        // 连接节点
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        // 开始播放
        oscillator.start();
        
        // 设置停止时间
        oscillator.stop(ctx.currentTime + 1.5);
        
        // 清理节点
        oscillator.onended = () => {
            oscillator.disconnect();
        };
    } catch (error) {
        console.log('游戏结束音效播放异常:', error);
    }
}

// 开始游戏
function startGame() {
    if (!gameState.isRunning) {
        // 如果游戏没有运行过，初始化游戏
        if (gameState.snake.length === 0) {
            initGame();
        }
        
        gameState.isRunning = true;
        gameState.gameLoop = setInterval(gameLoop, config.speed);
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        
        // 播放背景音乐
        playBackgroundMusic();
    }
}

// 暂停游戏
function pauseGame() {
    if (gameState.isRunning) {
        clearInterval(gameState.gameLoop);
        gameState.isRunning = false;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    }
}

// 结束游戏
function endGame() {
    clearInterval(gameState.gameLoop);
    gameState.isRunning = false;
    
    // 播放游戏结束音效
    playGameOverSound();
    
    // 停止背景音乐
    stopBackgroundMusic();
    
    alert('游戏结束！最终分数：' + gameState.score);
    initGame();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

// 处理键盘输入
function handleKeyPress(event) {
    // 防止页面滚动
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
    }
    
    switch (event.key) {
        case 'ArrowUp':
            // 不能直接向上移动（如果当前方向是向下）
            if (gameState.direction !== 'down') {
                gameState.nextDirection = 'up';
            }
            break;
        case 'ArrowDown':
            // 不能直接向下移动（如果当前方向是向上）
            if (gameState.direction !== 'up') {
                gameState.nextDirection = 'down';
            }
            break;
        case 'ArrowLeft':
            // 不能直接向左移动（如果当前方向是向右）
            if (gameState.direction !== 'right') {
                gameState.nextDirection = 'left';
            }
            break;
        case 'ArrowRight':
            // 不能直接向右移动（如果当前方向是向左）
            if (gameState.direction !== 'left') {
                gameState.nextDirection = 'right';
            }
            break;
        case ' ': // 空格键暂停/继续
            if (gameState.isRunning) {
                pauseGame();
            } else {
                startGame();
            }
            break;
    }
}

// 初始化游戏
initGame();

// 添加事件监听器
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
musicToggle.addEventListener('click', toggleMusic);
window.addEventListener('keydown', handleKeyPress);

// 添加背景音乐设置控件的事件监听器
if (volumeSlider) {
    volumeSlider.addEventListener('input', function() {
        updateVolume(this.value);
    });
}

if (musicSourceSelect) {
    musicSourceSelect.addEventListener('change', function() {
        switchMusicSource(this.value);
    });
}

if (speedSlider) {
    speedSlider.addEventListener('input', function() {
        updateMusicSpeed(this.value);
    });
}

if (waveTypeSelect) {
    waveTypeSelect.addEventListener('change', function() {
        updateWaveType(this.value);
    });
}

if (musicPatternSelect) {
    musicPatternSelect.addEventListener('change', function() {
        updateMusicPattern(this.value);
    });
}

if (musicFileInput) {
    musicFileInput.addEventListener('change', function() {
        loadUploadedMusic(this.files[0]);
    });
}

// 初始设置音乐按钮文本
musicToggle.textContent = config.isMusicOn ? '关闭音乐' : '打开音乐';

// 禁用暂停按钮（初始状态）
pauseBtn.disabled = true;