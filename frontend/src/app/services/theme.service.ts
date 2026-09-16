import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  isDarkMode = false;

  constructor() {
    this.loadTheme();
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    const htmlTag = document.documentElement;

    if (this.isDarkMode) {
      htmlTag.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      htmlTag.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  private loadTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;
    const htmlTag = document.documentElement;

    // Aplica escuro se estiver guardado, ou se for a preferência do SO (no primeiro acesso)
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      this.isDarkMode = true;
      htmlTag.classList.add('dark');
    } else {
      this.isDarkMode = false;
      htmlTag.classList.remove('dark');
    }
  }
}
