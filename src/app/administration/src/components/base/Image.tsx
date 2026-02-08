import { SxProps } from '@mui/material';
import { ImgHTMLAttributes } from 'react';
import { StaticImageData } from 'next/image';

interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | StaticImageData;
  sx?: SxProps;
}

const Image = ({ src, alt, sx, ...rest }: ImageProps) => {
  void sx;
  const imageSrc = typeof src === 'string' ? src : src.src;
  return <img src={imageSrc} alt={alt} {...rest} />;
};

export default Image;
