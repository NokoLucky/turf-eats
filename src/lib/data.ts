import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';

const findImage = (id: string): ImagePlaceholder => {
  const image = PlaceHolderImages.find((img) => img.id === id);
  if (!image) {
    // Fallback to a default image if not found
    return { id: 'fallback', description: 'Placeholder', imageUrl: 'https://picsum.photos/seed/fallback/200/200', imageHint: 'placeholder' };
  }
  return image;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: ImagePlaceholder;
  restaurantId: string;
  imageUrl: string;
};

export type Restaurant = {
  id: string;
  name: string;
  logoUrl: string;
  rating: number;
  category: string;
  bannerUrl: string;
  storeOwnerId: string;
  address: string;
  openingHours: string;
};

export type OrderStatus = 'Placed' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';

export type Order = {
  id: string;
  restaurantName: string;
  date: string;
  total: number;
  status: OrderStatus;
  items: { name: string; quantity: number }[];
};

export const orders: Order[] = [
    { id: 'ORD-001', restaurantName: 'The Golden Spatula', date: '2024-07-29', total: 17.49, status: 'Out for Delivery', items: [{name: 'Classic Burger', quantity: 1}, {name: 'Pancakes', quantity: 1}]},
    { id: 'ORD-002', restaurantName: 'Pizza Palace', date: '2024-07-28', total: 15.99, status: 'Delivered', items: [{name: 'Pepperoni Pizza', quantity: 1}] },
    { id: 'ORD-003', restaurantName: 'The Green Leaf', date: '2024-07-27', total: 12.00, status: 'Delivered', items: [{name: 'Kale Salad', quantity: 1}] },
];
