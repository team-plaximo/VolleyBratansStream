#!/bin/bash

# VolleyBratans Stream - Server Setup Script
# Tested on Ubuntu 24.04 LTS

echo "🏐 VolleyBratans Stream Server Setup..."
echo "========================================"

# 1. Update System
echo "[1/5] Updating Access List & System Upgrade..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Essentials & Git
echo "[2/5] Installing Git, Curl, Unzip..."
sudo apt-get install -y git curl unzip

# 3. Install Docker
echo "[3/5] Installing Docker..."
# Add Docker's official GPG key:
sudo apt-get install -y ca-certificates
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

# Install Docker packages
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Configure Firewall (UFW)
echo "[4/5] Configuring Firewall..."
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
# Enable firewall if not enabled (user must confirm ssh is allowed first!)
# sudo ufw enable 

# 5. Final Check
echo "========================================"
echo "✅ Setup Complete!"
echo ""
echo "Docker Version:"
docker --version
echo ""
echo "Next Steps:"
echo "1. Clone your repo: git clone https://github.com/YOUR_USER/VolleyBratansStream.git"
echo "2. cd VolleyBratansStream"
echo "3. cp .env.production .env"
echo "4. nano .env (Edit your domain/password)"
echo "5. ./update.sh"
echo "========================================"
