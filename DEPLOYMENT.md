# Deployment Guide

Deploy Tempo to production for your team or the world.

---

## Deployment Options

### Option 1: Vercel + Railway (Recommended)

**Frontend on Vercel** — Simple React deployment  
**Backend on Railway** — Managed Python hosting

#### Advantages
- ✅ Easy setup (5 minutes)
- ✅ Free tier available
- ✅ Auto-scaling
- ✅ Custom domain support
- ✅ Environment variable management

#### Frontend: Vercel

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repo
   - Select `frontend` as root directory
   - Deploy!

3. **Set environment variable:**
   ```
   VITE_WS_URL = https://your-backend.railway.app/ws
   ```

#### Backend: Railway

1. **Add to git**
   ```bash
   cd backend
   git add .
   git commit -m "backend: production ready"
   git push
   ```

2. **Deploy on Railway**
   - Go to [railway.app](https://railway.app)
   - New Project → Import from GitHub
   - Select backend folder
   - Add environment variable: `ANTHROPIC_API_KEY`
   - Deploy!

3. **Get your backend URL**
   ```
   https://your-backend.railway.app
   ```

---

### Option 2: Docker + Cloud Run

Deploy both frontend and backend as containers.

#### Prerequisites
- Docker installed
- Google Cloud account
- `gcloud` CLI

#### Setup

**1. Create Dockerfile for backend**

```dockerfile
# Dockerfile.backend
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
```

**2. Create Dockerfile for frontend**

```dockerfile
# Dockerfile.frontend
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**3. Create nginx.conf** (for frontend)

```nginx
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        root /usr/share/nginx/html;
        index index.html;
        
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        location /api {
            proxy_pass http://backend:8000;
        }
    }
}
```

**4. Build and push to Docker Hub**

```bash
# Build backend
docker build -f Dockerfile.backend -t yourusername/tempo-backend:latest .
docker push yourusername/tempo-backend:latest

# Build frontend
docker build -f Dockerfile.frontend -t yourusername/tempo-frontend:latest .
docker push yourusername/tempo-frontend:latest
```

**5. Deploy to Cloud Run**

```bash
# Backend
gcloud run deploy tempo-backend \
  --image yourusername/tempo-backend:latest \
  --platform managed \
  --region us-central1 \
  --memory 1Gi \
  --set-env-vars ANTHROPIC_API_KEY=sk-ant-...

# Frontend
gcloud run deploy tempo-frontend \
  --image yourusername/tempo-frontend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

### Option 3: Self-Hosted (VPS)

Deploy on your own server (DigitalOcean, Linode, AWS EC2, etc.).

#### Prerequisites
- Ubuntu 20.04+ instance
- SSH access
- Domain name (optional)

#### Setup

**1. Connect to server**

```bash
ssh root@your_ip_address
```

**2. Install dependencies**

```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install Python
apt-get install -y python3.10 python3-pip python3-venv

# Install Nginx (frontend proxy)
apt-get install -y nginx

# Install Supervisor (process management)
apt-get install -y supervisor

# Install certbot (SSL/HTTPS)
apt-get install -y certbot python3-certbot-nginx
```

**3. Clone your repository**

```bash
cd /var/www
git clone https://github.com/yourusername/tempo.git
cd tempo
```

**4. Setup backend**

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env
cat > ../.env << EOF
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=...
EOF
```

**5. Configure Supervisor for backend**

```bash
sudo tee /etc/supervisor/conf.d/tempo-backend.conf > /dev/null << EOF
[program:tempo-backend]
directory=/var/www/tempo/backend
command=/var/www/tempo/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8000
autostart=true
autorestart=true
stderr_logfile=/var/log/tempo-backend.err.log
stdout_logfile=/var/log/tempo-backend.out.log
environment=PATH="/var/www/tempo/backend/venv/bin"
EOF

sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start tempo-backend
```

**6. Setup frontend**

```bash
cd frontend

# Install and build
npm install
npm run build

