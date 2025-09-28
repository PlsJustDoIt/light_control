#!/bin/bash

# Script de déploiement pour le backend via Git
echo "🚀 Déploiement du backend Light Control via Git..."

# Variables de configuration
REPO_URL="git@github.com:votre-username/light_control.git"  # À adapter
APP_DIR="~/apps/light_control"
BACKEND_DIR="$APP_DIR/backend"

echo "📥 Mise à jour du code depuis le dépôt Git..."
ssh server "
  # Créer le répertoire d'applications si nécessaire
  mkdir -p ~/apps
  
  # Cloner ou mettre à jour le dépôt
  if [ -d '$APP_DIR' ]; then
    echo '🔄 Mise à jour du dépôt existant...'
    cd $APP_DIR && git pull origin main
  else
    echo '📁 Clonage du dépôt...'
    git clone $REPO_URL $APP_DIR
  fi
  
  # Aller dans le répertoire backend
  cd $BACKEND_DIR
  
  # Installer/mettre à jour les dépendances
  echo '📦 Installation des dépendances...'
  npm ci --omit=dev
  
  # Redémarrer avec PM2
  echo '🔄 Redémarrage du service...'
  pm2 restart light-control-backend 2>/dev/null || pm2 start ecosystem.config.js --env production
"

echo "✅ Déploiement terminé !"
echo "🔍 Vérifiez le statut avec: ssh server 'pm2 status'"