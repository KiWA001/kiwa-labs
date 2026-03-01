import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const alt = 'KiWA Labs - Anything you can imagine, we can build';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '120px',
              fontWeight: 800,
              color: 'black',
              letterSpacing: '-0.02em',
              marginBottom: '20px',
            }}
          >
            KiWA Labs
          </div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 400,
              color: '#333333',
              letterSpacing: '-0.01em',
            }}
          >
            Anything you can imagine, we can build!
          </div>
        </div>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  );
}
