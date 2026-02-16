import {
  IconShoppingCart,
  IconHome,
  IconBolt,
  IconCar,
  IconHeartbeat,
  IconSchool,
  IconToolsKitchen2,
  IconMovie,
  IconShoppingBag,
  IconBuildingBank,
  IconHomeHand,
  IconWifi,
  IconCoin,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';

interface TablerIconProps {
  size?: number | string;
  stroke?: number;
}

const iconMap: Record<string, ComponentType<TablerIconProps>> = {
  'shopping-cart': IconShoppingCart,
  home: IconHome,
  zap: IconBolt,
  car: IconCar,
  'heart-pulse': IconHeartbeat,
  'graduation-cap': IconSchool,
  utensils: IconToolsKitchen2,
  film: IconMovie,
  'shopping-bag': IconShoppingBag,
  landmark: IconBuildingBank,
  'hand-helping': IconHomeHand,
  wifi: IconWifi,
};

const fallbackIcon = IconCoin;

interface CategoryIconProps {
  name: string | null | undefined;
  size?: number;
  stroke?: number;
}

export function CategoryIcon({ name, size = 18, stroke = 1.5 }: CategoryIconProps) {
  const Icon = (name && iconMap[name]) || fallbackIcon;
  return <Icon size={size} stroke={stroke} />;
}
