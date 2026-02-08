import { IconButton, Paper, Stack, Typography } from '@mui/material';
import IconifyIcon from '../../../../components/base/IconifyIcon';
import ReactSwiper from '../../../../components/base/ReactSwiper';
import { ReactElement, useState, useEffect } from 'react';
import { SwiperSlide } from 'swiper/react';
import { Swiper as SwiperClass } from 'swiper/types';
import SlideItem from './SlideItem';

const TrendingNow = (): ReactElement => {
  const [, setSwiperRef] = useState<SwiperClass>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [trendingItemsSlides, setTrendingItemsSlides] = useState<{ id: string; name: string; imgsrc: string; popularity: number; users: any[] }[]>([]);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Map real products to the expected format
          const slides = data.slice(0, 5).map((p: { id: string; title: string; image?: string }) => ({
            id: p.id,
            name: p.title,
            imgsrc: p.image || '', // Ensure fallback if image is missing
            popularity: Math.floor(Math.random() * 40) + 60, // Mock popularity between 60-100%
            users: [], // No fake users
          }));
          setTrendingItemsSlides(slides);
        }
      })
      .catch((err) => console.error('Failed to fetch trending products', err));
  }, []);

  return (
    <Paper
      sx={{
        p: { xs: 4, sm: 8 },
        height: 1,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={5}
        mr={-2}
        flexWrap="wrap"
      >
        <Typography variant="h4" color="common.white">
          Produits Récents
        </Typography>
        <Stack direction="row" gap={1}>
          <IconButton
            className={`prev-arrow`}
            sx={{
              '&:disabled': {
                opacity: 0.5,
                cursor: 'default',
              },
              '&:hover': {
                bgcolor: 'transparent',
              },
            }}
            centerRipple
          >
            <IconifyIcon icon="mingcute:left-line" />
          </IconButton>
          <IconButton
            className={`next-arrow`}
            sx={{
              '&:disabled': {
                opacity: 0.5,
                cursor: 'default',
              },
              '&:hover': {
                bgcolor: 'transparent',
              },
            }}
            centerRipple
          >
            <IconifyIcon icon="mingcute:right-line" />
          </IconButton>
        </Stack>
      </Stack>
      <ReactSwiper
        onSwiper={setSwiperRef}
        sx={{
          height: 1,
        }}
      >
        {trendingItemsSlides.map((slideItem) => (
          <SwiperSlide key={slideItem.id}>
            <SlideItem trendingItem={slideItem} />
          </SwiperSlide>
        ))}
      </ReactSwiper>
    </Paper>
  );
};

export default TrendingNow;
