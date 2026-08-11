import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'
import path from 'path'

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../../'),
}

export default withSerwist(nextConfig)
