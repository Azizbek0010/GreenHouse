// Razmer tanlash — barcha o'lchamlar doim ko'rinadi (ombor qoldig'i hisobga olinmaydi)
import { FLOWER_SIZES } from '../lib/flowers'

export default function RazmerButtons({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FLOWER_SIZES.map(sm => (
        <button
          key={sm}
          onClick={() => onChange(sm)}
          className={`px-3 h-8 rounded-lg text-sm font-medium transition-colors border ${
            value === sm
              ? 'bg-primary text-white border-primary'
              : 'bg-cbg text-ctext border-cborder hover:border-primary'
          }`}
        >
          {sm}sm
        </button>
      ))}
    </div>
  )
}
