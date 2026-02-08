import { Swiper, SwiperClass } from 'swiper/react';
import { Navigation, Pagination, Scrollbar, A11y } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';

import { ReactElement, RefObject } from 'react';
import { useBreakpoints } from '../../providers/BreakpointsProvider';

const ReactSwiper = ({
  children,
  swiperRef,
  onSwiper,
  ...rest
}: {
  children: ReactElement[] | ReactElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  swiperRef?: RefObject<any>;
  onSwiper: React.Dispatch<React.SetStateAction<SwiperClass | undefined>>;
  [key: string]: unknown;
}) => {
  const { up } = useBreakpoints();
  return (
    <Swiper
      ref={swiperRef}
      modules={[Navigation, Pagination, Scrollbar, A11y]}
      spaceBetween={50}
      slidesPerView={up('sm') ? 2 : 1}
      onInit={(swiper) => {
        swiper.navigation.init();
        swiper.navigation.update();
      }}
      navigation={{
        prevEl: '.prev-arrow',
        nextEl: '.next-arrow',
      }}
      onSwiper={onSwiper}
      {...rest}
    >
      {children}
    </Swiper>
  );
};

export default ReactSwiper;
