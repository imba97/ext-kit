import { antfu } from '@antfu/eslint-config'

export default antfu({
  // extension project conventions: drop trailing commas (offer-hunter / btools-vitesse style)
  rules: {
    'style/comma-dangle': ['warn', 'never']
  }
})
