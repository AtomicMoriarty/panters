// Sistema de jogo da Pantera no Pantanal
(function() {
    'use strict';

    // Configurações do jogo
    const GAME_CONFIG = {
        SPEED: 4,
        MAX_SPEED: 10,
        ACCELERATION: 0.001,
        GRAVITY: 0.6,
        JUMP_VELOCITY: 12,
        GROUND_HEIGHT: 12,
        PANTHER_WIDTH: 44,
        PANTHER_HEIGHT: 47,
        OBSTACLE_WIDTH: 32,
        OBSTACLE_HEIGHT: 32
    };

    // Classe para carregar imagens
    class ImageLoader {
        constructor() {
            this.images = {};
            this.loadedCount = 0;
            this.totalImages = 0;
        }

        loadImage(name, src) {
            this.totalImages++;
            const img = new Image();
            img.onload = () => {
                this.loadedCount++;
                console.log(`Imagem carregada: ${name}`);
            };
            img.onerror = () => {
                console.error(`Erro ao carregar imagem: ${name}`);
                this.loadedCount++;
            };
            img.src = src;
            this.images[name] = img;
            return img;
        }

        isAllLoaded() {
            return this.loadedCount >= this.totalImages;
        }
    }

    // Classe da Pantera
    class Panther {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.x = 50;
            this.y = canvas.height - GAME_CONFIG.GROUND_HEIGHT - GAME_CONFIG.PANTHER_HEIGHT;
            this.groundY = this.y;
            this.velocityY = 0;
            this.jumping = false;
            this.animFrame = 0;
            this.animTimer = 0;
            this.width = GAME_CONFIG.PANTHER_WIDTH;
            this.height = GAME_CONFIG.PANTHER_HEIGHT;
        }

        jump() {
            if (!this.jumping) {
                this.jumping = true;
                this.velocityY = -GAME_CONFIG.JUMP_VELOCITY;
            }
        }

        update(deltaTime) {
            // Animação de corrida mais suave
            this.animTimer += deltaTime;
            if (this.animTimer > 80) { // Muda frame a cada 80ms para animação mais fluida
                this.animFrame = (this.animFrame + 1) % 4;
                this.animTimer = 0;
            }

            // Física do pulo
            if (this.jumping) {
                this.velocityY += GAME_CONFIG.GRAVITY;
                this.y += this.velocityY;

                if (this.y >= this.groundY) {
                    this.y = this.groundY;
                    this.jumping = false;
                    this.velocityY = 0;
                }
            }
        }

        draw(imageLoader) {
            const spriteName = `panther_run_${this.animFrame + 1}`;
            const img = imageLoader.images[spriteName];
            
            if (img && img.complete) {
                this.ctx.drawImage(img, this.x, this.y, this.width, this.height);
            } else {
                // Fallback: desenhar um retângulo preto
                this.ctx.fillStyle = '#000';
                this.ctx.fillRect(this.x, this.y, this.width, this.height);
            }
        }

        getCollisionBox() {
            return {
                x: this.x + 5,
                y: this.y + 5,
                width: this.width - 10,
                height: this.height - 10
            };
        }
    }

    // Classe dos Obstáculos
    class Obstacle {
        constructor(canvas, x, type) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.x = x;
            this.type = type; // 'bush' ou 'log'
            this.y = canvas.height - GAME_CONFIG.GROUND_HEIGHT - GAME_CONFIG.OBSTACLE_HEIGHT;
            this.width = GAME_CONFIG.OBSTACLE_WIDTH;
            this.height = GAME_CONFIG.OBSTACLE_HEIGHT;
            this.speed = GAME_CONFIG.SPEED;
        }

        update(deltaTime, gameSpeed) {
            this.x -= gameSpeed;
        }

        draw(imageLoader) {
            const spriteName = this.type === 'bush' ? 'bush_obstacle' : 'log_obstacle';
            const img = imageLoader.images[spriteName];
            
            if (img && img.complete) {
                this.ctx.drawImage(img, this.x, this.y, this.width, this.height);
            } else {
                // Fallback: desenhar um retângulo verde ou marrom
                this.ctx.fillStyle = this.type === 'bush' ? '#228B22' : '#8B4513';
                this.ctx.fillRect(this.x, this.y, this.width, this.height);
            }
        }

        getCollisionBox() {
            return {
                x: this.x + 2,
                y: this.y + 2,
                width: this.width - 4,
                height: this.height - 4
            };
        }

        isOffScreen() {
            return this.x + this.width < 0;
        }
    }

    // Classe principal do jogo
    class PantherGame {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.imageLoader = new ImageLoader();
            this.panther = new Panther(canvas);
            this.obstacles = [];
            this.gameSpeed = GAME_CONFIG.SPEED;
            this.score = 0;
            this.gameRunning = false;
            this.gameOver = false;
            this.lastTime = 0;
            this.obstacleTimer = 0;
            this.backgroundX = 0;

            this.loadAssets();
            this.setupControls();
        }

        loadAssets() {
            // Carregar sprites da pantera
            this.imageLoader.loadImage('panther_run_1', 'assets/panther_run_1.png');
            this.imageLoader.loadImage('panther_run_2', 'assets/panther_run_2.png');
            this.imageLoader.loadImage('panther_run_3', 'assets/panther_run_3.png');
            this.imageLoader.loadImage('panther_run_4', 'assets/panther_run_4.png');
            
            // Carregar obstáculos
            this.imageLoader.loadImage('bush_obstacle', 'assets/bush_obstacle.png');
            this.imageLoader.loadImage('log_obstacle', 'assets/log_obstacle.png');
            
            // Carregar fundo e chão
            this.imageLoader.loadImage('pantanal_background', 'assets/pantanal_background.png');
            this.imageLoader.loadImage('ground_grass', 'assets/ground_grass.png');
        }

        setupControls() {
            document.addEventListener('keydown', (e) => {
                if (e.code === 'Space' || e.code === 'ArrowUp') {
                    e.preventDefault();
                    if (!this.gameRunning && !this.gameOver) {
                        this.startGame();
                    } else if (this.gameRunning) {
                        this.panther.jump();
                    } else if (this.gameOver) {
                        this.restart();
                    }
                }
            });

            // Controles de toque para mobile
            this.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (!this.gameRunning && !this.gameOver) {
                    this.startGame();
                } else if (this.gameRunning) {
                    this.panther.jump();
                } else if (this.gameOver) {
                    this.restart();
                }
            });
        }

        startGame() {
            this.gameRunning = true;
            this.gameOver = false;
            this.score = 0;
            this.gameSpeed = GAME_CONFIG.SPEED;
            this.obstacles = [];
            this.panther.y = this.panther.groundY;
            this.panther.jumping = false;
            this.panther.velocityY = 0;
            this.lastTime = performance.now();
            this.gameLoop();
        }

        restart() {
            this.startGame();
        }

        spawnObstacle() {
            const types = ['bush', 'log'];
            const type = types[Math.floor(Math.random() * types.length)];
            const obstacle = new Obstacle(this.canvas, this.canvas.width, type);
            this.obstacles.push(obstacle);
        }

        checkCollisions() {
            const pantherBox = this.panther.getCollisionBox();
            
            for (let obstacle of this.obstacles) {
                const obstacleBox = obstacle.getCollisionBox();
                
                if (pantherBox.x < obstacleBox.x + obstacleBox.width &&
                    pantherBox.x + pantherBox.width > obstacleBox.x &&
                    pantherBox.y < obstacleBox.y + obstacleBox.height &&
                    pantherBox.y + pantherBox.height > obstacleBox.y) {
                    this.gameOver = true;
                    this.gameRunning = false;
                    return;
                }
            }
        }

        update(deltaTime) {
            if (!this.gameRunning) return;

            // Atualizar pantera
            this.panther.update(deltaTime);

            // Atualizar velocidade do jogo
            this.gameSpeed += GAME_CONFIG.ACCELERATION * deltaTime;
            if (this.gameSpeed > GAME_CONFIG.MAX_SPEED) {
                this.gameSpeed = GAME_CONFIG.MAX_SPEED;
            }

            // Spawnar obstáculos
            this.obstacleTimer += deltaTime;
            if (this.obstacleTimer > 1200) { // Novo obstáculo a cada 1.2 segundos para melhor jogabilidade
                this.spawnObstacle();
                this.obstacleTimer = 0;
            }

            // Atualizar obstáculos
            for (let i = this.obstacles.length - 1; i >= 0; i--) {
                this.obstacles[i].update(deltaTime, this.gameSpeed);
                
                if (this.obstacles[i].isOffScreen()) {
                    this.obstacles.splice(i, 1);
                    this.score += 10;
                }
            }

            // Verificar colisões
            this.checkCollisions();

            // Atualizar fundo
            this.backgroundX -= this.gameSpeed * 0.5;
            if (this.backgroundX <= -this.canvas.width) {
                this.backgroundX = 0;
            }
        }

        draw() {
            // Limpar canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Desenhar fundo
            const bgImg = this.imageLoader.images['pantanal_background'];
            if (bgImg && bgImg.complete) {
                this.ctx.drawImage(bgImg, this.backgroundX, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(bgImg, this.backgroundX + this.canvas.width, 0, this.canvas.width, this.canvas.height);
            } else {
                // Fallback: gradiente azul-verde
                const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
                gradient.addColorStop(0, '#87CEEB');
                gradient.addColorStop(1, '#228B22');
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }

            // Desenhar chão
            const groundImg = this.imageLoader.images['ground_grass'];
            const groundY = this.canvas.height - GAME_CONFIG.GROUND_HEIGHT;
            if (groundImg && groundImg.complete) {
                for (let x = 0; x < this.canvas.width; x += groundImg.width) {
                    this.ctx.drawImage(groundImg, x, groundY, groundImg.width, GAME_CONFIG.GROUND_HEIGHT);
                }
            } else {
                // Fallback: retângulo verde
                this.ctx.fillStyle = '#228B22';
                this.ctx.fillRect(0, groundY, this.canvas.width, GAME_CONFIG.GROUND_HEIGHT);
            }

            // Desenhar obstáculos
            for (let obstacle of this.obstacles) {
                obstacle.draw(this.imageLoader);
            }

            // Desenhar pantera
            this.panther.draw(this.imageLoader);

            // Desenhar UI
            this.drawUI();
        }

        drawUI() {
            this.ctx.fillStyle = '#DAA520';
            this.ctx.font = '20px Arial';
            this.ctx.fillText(`Pontuação: ${this.score}`, 10, 30);

            if (!this.gameRunning && !this.gameOver) {
                this.ctx.fillStyle = '#DAA520';
                this.ctx.font = '24px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('Pressione ESPAÇO para começar', this.canvas.width / 2, this.canvas.height / 2);
                this.ctx.textAlign = 'left';
            }

            if (this.gameOver) {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                this.ctx.fillStyle = '#DAA520';
                this.ctx.font = '32px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 20);
                this.ctx.font = '20px Arial';
                this.ctx.fillText(`Pontuação Final: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
                this.ctx.fillText('Pressione ESPAÇO para reiniciar', this.canvas.width / 2, this.canvas.height / 2 + 50);
                this.ctx.textAlign = 'left';
            }
        }

        gameLoop() {
            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastTime;
            this.lastTime = currentTime;

            this.update(deltaTime);
            this.draw();

            if (this.gameRunning || !this.imageLoader.isAllLoaded()) {
                requestAnimationFrame(() => this.gameLoop());
            }
        }
    }

    // Inicializar o jogo quando a página carregar
    window.addEventListener('load', () => {
        const canvas = document.querySelector('.runner-canvas');
        if (canvas) {
            window.pantherGame = new PantherGame(canvas);
            window.pantherGame.gameLoop();
        }
    });

})();

