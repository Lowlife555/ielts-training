import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import { TouchProvider } from './context/TouchContext'

// 首帧前应用暗色主题 + 触屏布局，避免闪烁
if (localStorage.getItem('ielts_theme') === 'dark') {
  document.documentElement.classList.add('dark');
}
const _layout = localStorage.getItem('ielts_layout');
if (
  _layout === 'touch' ||
  (!_layout && window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 768)
) {
  document.documentElement.classList.add('touch');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TouchProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </TouchProvider>
  </StrictMode>,
)
