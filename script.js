// 获取DOM元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');

// 游戏配置
const config = {
    gridSize: 20,
    snakeColor: '#4a148c',
    foodColor: '#e53935',
    speed: 150,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height
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
    
    // 绘制蛇
    ctx.fillStyle = config.snakeColor;
    for (let segment of gameState.snake) {
        ctx.fillRect(
            segment.x * config.gridSize,
            segment.y * config.gridSize,
            config.gridSize - 1,
            config.gridSize - 1
        );
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
window.addEventListener('keydown', handleKeyPress);

// 禁用暂停按钮（初始状态）
pauseBtn.disabled = true;