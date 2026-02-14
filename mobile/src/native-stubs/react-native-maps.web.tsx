import { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { StyledText as Text } from '@/components/ui/StyledText';

type MapViewProps = PropsWithChildren<{ [key: string]: unknown }>;

type MarkerProps = { [key: string]: unknown };

export const PROVIDER_GOOGLE = undefined;

export default function MapView({ children }: MapViewProps) {
  return <View>{children}</View>;
}

export function Marker(_props: MarkerProps) {
  return <Text>지도 마커</Text>;
}
