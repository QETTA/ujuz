import { Text, View } from 'react-native';

export default function MapScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-zinc-900 px-6 py-12">
      <Text className="text-white text-lg font-semibold">지도 화면은 웹에서 준비 중입니다.</Text>
      <Text className="mt-2 text-zinc-300">모바일 앱에서 지도를 확인해 주세요.</Text>
    </View>
  );
}
