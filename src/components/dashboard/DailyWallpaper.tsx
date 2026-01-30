import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Calendar, Clock, MapPin } from 'lucide-react';

// Collection of Angola landscapes and memorial locations
const ANGOLA_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=1920&h=1080&fit=crop',
    location: 'Quedas de Kalandula, Malanje',
    description: 'As majestosas quedas de água de Kalandula'
  },
  {
    url: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1920&h=1080&fit=crop',
    location: 'Deserto do Namibe',
    description: 'O encontro do deserto com o oceano'
  },
  {
    url: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1920&h=1080&fit=crop',
    location: 'Baía de Luanda',
    description: 'Vista panorâmica da Baía de Luanda'
  },
  {
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    location: 'Serra da Leba, Huíla',
    description: 'A famosa estrada da Serra da Leba'
  },
  {
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&h=1080&fit=crop',
    location: 'Planalto Central',
    description: 'As verdes planícies do planalto angolano'
  },
  {
    url: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1920&h=1080&fit=crop',
    location: 'Cascatas de Binga, Kwanza Sul',
    description: 'Beleza natural das cascatas'
  },
  {
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&h=1080&fit=crop',
    location: 'Marginal de Luanda',
    description: 'Pôr do sol na marginal'
  },
  {
    url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop',
    location: 'Parque Nacional da Kissama',
    description: 'Vida selvagem angolana'
  },
  {
    url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&h=1080&fit=crop',
    location: 'Lubango, Huíla',
    description: 'Vista do Cristo Rei'
  },
  {
    url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&h=1080&fit=crop',
    location: 'Tundavala, Huíla',
    description: 'A fenda de Tundavala'
  },
  {
    url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=1920&h=1080&fit=crop',
    location: 'Floresta de Maiombe, Cabinda',
    description: 'A floresta tropical do Maiombe'
  },
  {
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1920&h=1080&fit=crop',
    location: 'Benguela',
    description: 'Costa de Benguela'
  },
  {
    url: 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=1920&h=1080&fit=crop',
    location: 'Rio Kwanza',
    description: 'O majestoso Rio Kwanza'
  },
  {
    url: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=1920&h=1080&fit=crop',
    location: 'Praia do Mussulo',
    description: 'As águas cristalinas do Mussulo'
  },
  {
    url: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=1920&h=1080&fit=crop',
    location: 'Huambo',
    description: 'Campos floridos do Huambo'
  },
  {
    url: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1920&h=1080&fit=crop',
    location: 'Cabo Ledo',
    description: 'Ondas perfeitas de Cabo Ledo'
  },
  {
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&h=1080&fit=crop',
    location: 'Ilha de Luanda',
    description: 'Praias da Ilha de Luanda'
  },
  {
    url: 'https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=1920&h=1080&fit=crop',
    location: 'Noite em Luanda',
    description: 'Luanda iluminada'
  },
  {
    url: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1920&h=1080&fit=crop',
    location: 'Nascer do Sol, Namibe',
    description: 'Amanhecer no deserto'
  },
  {
    url: 'https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=1920&h=1080&fit=crop',
    location: 'Noite Estrelada, Cuando Cubango',
    description: 'Céu noturno do sul de Angola'
  },
  {
    url: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1920&h=1080&fit=crop',
    location: 'Montanhas de Bibala',
    description: 'Paisagem montanhosa'
  },
  {
    url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=1920&h=1080&fit=crop',
    location: 'Vale do Kwanza',
    description: 'Natureza exuberante'
  },
  {
    url: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1920&h=1080&fit=crop',
    location: 'Pedras Negras de Pungo Andongo',
    description: 'Formações rochosas históricas'
  },
  {
    url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1920&h=1080&fit=crop',
    location: 'Primavera em Angola',
    description: 'Flores silvestres angolanas'
  },
  {
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&h=1080&fit=crop',
    location: 'Floresta do Mayombe',
    description: 'Floresta tropical densa'
  },
  {
    url: 'https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=1920&h=1080&fit=crop',
    location: 'Lago Dilolo, Moxico',
    description: 'Águas serenas do leste'
  },
  {
    url: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1920&h=1080&fit=crop',
    location: 'Rio Cunene',
    description: 'Fronteira natural do sul'
  },
  {
    url: 'https://images.unsplash.com/photo-1414609245224-afa02bfb3fda?w=1920&h=1080&fit=crop',
    location: 'Savana de Angola',
    description: 'Paisagem típica africana'
  },
  {
    url: 'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1920&h=1080&fit=crop',
    location: 'Céu de Angola',
    description: 'Nuvens sobre o planalto'
  },
  {
    url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&h=1080&fit=crop',
    location: 'Via Láctea, Angola',
    description: 'Astronomia no sul de Angola'
  },
  {
    url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=1920&h=1080&fit=crop',
    location: 'Deserto do Namibe ao Entardecer',
    description: 'Cores do pôr do sol no deserto'
  }
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
    <div className="relative w-full h-[400px] rounded-2xl overflow-hidden shadow-lg animate-fade-in">
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
