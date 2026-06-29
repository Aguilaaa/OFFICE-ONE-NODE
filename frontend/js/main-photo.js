const getMainPhotoSrc = (API_BASE, product) => {
  if (product.image_url) return `${API_BASE}/${product.image_url}`;
  const photos = product.ProductPhotos || [];
  const main = photos.find((p) => p.is_main) || photos[0];
  return main ? `${API_BASE}/${main.photo_path}` : null;
};
