<template>
  <div class="mobile-block">
    <div class="content">
      <div class="icon">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
      </div>
      <h1 class="title">nginx Viewer</h1>
      <p class="message">
        이 서비스는 PC 환경에서<br>최적화되어 있습니다.
      </p>
      <p class="submessage">
        데스크탑 또는 노트북 브라우저에서<br>접속해 주세요.
      </p>
      <div class="url-badge">toolzy.site/nginx</div>
    </div>
  </div>
</template>

<style scoped>
.mobile-block {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #0f0f13;
  padding: 32px 24px;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  max-width: 320px;
}

.icon {
  color: #4ade80;
  opacity: 0.9;
  margin-bottom: 4px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #f0f0f5;
}

.message {
  font-size: 17px;
  font-weight: 500;
  color: #e0e0e0;
  line-height: 1.7;
}

.submessage {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.7;
}

.url-badge {
  margin-top: 8px;
  padding: 8px 20px;
  background: rgba(167, 139, 250, 0.12);
  border: 1px solid rgba(167, 139, 250, 0.3);
  border-radius: 20px;
  color: #4ade80;
  font-size: 13px;
  font-weight: 500;
  font-family: monospace;
  letter-spacing: 0.03em;
}
</style>
