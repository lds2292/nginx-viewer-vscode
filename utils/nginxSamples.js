export const SAMPLES = [
  {
    label: '기본 웹서버',
    key: 'basic',
    conf: `worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout 65;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    server {
        listen 80;
        server_name example.com www.example.com;

        root /var/www/html;
        index index.html index.htm;

        location / {
            try_files $uri $uri/ =404;
        }

        location /static/ {
            expires 30d;
            add_header Cache-Control "public";
        }

        location = /favicon.ico {
            log_not_found off;
            access_log off;
        }

        error_page 404 /404.html;
        error_page 500 502 503 504 /50x.html;
    }
}`,
  },
  {
    label: 'Reverse Proxy',
    key: 'proxy',
    conf: `worker_processes auto;

events {
    worker_connections 1024;
}

http {
    upstream backend {
        server 127.0.0.1:3000;
        server 127.0.0.1:3001;
        keepalive 32;
    }

    server {
        listen 80;
        server_name api.example.com;

        location / {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Connection "";
            proxy_connect_timeout 10s;
            proxy_read_timeout 60s;
        }

        location /health {
            return 200 "ok";
            add_header Content-Type text/plain;
        }
    }
}`,
  },
  {
    label: 'SSL + HTTPS 리다이렉트',
    key: 'ssl',
    conf: `worker_processes auto;

events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name example.com www.example.com;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name example.com www.example.com;

        ssl_certificate     /etc/ssl/certs/example.com.crt;
        ssl_certificate_key /etc/ssl/private/example.com.key;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        ssl_session_tickets off;

        ssl_stapling on;
        ssl_stapling_verify on;
        resolver 8.8.8.8 8.8.4.4 valid=300s;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        root /var/www/html;
        index index.html;

        location / {
            try_files $uri $uri/ =404;
        }

        location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}`,
  },
]
