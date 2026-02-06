import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Calendar, Clock, MapPin } from 'lucide-react';

// Import REAL Angola wallpapers
import kalandulaFalls from '@/assets/angola-wallpapers/kalandula-falls.jpg';
import serraLeba from '@/assets/angola-wallpapers/serra-da-leba.jpg';
import cristoRei from '@/assets/angola-wallpapers/cristo-rei-lubango.jpg';
import fortalezaSaoMiguel from '@/assets/angola-wallpapers/fortaleza-sao-miguel.jpg';
import tundavala from '@/assets/angola-wallpapers/tundavala.jpg';
import marginalLuanda from '@/assets/angola-wallpapers/marginal-luanda.jpg';
import mussuloBeach from '@/assets/angola-wallpapers/mussulo-beach.jpg';

// Collection of REAL Angola landscapes and landmarks
const ANGOLA_IMAGES = [
  {
    url: kalandulaFalls,
    location: 'Quedas de Kalandula, Malanje',
    description: 'As majestosas quedas de água de Kalandula'
  },
  {
    url: serraLeba,
    location: 'Serra da Leba, Huíla',
    description: 'A famosa estrada da Serra da Leba'
  },
  {
    url: cristoRei,
    location: 'Cristo Rei, Lubango',
    description: 'O monumento do Cristo Rei sobre a cidade'
  },
  {
    url: fortalezaSaoMiguel,
    location: 'Fortaleza de São Miguel, Luanda',
    description: 'Fortaleza histórica colonial portuguesa'
  },
  {
    url: tundavala,
    location: 'Fenda da Tundavala, Huíla',
    description: 'Vista deslumbrante da fenda de Tundavala'
  },
  {
    url: marginalLuanda,
    location: 'Marginal de Luanda',
    description: 'Pôr do sol na marginal de Luanda'
  },
  {
    url: mussuloBeach,
    location: 'Praia do Mussulo, Luanda',
    description: 'Paraíso tropical nas águas de Mussulo'
  },
];

// Get image index based on day of year (changes daily)
function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function DailyWallpaper() {
  const { language } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [imageLoaded, setImageLoaded] = useState(false);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get today's image based on day of year
  const dayOfYear = getDayOfYear();
  const todayImage = ANGOLA_IMAGES[dayOfYear % ANGOLA_IMAGES.length];

  // Format date
  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return currentTime.toLocaleDateString(language === 'pt' ? 'pt-AO' : 'en-US', options);
  };

  // Format time
  const formatTime = () => {
    return currentTime.toLocaleTimeString(language === 'pt' ? 'pt-AO' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="relative w-full h-[450px] rounded-2xl overflow-hidden shadow-lg animate-fade-in">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{ 
          backgroundImage: `url(${todayImage.url})`,
          opacity: imageLoaded ? 1 : 0
        }}
      />
      
      {/* Preload image */}
      <img 
        src={todayImage.url} 
        alt="" 
        className="hidden"
        onLoad={() => setImageLoaded(true)}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between p-6 text-white">
        {/* Top Section - Date and Time */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Calendar className="h-5 w-5 opacity-80" />
            <span className="text-lg font-medium capitalize opacity-90">
              {formatDate()}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Clock className="h-8 w-8 opacity-90" />
            <span className="text-5xl font-bold tracking-wider font-mono">
              {formatTime()}
            </span>
          </div>
        </div>

        {/* Bottom Section - Location Info */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <MapPin className="h-4 w-4 opacity-80" />
            <span className="text-lg font-semibold">
              {todayImage.location}
            </span>
          </div>
          <p className="text-sm opacity-80 italic">
            {todayImage.description}
          </p>
          <p className="text-xs mt-3 opacity-60">
            {language === 'pt' ? 'Imagem do dia' : 'Image of the day'} • {dayOfYear % ANGOLA_IMAGES.length + 1}/{ANGOLA_IMAGES.length}
          </p>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
        <span className="text-white/80 text-xs font-medium">
          🇦🇴 Angola
        </span>
      </div>
    </div>
  );
}
