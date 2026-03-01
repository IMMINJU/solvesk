import { ImageResponse } from 'next/og'

export const alt = 'Solvesk — Open-source multi-tenant helpdesk & issue tracker'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#faf9f9',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 80,
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 16,
          background: '#0d9488',
          color: '#ffffff',
          fontSize: 48,
          fontWeight: 700,
          marginBottom: 24,
        }}
      >
        S
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          color: '#1c1917',
          marginBottom: 12,
        }}
      >
        Solvesk
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 28,
          color: '#78716c',
        }}
      >
        Open-source multi-tenant helpdesk & issue tracker
      </div>
    </div>,
    { ...size }
  )
}
