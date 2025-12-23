import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Test Flakiness Detector',
  description: 'Detect unreliable tests by running them multiple times and tracking failure rates',
  base: '/tuulbelt/',

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/reference' },
      { text: 'GitHub', link: 'https://github.com/tuulbelt/tuulbelt/tree/main/test-flakiness-detector' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is it?', link: '/guide/what-is-it' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' }
          ]
        },
        {
          text: 'Usage',
          items: [
            { text: 'CLI Usage', link: '/guide/cli-usage' },
            { text: 'Library Usage', link: '/guide/library-usage' },
            { text: 'Examples', link: '/guide/examples' }
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Configuration', link: '/guide/configuration' },
            { text: 'Best Practices', link: '/guide/best-practices' },
            { text: 'Troubleshooting', link: '/guide/troubleshooting' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/reference' },
            { text: 'detectFlakiness()', link: '/api/detect-flakiness' },
            { text: 'Types', link: '/api/types' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/tuulbelt/tuulbelt' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 Tuulbelt'
    },

    search: {
      provider: 'local'
    }
  }
})
