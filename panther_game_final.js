// Jogo da Pantera no Pantanal - Sistema Final
(function() {
    'use strict';

    // Configurações do jogo
    const CONFIG = {
        SPEED: 4,
        MAX_SPEED: 10,
        ACCELERATION: 0.001,
        GRAVITY: 0.6,
        JUMP_VELOCITY: 12,
        GROUND_HEIGHT: 20,
        PANTHER_WIDTH: 50,
        PANTHER_HEIGHT: 50,
        OBSTACLE_WIDTH: 40,
        OBSTACLE_HEIGHT: 40
    };

    // Classe para carregar e gerenciar imagens
    class AssetManager {
        constructor() {
            this.images = {};
            this.loadedCount = 0;
            this.totalImages = 0;
            this.onAllLoaded = null;
        }

        loadImage(name, src) {
            this.totalImages++;
            const img = new Image();
            
            img.onload = () => {
                this.loadedCount++;
                console.log(`✅ Imagem carregada: ${name} (${this.loadedCount}/${this.totalImages})`);
                if (this.loadedCount === this.totalImages && this.onAllLoaded) {
                    this.onAllLoaded();
                }
            };
            
            img.onerror = () => {
                console.error(`❌ Erro ao carregar imagem: ${name} (${img.src})`);
                this.loadedCount++;
                if (this.loadedCount === this.totalImages && this.onAllLoaded) {
                    this.onAllLoaded();
                }
            };
            
            img.src = src;
            this.images[name] = img;
            return img;
        }

        isAllLoaded() {
            return this.loadedCount >= this.totalImages;
        }

        getImage(name) {
            return this.images[name];
        }
    }

    // Classe da Pantera
    class Panther {
        constructor(canvas, assetManager) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.assetManager = assetManager;
            this.x = 80;
            this.y = canvas.height - CONFIG.GROUND_HEIGHT - CONFIG.PANTHER_HEIGHT;
            this.groundY = this.y;
            this.velocityY = 0;
            this.jumping = false;
            this.animFrame = 0;
            this.animTimer = 0;
            this.width = CONFIG.PANTHER_WIDTH;
            this.height = CONFIG.PANTHER_HEIGHT;
        }

        jump() {
            if (!this.jumping) {
                this.jumping = true;
                this.velocityY = -CONFIG.JUMP_VELOCITY;
            }
        }

        update(deltaTime) {
            // Animação de corrida
            this.animTimer += deltaTime;
            if (this.animTimer > 120) {
                this.animFrame = (this.animFrame + 1) % 4;
                this.animTimer = 0;
            }

            // Física do pulo
            if (this.jumping) {
                this.velocityY += CONFIG.GRAVITY;
                this.y += this.velocityY;

                if (this.y >= this.groundY) {
                    this.y = this.groundY;
                    this.jumping = false;
                    this.velocityY = 0;
                }
            }
        }

        draw() {
            const spriteName = `panther_run_${this.animFrame + 1}`;
            const img = this.assetManager.getImage(spriteName);
            
            if (img && img.complete && img.naturalWidth > 0) {
                this.ctx.drawImage(img, this.x, this.y, this.width, this.height);
            } else {
                // Fallback: desenhar pantera simples
                this.ctx.fillStyle = '#000';
                this.ctx.fillRect(this.x, this.y, this.width, this.height);
                // Olhos amarelos
                this.ctx.fillStyle = '#DAA520';
                this.ctx.fillRect(this.x + 10, this.y + 10, 8, 8);
                this.ctx.fillRect(this.x + 25, this.y + 10, 8, 8);
            }
        }

        getCollisionBox() {
            return {
                x: this.x + 8,
                y: this.y + 8,
                width: this.width - 16,
                height: this.height - 16
            };
        }
    }

    // Classe dos Obstáculos
    class Obstacle {
        constructor(canvas, x, type, assetManager) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.assetManager = assetManager;
            this.x = x;
            this.type = type;
            this.y = canvas.height - CONFIG.GROUND_HEIGHT - CONFIG.OBSTACLE_HEIGHT;
            this.width = CONFIG.OBSTACLE_WIDTH;
            this.height = CONFIG.OBSTACLE_HEIGHT;
        }

        update(gameSpeed) {
            this.x -= gameSpeed;
        }

        draw() {
            const spriteName = this.type === 'bush' ? 'bush_obstacle' : 'log_obstacle';
            const img = this.assetManager.getImage(spriteName);
            
            if (img && img.complete && img.naturalWidth > 0) {
                this.ctx.drawImage(img, this.x, this.y, this.width, this.height);
            } else {
                // Fallback
                this.ctx.fillStyle = this.type === 'bush' ? '#228B22' : '#8B4513';
                this.ctx.fillRect(this.x, this.y, this.width, this.height);
            }
        }

        getCollisionBox() {
            return {
                x: this.x + 4,
                y: this.y + 4,
                width: this.width - 8,
                height: this.height - 8
            };
        }

        isOffScreen() {
            return this.x + this.width < 0;
        }
    }

    // Classe principal do jogo
    class PantherGame {
        constructor() {
            console.log("PantherGame: Constructor iniciado.");
            this.canvas = document.getElementById("gameCanvas");
            if (!this.canvas) {
                console.error("Erro: Canvas com ID 'gameCanvas' não encontrado!");
                return;
            }
            this.ctx = this.canvas.getContext("2d");
            this.scoreDisplay = document.getElementById("scoreDisplay");
            
            this.assetManager = new AssetManager();
            this.panther = new Panther(this.canvas, this.assetManager);
            this.obstacles = [];
            this.gameSpeed = CONFIG.SPEED;
            this.score = 0;
            this.gameRunning = false;
            this.gameOver = false;
            this.lastTime = 0;
            this.obstacleTimer = 0;
            this.backgroundX = 0;

            this.loadAssets();
            this.setupControls();
            
            // Aguardar carregamento dos assets
            this.assetManager.onAllLoaded = () => {
                console.log("🎮 Todos os assets carregados! Jogo pronto!");
                this.gameLoop();
            };
            console.log("PantherGame: Constructor finalizado.");
        }

        loadAssets() {
            console.log('📦 Carregando assets da pantera...');
            
            // Carregar sprites da pantera
            this.assetManager.loadImage("panther_run_1", "assets/panther_run_1.png");
            this.assetManager.loadImage("panther_run_2", "assets/panther_run_2.png");
            this.assetManager.loadImage("panther_run_3", "assets/panther_run_3.png");
            this.assetManager.loadImage("panther_run_4", "assets/panther_run_4.png");
            
            // Carregar obstáculos
            this.assetManager.loadImage("bush_obstacle", "assets/bush_obstacle.png");
            this.assetManager.loadImage("log_obstacle", "assets/log_obstacle.png");
            
            // Carregar cenário
            this.assetManager.loadImage("pantanal_background", "assets/pantanal_background.png");
            this.assetManager.loadImage("ground_grass", "assets/ground_grass.png");
        }

        setupControls() {
            // Controles de teclado
            document.addEventListener('keydown', (e) => {
                if (e.code === 'Space' || e.code === 'ArrowUp') {
                    e.preventDefault();
                    this.handleInput();
                }
            });

            // Controles de toque
            this.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleInput();
            });

            // Controles de mouse
            this.canvas.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleInput();
            });
        }

        handleInput() {
            if (!this.gameRunning && !this.gameOver) {
                this.startGame();
            } else if (this.gameRunning) {
                this.panther.jump();
            } else if (this.gameOver) {
                this.restart();
            }
        }

        startGame() {
            console.log('🚀 Iniciando jogo!');
            this.gameRunning = true;
            this.gameOver = false;
            this.score = 0;
            this.gameSpeed = CONFIG.SPEED;
            this.obstacles = [];
            this.panther.y = this.panther.groundY;
            this.panther.jumping = false;
            this.panther.velocityY = 0;
            this.obstacleTimer = 0;
            this.lastTime = performance.now();
            this.updateScore();
        }

        restart() {
            this.startGame();
        }

        spawnObstacle() {
            const types = ['bush', 'log'];
            const type = types[Math.floor(Math.random() * types.length)];
            const obstacle = new Obstacle(this.canvas, this.canvas.width, type, this.assetManager);
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
                    
                    console.log('💥 Colisão detectada!');
                    this.gameOver = true;
                    this.gameRunning = false;
                    return;
                }
            }
        }

        updateScore() {
            if (this.scoreDisplay) {
                this.scoreDisplay.textContent = `Pontuação: ${this.score}`;
            }
        }

        update(deltaTime) {
            if (!this.gameRunning) return;

            // Atualizar pantera
            this.panther.update(deltaTime);

            // Aumentar velocidade gradualmente
            this.gameSpeed += CONFIG.ACCELERATION * deltaTime;
            if (this.gameSpeed > CONFIG.MAX_SPEED) {
                this.gameSpeed = CONFIG.MAX_SPEED;
            }

            // Spawnar obstáculos
            this.obstacleTimer += deltaTime;
            if (this.obstacleTimer > 1800) {
                this.spawnObstacle();
                this.obstacleTimer = 0;
            }

            // Atualizar obstáculos
            for (let i = this.obstacles.length - 1; i >= 0; i--) {
                this.obstacles[i].update(this.gameSpeed);
                
                if (this.obstacles[i].isOffScreen()) {
                    this.obstacles.splice(i, 1);
                    this.score += 10;
                    this.updateScore();
                }
            }

            // Verificar colisões
            this.checkCollisions();

            // Atualizar fundo
            this.backgroundX -= this.gameSpeed * 0.3;
            if (this.backgroundX <= -this.canvas.width) {
                this.backgroundX = 0;
            }
        }

        draw() {
            // Limpar canvas com fundo transparente
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0)'; // Definir cor de preenchimento transparente
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Desenhar fundo do pantanal
            const bgImg = this.assetManager.getImage('pantanal_background');
            if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
                this.ctx.drawImage(bgImg, this.backgroundX, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(bgImg, this.backgroundX + this.canvas.width, 0, this.canvas.width, this.canvas.height);
            } else {
                // Fallback: gradiente do pantanal
                const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
                gradient.addColorStop(0, '#87CEEB');
                gradient.addColorStop(0.7, '#228B22');
                gradient.addColorStop(1, '#006400');
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }

            // Desenhar chão com grama
            const groundImg = this.assetManager.getImage('ground_grass');
            const groundY = this.canvas.height - CONFIG.GROUND_HEIGHT;
            
            if (groundImg && groundImg.complete && groundImg.naturalWidth > 0) {
                const grassWidth = groundImg.naturalWidth;
                for (let x = 0; x < this.canvas.width + grassWidth; x += grassWidth) {
                    this.ctx.drawImage(groundImg, x, groundY, grassWidth, CONFIG.GROUND_HEIGHT);
                }
            } else {
                // Fallback: chão verde
                this.ctx.fillStyle = '#228B22';
                this.ctx.fillRect(0, groundY, this.canvas.width, CONFIG.GROUND_HEIGHT);
            }

            // Desenhar obstáculos
            for (let obstacle of this.obstacles) {
                obstacle.draw();
            }

            // Desenhar pantera
            this.panther.draw();

            // Desenhar UI do jogo
            this.drawGameUI();
        }

        drawGameUI() {
            this.ctx.fillStyle = '#DAA520';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`Velocidade: ${this.gameSpeed.toFixed(1)}`, 10, 30);

            if (!this.gameRunning && !this.gameOver) {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                this.ctx.fillStyle = '#DAA520';
                this.ctx.font = 'bold 32px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('🐆 PANTERA NO PANTANAL 🌿', this.canvas.width / 2, this.canvas.height / 2 - 40);
                this.ctx.font = 'bold 20px Arial';
                this.ctx.fillText('Pressione ESPAÇO, clique ou toque para começar!', this.canvas.width / 2, this.canvas.height / 2 + 20);
            }

            if (this.gameOver) {
                this.ctx.fillStyle = 'rgba(139, 0, 0, 0.8)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                this.ctx.fillStyle = '#DAA520';
                this.ctx.font = 'bold 36px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('💥 GAME OVER 💥', this.canvas.width / 2, this.canvas.height / 2 - 30);
                this.ctx.font = 'bold 24px Arial';
                this.ctx.fillText(`Pontuação Final: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);
                this.ctx.font = 'bold 18px Arial';
                this.ctx.fillText('Pressione ESPAÇO para jogar novamente', this.canvas.width / 2, this.canvas.height / 2 + 50);
            }
        }

        gameLoop() {
            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastTime;
            this.lastTime = currentTime;

            this.update(deltaTime);
            this.draw();

            requestAnimationFrame(() => this.gameLoop());
        }
    }

    // Inicializar o jogo quando a página carregar
    window.addEventListener('load', () => {
        console.log('🎮 Iniciando Pantera no Pantanal...');
        window.pantherGame = new PantherGame();
    });

})();



document.addEventListener("touchstart", () => {
    if (typeof panther !== 'undefined' && typeof panther.jump === 'function') {
        panther.jump();
    }
});
