'use client';

import { ThemeToggle } from '@/features/theme/ui/theme-toggle';

export function DesktopSettingsPage() {
  return (
    <section className="stack">
      <div className="card">
        <p className="eyebrow">Settings</p>
        <h1>설정</h1>
        <p className="muted">앱 표시와 동작 방식을 조정합니다.</p>
      </div>

      <div className="card stack settings-card">
        <div>
          <p className="eyebrow">Appearance</p>
          <h2>Theme</h2>
        </div>
        <p className="muted">라이트와 다크 테마를 전환합니다.</p>
        <ThemeToggle />
      </div>
    </section>
  );
}
