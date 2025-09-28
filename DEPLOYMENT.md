# Guide de déploiement

## Architecture recommandée

```
Serveur:
├── ~/apps/light_control/          # Code de l'application
│   ├── frontend/                  # Frontend build
│   └── backend/                   # Backend Node.js
└── /var/www/light_control/        # Frontend statique servi par nginx
```

## Première installation

### 1. Sur le serveur, installer les prérequis :
```bash
# Node.js et PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Git (si pas déjà installé)
sudo apt-get install git
```

### 2. Cloner le dépôt :
```bash
mkdir -p ~/apps
cd ~/apps
git clone <URL_DU_DEPOT> light_control
```

### 3. Configurer le backend :
```bash
cd ~/apps/light_control/backend
cp .env.example .env  # Éditer avec vos vraies valeurs
npm ci --omit=dev
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Suivre les instructions pour démarrer PM2 au boot
```

### 4. Déployer le frontend :
```bash
# Copier le build du frontend vers nginx
sudo cp -r ~/apps/light_control/frontend/dist/* /var/www/light_control/
sudo chown -R www-data:www-data /var/www/light_control
```

## Déploiement continu

### Backend (via ce script) :
```bash
npm run deploy
```

### Frontend :
```bash
# Depuis votre machine locale après build
npm run build
scp -r dist/* server:/tmp/frontend_build/
ssh server "sudo cp -r /tmp/frontend_build/* /var/www/light_control/"
```

## Configuration Nginx recommandée

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Frontend statique
    location / {
        root /var/www/light_control;
        try_files $uri $uri/ /index.html;
    }
    
    # API Backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```