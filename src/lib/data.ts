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
  menu: MenuItem[];
  storeOwnerId: string;
  address: string;
  openingHours: string;
};

export const restaurants: Restaurant[] = [
  {
    id: '1',
    name: 'The Golden Spatula',
    logoUrl: findImage('restaurant-logo-1').imageUrl,
    rating: 4.5,
    category: 'Diner',
    bannerUrl: findImage('restaurant-banner-1').imageUrl,
    menu: [
      { id: '101', name: 'Classic Burger', description: 'Juicy beef patty with lettuce, tomato, and our special sauce.', price: 9.99, image: findImage('menu-item-1'), restaurantId: '1', imageUrl: findImage('menu-item-1').imageUrl },
      { id: '102', name: 'Pancakes', description: 'Fluffy buttermilk pancakes served with maple syrup.', price: 7.50, image: findImage('menu-item-2'), restaurantId: '1', imageUrl: findImage('menu-item-2').imageUrl },
    ],
    storeOwnerId: '',
    address: '',
    openingHours: ''
  },
  {
    id: '2',
    name: 'The Green Leaf',
    logoUrl: findImage('restaurant-logo-2').imageUrl,
    rating: 4.8,
    category: 'Healthy',
    bannerUrl: 'https://picsum.photos/seed/turf11/1200/400',
    menu: [
      { id: '201', name: 'Kale Salad', description: 'Fresh kale, quinoa, and avocado with a lemon vinaigrette.', price: 12.00, image: findImage('menu-item-3'), restaurantId: '2', imageUrl: findImage('menu-item-3').imageUrl },
    ],
    storeOwnerId: '',
    address: '',
    openingHours: ''
  },
  {
    id: '3',
    name: 'Pizza Palace',
    logoUrl: findImage('restaurant-logo-3').imageUrl,
    rating: 4.2,
    category: 'Pizza',
    bannerUrl: 'https://picsum.photos/seed/turf12/1200/400',
    menu: [
      { id: '301', name: 'Pepperoni Pizza', description: 'Classic pizza with zesty pepperoni and mozzarella.', price: 15.99, image: findImage('menu-item-4'), restaurantId: '3', imageUrl: findImage('menu-item-4').imageUrl },
    ],
    storeOwnerId: '',
    address: '',
    openingHours: ''
  },
  {
    id: '4',
    name: 'Sushi Central',
    logoUrl: findImage('restaurant-logo-4').imageUrl,
    rating: 4.7,
    category: 'Japanese',
    bannerUrl: 'https://picsum.photos/seed/turf13/1200/400',
    menu: [],
    storeOwnerId: '',
    address: '',
    openingHours: ''
  },
];

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