# Copy to Nginx
sudo cp -r dist/* /var/www/html/
```

**7. Configure Nginx**

```bash
sudo tee /etc/nginx/sites-available/tempo > /dev/null << EOF
server {
    listen 80;
    server_name your_domain.com;
    root /var/www/html;
    
    # Frontend routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Backend proxy
    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
    
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
    }
}
EOF

sudo rm /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/tempo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**8. Setup HTTPS with Let's Encrypt**

```bash
sudo certbot --nginx -d your_domain.com
```

**9. Verify it's working**

```bash
# Check backend
curl http://127.0.0.1:8000/docs

# Check frontend in browser
open https://your_domain.com
```

---

## Production Checklist

- [ ] **API Keys**: Stored in environment variables, never in code
- [ ] **HTTPS**: Enabled for all traffic
- [ ] **CORS**: Restricted to your domain only
- [ ] **Rate Limiting**: Enabled to prevent abuse
- [ ] **Logging**: Centralized logs for debugging
- [ ] **Monitoring**: Set up alerts for errors
- [ ] **Backups**: Regular database/config backups
- [ ] **Updates**: Plan for dependency updates
- [ ] **Security Headers**: Added to responses
- [ ] **CDN**: Cache static assets (optional)

---

## Environment Variables

### Backend (.env)

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional but recommended
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=...

# Logging
LOG_LEVEL=INFO
DEBUG=False
```

### Frontend (.env.production)

```env
VITE_WS_URL=https://your-backend.com/ws
VITE_API_URL=https://your-backend.com/api
```

---

## Monitoring & Logging

### Application Monitoring

```bash
# Check backend status
sudo supervisorctl status tempo-backend

# View logs
tail -f /var/log/tempo-backend.out.log

# Check Nginx
sudo systemctl status nginx
```

### Cloud Monitoring

**Railway Dashboard:**
- Memory usage
- CPU usage
- Network throughput
- Error rates

**Vercel Dashboard:**
- Build logs
- Runtime errors
- Analytics

---

## Scaling

### As your user base grows:

1. **Database**: Add PostgreSQL for session persistence
   ```python
   # Future: sqlalchemy + async
   async with SessionLocal() as session:
       session.add(SessionRecord(...))
   ```

2. **Caching**: Add Redis for performance
   ```python
   # Cache coach prompts
   cached_response = redis.get('coach_' + session_id)
   ```

3. **Load Balancing**: Multiple backend instances
   ```bash
   # Route through load balancer
   # AWS ALB, nginx, etc.
   ```

4. **CDN**: Serve static files globally
   ```
   Cloudflare, AWS CloudFront, etc.
   ```

---

## Troubleshooting

### Backend won't start

```bash
# Check logs
journalctl -u tempo-backend -n 50

# Test Python
python3 -c "import anthropic; print('OK')"

# Test imports
python3 -c "from server import app"
```

### Frontend blank page

```bash
# Check Nginx logs
tail -f /var/log/nginx/error.log

# Verify build
ls -la frontend/dist/
```

### WebSocket connection fails

```bash
# Check Nginx proxy
grep proxy /etc/nginx/sites-available/tempo

# Test backend directly
curl http://127.0.0.1:8000/docs

# Check firewall
sudo ufw status
```

---

## Continuous Deployment

### GitHub Actions

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy Frontend
        run: |
          npm --prefix frontend install
          npm --prefix frontend run build
          
      - name: Deploy Backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          railway up
```

---

## Cost Estimation (Monthly)

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Vercel (Frontend) | 100GB bandwidth | $20+ |
| Railway (Backend) | 5GB RAM | $5+ |
| Anthropic API | $0 (usage-based) | $0.80/million tokens |
| Domain | - | $12/year |
| **Total** | **Free** | **~$25-40/mo** |

---

## Support & Updates

- **Security Updates**: Keep dependencies updated
  ```bash
  npm update  # Frontend
  pip list --outdated  # Backend
  ```

- **Monitoring**: Set up error tracking (Sentry, LogRocket)

- **Analytics**: Track usage with Plausible or Mixpanel

---

For deployment help, see [QUICKSTART.md](QUICKSTART.md) or open an issue.

