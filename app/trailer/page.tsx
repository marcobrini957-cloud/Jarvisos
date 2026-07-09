'use client';
import dynamic from 'next/dynamic';

const VelquorTrailer = dynamic(
  () => import('@/components/trailer/VelquorTrailer'),
  { ssr: false }
);

export default function TrailerPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <VelquorTrailer />
    </div>
  );
}
